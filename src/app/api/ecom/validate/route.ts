import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateStorefront } from '@/lib/storefront/validate';
import type { Storefront } from '@/types/storefront';

/* ═══════════════════════════════════════════════════════════════════
   GET /api/ecom/validate?collectionPlanId=X
   Returns the structural validation pass for a storefront publish:
     { canPublish: boolean, errors: [...], warnings: [...], counts: {...} }

   Pure read — no mutations. The same util backs the publish endpoint.
   Intended for live UX feedback inside EcomHub: the user sees blockers
   before clicking Publish.
   ═══════════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const planId = req.nextUrl.searchParams.get('collectionPlanId');
  if (!planId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, planId, 'view_all');
  if (!ownership.authorized) return ownership.error;

  // If a storefront row already exists for this collection, use its current
  // payment_provider + sku_payment_map for the buy-button checks. Otherwise
  // default to lookbook_only (no buy-button warnings yet).
  const { data: storefront } = await supabaseAdmin
    .from('storefronts')
    .select('payment_provider, sku_payment_map')
    .eq('collection_plan_id', planId)
    .maybeSingle();

  const result = await validateStorefront(planId, {
    paymentProvider: (storefront?.payment_provider as Storefront['payment_provider']) ?? 'lookbook_only',
    skuPaymentMap: (storefront?.sku_payment_map as Record<string, { buyButtonId?: string; productHandle?: string }>) ?? {},
  });

  return NextResponse.json(result);
}
