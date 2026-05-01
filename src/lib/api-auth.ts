import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { ADMIN_EMAILS, getPlanLimits, PlanId } from '@/lib/stripe';
import { checkTeamPermission, type TeamPermission } from '@/lib/team-permissions';
import { rateLimit } from '@/lib/rate-limit';

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
}

/**
 * Verify the authenticated user has access to the collection plan.
 *
 * Resolves access through `checkTeamPermission` so both the legacy owner-only
 * model AND team members (Fase 4.3) are honored. Routes that don't specify a
 * `permission` default to `view_all`, which maps to "owner or any seat with
 * collection access" — matching the original behavior for legacy call sites.
 *
 * For marketing/financial/PII routes, pass the granular permission explicitly:
 *
 *   await verifyCollectionOwnership(user.id, planId, 'edit_marketing')
 *   await verifyCollectionOwnership(user.id, planId, 'edit_paid_campaigns')
 *   await verifyCollectionOwnership(user.id, planId, 'manage_pr_contacts')
 */
export async function verifyCollectionOwnership(
  userId: string,
  collectionPlanId: string,
  permission: TeamPermission = 'view_all',
) {
  const check = await checkTeamPermission({ userId, collectionPlanId, permission });
  if (!check.allowed) {
    return { authorized: false as const, error: check.error! };
  }
  return { authorized: true as const, error: null };
}

/**
 * Imagery quota check — only paid AI image/video generations consume quota.
 * Text generations (Claude Haiku, Gemini Flash, Perplexity) are unlimited.
 *
 * Atomic: delegates the read+write to the `consume_imagery_units` Postgres
 * RPC, which holds row locks on `ai_usage` and `imagery_credits` for the
 * duration of the transaction. Two concurrent requests cannot both pass
 * the check, and the two-table update can never end up half-applied.
 *
 * Returned `planConsumed` and `packConsumed` MUST be passed to
 * `refundImageryUnits()` if the downstream provider call fails — that
 * gives the customer back exactly what was taken, no more, no less.
 *
 * `units` lets multi-image endpoints count more than 1 (brand-references = 4,
 * Kling video = 5).
 */
export async function checkImageryUsage(
  userId: string,
  userEmail: string,
  units: number = 1,
) {
  // Admin bypass — no quota, no record.
  if (ADMIN_EMAILS.includes(userEmail)) {
    return { allowed: true as const, current: 0, limit: -1, packBalance: 0, planConsumed: 0, packConsumed: 0 };
  }

  // Get subscription state. Auth gates (trial expiry, subscription status)
  // run in JS because they're pure data reads with no race window worth
  // pushing into the RPC. Quota math is what needs the lock.
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, trial_ends_at, is_admin')
    .eq('user_id', userId)
    .single();

  if (sub?.is_admin) {
    return { allowed: true as const, current: 0, limit: -1, packBalance: 0, planConsumed: 0, packConsumed: 0 };
  }

  if (sub?.plan === 'trial' && sub?.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return { allowed: false as const, reason: 'trial_expired' as const, current: 0, limit: 0, packBalance: 0 };
    }
  }

  if (sub?.status === 'canceled' || sub?.status === 'unpaid') {
    return { allowed: false as const, reason: 'subscription_inactive' as const, current: 0, limit: 0, packBalance: 0 };
  }

  const plan = (sub?.plan || 'trial') as PlanId;
  const planLimits = getPlanLimits(plan);
  const limit = planLimits.imageryGenerations;

  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('consume_imagery_units', {
    p_user_id: userId,
    p_units: units,
    p_plan_limit: limit,
  });

  if (rpcError || !rpcData) {
    console.error('[imagery-quota] consume RPC failed:', rpcError);
    /* Fail closed: deny rather than risk silent over-consumption.
       Surfaces as 402 to the user; ops sees the RPC error in logs. */
    return { allowed: false as const, reason: 'limit_reached' as const, current: 0, limit, packBalance: 0 };
  }

  const result = rpcData as {
    allowed: boolean;
    reason?: string;
    plan_consumed?: number;
    pack_consumed?: number;
    current?: number;
    limit?: number;
    pack_balance?: number;
  };

  if (!result.allowed) {
    return {
      allowed: false as const,
      reason: (result.reason as 'limit_reached') || 'limit_reached',
      current: result.current ?? 0,
      limit: result.limit ?? limit,
      packBalance: result.pack_balance ?? 0,
    };
  }

  return {
    allowed: true as const,
    current: result.current ?? 0,
    limit: result.limit ?? limit,
    packBalance: result.pack_balance ?? 0,
    planConsumed: result.plan_consumed ?? 0,
    packConsumed: result.pack_consumed ?? 0,
  };
}

