/**
 * GET /api/in-season/oauth/shopify/callback?code=...&shop=...&state=...&hmac=...
 *
 * Felipe 2026-05-20 · Sprint 5 OAuth Partner App callback handler.
 *
 * Shopify hits this endpoint after the merchant approves the install. We:
 *   1) Verify the `hmac` parameter using the app client secret (proves the
 *      callback originated from Shopify and the query string wasn't tampered).
 *   2) Verify our `state` token (proves we minted it, hasn't expired, and
 *      pins the (tenant_slug, shop) tuple to the original install request).
 *   3) Validate the `shop` query param against the strict *.myshopify.com
 *      regex — second defence against redirect-to-attacker tricks.
 *   4) Exchange `code` for an access token via Shopify's token endpoint.
 *   5) Upsert the tenant_sales_connections row (delete-then-insert for the
 *      (tenant_id, provider='shopify') uniqueness key) and store the token
 *      in Supabase Vault via the SECURITY DEFINER helper from migration 067.
 *   6) Redirect the merchant back to /in-season/<tenant>/connections with
 *      a success flag.
 *
 * Errors funnel to the connections page with `?oauth_error=<reason>` so the
 * UI can surface a useful message without leaking secrets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isValidShopDomain,
  verifyOAuthState,
  verifyShopifyHmac,
} from '@/lib/shopify/oauth-state';

export const runtime = 'nodejs';

function failRedirect(req: NextRequest, tenantSlug: string | null, reason: string): NextResponse {
  const dest = tenantSlug
    ? `/in-season/${tenantSlug}/connections?oauth_error=${encodeURIComponent(reason)}`
    : `/in-season?oauth_error=${encodeURIComponent(reason)}`;
  return NextResponse.redirect(new URL(dest, req.url));
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const shopParam = searchParams.get('shop');
  const stateParam = searchParams.get('state');
  const shopErr = searchParams.get('error');

  if (shopErr) {
    return failRedirect(req, null, `shopify_${shopErr}`);
  }
  if (!code || !shopParam || !stateParam) {
    return failRedirect(req, null, 'missing_params');
  }
  if (!isValidShopDomain(shopParam)) {
    return failRedirect(req, null, 'invalid_shop');
  }

  const clientId = process.env.SHOPIFY_PARTNER_APP_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_PARTNER_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return failRedirect(req, null, 'app_not_configured');
  }

  // 1) HMAC verification of the query string
  if (!verifyShopifyHmac(searchParams, clientSecret)) {
    return failRedirect(req, null, 'invalid_hmac');
  }

  // 2) State verification
  const statePayload = verifyOAuthState(stateParam);
  if (!statePayload) {
    return failRedirect(req, null, 'invalid_state');
  }
  // 3) The shop in state must match the shop in the callback
  if (statePayload.shop.toLowerCase() !== shopParam.toLowerCase()) {
    return failRedirect(req, statePayload.tenant_slug, 'shop_mismatch');
  }

  // 4) Token exchange
  let accessToken: string;
  let grantedScope: string;
  try {
    const tokenRes = await fetch(`https://${shopParam}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('[shopify oauth] token exchange failed', tokenRes.status, body.slice(0, 500));
      return failRedirect(req, statePayload.tenant_slug, `token_exchange_${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string; scope?: string };
    if (!tokenJson.access_token) {
      return failRedirect(req, statePayload.tenant_slug, 'no_access_token_in_response');
    }
    accessToken = tokenJson.access_token;
    grantedScope = tokenJson.scope ?? '';
  } catch (err) {
    console.error('[shopify oauth] token exchange threw', err);
    return failRedirect(req, statePayload.tenant_slug, 'token_exchange_network');
  }

  // 5) Resolve tenant by slug → id (we know the user was authorised at install
  //    time, but the callback is hit by Shopify, not the user, so we resolve
  //    via the slug from the signed state). Service-role bypasses RLS here.
  const { data: tenant } = await supabaseAdmin
    .from('in_season_tenants')
    .select('id')
    .eq('slug', statePayload.tenant_slug)
    .maybeSingle();
  if (!tenant) {
    return failRedirect(req, statePayload.tenant_slug, 'tenant_not_found');
  }
  const tenantId = (tenant as { id: string }).id;

  // 6) Upsert connection: delete existing shopify row for this tenant, insert fresh.
  await supabaseAdmin
    .from('tenant_sales_connections')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('provider', 'shopify');

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('tenant_sales_connections')
    .insert({
      tenant_id: tenantId,
      provider: 'shopify',
      shop_domain: shopParam,
      scopes: grantedScope ? grantedScope.split(',') : [],
      status: 'active',
      next_sync_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error('[shopify oauth] connection insert failed', insertErr);
    return failRedirect(req, statePayload.tenant_slug, 'connection_insert_failed');
  }
  const connectionId = (inserted as { id: string }).id;

  // 7) Store token in Vault. Failure → roll back the connection row.
  // supabase-js `.rpc()` does NOT throw on a SQL error — it returns
  // `{ error }`. We must inspect that explicitly; the surrounding try/catch
  // only catches network/runtime failures.
  try {
    const { error: vaultErr } = await supabaseAdmin.rpc(
      'tenant_sales_connections_store_token',
      { p_connection_id: connectionId, p_token: accessToken }
    );
    if (vaultErr) {
      console.error('[shopify oauth] vault store returned error', vaultErr);
      await supabaseAdmin.from('tenant_sales_connections').delete().eq('id', connectionId);
      return failRedirect(req, statePayload.tenant_slug, 'token_vault_failed');
    }
  } catch (err) {
    console.error('[shopify oauth] vault store threw', err);
    await supabaseAdmin.from('tenant_sales_connections').delete().eq('id', connectionId);
    return failRedirect(req, statePayload.tenant_slug, 'token_vault_failed');
  }

  // Success — kick off an immediate sync via the existing cadence machinery
  // and bounce the merchant back to the connections page.
  const dest = `/in-season/${statePayload.tenant_slug}/connections?oauth_success=shopify&shop=${encodeURIComponent(shopParam)}`;
  return NextResponse.redirect(new URL(dest, req.url));
}
