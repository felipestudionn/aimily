/**
 * Transactional email senders — Resend.
 *
 * Soft-fails: missing RESEND_API_KEY logs a warning and returns null
 * so signup/billing flows never break on email errors.
 *
 * Design system: editorial dark (carbon background, crema text, serif
 * headline, system sans body, pill CTA, "That's all." sign-off). Every
 * customer-facing email shares the same shell via wrapEditorialDarkEmail.
 */
import { Resend } from 'resend';

const FROM = 'aimily <hello@aimily.app>';
const REPLY_TO = 'hello@aimily.app';

const LOGO_WHITE_URL = 'https://www.aimily.app/images/aimily-logo-white.png';

const COLOR_BG = '#282A29';
const COLOR_FG = '#FAEFE0';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing — email skipped');
    return null;
  }
  return new Resend(key);
}

/* ──────────────────────────────────────────────────────────────────
   Editorial dark email shell — used by every customer-facing email.

   - Carbon (#282A29) background full-bleed
   - aimily logo white centered at top
   - Serif headline (Georgia fallback — system serif, not webfont, so
     Gmail / Apple Mail / Outlook all render without webfont fetch)
   - Crema body with opacity layers for hierarchy
   - Pill CTA with crema bg + carbon text (inverted from the in-app pill)
   - Personal note in italic + minimal footer with "That's all." sign-off
   - Tables for layout — robust across clients including Outlook desktop

   Inputs:
     - greeting: "Hi Felipe,"  (already i18n'd / personalised)
     - headline: serif H1 (e.g. "Welcome to aimily.")
     - bodyHtml: the unique middle content for this email type
     - ctaLabel + ctaHref: the pill button
     - personalNote: optional italic note above the divider
     - signoff: 'thats-all' | 'felipe' (default felipe)
   ────────────────────────────────────────────────────────────────── */

interface ShellParams {
  greeting: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  personalNote?: string;
  signoff?: 'thats-all' | 'felipe';
}

function wrapEditorialDarkEmail({
  greeting,
  headline,
  bodyHtml,
  ctaLabel,
  ctaHref,
  personalNote,
  signoff = 'felipe',
}: ShellParams): string {
  const signoffBlock =
    signoff === 'thats-all'
      ? `
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.6;color:${COLOR_FG};opacity:0.55;font-style:italic;margin:0 0 4px 0;letter-spacing:-0.01em;">That's all.</p>
        <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.4;margin:18px 0 0 0;">Felipe · Founder, aimily</p>
        <p style="font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.28;margin:6px 0 0 0;">Built by StudioNN — a fashion agency, not a startup that heard about fashion.</p>
      `
      : `
        <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.45;font-style:italic;margin:0 0 4px 0;">Felipe</p>
        <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.45;margin:0 0 4px 0;">Founder, aimily</p>
        <p style="font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.3;margin:12px 0 0 0;">Built by StudioNN — a fashion agency, not a startup that heard about fashion.</p>
      `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <title>aimily</title>
</head>
<body style="background:${COLOR_BG};color:${COLOR_FG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!-- Outer wrapper, carbon full-bleed -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR_BG};width:100%;">
    <tr>
      <td align="center" style="padding:60px 24px;background:${COLOR_BG};">
        <!-- Inner container, max 600px -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 56px 0;">
              <img src="${LOGO_WHITE_URL}" alt="aimily" width="120" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;opacity:0.95;"/>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding:0 0 36px 0;">
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:42px;font-weight:300;color:${COLOR_FG};letter-spacing:-0.03em;line-height:1.08;margin:0;">${headline}</h1>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding:0 0 18px 0;">
              <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0;">${greeting}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 0 40px 0;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 0 56px 0;">
              <a href="${ctaHref}" style="display:inline-block;background:${COLOR_FG};color:${COLOR_BG};padding:16px 40px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:-0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${ctaLabel}</a>
            </td>
          </tr>
          ${
            personalNote
              ? `<tr>
            <td style="padding:0 0 32px 0;">
              <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.65;margin:0;font-style:italic;">${personalNote}</p>
            </td>
          </tr>`
              : ''
          }
          <!-- Divider -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <div style="height:1px;background:rgba(250,239,224,0.12);width:64px;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <!-- Signoff / footer -->
          <tr>
            <td style="padding:0 0 60px 0;">
              ${signoffBlock}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/* ──────────────────────────────────────────────────────────────────
   1. Welcome — Day 0 (signup confirmation)
   ────────────────────────────────────────────────────────────────── */

export interface WelcomeEmailParams {
  to: string;
  name?: string;
  /** When set, prepends to the subject. Use for preview/test sends so Felipe can distinguish from real production emails. */
  _previewSubjectPrefix?: string;
}

export async function sendWelcomeEmail({ to, name, _previewSubjectPrefix }: WelcomeEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const subject = `${_previewSubjectPrefix ?? ''}Welcome to aimily — your 14 days start now`;

  const stepsHtml = [
    {
      n: '01.',
      title: 'Start a collection',
      desc: 'Pick a season, name your idea. The brief takes ~2 min.',
    },
    {
      n: '02.',
      title: 'Drop a moodboard',
      desc: 'Paste 4–6 references. The AI extracts colours, materials, mood.',
    },
    {
      n: '03.',
      title: 'Generate your first sketch',
      desc: 'Click any product, upload a photo, let aimily turn it into a fashion flat.',
    },
  ]
    .map(
      ({ n, title, desc }, i, arr) => `
      <tr>
        <td style="padding:${i === 0 ? '28px' : '0'} 28px ${i === arr.length - 1 ? '28px' : '20px'} 28px;">
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${COLOR_FG};opacity:0.4;letter-spacing:0.05em;margin:0 0 8px 0;">${n}</p>
          <p style="font-size:15px;line-height:1.6;color:${COLOR_FG};opacity:0.95;margin:0 0 4px 0;font-weight:500;">${title}</p>
          <p style="font-size:14px;line-height:1.6;color:${COLOR_FG};opacity:0.6;margin:0;">${desc}</p>
        </td>
      </tr>`,
    )
    .join('');

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 28px 0;">
      You just got 14 days of full access to the platform we built for fashion brands at <strong style="color:${COLOR_FG};opacity:1;font-weight:600;">StudioNN</strong>. Same models, same quality, no card required.
    </p>

    <!-- Section eyebrow -->
    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 16px 0;">Three things to try first</p>

    <!-- Steps box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
      ${stepsHtml}
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: `Hi ${firstName},`,
    headline: 'Welcome to aimily.',
    bodyHtml,
    ctaLabel: 'Open aimily →',
    ctaHref: 'https://www.aimily.app/my-collections',
    personalNote:
      "Stuck? Reply to this email. Felipe (founder) will personally help you out — that's how we run things.",
    signoff: 'felipe',
  });

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

