import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { ADMIN_EMAILS, getPlanLimits, PlanId } from '@/lib/stripe';

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
}

export async function checkAIUsage(userId: string, userEmail: string) {
  // Admin bypass
  if (ADMIN_EMAILS.includes(userEmail)) {
    return { allowed: true as const, current: 0, limit: -1 };
  }

  // Get subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, trial_ends_at, is_admin')
    .eq('user_id', userId)
    .single();

  // Admin flag bypass
  if (sub?.is_admin) {
    return { allowed: true as const, current: 0, limit: -1 };
  }

  // Check trial expiration
  if (sub?.plan === 'trial' && sub?.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return { allowed: false as const, reason: 'trial_expired' as const, current: 0, limit: 0 };
    }
  }

  // Check subscription status
  if (sub?.status === 'canceled' || sub?.status === 'unpaid') {
    return { allowed: false as const, reason: 'subscription_inactive' as const, current: 0, limit: 0 };
  }

  // Get plan limits
  const plan = (sub?.plan || 'trial') as PlanId;
  const planLimits = getPlanLimits(plan);
  const limit = planLimits.aiGenerations;

  // Unlimited
  if (limit === -1) {
    return { allowed: true as const, current: 0, limit: -1 };
  }

  // Check current usage
  const month = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabaseAdmin
    .from('ai_usage')
    .select('generation_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  const current = usage?.generation_count || 0;

  if (current >= limit) {
    return { allowed: false as const, reason: 'limit_reached' as const, current, limit };
  }

  // Increment usage
  await supabaseAdmin.from('ai_usage').upsert({
    user_id: userId,
    month,
    generation_count: current + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,month' });

  return { allowed: true as const, current: current + 1, limit };
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

/** Build 403 response from usage check result */
export function usageDeniedResponse(usage: { reason?: string }) {
  const message = usage.reason === 'trial_expired'
    ? 'Your trial has expired. Please choose a plan to continue.'
    : usage.reason === 'limit_reached'
    ? 'AI generation limit reached for this month.'
    : 'Subscription inactive. Please update your payment method.';

  return NextResponse.json({ error: message }, { status: 403 });
}
