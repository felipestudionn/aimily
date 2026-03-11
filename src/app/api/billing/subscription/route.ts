import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLANS, PlanId } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
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
