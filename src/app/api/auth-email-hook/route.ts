/**
 * POST /api/auth-email-hook — Supabase Auth Send Email Hook.
 *
 * When configured, Supabase calls this endpoint instead of sending the
 * default Auth email. We render the localized editorial-dark email
 * (using user.user_metadata.language) and ship it via Resend, so password
 * resets, magic links, email-change confirmations, etc. arrive in the
 * user's chosen language with the same shell as the trial-funnel emails.
 *
 * Hook config (Supabase Dashboard → Auth → Hooks → Send Email):
 *   URL:    https://www.aimily.app/api/auth-email-hook
 *   Secret: SUPABASE_AUTH_HOOK_SECRET (env var, format `v1,whsec_...`)
 *
 * Verification follows the Standard Webhooks spec:
 *   svix-id, svix-timestamp, svix-signature headers + HMAC-SHA256 of
 *   (id.timestamp.body) keyed with the base64-decoded webhook secret.
 *
 * On success: returns 200 with `{}` (empty object — Supabase considers
 * empty success). On any error: returns 500 with `{ error: { message } }`
 * so Supabase falls back to the static template (bound to fail because
 * the static templates are also our editorial files, but in EN — still
 * better than silently dropping the email).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { renderAuthEmail, type AuthActionType } from '@/lib/auth-email-renderer';

const FROM = 'aimily <hello@aimily.app>';
const REPLY_TO = 'hello@aimily.app';

interface SupabaseAuthHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      language?: string;
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: AuthActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
    new_email?: string;
  };
}

function verifyStandardWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const id = headers.get('svix-id') || headers.get('webhook-id');
  const timestamp = headers.get('svix-timestamp') || headers.get('webhook-timestamp');
  const signatureHeader = headers.get('svix-signature') || headers.get('webhook-signature');

  if (!id || !timestamp || !signatureHeader) return false;

  // Reject anything older than 5 minutes (replay protection).
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageMs = Math.abs(Date.now() - ts * 1000);
  if (ageMs > 5 * 60 * 1000) return false;

  // Standard Webhooks signs `${id}.${timestamp}.${body}` with the secret.
  const signedContent = `${id}.${timestamp}.${rawBody}`;

  // Secret format: `v1,whsec_<base64>` — strip the version prefix.
  const rawSecret = secret.startsWith('v1,whsec_')
    ? secret.slice('v1,whsec_'.length)
    : secret.startsWith('whsec_')
      ? secret.slice('whsec_'.length)
      : secret;

  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(rawSecret, 'base64');
  } catch {
    return false;
  }

  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // The signature header is "v1,sig1 v1,sig2 ..." — accept if any matches.
  for (const candidate of signatureHeader.split(' ')) {
    const sig = candidate.startsWith('v1,') ? candidate.slice('v1,'.length) : candidate;
    try {
      if (
        sig.length === expected.length &&
        timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))
      ) {
        return true;
      }
    } catch {
      // length mismatch → ignore, try next
    }
  }
  return false;
}

function buildConfirmationUrl(payload: SupabaseAuthHookPayload): string {
  const { site_url, token_hash, email_action_type, redirect_to } = payload.email_data;
  const verifyType =
    email_action_type === 'signup' ? 'signup'
    : email_action_type === 'recovery' ? 'recovery'
    : email_action_type === 'magiclink' ? 'magiclink'
    : email_action_type === 'invite' ? 'invite'
    : email_action_type === 'email_change' ? 'email_change'
    : email_action_type;
  const params = new URLSearchParams({
    token_hash,
    type: verifyType,
    redirect_to,
  });
  return `${site_url.replace(/\/$/, '')}/auth/v1/verify?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    console.error('[auth-email-hook] SUPABASE_AUTH_HOOK_SECRET missing — refusing to send');
    return NextResponse.json(
      { error: { message: 'Hook not configured' } },
      { status: 500 },
    );
  }

  const rawBody = await req.text();

  if (!verifyStandardWebhook(rawBody, req.headers, secret)) {
    console.error('[auth-email-hook] signature verification failed');
    return NextResponse.json(
      { error: { message: 'Invalid signature' } },
      { status: 401 },
    );
  }

  let payload: SupabaseAuthHookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  const { user, email_data } = payload;
  if (!user?.email || !email_data?.email_action_type) {
    return NextResponse.json(
      { error: { message: 'Missing user or email_data' } },
      { status: 400 },
    );
  }

  const locale = user.user_metadata?.language || null;
  const action = email_data.email_action_type;

  const { subject, html } = renderAuthEmail(action, locale, {
    email: user.email,
    newEmail: email_data.new_email,
    confirmationUrl: buildConfirmationUrl(payload),
    token: email_data.token,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[auth-email-hook] RESEND_API_KEY missing — cannot deliver');
    return NextResponse.json(
      { error: { message: 'Mailer not configured' } },
      { status: 500 },
    );
  }
  const resend = new Resend(resendKey);

  // Email change uses the NEW address as the recipient (Supabase confirms
  // ownership of the destination); every other action uses the existing
  // user.email.
  const recipient = action === 'email_change' && email_data.new_email
    ? email_data.new_email
    : user.email;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipient,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) {
      console.error('[auth-email-hook] Resend error', { action, error });
      return NextResponse.json(
        { error: { message: 'Email delivery failed', detail: error } },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error('[auth-email-hook] Resend threw', { action, err });
    return NextResponse.json(
      { error: { message: 'Email delivery threw' } },
      { status: 500 },
    );
  }

  // Supabase treats `{}` as a success indicator for the hook.
  return NextResponse.json({});
}
