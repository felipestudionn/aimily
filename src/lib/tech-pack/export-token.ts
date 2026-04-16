/* ═══════════════════════════════════════════════════════════════════
   Tech Pack export token — signs a short-lived JWT the PDF export
   route validates without a user session. Same HMAC-SHA256 pattern
   as the Presentation export (lib/presentation/export-token.ts).
   ═══════════════════════════════════════════════════════════════════ */

import { createHmac } from 'crypto';

interface TechPackExportTokenPayload {
  collectionId: string;
  userId: string;
  skuId: string;
  exp: number;
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

export function signTechPackToken(payload: Omit<TechPackExportTokenPayload, 'exp'>, ttlSeconds = 300): string {
  const full: TechPackExportTokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = base64url(JSON.stringify(full));
  const mac = base64url(createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyTechPackToken(token: string): TechPackExportTokenPayload | null {
  try {
    const [body, mac] = token.split('.');
    if (!body || !mac) return null;
    const expected = base64url(createHmac('sha256', getSecret()).update(body).digest());
    if (expected !== mac) return null;
    const payload = JSON.parse(base64urlDecode(body).toString('utf8')) as TechPackExportTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
