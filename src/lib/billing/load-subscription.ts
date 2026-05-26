/**
 * Subscription loader — single source of truth for the shape consumed by
 * SubscriptionContext on the client.
 *
 * Used by both:
 *   • `/api/billing/subscription` (the existing GET endpoint that the
 *     client calls on focus changes, realtime channel updates, and after
 *     Stripe round-trips).
 *   • `(app)/layout.tsx` SSR — so the first paint of any authenticated
 *     route already has the plan/limits/usage resolved, no client-side
 *     "subscription = null" flash.
 *
 * Returning the same shape from both call sites guarantees no drift —
 * the API route now delegates to this function.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLANS, PlanId, ADMIN_EMAILS } from '@/lib/stripe';

export interface LoadedSubscription {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: (typeof PLANS)[PlanId]['limits'];
  trialEndsAt: string | null;
  isAdmin: boolean;
  usage: { imagery: number; month: string };
  packBalance: number;
  refundedAt: string | null;
  refundAmountCents: number | null;
  refundCurrency: string | null;
  onboardingCompletedAt: string | null;
}

export async function loadSubscriptionForUser(
  userId: string,
  userEmail: string | undefined,
): Promise<LoadedSubscription> {
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  const isAdmin = sub?.is_admin || ADMIN_EMAILS.includes(userEmail || '');
  const plan = isAdmin ? 'enterprise' : ((sub?.plan || 'trial') as PlanId);
  const limits = PLANS[plan].limits;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [{ data: usage }, { data: credits }] = await Promise.all([
    supabaseAdmin
      .from('ai_usage')
      .select('imagery_count')
      .eq('user_id', userId)
      .eq('month', month)
      .single(),
    supabaseAdmin
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single(),
  ]);

  return {
    plan,
    status: isAdmin ? 'active' : (sub?.status || 'active'),
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
    limits,
    trialEndsAt: sub?.trial_ends_at || null,
    isAdmin,
    usage: { imagery: usage?.imagery_count || 0, month },
    packBalance: credits?.balance || 0,
    refundedAt: sub?.refunded_at || null,
    refundAmountCents: sub?.refund_amount_cents || null,
    refundCurrency: sub?.refund_currency || null,
    onboardingCompletedAt: sub?.onboarding_completed_at || null,
  };
}
