/* ═══════════════════════════════════════════════════════════════════
   GET /api/ecom/check-subdomain?subdomain=foo[&storefrontId=xxx]

   Live validation for the EcomHub subdomain input. Combines:
   - Syntax (regex + length)
   - Reserved-list check
   - DB uniqueness check (excluding `storefrontId` if passed for edits)

   Auth: required (only logged-in users can probe). Rate-limited via
   middleware (per-IP) and per-user via in-memory limiter — anti-enum.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { isSubdomainAvailable, SUBDOMAIN_ERROR_MESSAGES } from '@/lib/storefront/subdomain-validator';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  // Per-user soft rate limit — discourages enumeration of taken subdomains
  if (!rateLimit.allow(`${user.id}:ecom-check-subdomain`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many checks. Slow down.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const subdomain = url.searchParams.get('subdomain') ?? '';
  const storefrontId = url.searchParams.get('storefrontId') ?? undefined;

  if (!subdomain) {
    return NextResponse.json({ ok: false, reason: 'too_short', message: SUBDOMAIN_ERROR_MESSAGES.too_short }, { status: 400 });
  }

  const result = await isSubdomainAvailable(subdomain, storefrontId);

  if (result.ok) {
    return NextResponse.json({ ok: true, normalized: result.normalized });
  }

  return NextResponse.json({
    ok: false,
    reason: result.reason,
    message: SUBDOMAIN_ERROR_MESSAGES[result.reason],
  });
}
