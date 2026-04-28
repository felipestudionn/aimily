import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { ADMIN_EMAILS, getPlanLimits, PlanId } from '@/lib/stripe';
import { checkTeamPermission, type TeamPermission } from '@/lib/team-permissions';

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
 * Flow: plan limit first, then top-up Aimily Credits pack balance, then deny.
 * `units` lets multi-image endpoints count more than 1 (brand-references = 4,
 * Kling video = 5).
 */
export async function checkImageryUsage(
  userId: string,
  userEmail: string,
  units: number = 1,
) {
  // Admin bypass
  if (ADMIN_EMAILS.includes(userEmail)) {
    return { allowed: true as const, current: 0, limit: -1, packBalance: 0 };
  }

  // Get subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, trial_ends_at, is_admin')
    .eq('user_id', userId)
    .single();

  // Admin flag bypass
  if (sub?.is_admin) {
    return { allowed: true as const, current: 0, limit: -1, packBalance: 0 };
  }

  // Check trial expiration
  if (sub?.plan === 'trial' && sub?.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return { allowed: false as const, reason: 'trial_expired' as const, current: 0, limit: 0, packBalance: 0 };
    }
  }

  // Check subscription status
  if (sub?.status === 'canceled' || sub?.status === 'unpaid') {
    return { allowed: false as const, reason: 'subscription_inactive' as const, current: 0, limit: 0, packBalance: 0 };
  }

  // Get plan limits
  const plan = (sub?.plan || 'trial') as PlanId;
  const planLimits = getPlanLimits(plan);
  const limit = planLimits.imageryGenerations;

  // Unlimited (Enterprise / admin)
  if (limit === -1) {
    return { allowed: true as const, current: 0, limit: -1, packBalance: 0 };
  }

  // Read current month usage
  const month = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabaseAdmin
    .from('ai_usage')
    .select('imagery_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single();
  const current = usage?.imagery_count || 0;

  // Read Aimily Credits pack balance (top-ups, no expiry)
  const { data: credits } = await supabaseAdmin
    .from('imagery_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
  const packBalance = credits?.balance || 0;

  const planRemaining = Math.max(0, limit - current);
  const totalRemaining = planRemaining + packBalance;

  if (totalRemaining < units) {
    return { allowed: false as const, reason: 'limit_reached' as const, current, limit, packBalance };
  }

  // Consume plan first, then dip into packs
  const consumeFromPlan = Math.min(units, planRemaining);
  const consumeFromPacks = units - consumeFromPlan;

  if (consumeFromPlan > 0) {
    await supabaseAdmin.from('ai_usage').upsert({
      user_id: userId,
      month,
      imagery_count: current + consumeFromPlan,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,month' });
  }

  if (consumeFromPacks > 0) {
    await supabaseAdmin
      .from('imagery_credits')
      .update({
        balance: packBalance - consumeFromPacks,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  return {
    allowed: true as const,
    current: current + consumeFromPlan,
    limit,
    packBalance: packBalance - consumeFromPacks,
  };
}

/**
 * @deprecated kept temporarily for backwards-compat — alias to checkImageryUsage.
 * Will be removed once all endpoints migrate.
 */
export const checkAIUsage = checkImageryUsage;

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
