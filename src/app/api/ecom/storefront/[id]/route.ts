/* ═══════════════════════════════════════════════════════════════════
   GET /api/ecom/storefront/[id]
   PATCH /api/ecom/storefront/[id]   — edit theme/payment/SEO
   POST /api/ecom/storefront/[id]/unpublish (separate route in Sprint 2)

   Auth + ownership required for both methods.
   PATCH does NOT change subdomain (use the publish endpoint to change subdomain).
   ═══════════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ALL_THEME_IDS, type ThemeId, type PaymentProvider } from '@/types/storefront';

const VALID_PROVIDERS: PaymentProvider[] = ['stripe_buy_button', 'shopify_buy', 'lookbook_only'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadOwnedStorefront(storefrontId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('storefronts')
    .select('*')
    .eq('id', storefrontId)
    .maybeSingle();

  if (error || !data) {
    return { storefront: null, error: NextResponse.json({ error: 'Storefront not found' }, { status: 404 }) };
  }

  const ownership = await verifyCollectionOwnership(userId, data.collection_plan_id, 'view_all');
  if (!ownership.authorized) {
    return { storefront: null, error: ownership.error };
  }

  return { storefront: data, error: null };
}

export async function GET(_: Request, ctx: RouteContext) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { id } = await ctx.params;
  const { storefront, error } = await loadOwnedStorefront(id, user.id);
  if (error) return error;

  return NextResponse.json({ storefront });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { id } = await ctx.params;
  const { storefront, error } = await loadOwnedStorefront(id, user.id);
  if (error) return error;

  let body: {
    themeId?: string;
    paymentProvider?: string;
    paymentConfig?: Record<string, unknown>;
    skuPaymentMap?: Record<string, unknown>;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoOgImageUrl?: string | null;
    seoKeywords?: string[] | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.themeId !== undefined) {
    if (!(ALL_THEME_IDS as readonly string[]).includes(body.themeId)) {
      return NextResponse.json({ error: 'Invalid themeId' }, { status: 400 });
    }
    update.theme_id = body.themeId as ThemeId;
  }

  if (body.paymentProvider !== undefined) {
    if (!VALID_PROVIDERS.includes(body.paymentProvider as PaymentProvider)) {
      return NextResponse.json({ error: 'Invalid paymentProvider' }, { status: 400 });
    }
    update.payment_provider = body.paymentProvider as PaymentProvider;
  }
  if (body.paymentConfig !== undefined) update.payment_config = body.paymentConfig;
  if (body.skuPaymentMap !== undefined) update.sku_payment_map = body.skuPaymentMap;
  if (body.seoTitle !== undefined) update.seo_title = body.seoTitle;
  if (body.seoDescription !== undefined) update.seo_description = body.seoDescription;
  if (body.seoOgImageUrl !== undefined) update.seo_og_image_url = body.seoOgImageUrl;
  if (body.seoKeywords !== undefined) update.seo_keywords = body.seoKeywords;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  // If theme is changing on a published storefront, audit it
  const isThemeChange = update.theme_id && update.theme_id !== storefront.theme_id;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('storefronts')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updated) {
    console.error('[ecom/storefront PATCH] update failed:', updateError);
    return NextResponse.json({ error: 'Failed to update storefront' }, { status: 500 });
  }

  if (isThemeChange) {
    await supabaseAdmin.from('storefront_publishes').insert({
      storefront_id: id,
      action: 'theme_change',
      triggered_by: user.id,
      payload_snapshot: { from: storefront.theme_id, to: update.theme_id },
    });
  }

  revalidateTag(`storefront-${id}`, 'default');

  return NextResponse.json({ storefront: updated });
}
