/* ═══════════════════════════════════════════════════════════════════
   Subdomain validator for *.aimily.shop

   Rules (mirrors the CHECK constraint in 046_ecom_storefronts.sql):
   - 4 to 32 chars total
   - Lowercase letters, digits, hyphens
   - Must start with a letter, end with letter or digit
   - No consecutive hyphens (avoids visual confusion)
   - Not in RESERVED_SUBDOMAINS list

   Uniqueness is checked separately via Supabase query (see
   `isSubdomainAvailable` for the combined check).
   ═══════════════════════════════════════════════════════════════════ */

import { isReservedSubdomain } from './reserved-subdomains';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type SubdomainValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: 'too_short' | 'too_long' | 'invalid_chars' | 'reserved' | 'consecutive_hyphens' | 'taken' };

const SUBDOMAIN_REGEX = /^[a-z][a-z0-9-]{2,30}[a-z0-9]$/;

/**
 * Pure validator — does NOT check DB uniqueness. Use `isSubdomainAvailable`
 * for the combined check including the DB lookup.
 */
export function validateSubdomainSyntax(input: string): SubdomainValidationResult {
  const s = input.trim().toLowerCase();

  if (s.length < 4) return { ok: false, reason: 'too_short' };
  if (s.length > 32) return { ok: false, reason: 'too_long' };
  if (!SUBDOMAIN_REGEX.test(s)) return { ok: false, reason: 'invalid_chars' };
  if (s.includes('--')) return { ok: false, reason: 'consecutive_hyphens' };
  if (isReservedSubdomain(s)) return { ok: false, reason: 'reserved' };

  return { ok: true, normalized: s };
}

/**
 * Full check — syntax + reserved + uniqueness in `storefronts` table.
 * Pass `excludeStorefrontId` when re-checking the same storefront's current
 * subdomain (e.g. when editing) so the row's own subdomain doesn't count
 * as taken.
 */
export async function isSubdomainAvailable(
  input: string,
  excludeStorefrontId?: string,
): Promise<SubdomainValidationResult> {
  const syntax = validateSubdomainSyntax(input);
  if (!syntax.ok) return syntax;

  const query = supabaseAdmin
    .from('storefronts')
    .select('id', { count: 'exact', head: true })
    .eq('subdomain', syntax.normalized);

  if (excludeStorefrontId) {
    query.neq('id', excludeStorefrontId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('[subdomain-validator] DB query failed:', error);
    // Fail closed: treat as taken to avoid creating a duplicate
    return { ok: false, reason: 'taken' };
  }

  if ((count ?? 0) > 0) {
    return { ok: false, reason: 'taken' };
  }

  return { ok: true, normalized: syntax.normalized };
}

/**
 * Human-readable error messages keyed by validation reason.
 */
export const SUBDOMAIN_ERROR_MESSAGES: Record<Exclude<SubdomainValidationResult, { ok: true }>['reason'], string> = {
  too_short: 'Subdomain must be at least 4 characters.',
  too_long: 'Subdomain must be 32 characters or fewer.',
  invalid_chars: 'Use only lowercase letters, numbers, and hyphens. Must start with a letter and end with a letter or number.',
  consecutive_hyphens: 'No consecutive hyphens allowed.',
  reserved: 'This subdomain is reserved. Try another.',
  taken: 'This subdomain is already taken. Try another.',
};
