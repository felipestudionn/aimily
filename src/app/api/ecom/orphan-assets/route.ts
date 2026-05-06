import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

/* ═══════════════════════════════════════════════════════════════════
   GET /api/ecom/orphan-assets?collectionPlanId=X
   List storefront-bound assets (editorial / lifestyle / still_life)
   that lack metadata.sku_id. Surfaces orphans so the user can
   self-heal: assign each to a SKU (so it shows on that PDP),
   reclassify as a non-storefront type, or delete.

   Why this exists: pre-2026-05-06 the upload endpoints didn't write
   metadata.sku_id, so historical assets (incl. style references that
   were misclassified as 'editorial') ended up findable in Aimily but
   invisible on the public storefront PDP filter. This endpoint +
   OrphanAssetsLinker UI is the framework-grade self-heal pattern.
   ═══════════════════════════════════════════════════════════════════ */

const STOREFRONT_LINKED_TYPES = ['editorial', 'lifestyle', 'still_life'] as const;

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const planId = req.nextUrl.searchParams.get('collectionPlanId');
  if (!planId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }

  const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
  if (!authorized) return ownerError;

  // Pull all storefront-linked types for this collection, then filter
  // out the ones that already have metadata.sku_id. Doing the filter
  // in JS rather than SQL avoids a JSONB ?-operator quirk on RLS-
  // hardened queries — and keeps the surface tiny (typically <50 rows).
  const { data, error } = await supabaseAdmin
    .from('collection_assets')
    .select('id, asset_type, name, description, url, thumbnail_url, metadata, created_at')
    .eq('collection_plan_id', planId)
    .is('deleted_at', null)
    .in('asset_type', STOREFRONT_LINKED_TYPES as unknown as string[])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[orphan-assets GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orphans = (data ?? []).filter((row) => {
    const meta = row.metadata as Record<string, unknown> | null;
    return !meta || !meta.sku_id || typeof meta.sku_id !== 'string' || !meta.sku_id;
  });

  return NextResponse.json({ orphans });
}
