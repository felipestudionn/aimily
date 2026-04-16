/* ═══════════════════════════════════════════════════════════════════
   POST /api/presentation/share/unlock
   Body: { token: string; password: string }
   On match: sets an HTTP-only cookie scoped to /p/<token> that the
   viewer page reads on subsequent loads to skip the prompt.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  cookieNameForToken,
  signUnlockCookie,
  UNLOCK_COOKIE_MAX_AGE,
  verifySharePassword,
} from '@/lib/presentation/share-password';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || !password) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
  }

  const { data: share } = await supabaseAdmin
    .from('presentation_shares')
    .select('password_hash, expires_at')
    .eq('token', token)
    .maybeSingle();

  // 404 when the share or its password is absent so scrapers don't
  // learn which tokens are real. Same treatment as expired links.
  if (!share || !share.password_hash) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!verifySharePassword(password, share.password_hash)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: cookieNameForToken(token),
    value: signUnlockCookie(token),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: `/p/${token}`,
    maxAge: UNLOCK_COOKIE_MAX_AGE,
  });
  return res;
}