/**
 * Refund the exact units that `checkImageryUsage` took, in case the
 * downstream provider call (Freepik, OpenAI, Anthropic) failed and the
 * user never received their imagery.
 *
 * Pass the `planConsumed` and `packConsumed` values returned by the
 * earlier `checkImageryUsage` call. Pure no-op if both are zero (admin /
 * unlimited / quota-denied paths set them to 0).
 *
 * Fire-and-forget is fine because failure to refund only delays the
 * eventual reconciliation — but try to await when you can so the request
 * doesn't return before the credit is back in the customer's account.
 */
export async function refundImageryUnits(
  userId: string,
  planConsumed: number,
  packConsumed: number,
) {
  if ((planConsumed || 0) <= 0 && (packConsumed || 0) <= 0) return;

  const { error } = await supabaseAdmin.rpc('refund_imagery_units', {
    p_user_id: userId,
    p_plan_consumed: planConsumed || 0,
    p_pack_consumed: packConsumed || 0,
  });

  if (error) {
    console.error('[imagery-quota] refund RPC failed:', error, { userId, planConsumed, packConsumed });
  }
}

/**
 * @deprecated kept temporarily for backwards-compat — alias to checkImageryUsage.
 * Will be removed once all endpoints migrate.
 */
export const checkAIUsage = checkImageryUsage;

/**
 * Per-user rate limit on AI endpoints. Stops a runaway client (loop in
 * the browser, debounce regression, scripted abuse) from burning through
 * imagery quota AND provider credits in seconds.
 *
 * The middleware already throttles AI traffic at 30/min/IP, but a
 * malicious user behind a residential rotating IP would slip past.
 * This second layer keys off the authenticated user.id so it tracks the
 * actor regardless of network egress.
 *
 * In-memory + per-warm-instance (same caveats as `rateLimit`): not exact
 * across Fluid replicas, but more than enough to keep cost runaway from
 * any single account bounded.
 *
 * Buckets:
 *   text  — Claude / Gemini / Perplexity calls (cheap, but Perplexity
 *           Search costs add up). 30/min.
 *   image — Freepik / OpenAI image gen. 10/min — quota check still
 *           enforces monthly cap, this is just the burst limit.
 *   video — Kling video. 3/min — each call is ~$0.30 and runs 90s.
 */
export function enforceAiUserRateLimit(
  userId: string,
  bucket: 'text' | 'image' | 'video' = 'text',
): NextResponse | null {
  const cfg = bucket === 'video'
    ? { count: 3, window: 60_000 }
    : bucket === 'image'
    ? { count: 10, window: 60_000 }
    : { count: 30, window: 60_000 };
  if (rateLimit.allow(`${userId}:ai-${bucket}`, cfg.count, cfg.window)) return null;
  return NextResponse.json(
    { error: 'Too many AI requests. Slow down for a moment and try again.' },
    { status: 429, headers: { 'Retry-After': '30' } },
  );
}

/** Auth-only check (no usage tracking) — for status endpoints */
export async function checkAuthOnly(userId: string, userEmail: string) {
  if (ADMIN_EMAILS.includes(userEmail)) {
    return { allowed: true as const };
  }

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, trial_ends_at, is_admin')
    .eq('user_id', userId)
    .single();

  if (sub?.is_admin) {
    return { allowed: true as const };
  }

  if (sub?.plan === 'trial' && sub?.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return { allowed: false as const, reason: 'trial_expired' as const };
    }
  }

  if (sub?.status === 'canceled' || sub?.status === 'unpaid') {
    return { allowed: false as const, reason: 'subscription_inactive' as const };
  }

  return { allowed: true as const };
}

/** Build response from imagery quota denial. 402 = Payment Required. */
export function usageDeniedResponse(usage: { reason?: string; current?: number; limit?: number; packBalance?: number }) {
  const message = usage.reason === 'trial_expired'
    ? 'Your trial has expired. Please choose a plan to continue.'
    : usage.reason === 'limit_reached'
    ? 'You have used all your imagery generations this month. Upgrade your plan or buy an Aimily Credits pack to keep generating.'
    : 'Subscription inactive. Please update your payment method.';

  return NextResponse.json({
    error: message,
    reason: usage.reason,
    current: usage.current,
    limit: usage.limit,
    packBalance: usage.packBalance,
  }, { status: usage.reason === 'limit_reached' ? 402 : 403 });
}
