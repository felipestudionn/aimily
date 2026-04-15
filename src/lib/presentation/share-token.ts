/* ═══════════════════════════════════════════════════════════════════
   Share token — URL-safe random strings saved in presentation_shares.

   Unlike the export token (signed JWT, 5-min TTL), share tokens are
   opaque random values looked up in the DB. The DB row carries the
   actual state (collection, theme, expiry, view count, optional
   password hash). Tokens are 32 bytes → 43 base64url chars, long
   enough to make guessing infeasible.
   ═══════════════════════════════════════════════════════════════════ */

import { randomBytes } from 'crypto';

export function generateShareToken(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
