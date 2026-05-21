/**
 * GET /api/in-season/oauth/shopify/install?shop=<shop>.myshopify.com&tenant_slug=<slug>
 *
 * Felipe 2026-05-20 · Sprint 5 OAuth Partner App install kickoff.
 *
 * Validates the shop domain + tenant access, mints a signed state token,
 * and redirects the merchant to Shopify's authorize page. Shopify shows
 * the scope screen and, on approval, redirects back to /callback with
 * `code`, `shop`, `state`, `hmac`.
 *
 * Required env (set in Vercel + .env.local once the Partner App exists):
 *   SHOPIFY_PARTNER_APP_CLIENT_ID      — public key, lives in App Setup
 *   SHOPIFY_PARTNER_APP_CLIENT_SECRET  — server-side only
 *   SHOPIFY_OAUTH_STATE_SECRET         — random ≥32 chars for HMAC state
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §6.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { isValidShopDomain, signOAuthState, SHOPIFY_OAUTH_SCOPES } from '@/lib/shopify/oauth-state';

export const runtime = 'nodejs';

function callbackUrl(req: NextRequest): string {
  const explicit = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  if (explicit) return explicit;
  return `${req.nextUrl.origin}/api/in-season/oauth/shopify/callback`;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const shopParam = searchParams.get('shop');
  const tenantSlug = searchParams.get('tenant_slug');

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug required' }, { status: 400 });
  }
  if (!isValidShopDomain(shopParam)) {
    return NextResponse.json(
      { error: 'shop must be a valid <name>.myshopify.com domain' },
      { status: 400 }
    );
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'admin' });
  if (!access.ok) return access.response;

  const clientId = process.env.SHOPIFY_PARTNER_APP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'SHOPIFY_PARTNER_APP_CLIENT_ID env not configured' },
      { status: 503 }
    );
  }

  let state: string;
  try {
    state = signOAuthState({ tenant_slug: tenantSlug, shop: shopParam });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'state signing failed' },
      { status: 503 }
    );
  }

  const authorizeUrl = new URL(`https://${shopParam}/admin/oauth/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('scope', SHOPIFY_OAUTH_SCOPES);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl(req));
  authorizeUrl.searchParams.set('state', state);
  // grant_options[]=per-user could be added later for online tokens.

  return NextResponse.redirect(authorizeUrl.toString(), { status: 302 });
}
