import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLANS, PlanId, ADMIN_EMAILS } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Admin bypass — always return enterprise
    const isAdmin = sub?.is_admin || ADMIN_EMAILS.includes(user.email || '');
    const plan = isAdmin ? 'enterprise' : ((sub?.plan || 'trial') as PlanId);
    const limits = PLANS[plan].limits;

    // Get current month AI usage
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: usage } = await supabaseAdmin
      .from('ai_usage')
      .select('imagery_count')
      .eq('user_id', user.id)
      .eq('month', month)
      .single();

    const { data: credits } = await supabaseAdmin
      .from('imagery_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      plan,
      status: isAdmin ? 'active' : (sub?.status || 'active'),
      currentPeriodEnd: sub?.current_period_end,
      cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      limits,
      trialEndsAt: sub?.trial_ends_at || null,
      isAdmin,
      usage: {
        imagery: usage?.imagery_count || 0,
        month,
      },
      packBalance: credits?.balance || 0,
      refundedAt: sub?.refunded_at || null,
      refundAmountCents: sub?.refund_amount_cents || null,
      refundCurrency: sub?.refund_currency || null,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
