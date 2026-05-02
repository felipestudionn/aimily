/**
 * Founder alerts — Resend email to hello@aimily.app for high-signal events.
 *
 * Triggered by:
 *   - Database Webhooks via /api/webhooks/db-event (DB rows changing)
 *   - pg_cron jobs that detect aggregate conditions (10+ signups/hour)
 *   - Application code that wants to surface a one-off event
 *
 * Soft-fails: a missing RESEND_API_KEY logs and returns null, never throws —
 * a webhook handler should never block a database transaction because the
 * notification email failed to send.
 */
import { Resend } from 'resend';

const FROM = 'aimily alerts <hello@aimily.app>';
const TO = 'hello@aimily.app';

export type FounderAlertType =
  | 'subscription_new'        // new paying subscription
  | 'subscription_canceled'   // subscription canceled
  | 'subscription_refunded'   // refund processed
  | 'wholesale_order_new'     // first wholesale order received
  | 'audit_high_severity'     // audit_log row with severity high
  | 'cron_failed'             // a scheduled job has failed twice
  | 'signup_spike';           // 10+ signups in one hour

export interface FounderAlertPayload {
  type: FounderAlertType;
  /** One-line summary that becomes the email subject — keep under 80 chars. */
  subject: string;
  /** Plain text body. HTML is generated from this — keep it short. */
  body: string;
  /** Optional structured data shown in a monospace block at the bottom. */
  data?: Record<string, unknown>;
}

let _resend: Resend | null | undefined;
function getResend(): Resend | null {
  if (_resend !== undefined) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[founder-alerts] RESEND_API_KEY missing — alert skipped');
    _resend = null;
    return null;
  }
  _resend = new Resend(key);
  return _resend;
}

const TYPE_LABEL: Record<FounderAlertType, string> = {
  subscription_new: 'New subscription',
  subscription_canceled: 'Subscription canceled',
  subscription_refunded: 'Refund processed',
  wholesale_order_new: 'New wholesale order',
  audit_high_severity: 'High-severity audit event',
  cron_failed: 'Cron job failed',
  signup_spike: 'Signup spike',
};

export async function sendFounderAlert(p: FounderAlertPayload): Promise<{ id: string } | null> {
  const resend = getResend();
  if (!resend) return null;

  const label = TYPE_LABEL[p.type];
  const dataBlock = p.data
    ? `<pre style="background:#f6f5f0;border-radius:8px;padding:14px;font-size:12px;line-height:1.5;color:#282A29;overflow-x:auto;">${escapeHtml(
        JSON.stringify(p.data, null, 2),
      )}</pre>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff6dc;margin:0;padding:32px 16px;color:#282A29;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px 32px;">
    <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#282A29;opacity:0.5;margin-bottom:8px;">${label}</div>
    <div style="font-size:22px;font-weight:500;letter-spacing:-0.02em;margin-bottom:20px;color:#282A29;">${escapeHtml(p.subject)}</div>
    <div style="font-size:14px;line-height:1.6;color:#282A29;white-space:pre-wrap;">${escapeHtml(p.body)}</div>
    ${dataBlock}
    <hr style="border:none;border-top:1px solid rgba(40,42,41,0.08);margin:28px 0 16px 0;"/>
    <div style="font-size:11px;color:#282A29;opacity:0.4;">Sent automatically by aimily backend. Do not reply.</div>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: TO,
      subject: `[aimily] ${p.subject}`,
      html,
      replyTo: TO,
    });
    return result.data ? { id: result.data.id } : null;
  } catch (e) {
    console.error('[founder-alerts] send failed', { type: p.type, error: e });
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
