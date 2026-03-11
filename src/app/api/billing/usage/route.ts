import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLANS, PlanId } from '@/lib/stripe';

// Increment AI usage count and check limits
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user plan
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const plan = (sub?.plan || 'trial') as PlanId;
    const limit = PLANS[plan].limits.aiGenerations;

    // Get current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get current usage
    const { data: usage } = await supabaseAdmin
      .from('ai_usage')
      .select('generation_count')
      .eq('user_id', user.id)
      .eq('month', month)
      .single();

    const currentCount = usage?.generation_count || 0;

    // Check limit (-1 means unlimited)
    if (limit !== -1 && currentCount >= limit) {
      return NextResponse.json({
        allowed: false,
        current: currentCount,
        limit,
        plan,
      }, { status: 429 });
    }

    // Increment usage
    const { error: upsertError } = await supabaseAdmin
      .from('ai_usage')
      .upsert({
        user_id: user.id,
        month,
        generation_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,month' });

    if (upsertError) {
      console.error('Usage upsert error:', upsertError);
    }

    return NextResponse.json({
      allowed: true,
      current: currentCount + 1,
      limit,
      plan,
    });
  } catch (error) {
    console.error('Usage tracking error:', error);
    // Don't block AI usage on tracking errors
    return NextResponse.json({ allowed: true, current: 0, limit: -1, plan: 'trial' });
  }
}
