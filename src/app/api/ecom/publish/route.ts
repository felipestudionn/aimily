/* ═══════════════════════════════════════════════════════════════════
   POST /api/ecom/publish

   Publishes (or republishes) a storefront for a collection.

   Body:
     {
       collectionPlanId: string,    // required
       subdomain: string,           // required (validated)
       themeId?: ThemeId,           // optional, default 'editorial-heritage'
       paymentProvider?: PaymentProvider,  // optional, default 'lookbook_only'
       paymentConfig?: object,      // optional
       skuPaymentMap?: object,      // optional
     }

   Behavior:
   - Auth: required + collection ownership verified via verifyCollectionOwnership
   - Quota: enforces subscriptions.storefront_quota via can_publish_storefront() RPC
   - Idempotent: if a row already exists for this collection, UPDATEs subdomain/theme/payment
   - Writes audit row in storefront_publishes
   - Invalidates cache via revalidateTag('storefront-{id}')

   Returns: { storefront, publicUrl }
   ═══════════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isSubdomainAvailable, SUBDOMAIN_ERROR_MESSAGES } from '@/lib/storefront/subdomain-validator';
import { registerStorefrontDomain, buildStorefrontUrl } from '@/lib/storefront/vercel-domains';
import { ALL_THEME_IDS, type ThemeId, type PaymentProvider } from '@/types/storefront';

const VALID_PROVIDERS: PaymentProvider[] = ['stripe_buy_button', 'shopify_buy', 'lookbook_only'];

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: {
    collectionPlanId?: string;
    subdomain?: string;
    themeId?: string;
    paymentProvider?: string;
    paymentConfig?: Record<string, unknown>;
    skuPaymentMap?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { collectionPlanId, subdomain, themeId, paymentProvider, paymentConfig, skuPaymentMap } = body;

  if (!collectionPlanId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }
  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
  }

  // Verify ownership of the collection
  const ownershipCheck = await verifyCollectionOwnership(user.id, collectionPlanId, 'view_all');
  if (!ownershipCheck.authorized) return ownershipCheck.error;

  // Find existing storefront for this collection (1-to-1 unique)
  const { data: existing } = await supabaseAdmin
    .from('storefronts')
    .select('id, subdomain')
    .eq('collection_plan_id', collectionPlanId)
    .maybeSingle();

  // Validate subdomain (allowing the same row to keep its current subdomain)
  const subdomainCheck = await isSubdomainAvailable(subdomain, existing?.id);
  if (!subdomainCheck.ok) {
    return NextResponse.json(
      { error: SUBDOMAIN_ERROR_MESSAGES[subdomainCheck.reason], reason: subdomainCheck.reason },
      { status: 400 },
    );
  }
  const normalizedSubdomain = subdomainCheck.normalized;

  // Validate theme + provider
  const finalThemeId: ThemeId =
    themeId && (ALL_THEME_IDS as readonly string[]).includes(themeId)
      ? (themeId as ThemeId)
      : 'editorial-heritage';

  const finalProvider: PaymentProvider =
    paymentProvider && VALID_PROVIDERS.includes(paymentProvider as PaymentProvider)
      ? (paymentProvider as PaymentProvider)
      : 'lookbook_only';

  // Quota check via RPC (reads subscriptions.storefront_quota + counts published)
  const { data: canPublish, error: quotaError } = await supabaseAdmin.rpc('can_publish_storefront', {
    p_user_id: user.id,
  });

  if (quotaError) {
    console.error('[ecom/publish] quota check failed:', quotaError);
    return NextResponse.json({ error: 'Failed to verify storefront quota' }, { status: 500 });
  }

  // Allow republish (existing row, already counts toward quota); block only new publishes over quota
  if (!canPublish && !existing) {
    return NextResponse.json(
      {
        error: 'You have reached your plan&apos;s published storefront limit. Upgrade to publish more.',
        reason: 'quota_exceeded',
      },
      { status: 402 },
    );
  }

  const now = new Date().toISOString();
  let storefrontId: string;

  if (existing) {
    // UPDATE path
    const { data, error } = await supabaseAdmin
      .from('storefronts')
      .update({
        subdomain: normalizedSubdomain,
        theme_id: finalThemeId,
        payment_provider: finalProvider,
        payment_config: paymentConfig ?? {},
        sku_payment_map: skuPaymentMap ?? {},
        published_at: now,
        unpublished_at: null,
        last_built_at: now,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[ecom/publish] update failed:', error);
      return NextResponse.json({ error: 'Failed to publish storefront' }, { status: 500 });
    }
    storefrontId = data.id;
  } else {
    // INSERT path
    const { data, error } = await supabaseAdmin
      .from('storefronts')
      .insert({
        user_id: user.id,
        collection_plan_id: collectionPlanId,
        subdomain: normalizedSubdomain,
        theme_id: finalThemeId,
        payment_provider: finalProvider,
        payment_config: paymentConfig ?? {},
        sku_payment_map: skuPaymentMap ?? {},
        published_at: now,
        last_built_at: now,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[ecom/publish] insert failed:', error);
      return NextResponse.json({ error: 'Failed to publish storefront' }, { status: 500 });
    }
    storefrontId = data.id;
  }

  // Audit row
  await supabaseAdmin.from('storefront_publishes').insert({
    storefront_id: storefrontId,
    action: existing ? 'rebuild' : 'publish',
    triggered_by: user.id,
    payload_snapshot: {
      subdomain: normalizedSubdomain,
      themeId: finalThemeId,
      paymentProvider: finalProvider,
    },
  });

  // Register the subdomain in Vercel so SSL gets emitted via HTTP-01.
  // This is the SSL strategy for *.aimily.shop because:
  //   - Cloudflare Free doesn't allow proxied wildcard records (Business+ only)
  //   - Vercel can't emit a wildcard SSL cert without DNS-01 challenge access
  //   - Cloudflare Registrar locks NS to Cloudflare nameservers (no NS swap)
  // Per-subdomain SSL via Vercel API is the standard pattern (Linktree, Substack).
  // Vercel emits a single-host cert in 30-90s once it sees DNS routes traffic.
  const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN ?? 'aimily.shop';
  const fullDomain = `${normalizedSubdomain}.${baseDomain}`;
  const vercelResult = await registerStorefrontDomain(fullDomain);
  if (!vercelResult.ok) {
    // Soft-fail: the storefront row exists in DB but Vercel didn't accept the
    // domain (transient API error, rate limit, etc.). The user gets a warning
    // and can retry publish. We do NOT roll back the DB row — the storefront
    // is already "published" semantically; only SSL is pending.
    console.error('[ecom/publish] Vercel register failed:', vercelResult.error);
  }

  // Cache invalidation (Next.js 16 requires explicit profile)
  revalidateTag(`storefront-${storefrontId}`, 'default');

  // Re-fetch the full row for the response
  const { data: storefront } = await supabaseAdmin
    .from('storefronts')
    .select('*')
    .eq('id', storefrontId)
    .single();

  const publicUrl = buildStorefrontUrl(normalizedSubdomain);

  return NextResponse.json(
    {
      storefront,
      publicUrl,
      sslPending: !vercelResult.ok || !vercelResult.alreadyExists,
      sslWarning: vercelResult.ok ? undefined : 'SSL provisioning failed — please retry publish in 1 minute.',
    },
    { status: existing ? 200 : 201 },
  );
}
