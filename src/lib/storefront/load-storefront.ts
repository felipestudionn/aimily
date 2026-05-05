/* ═══════════════════════════════════════════════════════════════════
   Storefront loader · resolves a request host to a published storefront row

   Used by:
   - Route group SSR: `src/app/(storefront)/_storefront/[host]/...`
     to render the right brand/theme/data based on the request host.
   - Hub UI inside aimily app to fetch a user's own storefront for edit.

   Uses supabaseAdmin (service role) because the public storefront SSR
   has no user session — the row is gated by `published_at IS NOT NULL`,
   not by auth.

   Caching strategy: Next.js `unstable_cache` with tag-based revalidation.
   Cache key is the host. Tag is `storefront-${id}` once resolved.
   Publish/unpublish/edit endpoints call `revalidateTag` to invalidate.

   Plan: .planning/ecom/01-ARCHITECTURE.md §3-§4
   ═══════════════════════════════════════════════════════════════════ */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { extractSubdomain } from './host';
import type { Storefront } from '@/types/storefront';

/**
 * Resolves a request host to a published storefront. Returns null if the
 * host doesn't match any published storefront.
 *
 * Lookup order:
 *   1. If host matches `<sub>.aimily.shop` pattern → look up by `subdomain`
 *   2. Otherwise (custom domain) → look up by `custom_domain` AND `custom_domain_verified = true`
 *
 * Both lookups require `published_at IS NOT NULL` — unpublished storefronts
 * always 404 publicly even if the row exists.
 */
export async function loadStorefrontByHost(host: string): Promise<Storefront | null> {
  if (!host) return null;
  const h = host.toLowerCase();

  const subdomain = extractSubdomain(h);

  if (subdomain) {
    // *.aimily.shop lookup
    const { data, error } = await supabaseAdmin
      .from('storefronts')
      .select('*')
      .eq('subdomain', subdomain)
      .not('published_at', 'is', null)
      .maybeSingle();

    if (error) {
      console.error('[storefront] subdomain lookup failed:', error);
      return null;
    }
    return (data as Storefront | null) ?? null;
  }

  // Custom domain lookup (V1 — no rows yet in MVP, but already wired)
  const { data, error } = await supabaseAdmin
    .from('storefronts')
    .select('*')
    .eq('custom_domain', h)
    .eq('custom_domain_verified', true)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (error) {
    console.error('[storefront] custom domain lookup failed:', error);
    return null;
  }
  return (data as Storefront | null) ?? null;
}

/**
 * Loads a storefront by id. Used by the hub UI inside aimily app
 * (where the user is authenticated and owns the storefront).
 *
 * Caller is responsible for verifying ownership via `verifyCollectionOwnership`
 * on the returned `collection_plan_id`. This function does NOT enforce auth.
 */
export async function loadStorefrontById(id: string): Promise<Storefront | null> {
  const { data, error } = await supabaseAdmin
    .from('storefronts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[storefront] id lookup failed:', error);
    return null;
  }
  return (data as Storefront | null) ?? null;
}

/**
 * Loads a storefront by collection_plan_id (one-to-one). Returns null if
 * no storefront exists yet for the collection.
 */
export async function loadStorefrontByCollectionId(collectionPlanId: string): Promise<Storefront | null> {
  const { data, error } = await supabaseAdmin
    .from('storefronts')
    .select('*')
    .eq('collection_plan_id', collectionPlanId)
    .maybeSingle();

  if (error) {
    console.error('[storefront] collection_plan_id lookup failed:', error);
    return null;
  }
  return (data as Storefront | null) ?? null;
}
