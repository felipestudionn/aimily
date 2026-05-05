/* ═══════════════════════════════════════════════════════════════════
   Storefront host detection · used by middleware + route group SSR

   Determines whether a request belongs to a published Ecom storefront
   (e.g. `slaiz.aimily.shop`) vs the main aimily app (`aimily.app`).

   Custom domains (slaiz.com pointing at our wildcard) are detected in
   middleware via `extractStorefrontHost` — the actual lookup happens
   later in route-group SSR via `loadStorefrontByHost()`.

   Plan reference: .planning/ecom/01-ARCHITECTURE.md
   ═══════════════════════════════════════════════════════════════════ */

const STOREFRONT_BASE_DOMAIN = 'aimily.shop';

const APEX_HOSTS = new Set<string>([
  // Production app
  'aimily.app',
  'www.aimily.app',
  // Local dev
  'localhost',
  'localhost:3000',
  'localhost:3001',
  // Bare apex of the storefront base (reserved — no storefront lives here)
  STOREFRONT_BASE_DOMAIN,
  `www.${STOREFRONT_BASE_DOMAIN}`,
]);

/**
 * Returns true if the request host belongs to a published storefront.
 *
 * Matches:
 *   - `<sub>.aimily.shop` (any non-empty subdomain)
 *   - `<sub>.aimily.shop.localhost` (local dev with /etc/hosts)
 *   - Anything NOT in APEX_HOSTS (will be checked as a custom domain)
 */
export function isStorefrontHost(host: string): boolean {
  if (!host) return false;
  const h = host.toLowerCase();

  if (APEX_HOSTS.has(h)) return false;

  // Wildcard subdomain on aimily.shop (production)
  if (h.endsWith(`.${STOREFRONT_BASE_DOMAIN}`)) return true;

  // Local dev: foo.aimily.shop.localhost or foo.aimily.shop.localhost:3000
  if (h.endsWith(`.${STOREFRONT_BASE_DOMAIN}.localhost`)) return true;
  if (h.match(new RegExp(`\\.${STOREFRONT_BASE_DOMAIN}\\.localhost:\\d+$`))) return true;

  // Custom domain: anything not in apex list and not localhost variants
  // (we don't validate against DB here — that happens in SSR loader)
  if (h.endsWith('.localhost') || h.startsWith('localhost')) return false;
  if (h.endsWith('.vercel.app')) return false;

  // Could be a custom domain — let the route-group SSR resolve it
  return true;
}

/**
 * Returns the storefront host as-is, or null if the request is not for a storefront.
 * Used by middleware to rewrite the URL to the `_storefront/[host]/...` route group.
 */
export function extractStorefrontHost(host: string): string | null {
  return isStorefrontHost(host) ? host.toLowerCase() : null;
}

/**
 * Extracts the subdomain from a `<sub>.aimily.shop[.localhost[:port]]` host.
 * Returns null for custom domains or non-storefront hosts.
 */
export function extractSubdomain(host: string): string | null {
  if (!host) return null;
  const h = host.toLowerCase();

  if (h.endsWith(`.${STOREFRONT_BASE_DOMAIN}`)) {
    return h.slice(0, -1 - STOREFRONT_BASE_DOMAIN.length);
  }

  const localDevMatch = h.match(new RegExp(`^([a-z0-9-]+)\\.${STOREFRONT_BASE_DOMAIN}\\.localhost(?::\\d+)?$`));
  if (localDevMatch) return localDevMatch[1];

  return null;
}

export const STOREFRONT_BASE_DOMAIN_CONST = STOREFRONT_BASE_DOMAIN;
