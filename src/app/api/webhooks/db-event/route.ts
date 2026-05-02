import { NextRequest, NextResponse } from 'next/server';
import { sendFounderAlert, type FounderAlertType } from '@/lib/founder-alerts';

/**
 * POST /api/webhooks/db-event
 *
 * Receives Database Webhooks (Supabase / pg_net) emitted by triggers on
 * subscriptions, wholesale_orders, audit_log, etc. Authenticates with a
 * shared secret in the X-DB-Webhook-Secret header (compared in constant
 * time against DB_WEBHOOK_SECRET env var).
 *
 * Body shape (set by `notify_founder()` in pg_cron migrations):
 *   { event: 'subscription_change' | 'wholesale_order_new' | 'audit_high_severity' | 'signup_spike' | 'cron_failed',
 *     data: jsonb }
 *
 * Maps the event onto a FounderAlertType + a one-line subject + body, and
 * dispatches the email through Resend. Returns 204 even on alert failures
 * so the database trigger is never blocked by an email outage.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.DB_WEBHOOK_SECRET;
  if (!expected) {
    console.error('[db-event] DB_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const got = req.headers.get('x-db-webhook-secret');
  if (!got || !timingSafeEqual(got, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { event?: string; data?: Record<string, unknown> };
  try {
    body = (await req.json()) as { event?: string; data?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event;
  const data = body.data ?? {};
  if (!event) {
    return NextResponse.json({ error: 'event missing' }, { status: 400 });
  }

  try {
    switch (event) {
      case 'subscription_change': {
        const plan = (data.plan as string) ?? '?';
        const status = (data.status as string) ?? '?';
        const email = (data.email as string) ?? (data.user_id as string) ?? 'unknown';

        if (status === 'canceled' || status === 'unpaid') {
          await sendFounderAlert({
            type: 'subscription_canceled',
            subject: `Cancellation — ${email}`,
            body: `Plan ${plan} → status ${status}.`,
            data,
          });
        } else if (plan && plan !== 'trial') {
          await sendFounderAlert({
            type: 'subscription_new',
            subject: `New ${plan} subscription — ${email}`,
            body: `Status ${status}.`,
            data,
          });
        }
        break;
      }

      case 'subscription_refunded':
        await sendFounderAlert({
          type: 'subscription_refunded',
          subject: `Refund processed — ${(data.email as string) ?? 'unknown'}`,
          body: `Amount ${(data.amount as string) ?? '?'}. Reason ${(data.reason as string) ?? '—'}.`,
          data,
        });
        break;

      case 'wholesale_order_new':
        await sendFounderAlert({
          type: 'wholesale_order_new',
          subject: `Wholesale order — ${(data.collection_plan_id as string) ?? 'unknown collection'}`,
          body: `${(data.skus_count as number) ?? '?'} SKUs · €${(data.total_amount as number) ?? '?'}.`,
          data,
        });
        break;

      case 'audit_high_severity':
        await sendFounderAlert({
          type: 'audit_high_severity',
          subject: `Audit alert — ${(data.action as string) ?? 'unknown action'}`,
          body: `User ${(data.user_id as string) ?? 'unknown'} · ${(data.message as string) ?? ''}`,
          data,
        });
        break;

      case 'signup_spike':
        await sendFounderAlert({
          type: 'signup_spike',
          subject: `Signup spike — ${(data.count as number) ?? '?'} in last hour`,
          body: `Threshold crossed (10/hour). Possible bot or organic spike — review.`,
          data,
        });
        break;

      case 'cron_failed':
        await sendFounderAlert({
          type: 'cron_failed',
          subject: `Cron failed — ${(data.jobname as string) ?? 'unknown'}`,
          body: `${(data.failures as number) ?? '?'} consecutive failures. Last error: ${(data.last_error as string) ?? '—'}.`,
          data,
        });
        break;

      default:
        console.warn('[db-event] unknown event type', event);
        return NextResponse.json({ ignored: true, event }, { status: 202 });
    }
  } catch (e) {
    console.error('[db-event] alert handler threw', { event, error: e });
    // Still 204 — we don't want pg_net retrying forever and clogging the queue.
  }

  return new NextResponse(null, { status: 204 });
}

/** Constant-time string compare. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
