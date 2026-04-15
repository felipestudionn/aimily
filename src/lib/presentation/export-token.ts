/* ═══════════════════════════════════════════════════════════════════
   Export token — signs a short-lived JWT that the PDF export route
   can validate without a user session.

   Flow:
   1. POST /api/presentation/export (user-authenticated)
      → signs a token with { collectionId, userId, themeId, exp = +5min }
      → launches headless Chrome against /presentation/export/[id]?token=...
   2. /presentation/export/[id] (unauthenticated route) validates the
      token and loads data server-side if valid.

   Uses Node's crypto HMAC — no external dep. Secret pulled from
   env.PRESENTATION_EXPORT_SECRET (falls back to NEXTAUTH_SECRET /
   SUPABASE_SERVICE_ROLE_KEY as dev-only convenience).
   ═══════════════════════════════════════════════════════════════════ */

import { createHmac } from 'crypto';

interface ExportTokenPayload {
  collectionId: string;
  userId: string;
  themeId: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const s =
    process.env.PRESENTATION_EXPORT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  if (!s) throw new Error('No secret available for signing export tokens');
  return s;
}

function base64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Buffer {
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(s, 'base64');
}

export function signExportToken(payload: Omit<ExportTokenPayload, 'exp'>, ttlSeconds = 300): string {
  const full: ExportTokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = base64url(JSON.stringify(full));
  const mac = base64url(createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyExportToken(token: string): ExportTokenPayload | null {
  try {
    const [body, mac] = token.split('.');
    if (!body || !mac) return null;
    const expected = base64url(createHmac('sha256', getSecret()).update(body).digest());
    if (expected !== mac) return null;
    const payload = JSON.parse(base64urlDecode(body).toString('utf8')) as ExportTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
