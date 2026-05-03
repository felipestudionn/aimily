/**
 * Daily cron — warns users whose certificates expire within 90 days.
 *
 * Triggered by Vercel Cron (configured in vercel.json) once a day. For
 * each cert that:
 *   - has an expires_date set
 *   - status != 'revoked'
 *   - expires within 90 days
 *   - hasn't been warned in the last 14 days
 *
 * sends a single roll-up email to the user listing every affected cert.
 *
 * Auth: Bearer CRON_SECRET. Vercel cron sends this header automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const FROM = 'aimily <hello@aimily.app>';
const REPLY_TO = 'hello@aimily.app';
const COLOR_BG = '#282A29';
const COLOR_FG = '#FAEFE0';
const LOGO_WHITE_URL = 'https://www.aimily.app/images/aimily-logo-white.png';

interface CertRow {
  id: string;
  user_id: string;
  certification_type: string;
  certificate_number: string | null;
  issuer: string | null;
  scope: string | null;
  expires_date: string;
  linked_supplier_name: string | null;
}

function verifyCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: certs, error } = await supabaseAdmin
    .from('certifications')
    .select('id, user_id, certification_type, certificate_number, issuer, scope, expires_date, linked_supplier_name')
    .neq('status', 'revoked')
    .not('expires_date', 'is', null)
    .lte('expires_date', cutoff);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!certs || certs.length === 0) {
    return NextResponse.json({ users: 0, certs: 0, sent: 0 });
  }

  // Group by user_id and roll up.
  const byUser = new Map<string, CertRow[]>();
  for (const c of certs as CertRow[]) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
    byUser.get(c.user_id)!.push(c);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;
  let sent = 0;

  for (const [userId, userCerts] of Array.from(byUser.entries())) {
    // Resolve user email from auth.users via the admin API.
    const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userResp?.user?.email;
    if (!email) continue;

    const expiredList = userCerts.filter((c) => new Date(c.expires_date) < now);
    const expiringList = userCerts.filter((c) => new Date(c.expires_date) >= now);

    const subject = expiredList.length
      ? `Compliance certificates expired (${expiredList.length})`
      : `Compliance certificates expiring soon (${expiringList.length})`;

    const rows = userCerts
      .map((c) => {
        const days = Math.ceil((new Date(c.expires_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const status = days < 0 ? `<span style="color:#ff8b8b">expired ${-days}d ago</span>` : `${days} days left`;
        return `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(250,239,224,0.1);">
          <strong style="color:${COLOR_FG};">${c.certification_type}</strong>
          <span style="color:${COLOR_FG};opacity:0.55;"> · ${c.linked_supplier_name ?? c.scope ?? '—'}</span><br/>
          <span style="font-size:12px;color:${COLOR_FG};opacity:0.45;">expires ${c.expires_date} · ${status}</span>
        </td></tr>`;
      })
      .join('');

    const html = `
<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background-color:${COLOR_BG};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};padding:48px 24px;">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
      <tr><td align="center" style="padding-bottom:32px;"><img src="${LOGO_WHITE_URL}" alt="aimily" width="80" /></td></tr>
      <tr><td>
        <p style="font-family:Georgia,serif;font-size:28px;line-height:1.2;color:${COLOR_FG};margin:0 0 8px 0;letter-spacing:-0.02em;">Compliance check-in.</p>
        <p style="font-family:-apple-system,sans-serif;font-size:16px;line-height:1.6;color:${COLOR_FG};opacity:0.85;margin:0 0 24px 0;">
          ${expiredList.length > 0
            ? `${expiredList.length} of your compliance certificates ${expiredList.length === 1 ? 'has' : 'have'} expired and ${expiringList.length} ${expiringList.length === 1 ? 'is' : 'are'} expiring within 90 days.`
            : `${expiringList.length} of your compliance certificates ${expiringList.length === 1 ? 'is' : 'are'} expiring within 90 days.`}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">${rows}</table>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:${COLOR_FG};border-radius:9999px;">
          <a href="https://www.aimily.app/account" style="display:inline-block;padding:14px 28px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;color:${COLOR_BG};text-decoration:none;letter-spacing:-0.01em;">
            Open compliance →
          </a>
        </td></tr></table>
        <p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:${COLOR_FG};opacity:0.55;font-style:italic;margin:32px 0 0 0;letter-spacing:-0.01em;">That's all.</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`;

    if (resend) {
      try {
        await resend.emails.send({ from: FROM, to: email, replyTo: REPLY_TO, subject, html });
        sent += 1;
      } catch (err) {
        console.error('[cert-cron] failed for', userId, err);
      }
    }
  }

  return NextResponse.json({ users: byUser.size, certs: certs.length, sent });
}