/* ──────────────────────────────────────────────────────────────────
   2. Trial ending — fires at T-3 days and T-1 day
   ────────────────────────────────────────────────────────────────── */

export interface TrialEndingEmailParams {
  to: string;
  name?: string;
  daysLeft: number;
  /** When set, prepends to the subject. Used by scripts/email-preview.ts. */
  _previewSubjectPrefix?: string;
}

export async function sendTrialEndingEmail({ to, name, daysLeft, _previewSubjectPrefix }: TrialEndingEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const baseSubject = daysLeft <= 1 ? 'Your aimily trial ends tomorrow' : `Your aimily trial ends in ${daysLeft} days`;
  const subject = `${_previewSubjectPrefix ?? ''}${baseSubject}`;

  const headline = daysLeft <= 1 ? 'Your trial ends tomorrow.' : `${daysLeft} days left in your trial.`;

  // Three plans rendered as stacked cards. Same visual language as the
  // landing /pricing section — Starter, Professional, Professional Max.
  // Professional carries a small "Most chosen" eyebrow but no aggressive
  // recommended badge — the user picks what fits their stage.
  const planCardsHtml = [
    {
      name: 'Starter',
      eyebrow: 'For first projects',
      price: '€159',
      cadence: '/mo · annual',
      monthly: 'or €199 monthly',
      bullets: ['200 imagery generations', '1 seat', 'All four blocks unlocked'],
    },
    {
      name: 'Professional',
      eyebrow: 'Most chosen',
      price: '€479',
      cadence: '/mo · annual',
      monthly: 'or €599 monthly',
      bullets: ['1,000 imagery generations', '5 seats', 'AI video unlocked'],
    },
    {
      name: 'Professional Max',
      eyebrow: 'For studios',
      price: '€1,199',
      cadence: '/mo · annual',
      monthly: 'or €1,499 monthly',
      bullets: ['3,000 imagery generations', '25 seats', 'API access + SSO'],
    },
  ]
    .map(
      (plan, i) => `
      <tr>
        <td style="padding:${i === 0 ? '0' : '12px'} 0 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
            <tr>
              <td style="padding:24px 28px;">
                <p style="font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${COLOR_FG};opacity:0.5;margin:0 0 10px 0;">${plan.eyebrow}</p>
                <p style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:300;color:${COLOR_FG};letter-spacing:-0.02em;line-height:1.1;margin:0 0 6px 0;">${plan.name}</p>
                <p style="margin:0 0 6px 0;">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;color:${COLOR_FG};letter-spacing:-0.02em;">${plan.price}</span>
                  <span style="font-size:14px;color:${COLOR_FG};opacity:0.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${plan.cadence}</span>
                </p>
                <p style="font-size:12px;color:${COLOR_FG};opacity:0.4;margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${plan.monthly}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${plan.bullets
                    .map(
                      (b) => `
                  <tr>
                    <td style="padding:3px 0;">
                      <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.7;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">— ${b}</p>
                    </td>
                  </tr>`,
                    )
                    .join('')}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `,
    )
    .join('');

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 32px 0;">
      Quick heads-up: your aimily trial expires soon. Pick the plan that fits where you are right now — they all use the same top-quality models, so you're not trading capability for price.
    </p>

    <!-- Section eyebrow -->
    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 18px 0;">Three plans · annual price shown</p>

    <!-- Three stacked plan cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${planCardsHtml}
    </table>

    <!-- Hint about credits -->
    <p style="font-size:13px;line-height:1.7;color:${COLOR_FG};opacity:0.5;margin:24px 0 0 0;">Need a one-off boost without changing plan? Aimily Credit packs (€29 / €119 / €399) top up imagery for the busy month and don't expire while you're subscribed.</p>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: `Hi ${firstName},`,
    headline,
    bodyHtml,
    ctaLabel: 'Choose a plan →',
    ctaHref: 'https://www.aimily.app/pricing',
    signoff: 'thats-all',
  });

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
