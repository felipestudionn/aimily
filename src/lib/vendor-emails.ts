/**
 * Vendor portal invitation email.
 *
 * Sent when a user creates a vendor_invitation row. Carries the share
 * URL the factory uses to open `/vendor/[token]`. Soft-fails if Resend
 * isn't configured so invite creation never breaks.
 */

import { Resend } from 'resend';

const FROM = 'aimily <hello@aimily.app>';
const REPLY_TO = 'hello@aimily.app';

const COLOR_BG = '#282A29';
const COLOR_FG = '#FAEFE0';
const LOGO_WHITE_URL = 'https://www.aimily.app/images/aimily-logo-white.png';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[vendor-email] RESEND_API_KEY missing — email skipped');
    return null;
  }
  return new Resend(key);
}

interface InvitationParams {
  to: string;
  vendorName?: string | null;
  collectionName: string;
  shareUrl: string;
  expiresAt: string;
  invitedByName?: string | null;
}

export async function sendVendorInvitationEmail(params: InvitationParams) {
  const resend = getResend();
  if (!resend) return null;

  const greeting = params.vendorName ? `Hi ${params.vendorName},` : 'Hi there,';
  const inviter = params.invitedByName ?? 'the design team';
  const expiresLabel = new Date(params.expiresAt).toLocaleDateString();

  const html = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Tech pack access</title></head>
<body style="margin:0;padding:0;background-color:${COLOR_BG};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="${LOGO_WHITE_URL}" alt="aimily" width="80" style="display:block;" />
        </td></tr>
        <tr><td>
          <p style="font-family:Georgia,serif;font-size:32px;line-height:1.2;color:${COLOR_FG};margin:0 0 8px 0;letter-spacing:-0.02em;">${greeting}</p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:${COLOR_FG};opacity:0.85;margin:0 0 24px 0;">
            ${inviter} at aimily has shared the tech-pack for the <strong>${params.collectionName}</strong> collection with you.
          </p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:${COLOR_FG};opacity:0.7;margin:0 0 32px 0;">
            Open the link below — no login required. You'll see the assigned SKUs, technical drawings, measurements, and BOM. AI translation is enabled if you want to read in your working language.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;"><tr><td style="background-color:${COLOR_FG};border-radius:9999px;">
            <a href="${params.shareUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:${COLOR_BG};text-decoration:none;letter-spacing:-0.01em;">
              Open the tech pack →
            </a>
          </td></tr></table>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.5;margin:0 0 8px 0;">
            Direct URL: <a href="${params.shareUrl}" style="color:${COLOR_FG};opacity:0.85;">${params.shareUrl}</a>
          </p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:${COLOR_FG};opacity:0.4;margin:0 0 24px 0;">
            Access expires on ${expiresLabel}. The link can be revoked at any time by the design team.
          </p>
          <p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:${COLOR_FG};opacity:0.55;font-style:italic;margin:0;letter-spacing:-0.01em;">
            That's all.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const subject = `${params.collectionName} — tech pack access from aimily`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) {
      console.error('[vendor-email] Resend error:', error);
      return null;
    }
    return { ok: true };
  } catch (err) {
    console.error('[vendor-email] send threw:', err);
    return null;
  }
}
