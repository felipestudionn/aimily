/**
 * Slack alerts — incoming webhook in parallel to Resend (founder-alerts.ts).
 *
 * Why two channels: email arrives in the inbox eventually, Slack hits the
 * phone instantly. If Resend has an outage, Slack still fires; if Slack
 * hits a 429 burst, the email is the durable record. Defense in depth.
 *
 * Soft-fail on missing SLACK_WEBHOOK_URL: a webhook handler must never
 * throw because an alert sender misbehaved. Logs and returns null.
 *
 * Source of truth for Block Kit:
 *   https://docs.slack.dev/reference/block-kit
 *   https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
 */

import type { FounderAlertType } from './founder-alerts';

const TYPE_LABEL: Record<FounderAlertType, string> = {
  subscription_new: 'New subscription',
  subscription_canceled: 'Subscription canceled',
  subscription_refunded: 'Refund processed',
  wholesale_order_new: 'New wholesale order',
  audit_high_severity: 'High-severity audit',
  cron_failed: 'Cron failed',
  signup_spike: 'Signup spike',
};

const TYPE_EMOJI: Record<FounderAlertType, string> = {
  subscription_new: ':moneybag:',
  subscription_canceled: ':warning:',
  subscription_refunded: ':arrows_counterclockwise:',
  wholesale_order_new: ':package:',
  audit_high_severity: ':rotating_light:',
  cron_failed: ':x:',
  signup_spike: ':rocket:',
};

export interface SlackAlertPayload {
  type: FounderAlertType;
  /** One-line summary — becomes the bold title of the Slack message. */
  subject: string;
  /** Plain text body — rendered as mrkdwn under the title. */
  body: string;
  /** Optional structured data — rendered as monospace block. */
  data?: Record<string, unknown>;
  /**
   * Optional deep-link URL to surface as a "View in aimily" button.
   * Should be an absolute URL on aimily.app (validated against allowlist
   * by Slack itself — Slack accepts max 3000 chars).
   */
  link?: string;
  /** Optional CTA label (default "View in aimily"). */
  linkLabel?: string;
}

/**
 * Send a Slack alert via incoming webhook. Returns ok/null/error info
 * so callers can log without throwing. Never throws.
 */
export async function sendSlackAlert(p: SlackAlertPayload): Promise<{ ok: boolean; reason?: string }> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn('[slack-alerts] SLACK_WEBHOOK_URL missing — alert skipped');
    return { ok: false, reason: 'no_webhook_url' };
  }

  const label = TYPE_LABEL[p.type];
  const emoji = TYPE_EMOJI[p.type];

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ${label}`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${escapeMrkdwn(p.subject)}*\n${escapeMrkdwn(p.body)}` },
    },
  ];

  if (p.data && Object.keys(p.data).length > 0) {
    const dataText = '```\n' + JSON.stringify(p.data, null, 2).slice(0, 2500) + '\n```';
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: dataText },
    });
  }

  if (p.link) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: p.linkLabel ?? 'View in aimily', emoji: true },
          url: p.link.slice(0, 3000),
          action_id: `view_${p.type}`,
        },
      ],
    });
  }

  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: '_aimily backend · automated alert_' }] });

  const body = {
    // Fallback text for notifications and accessibility — Slack requires this.
    text: `${label}: ${p.subject}`,
    blocks,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Slack webhooks are fast — 5s ceiling is plenty.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[slack-alerts] non-200 response', { status: res.status, body: text.slice(0, 200) });
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('[slack-alerts] send failed', { type: p.type, error: e });
    return { ok: false, reason: 'fetch_error' };
  }
}

/**
 * Escape Slack mrkdwn so user-controlled text can't break out of the
 * message structure. Slack's mrkdwn is forgiving but the three
 * characters that confuse most often are *, _, and `. We also strip
 * angle brackets so injected URLs stay literal.
 */
function escapeMrkdwn(s: string): string {
  return s.replace(/[<>]/g, '').replace(/([*_`])/g, '\\$1');
}
