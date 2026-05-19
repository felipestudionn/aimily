/**
 * Shopify OAuth state — short-lived HMAC-signed token round-tripped
 * through the `state` query param of the install/callback dance.
 *
 * Felipe 2026-05-20 · Sprint 5 OAuth Partner App.
 *
 * The Shopify install flow lasts <60s in practice (user clicks Install,
 * sees scope screen, approves). We sign the (tenant_slug, shop, nonce,
 * exp) tuple with HMAC-SHA256 using SHOPIFY_OAUTH_STATE_SECRET so the
 * callback can verify: (a) the state was minted by us and (b) hasn't
 * expired or been tampered with. The nonce defends against replay even
 * within the TTL window if we ever store consumed states.
 */

import crypto from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStatePayload {
  tenant_slug: string;
  shop: string;
  nonce: string;
  exp: number;
}

function getSigningSecret(): string {
  const secret = process.env.SHOPIFY_OAUTH_STATE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SHOPIFY_OAUTH_STATE_SECRET env var missing or <32 chars. Generate via `openssl rand -hex 32` and set it in .env.local + Vercel.'
    );
  }
  return secret;
}

export function signOAuthState(input: { tenant_slug: string; shop: string }): string {
  const payload: OAuthStatePayload = {
    tenant_slug: input.tenant_slug,
    shop: input.shop,
    nonce: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  if (!state) return null;
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url');
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify the HMAC that Shopify attaches to the callback URL. Per Shopify
 * spec we take all query params EXCEPT `hmac` and `signature`, sort them
 * by key, build a `key=value&key=value...` string (NOT URL-encoded — values
 * are passed verbatim), HMAC-SHA256 with the app client secret, and compare
 * hex digest to the `hmac` param.
 *
 * Ref: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant#verifying-callbacks
 */
export function verifyShopifyHmac(searchParams: URLSearchParams, clientSecret: string): boolean {
  const hmacParam = searchParams.get('hmac');
  if (!hmacParam) return false;

  const entries: Array<[string, string]> = [];
  searchParams.forEach((value, key) => {
    if (key === 'hmac' || key === 'signature') return;
    entries.push([key, value]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([k, v]) => `${k}=${v}`).join('&');

  const expected = crypto.createHmac('sha256', clientSecret).update(message).digest('hex');
  if (expected.length !== hmacParam.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmacParam));
  } catch {
    return false;
  }
}

/**
 * Tight regex for the `shop` query param. Shopify shops are always
 * `<subdomain>.myshopify.com` — anything else is an attacker trying to
 * redirect us elsewhere. Subdomain is 1-60 alnum + hyphens (Shopify limit).
 */
const SHOP_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{0,59}\.myshopify\.com$/i;
export function isValidShopDomain(shop: string | null | undefined): shop is string {
  return !!shop && SHOP_DOMAIN_REGEX.test(shop);
}

/**
 * Canonical scope list aimily In-Season requests when installing on a new
 * shop. Mirrors the read scopes used by `src/lib/strategy/parsers/shopify-graphql.ts`.
 * `read_all_orders` is a restricted scope (requires Partner approval) so we
 * only request `read_orders` for the last 60 days. Adding it later lands in
 * a separate migration once we have approval.
 */
export const SHOPIFY_OAUTH_SCOPES = [
  'read_products',
  'read_orders',
  'read_inventory',
  'read_locations',
  'read_customers',
  'read_price_rules',
  'read_discounts',
  'read_publications',
].join(',');
