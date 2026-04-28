import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendTrialEndingEmail } from '@/lib/transactional-emails';

/**
 * Daily cron — emails users whose trial ends in 3 days or 1 day.
 * Idempotent via subscriptions.trial_emails_sent JSONB array.
 *
 * Verifies CRON_SECRET to block public invocation.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 86_400_000);
  const oneDay = new Date(now.getTime() + 86_400_000);

  // Pull all trial subs ending in the next 4 days that we still consider active
  const { data: trials, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, trial_ends_at, trial_emails_sent')
    .eq('plan', 'trial')
    .eq('status', 'active')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', new Date(now.getTime() + 4 * 86_400_000).toISOString());

  if (error) {
    console.error('[cron/trial-emails] query failed:', error);
    return NextResponse.json({ error: 'query failed' }, { status: 500 });
  }

  const sent: string[] = [];

  for (const sub of trials || []) {
    const ends = new Date(sub.trial_ends_at);
    const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / 86_400_000);
    const tag = daysLeft <= 1 ? '1d' : daysLeft <= 3 ? '3d' : null;
    if (!tag) continue;

    const already = (sub.trial_emails_sent as string[] | null) || [];
    if (already.includes(tag)) continue;

    // Resolve user email
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
    const email = userRes?.user?.email;
    if (!email) continue;

    const fullName = (userRes?.user?.user_metadata?.full_name as string | undefined) || undefined;

    await sendTrialEndingEmail({ to: email, name: fullName, daysLeft });

    await supabaseAdmin
      .from('subscriptions')
      .update({ trial_emails_sent: [...already, tag] })
      .eq('user_id', sub.user_id);

    sent.push(`${email} (${tag})`);
  }

  // Same cron also flips expired trials to status='canceled' so other code paths
  // (and the UI) reflect the expiry without waiting for a lazy check.
  const { data: expired } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('plan', 'trial')
    .eq('status', 'active')
    .lt('trial_ends_at', now.toISOString())
    .select('user_id');

  return NextResponse.json({
    ok: true,
    emailsSent: sent,
    expiredTrials: expired?.length || 0,
  });
}
