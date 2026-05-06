import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

/* ═══════════════════════════════════════════════════════════════════
   PATCH /api/ecom/orphan-assets/[id]
   Body (one of):
     { skuId: string }           → assign asset to SKU (sets metadata.sku_id)
     { assetType: 'callout' }    → reclassify as input/aux (excluded from
                                   storefront PDP filter)
     { delete: true }            → soft-delete (sets deleted_at)

   The asset must belong to a collection_plan owned by the user — we
   verify by joining via collection_assets.collection_plan_id.
   ═══════════════════════════════════════════════════════════════════ */

interface RouteParams { params: Promise<{ id: string }> }

const RECLASSIFY_TARGET = 'callout' as const;

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'asset id is required' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { skuId, assetType, delete: doDelete } = body as {
    skuId?: string; assetType?: string; delete?: boolean;
  };

  // Load the asset + verify ownership (asset → plan → user)
  const { data: asset, error: loadError } = await supabaseAdmin
    .from('collection_assets')
    .select('id, collection_plan_id, metadata, asset_type')
    .eq('id', id)
    .single();

  if (loadError || !asset) {
    return NextResponse.json({ error: 'asset not found' }, { status: 404 });
  }

  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id')
    .eq('id', asset.collection_plan_id as string)
    .single();

  if (!plan || plan.user_id !== user.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  // Apply the requested action
  if (doDelete === true) {
    const { error } = await supabaseAdmin
      .from('collection_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'deleted' });
  }

  if (assetType) {
    // Only allow reclassify TO callout — that's the documented escape
    // hatch for AI-input refs. Other reclassifications go through a
    // dedicated endpoint if/when needed.
    if (assetType !== RECLASSIFY_TARGET) {
      return NextResponse.json(
        { error: `Only reclassify to '${RECLASSIFY_TARGET}' is supported here.` },
        { status: 400 }
      );
    }
    const { error } = await supabaseAdmin
      .from('collection_assets')
      .update({ asset_type: RECLASSIFY_TARGET })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'reclassified', assetType: RECLASSIFY_TARGET });
  }

  if (typeof skuId === 'string' && skuId.length > 0) {
    // Verify the target SKU belongs to the same collection plan
    const { data: sku } = await supabaseAdmin
      .from('collection_skus')
      .select('id, collection_plan_id')
      .eq('id', skuId)
      .single();

    if (!sku || sku.collection_plan_id !== asset.collection_plan_id) {
      return NextResponse.json(
        { error: 'sku does not belong to the same collection_plan' },
        { status: 400 }
      );
    }

    const newMetadata = {
      ...((asset.metadata as Record<string, unknown> | null) ?? {}),
      sku_id: skuId,
    };
    const { error } = await supabaseAdmin
      .from('collection_assets')
      .update({ metadata: newMetadata })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'assigned', skuId });
  }

  return NextResponse.json(
    { error: 'one of {skuId, assetType: "callout", delete: true} is required' },
    { status: 400 }
  );
}
