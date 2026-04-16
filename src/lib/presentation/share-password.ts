/* ═══════════════════════════════════════════════════════════════════
   Password gating for public /p/[token] share links.

   Storage: `presentation_shares.password_hash` holds a string of the
   form `scrypt$<salt_hex>$<hash_hex>`. Absent = no password required.

   Unlock: once a viewer posts the correct password, we set a signed
   HTTP-only cookie `share_unlock_<token>=<signature>` scoped to /p
   that stays valid until the share itself expires (or 30 days,
   whichever comes first). Signature is HMAC-SHA256 over the token
   keyed with the server secret — cheap to verify, can't be forged
   without the secret.
   ═══════════════════════════════════════════════════════════════════ */

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';

const SALT_BYTES = 16;
const HASH_BYTES = 32;
const COOKIE_PREFIX = 'share_unlock_';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  return (
    process.env.PRESENTATION_EXPORT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'aimily-dev-secret'
  );
}

export function hashSharePassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, HASH_BYTES);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifySharePassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function cookieNameForToken(token: string): string {
  return `${COOKIE_PREFIX}${token}`;
}

export function signUnlockCookie(token: string): string {
  return createHmac('sha256', getSecret()).update(token).digest('hex');
}

export function verifyUnlockCookie(token: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = signUnlockCookie(token);
  if (cookieValue.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(cookieValue, 'hex'), Buffer.from(expected, 'hex'));
}

export const UNLOCK_COOKIE_MAX_AGE = COOKIE_MAX_AGE;
