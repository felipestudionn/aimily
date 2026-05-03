/**
 * Auth-flow email renderer.
 *
 * Generates the HTML + subject for each Supabase Auth email type, in the
 * locale stored in `user.user_metadata.language` (or EN as fallback).
 * Used by the Supabase Send Email Hook at /api/auth-email-hook so that
 * password resets, magic links, email-change confirmations, etc. all
 * arrive in the user's chosen language with the same editorial dark
 * shell as the trial-funnel emails.
 */
import { getEmailDict, type EmailDict } from '@/lib/email-i18n';

const COLOR_BG = '#282A29';
const COLOR_FG = '#FAEFE0';
const LOGO_WHITE_URL = 'https://www.aimily.app/images/aimily-logo-white.png';

export type AuthActionType =
  | 'signup'
  | 'recovery'
  | 'magiclink'
  | 'email_change'
  | 'invite'
  | 'reauthentication';

export interface AuthEmailVars {
  /** Recipient address (always present). */
  email: string;
  /** New address (only for `email_change`). */
  newEmail?: string;
  /** Pre-built confirmation URL (Supabase passes site_url + token_hash + type). */
  confirmationUrl?: string;
  /** OTP / verification code (only for `reauthentication` and SOTP-style flows). */
  token?: string;
}

export interface RenderedAuthEmail {
  subject: string;
  html: string;
}

function authShell({
  greeting,
  headline,
  bodyHtml,
  ctaLabel,
  ctaHref,
  showCta,
  footer,
  fallbackLink,
}: {
  greeting: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  showCta: boolean;
  footer: string;
  fallbackLink: string;
}): string {
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
            <td style="padding:0 0 28px 0;">
              <p style="font-size:16px;line-height:1.7;color:${COLOR_FG};opacity:0.85;margin:0;">${greeting}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 32px 0;">
              ${bodyHtml}
            </td>
          </tr>
          ${
            showCta
              ? `<tr>
            <td align="center" style="padding:0 0 48px 0;">
              <a href="${ctaHref}" style="display:inline-block;background:${COLOR_FG};color:${COLOR_BG};padding:16px 40px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:-0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${ctaLabel} →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 32px 0;">
              <p style="font-size:13px;line-height:1.7;color:${COLOR_FG};opacity:0.5;margin:0;font-style:italic;">${fallbackLink}<br/><span style="color:${COLOR_FG};opacity:0.7;word-break:break-all;font-style:normal;">${ctaHref}</span></p>
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
              <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.45;font-style:italic;margin:0 0 4px 0;">Felipe</p>
              <p style="font-size:13px;line-height:1.6;color:${COLOR_FG};opacity:0.45;margin:0 0 4px 0;">Founder, aimily</p>
              <p style="font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.3;margin:12px 0 4px 0;">Built by StudioNN — a fashion agency, not a startup that heard about fashion.</p>
              <p style="font-size:11px;line-height:1.6;color:${COLOR_FG};opacity:0.25;margin:8px 0 0 0;">${footer}</p>
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

function pickActionStrings(t: EmailDict, action: AuthActionType) {
  switch (action) {
    case 'signup':
      return t.auth.confirmSignup;
    case 'recovery':
      return t.auth.recovery;
    case 'magiclink':
      return t.auth.magicLink;
    case 'email_change':
      return t.auth.emailChange;
    case 'reauthentication':
      return t.auth.reauthentication;
    case 'invite':
      return t.auth.invite;
  }
}

export function renderAuthEmail(
  action: AuthActionType,
  locale: string | null | undefined,
  vars: AuthEmailVars,
): RenderedAuthEmail {
  const t = getEmailDict(locale);
  const s = pickActionStrings(t, action);

  const intro = (s.intro || '')
    .replace('{email}', vars.email)
    .replace('{newEmail}', vars.newEmail || '');
  const detail = (s.detail || '')
    .replace('{email}', vars.email)
    .replace('{newEmail}', vars.newEmail || '');

  let bodyHtml = `
    <p style="font-size:14px;line-height:1.65;color:${COLOR_FG};opacity:0.55;margin:0 0 16px 0;">${detail}</p>
  `;

  // The reauthentication template renders the OTP code in a centered card
  // instead of a CTA button — the user types the digits into the app.
  if (action === 'reauthentication') {
    bodyHtml = `
      <div style="text-align:center;margin:8px 0 24px 0;">
        <div style="display:inline-block;background:rgba(250,239,224,0.06);border:1px solid rgba(250,239,224,0.12);border-radius:14px;padding:22px 36px;">
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:300;letter-spacing:0.32em;color:${COLOR_FG};margin:0;">${vars.token || ''}</p>
        </div>
      </div>
      <p style="font-size:14px;line-height:1.65;color:${COLOR_FG};opacity:0.55;margin:0;">${detail}</p>
    `;
  }

  // Two-line greeting: the localized intro string (e.g. "Click below to set
  // a new one for foo@bar.com.") becomes the visible greeting to keep the
  // shell consistent with the trial-funnel emails.
  const html = authShell({
    greeting: intro,
    headline: s.headline,
    bodyHtml,
    ctaLabel: 'cta' in s ? (s as { cta: string }).cta : '',
    ctaHref: vars.confirmationUrl || '',
    showCta: action !== 'reauthentication' && !!vars.confirmationUrl,
    footer: s.footer,
    fallbackLink: t.auth.common.fallbackLink,
  });

  return { subject: s.subject, html };
}
