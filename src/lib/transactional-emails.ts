/**
 * Transactional email senders — Resend.
 *
 * Soft-fails: missing RESEND_API_KEY logs a warning and returns null
 * so signup/billing flows never break on email errors.
 */
import { Resend } from 'resend';

const FROM = 'aimily <hello@aimily.app>';
const REPLY_TO = 'hello@aimily.app';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing — email skipped');
    return null;
  }
  return new Resend(key);
}

export interface WelcomeEmailParams {
  to: string;
  name?: string;
}

export async function sendWelcomeEmail({ to, name }: WelcomeEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const subject = "Welcome to aimily — your 14 days start now";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff6dc; margin: 0; padding: 40px 20px; color: #282A29;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 48px 40px;">
    <div style="font-size: 28px; font-weight: 300; letter-spacing: -0.03em; margin-bottom: 24px;">Welcome to aimily.</div>

    <p style="font-size: 16px; line-height: 1.6; color: #282A29;">Hi ${firstName},</p>

    <p style="font-size: 16px; line-height: 1.6; color: #282A29;">
      You just got 14 days of full access to the platform we built for fashion brands at <strong>StudioNN</strong>.
      Same models, same quality, no card required.
    </p>

    <p style="font-size: 16px; line-height: 1.6; color: #282A29; margin-top: 24px;">
      <strong>Three things to try first:</strong>
    </p>

    <ol style="font-size: 15px; line-height: 1.7; color: #282A29;">
      <li><strong>Start a collection</strong> — pick a season, name your idea. The brief takes ~2 min.</li>
      <li><strong>Drop a moodboard</strong> — paste 4–6 references. The AI extracts colours, materials, mood.</li>
      <li><strong>Generate your first sketch</strong> — click any product, upload a photo, let aimily turn it into a fashion flat.</li>
    </ol>

    <div style="text-align: center; margin: 36px 0;">
      <a href="https://www.aimily.app/my-collections" style="display: inline-block; background: #282A29; color: #fff6dc; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 500; font-size: 14px;">
        Open aimily →
      </a>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #282A29; opacity: 0.7;">
      Stuck? Reply to this email. Felipe (founder) will personally help you out — that's how we run things.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(40,42,41,0.1); margin: 32px 0;"/>

    <p style="font-size: 12px; line-height: 1.6; color: #282A29; opacity: 0.5; font-style: italic;">
      Felipe<br/>
      Founder, aimily<br/>
      Built by StudioNN — a fashion agency, not a startup that heard about fashion.
    </p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) {
      console.error('[email] welcome failed:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[email] welcome threw:', err);
    return null;
  }
}

export interface TrialEndingEmailParams {
  to: string;
  name?: string;
  daysLeft: number;
}

export async function sendTrialEndingEmail({ to, name, daysLeft }: TrialEndingEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const subject = daysLeft <= 1
    ? "Your aimily trial ends tomorrow"
    : `Your aimily trial ends in ${daysLeft} days`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff6dc; margin: 0; padding: 40px 20px; color: #282A29;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 48px 40px;">
    <div style="font-size: 24px; font-weight: 300; letter-spacing: -0.03em; margin-bottom: 24px;">
      ${daysLeft <= 1 ? 'Your trial ends tomorrow' : `${daysLeft} days left in your trial`}
    </div>

    <p style="font-size: 16px; line-height: 1.6; color: #282A29;">Hi ${firstName},</p>

    <p style="font-size: 16px; line-height: 1.6; color: #282A29;">
      Quick heads-up: your aimily trial expires soon. Pick a plan to keep generating without interruption.
    </p>

    <div style="background: #fff6dc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Most teams pick Professional:</div>
      <div style="font-size: 13px; color: #282A29; opacity: 0.75; line-height: 1.6;">
        €479/mo (annual) · 1,000 imagery generations · 5 seats · video<br/>
        Same top-quality models on every plan.
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="https://www.aimily.app/pricing" style="display: inline-block; background: #282A29; color: #fff6dc; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 500; font-size: 14px;">
        Choose a plan →
      </a>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #282A29; opacity: 0.7;">
      That's all.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(40,42,41,0.1); margin: 32px 0;"/>

    <p style="font-size: 12px; line-height: 1.6; color: #282A29; opacity: 0.5; font-style: italic;">
      Felipe · Founder, aimily
    </p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) {
      console.error('[email] trial-ending failed:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[email] trial-ending threw:', err);
    return null;
  }
}
