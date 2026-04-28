import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLANS, PlanId, ADMIN_EMAILS } from '@/lib/stripe';

/**
 * GET imagery usage state. Read-only — actual quota enforcement happens
 * server-side in each AI image endpoint via `checkImageryUsage`.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ current: 0, limit: -1, plan: 'enterprise', packBalance: 0 });
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, is_admin')
      .eq('user_id', user.id)
      .single();

    if (sub?.is_admin) {
      return NextResponse.json({ current: 0, limit: -1, plan: 'enterprise', packBalance: 0 });
    }

    const plan = (sub?.plan || 'trial') as PlanId;
    const limit = PLANS[plan].limits.imageryGenerations;

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
      current: usage?.imagery_count || 0,
      limit,
      plan,
      packBalance: credits?.balance || 0,
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json({ current: 0, limit: -1, plan: 'trial', packBalance: 0 });
  }
}
