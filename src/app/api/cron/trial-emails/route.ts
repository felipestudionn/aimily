import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  sendTrialEndingEmail,
  sendTwoDaysInEmail,
  sendHalfwayEmail,
  sendTrialExpiredEmail,
} from '@/lib/transactional-emails';

/**
 * Daily cron — drives the full trial email funnel.
 *
 *   D+2  · twoDaysIn      — gentle nudge if no collection started yet
 *   D+7  · halfway        — mid-trial check-in for everyone still on trial
 *   D-3  · trialEnding    — pick a plan, 3 plans shown
 *   D-1  · trialEnding    — pick a plan, last call
 *   D+14 · trialExpired   — fired on the transition active → canceled
 *
 * Idempotent via `subscriptions.trial_emails_sent` JSONB array. Tags used:
 *   '2d', '7d', '3d', '1d', 'expired'.
 *
 * Verifies CRON_SECRET to block public invocation.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const sent: string[] = [];

  /* ──────────────────────────────────────────────────────────────
     D+2 (twoDaysIn) and D+7 (halfway) — pull active trials by age
     ────────────────────────────────────────────────────────────── */

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const { data: activeTrials, error: activeErr } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, created_at, trial_emails_sent')
    .eq('plan', 'trial')
    .eq('status', 'active')
    .gte('created_at', fourteenDaysAgo);

  if (activeErr) {
    console.error('[cron/trial-emails] active query failed:', activeErr);
  }

  for (const sub of activeTrials || []) {
    const ageMs = now.getTime() - new Date(sub.created_at).getTime();
    const ageDays = Math.floor(ageMs / 86_400_000);

    const tag = ageDays === 2 ? '2d' : ageDays === 7 ? '7d' : null;
    if (!tag) continue;

    const already = (sub.trial_emails_sent as string[] | null) || [];
    if (already.includes(tag)) continue;

    // D+2 only fires if the user hasn't started a collection yet — sending
    // it to someone who already has a collection would be tone-deaf.
    if (tag === '2d') {
      const { count } = await supabaseAdmin
        .from('collection_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sub.user_id);
      if ((count ?? 0) > 0) {
        // Mark as 'skipped:2d' so we don't keep checking on subsequent runs.
        await supabaseAdmin
          .from('subscriptions')
          .update({ trial_emails_sent: [...already, '2d:skipped'] })
          .eq('user_id', sub.user_id);
        continue;
      }
    }

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
    const email = userRes?.user?.email;
    if (!email) continue;

    const fullName = (userRes?.user?.user_metadata?.full_name as string | undefined) || undefined;
    const locale = (userRes?.user?.user_metadata?.language as string | undefined) || null;

    if (tag === '2d') {
      await sendTwoDaysInEmail({ to: email, name: fullName, locale });
    } else if (tag === '7d') {
      await sendHalfwayEmail({ to: email, name: fullName, locale });
    }

    await supabaseAdmin
      .from('subscriptions')
      .update({ trial_emails_sent: [...already, tag] })
      .eq('user_id', sub.user_id);

    sent.push(`${email} (${tag})`);
  }

  /* ──────────────────────────────────────────────────────────────
     D-3 / D-1 (trialEnding) — pull active trials ending soon
     ────────────────────────────────────────────────────────────── */

  const { data: trials, error: trialsErr } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, trial_ends_at, trial_emails_sent')
    .eq('plan', 'trial')
    .eq('status', 'active')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', new Date(now.getTime() + 4 * 86_400_000).toISOString());

  if (trialsErr) {
    console.error('[cron/trial-emails] trials query failed:', trialsErr);
  }

  for (const sub of trials || []) {
    const ends = new Date(sub.trial_ends_at);
    const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / 86_400_000);
    const tag = daysLeft <= 1 ? '1d' : daysLeft <= 3 ? '3d' : null;
    if (!tag) continue;

    const already = (sub.trial_emails_sent as string[] | null) || [];
    if (already.includes(tag)) continue;

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
    const email = userRes?.user?.email;
    if (!email) continue;

    const fullName = (userRes?.user?.user_metadata?.full_name as string | undefined) || undefined;
    const locale = (userRes?.user?.user_metadata?.language as string | undefined) || null;

    await sendTrialEndingEmail({ to: email, name: fullName, daysLeft, locale });

    await supabaseAdmin
      .from('subscriptions')
      .update({ trial_emails_sent: [...already, tag] })
      .eq('user_id', sub.user_id);

    sent.push(`${email} (${tag})`);
  }

  /* ──────────────────────────────────────────────────────────────
     D+14 (trialExpired) — flip expired trials to canceled AND fire
     the post-expiration email atomically per row. We do the read
     first (so we still have the previous trial_emails_sent), then
     an update keyed on user_id to perform the transition.
     ────────────────────────────────────────────────────────────── */

  const { data: expiringRows } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, trial_emails_sent')
    .eq('plan', 'trial')
    .eq('status', 'active')
    .lt('trial_ends_at', now.toISOString());

  let expiredCount = 0;
  for (const row of expiringRows || []) {
    const already = (row.trial_emails_sent as string[] | null) || [];

    // Flip to canceled — same as before, just per-row so we can also send
    // the trial-expired email idempotently.
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: now.toISOString() })
      .eq('user_id', row.user_id)
      .eq('plan', 'trial')
      .eq('status', 'active');
    expiredCount += 1;

    if (already.includes('expired')) continue;

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
    const email = userRes?.user?.email;
    if (!email) continue;

    const fullName = (userRes?.user?.user_metadata?.full_name as string | undefined) || undefined;
    const locale = (userRes?.user?.user_metadata?.language as string | undefined) || null;

    await sendTrialExpiredEmail({ to: email, name: fullName, locale });

    await supabaseAdmin
      .from('subscriptions')
      .update({ trial_emails_sent: [...already, 'expired'] })
      .eq('user_id', row.user_id);

    sent.push(`${email} (expired)`);
  }

  return NextResponse.json({
    ok: true,
    emailsSent: sent,
    expiredTrials: expiredCount,
  });
}
