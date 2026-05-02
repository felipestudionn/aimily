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

/* ──────────────────────────────────────────────────────────────────
   3. Two days in — gentle nudge if the user hasn't started a collection
   ────────────────────────────────────────────────────────────────── */

export interface TwoDaysInEmailParams {
  to: string;
  name?: string;
  _previewSubjectPrefix?: string;
}

export async function sendTwoDaysInEmail({ to, name, _previewSubjectPrefix }: TwoDaysInEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const subject = `${_previewSubjectPrefix ?? ''}Two days in. How's it going?`;

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 24px 0;">
      No pressure — just checking in. I noticed you haven't started a collection yet, and the collection is the door to everything else aimily does. Brand work, range plans, sketches, marketing — they all flow from one collection record.
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 18px 0;">Why a collection first</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
      <tr>
        <td style="padding:24px 28px;">
          <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.75;margin:0 0 12px 0;">— A season + a name. Two minutes of input.</p>
          <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.75;margin:0 0 12px 0;">— After that, every block (Brand, Range Plan, Design, Marketing) reads from the same source — you don't repeat yourself.</p>
          <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.75;margin:0;">— You can rename or delete it later. Nothing is committed.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: `Hi ${firstName},`,
    headline: 'Two days in.',
    bodyHtml,
    ctaLabel: 'Start a collection →',
    ctaHref: 'https://www.aimily.app/new-collection',
    personalNote: "If something is in the way — a confusing screen, a missing feature, an idea you can't shape yet — just hit reply. I read everything.",
    signoff: 'felipe',
  });

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html });
    if (error) {
      console.error('[email] two-days-in failed:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[email] two-days-in threw:', err);
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────
   4. Halfway there — mid-trial (Day 7) check-in for everyone
   ────────────────────────────────────────────────────────────────── */

export interface HalfwayEmailParams {
  to: string;
  name?: string;
  _previewSubjectPrefix?: string;
}

export async function sendHalfwayEmail({ to, name, _previewSubjectPrefix }: HalfwayEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const subject = `${_previewSubjectPrefix ?? ''}Halfway through your trial.`;

  const featuresHtml = [
    {
      eyebrow: 'A',
      title: 'Aimily Assistant',
      desc: 'Press ⌘K (Cmd+K on Mac, Ctrl+K on Windows) anywhere inside aimily. The assistant explains how every block works and answers fashion-industry questions — BOM, range plan, tier mix, drop, MOQ. Editorial calm, no AI bro talk.',
    },
    {
      eyebrow: 'B',
      title: 'Calendar mode',
      desc: 'Click Calendar in the sidebar. The same 20 slots stretch sideways as a horizontal timeline. Drag, edit milestones, see the full season at once. Click any bar to jump back to its workspace.',
    },
    {
      eyebrow: 'C',
      title: 'Presentation mode',
      desc: 'Click Presentation. Twenty-one slides materialise from your Collection Intelligence — auto-filled, ten themes to choose from, exportable to PDF, shareable with a public link. No PowerPoint required.',
    },
  ]
    .map(
      (f, i, arr) => `
      <tr>
        <td style="padding:${i === 0 ? '24px' : '8px'} 28px ${i === arr.length - 1 ? '24px' : '8px'} 28px;">
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${COLOR_FG};opacity:0.45;letter-spacing:0.05em;margin:0 0 6px 0;">${f.eyebrow}.</p>
          <p style="font-size:15px;line-height:1.6;color:${COLOR_FG};opacity:0.95;margin:0 0 6px 0;font-weight:500;">${f.title}</p>
          <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.6;margin:0;">${f.desc}</p>
        </td>
      </tr>`,
    )
    .join('');

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 28px 0;">
      Seven days in, seven left. Quick recap of three things most people miss in their first week — none of them obvious from the sidebar.
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 16px 0;">Hidden corners worth opening</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
      ${featuresHtml}
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: `Hi ${firstName},`,
    headline: 'Halfway through.',
    bodyHtml,
    ctaLabel: 'Open aimily →',
    ctaHref: 'https://www.aimily.app/my-collections',
    personalNote: "Tried any of the three above? Reply and tell me which clicked — your answer is honestly useful for everyone who comes after you.",
    signoff: 'felipe',
  });

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html });
    if (error) {
      console.error('[email] halfway failed:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[email] halfway threw:', err);
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────
   5. Trial expired — Day 14, gentle, "everything is still there"
   ────────────────────────────────────────────────────────────────── */

export interface TrialExpiredEmailParams {
  to: string;
  name?: string;
  _previewSubjectPrefix?: string;
}

export async function sendTrialExpiredEmail({ to, name, _previewSubjectPrefix }: TrialExpiredEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const firstName = name?.split(' ')[0] || 'there';
  const subject = `${_previewSubjectPrefix ?? ''}Your aimily trial ended · everything is still here`;

  // Same three plan cards as the trial-ending email so the user can reactivate
  // by picking the plan that fits — no pressure, no "limited offer".
  const planCardsHtml = [
    {
      name: 'Starter',
      eyebrow: 'For first projects',
      price: '€159',
      cadence: '/mo · annual',
      bullets: ['200 imagery generations', '1 seat', 'All four blocks unlocked'],
    },
    {
      name: 'Professional',
      eyebrow: 'Most chosen',
      price: '€479',
      cadence: '/mo · annual',
      bullets: ['1,000 imagery generations', '5 seats', 'AI video unlocked'],
    },
    {
      name: 'Professional Max',
      eyebrow: 'For studios',
      price: '€1,199',
      cadence: '/mo · annual',
      bullets: ['3,000 imagery generations', '25 seats', 'API access + SSO'],
    },
  ]
    .map(
      (plan, i) => `
      <tr>
        <td style="padding:${i === 0 ? '0' : '12px'} 0 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
            <tr>
              <td style="padding:22px 26px;">
                <p style="font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${COLOR_FG};opacity:0.5;margin:0 0 8px 0;">${plan.eyebrow}</p>
                <p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:300;color:${COLOR_FG};letter-spacing:-0.02em;line-height:1.1;margin:0 0 6px 0;">${plan.name}</p>
                <p style="margin:0 0 12px 0;">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:300;color:${COLOR_FG};letter-spacing:-0.02em;">${plan.price}</span>
                  <span style="font-size:13px;color:${COLOR_FG};opacity:0.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${plan.cadence}</span>
                </p>
                ${plan.bullets
                  .map(
                    (b) => `<p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.7;margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">— ${b}</p>`,
                  )
                  .join('')}
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join('');

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 22px 0;">
      Your 14 days finished today. Nothing of yours has been touched: your collections, your moodboards, your CIS facts, your sketches — all of it is still there waiting, exactly as you left it.
    </p>

    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 32px 0;">
      Pick a plan whenever you're ready and your work picks up where it stopped. No re-import, no setup again, no lost moodboard.
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 18px 0;">Three plans · annual price shown</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${planCardsHtml}
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: `Hi ${firstName},`,
    headline: 'Your trial ended.',
    bodyHtml,
    ctaLabel: 'Reactivate aimily →',
    ctaHref: 'https://www.aimily.app/pricing',
    personalNote: "Or reply to this email and tell me what you'd want different — what was missing, what was confusing, what you wished it did. I'm building this with you, not at you.",
    signoff: 'thats-all',
  });

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html });
    if (error) {
      console.error('[email] trial-expired failed:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[email] trial-expired threw:', err);
    return null;
  }
}
