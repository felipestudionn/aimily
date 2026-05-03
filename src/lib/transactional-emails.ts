/**
 * Transactional email senders — Resend.
 *
 * Soft-fails: missing RESEND_API_KEY logs a warning and returns null
 * so signup/billing flows never break on email errors.
 *
 * i18n: every customer-facing string lives in `src/i18n/{locale}.ts` under
 * the `emails` section, resolved here via `getEmailDict(locale)`. Pass the
 * `locale` param when calling — auth/callback reads it from
 * `user.user_metadata.language`, the trial-emails cron does the same.
 *
 * Design system: editorial dark (carbon background, crema text, serif
 * headline, system sans body, pill CTA, "That's all." sign-off). Every
 * customer-facing email shares the same shell via wrapEditorialDarkEmail.
 */
import { Resend } from 'resend';
import { getEmailDict, type EmailDict } from '@/lib/email-i18n';

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

function firstNameFromInputs(name: string | undefined, fallback: string): string {
  return name?.split(' ')[0] || fallback;
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
   ────────────────────────────────────────────────────────────────── */

interface ShellParams {
  greeting: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  personalNote?: string;
  signoff?: 'thats-all' | 'felipe';
  t: EmailDict;
}

function wrapEditorialDarkEmail({
  greeting,
  headline,
  bodyHtml,
  ctaLabel,
  ctaHref,
  personalNote,
  signoff = 'felipe',
  t,
}: ShellParams): string {
  const signoffBlock =
    signoff === 'thats-all'
      ? `
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.6;color:${COLOR_FG};opacity:0.55;font-style:italic;margin:0 0 4px 0;letter-spacing:-0.01em;">${t.common.signoffThatsAll}</p>
        <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.4;margin:18px 0 0 0;">${t.common.signoffFelipe} · ${t.common.signoffFounder}</p>
        <p style="font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.28;margin:6px 0 0 0;">${t.common.studiONN}</p>
      `
      : `
        <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.45;font-style:italic;margin:0 0 4px 0;">${t.common.signoffFelipe}</p>
        <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.45;margin:0 0 4px 0;">${t.common.signoffFounder}</p>
        <p style="font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.3;margin:12px 0 0 0;">${t.common.studiONN}</p>
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
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR_BG};width:100%;">
    <tr>
      <td align="center" style="padding:60px 24px;background:${COLOR_BG};">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 56px 0;">
              <img src="${LOGO_WHITE_URL}" alt="aimily" width="120" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;opacity:0.95;"/>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 36px 0;">
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:42px;font-weight:300;color:${COLOR_FG};letter-spacing:-0.03em;line-height:1.08;margin:0;">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 18px 0;">
              <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0;">${greeting}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 40px 0;">
              ${bodyHtml}
            </td>
          </tr>
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
          <tr>
            <td style="padding:0 0 32px 0;">
              <div style="height:1px;background:rgba(250,239,224,0.12);width:64px;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
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
   Plan card renderer — used by trial-ending + trial-expired emails.
   "Compact" variant trims paddings + drops `monthly` for trial-expired.
   ────────────────────────────────────────────────────────────────── */

function renderPlanCards(t: EmailDict, opts: { compact?: boolean } = {}): string {
  const compact = !!opts.compact;
  const planList = [t.plans.starter, t.plans.professional, t.plans.professionalMax];

  return planList
    .map(
      (plan, i) => `
      <tr>
        <td style="padding:${i === 0 ? '0' : '12px'} 0 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
            <tr>
              <td style="padding:${compact ? '22px 26px' : '24px 28px'};">
                <p style="font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${COLOR_FG};opacity:0.5;margin:0 0 ${compact ? '8px' : '10px'} 0;">${plan.eyebrow}</p>
                <p style="font-family:Georgia,'Times New Roman',serif;font-size:${compact ? '22px' : '24px'};font-weight:300;color:${COLOR_FG};letter-spacing:-0.02em;line-height:1.1;margin:0 0 6px 0;">${plan.name}</p>
                <p style="margin:0 0 ${compact ? '12px' : '6px'} 0;">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:${compact ? '26px' : '30px'};font-weight:300;color:${COLOR_FG};letter-spacing:-0.02em;">${plan.price}</span>
                  <span style="font-size:${compact ? '13px' : '14px'};color:${COLOR_FG};opacity:0.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${t.trialEnding.cadenceAnnual}</span>
                </p>
                ${
                  compact
                    ? ''
                    : `<p style="font-size:12px;color:${COLOR_FG};opacity:0.4;margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${plan.monthly}</p>`
                }
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${[plan.bullet1, plan.bullet2, plan.bullet3]
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
}

/* ──────────────────────────────────────────────────────────────────
   1. Welcome — Day 0 (signup confirmation)
   ────────────────────────────────────────────────────────────────── */

export interface WelcomeEmailParams {
  to: string;
  name?: string;
  /** Locale code (en/es/fr/it/de/pt/nl/sv/no). Falls back to EN if missing. */
  locale?: string | null;
  /** When set, prepends to the subject. Use for preview/test sends. */
  _previewSubjectPrefix?: string;
}

export async function sendWelcomeEmail({ to, name, locale, _previewSubjectPrefix }: WelcomeEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const t = getEmailDict(locale);
  const firstName = firstNameFromInputs(name, t.common.fallbackName);
  const subject = `${_previewSubjectPrefix ?? ''}${t.welcome.subject}`;

  const stepsHtml = [
    { n: '01.', title: t.welcome.step1Title, desc: t.welcome.step1Desc },
    { n: '02.', title: t.welcome.step2Title, desc: t.welcome.step2Desc },
    { n: '03.', title: t.welcome.step3Title, desc: t.welcome.step3Desc },
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
      ${t.welcome.intro}
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 16px 0;">${t.welcome.eyebrowSteps}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
      ${stepsHtml}
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: t.welcome.greeting.replace('{name}', firstName),
    headline: t.welcome.headline,
    bodyHtml,
    ctaLabel: t.welcome.ctaLabel,
    ctaHref: 'https://www.aimily.app/my-collections',
    personalNote: t.welcome.personalNote,
    signoff: 'felipe',
    t,
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
  locale?: string | null;
  _previewSubjectPrefix?: string;
}

export async function sendTrialEndingEmail({ to, name, daysLeft, locale, _previewSubjectPrefix }: TrialEndingEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const t = getEmailDict(locale);
  const firstName = firstNameFromInputs(name, t.common.fallbackName);

  const baseSubject =
    daysLeft <= 1
      ? t.trialEnding.subject1d
      : t.trialEnding.subjectNd.replace('{n}', String(daysLeft));
  const subject = `${_previewSubjectPrefix ?? ''}${baseSubject}`;

  const headline =
    daysLeft <= 1
      ? t.trialEnding.headline1d
      : t.trialEnding.headlineNd.replace('{n}', String(daysLeft));

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 32px 0;">
      ${t.trialEnding.intro}
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 18px 0;">${t.trialEnding.eyebrowPlans}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${renderPlanCards(t)}
    </table>

    <p style="font-size:13px;line-height:1.7;color:${COLOR_FG};opacity:0.5;margin:24px 0 0 0;">${t.trialEnding.creditsHint}</p>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: t.welcome.greeting.replace('{name}', firstName),
    headline,
    bodyHtml,
    ctaLabel: t.trialEnding.ctaLabel,
    ctaHref: 'https://www.aimily.app/pricing',
    signoff: 'thats-all',
    t,
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
   3. Two days in — gentle nudge if no collection started
   ────────────────────────────────────────────────────────────────── */

export interface TwoDaysInEmailParams {
  to: string;
  name?: string;
  locale?: string | null;
  _previewSubjectPrefix?: string;
}

export async function sendTwoDaysInEmail({ to, name, locale, _previewSubjectPrefix }: TwoDaysInEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const t = getEmailDict(locale);
  const firstName = firstNameFromInputs(name, t.common.fallbackName);
  const subject = `${_previewSubjectPrefix ?? ''}${t.twoDaysIn.subject}`;

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 24px 0;">
      ${t.twoDaysIn.intro}
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 18px 0;">${t.twoDaysIn.eyebrow}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
      <tr>
        <td style="padding:24px 28px;">
          <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.75;margin:0 0 12px 0;">— ${t.twoDaysIn.bullet1}</p>
          <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.75;margin:0 0 12px 0;">— ${t.twoDaysIn.bullet2}</p>
          <p style="font-size:14px;line-height:1.7;color:${COLOR_FG};opacity:0.75;margin:0;">— ${t.twoDaysIn.bullet3}</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: t.welcome.greeting.replace('{name}', firstName),
    headline: t.twoDaysIn.headline,
    bodyHtml,
    ctaLabel: t.twoDaysIn.ctaLabel,
    ctaHref: 'https://www.aimily.app/new-collection',
    personalNote: t.twoDaysIn.personalNote,
    signoff: 'felipe',
    t,
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
   4. Halfway through — Day 7 mid-trial check-in
   ────────────────────────────────────────────────────────────────── */

export interface HalfwayEmailParams {
  to: string;
  name?: string;
  locale?: string | null;
  _previewSubjectPrefix?: string;
}

export async function sendHalfwayEmail({ to, name, locale, _previewSubjectPrefix }: HalfwayEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const t = getEmailDict(locale);
  const firstName = firstNameFromInputs(name, t.common.fallbackName);
  const subject = `${_previewSubjectPrefix ?? ''}${t.halfway.subject}`;

  const featuresHtml = [
    { eyebrow: 'A', title: t.halfway.featureATitle, desc: t.halfway.featureADesc },
    { eyebrow: 'B', title: t.halfway.featureBTitle, desc: t.halfway.featureBDesc },
    { eyebrow: 'C', title: t.halfway.featureCTitle, desc: t.halfway.featureCDesc },
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
      ${t.halfway.intro}
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 16px 0;">${t.halfway.eyebrow}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,239,224,0.04);border-radius:16px;border:1px solid rgba(250,239,224,0.08);">
      ${featuresHtml}
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: t.welcome.greeting.replace('{name}', firstName),
    headline: t.halfway.headline,
    bodyHtml,
    ctaLabel: t.halfway.ctaLabel,
    ctaHref: 'https://www.aimily.app/my-collections',
    personalNote: t.halfway.personalNote,
    signoff: 'felipe',
    t,
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
   5. Trial expired — Day 14, gentle "everything is still here"
   ────────────────────────────────────────────────────────────────── */

export interface TrialExpiredEmailParams {
  to: string;
  name?: string;
  locale?: string | null;
  _previewSubjectPrefix?: string;
}

export async function sendTrialExpiredEmail({ to, name, locale, _previewSubjectPrefix }: TrialExpiredEmailParams) {
  const resend = getResend();
  if (!resend) return null;

  const t = getEmailDict(locale);
  const firstName = firstNameFromInputs(name, t.common.fallbackName);
  const subject = `${_previewSubjectPrefix ?? ''}${t.trialExpired.subject}`;

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 22px 0;">
      ${t.trialExpired.intro1}
    </p>

    <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0 0 32px 0;">
      ${t.trialExpired.intro2}
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:${COLOR_FG};opacity:0.55;margin:0 0 18px 0;">${t.trialExpired.eyebrowPlans}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${renderPlanCards(t, { compact: true })}
    </table>
  `;

  const html = wrapEditorialDarkEmail({
    greeting: t.welcome.greeting.replace('{name}', firstName),
    headline: t.trialExpired.headline,
    bodyHtml,
    ctaLabel: t.trialExpired.ctaLabel,
    ctaHref: 'https://www.aimily.app/pricing',
    personalNote: t.trialExpired.personalNote,
    signoff: 'thats-all',
    t,
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
