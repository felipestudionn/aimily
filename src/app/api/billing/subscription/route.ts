import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLANS, PlanId } from '@/lib/stripe';

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

    const plan = (sub?.plan || 'free') as PlanId;
    const limits = PLANS[plan].limits;

    // Get current month AI usage
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: usage } = await supabaseAdmin
      .from('ai_usage')
      .select('generation_count')
      .eq('user_id', user.id)
      .eq('month', month)
      .single();

    return NextResponse.json({
      plan,
      status: sub?.status || 'active',
      currentPeriodEnd: sub?.current_period_end,
      cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      limits,
      usage: {
        aiGenerations: usage?.generation_count || 0,
        month,
      },
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
