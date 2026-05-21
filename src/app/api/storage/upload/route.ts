import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { uploadBase64, uploadFromUrl, saveAssetRecord, type AssetType } from '@/lib/storage';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';

const VALID_ASSET_TYPES: AssetType[] = ['moodboard', 'render', 'lifestyle', 'tryon', 'sketch', 'video', 'model', 'still_life', 'editorial', 'tech_pack', 'material_swatch', 'callout'];

/**
 * POST /api/storage/upload
 *
 * Upload an asset (base64 or URL) to Supabase Storage + register in collection_assets.
 *
 * Body: {
 *   collectionPlanId: string (required)
 *   assetType: AssetType (required)
 *   name: string (required)
 *   base64?: string (for direct upload)
 *   mimeType?: string (for base64)
 *   sourceUrl?: string (for re-hosting external URLs)
 *   description?: string
 *   phase?: string
 *   skuId?: string                  ← top-level, auto-populates metadata.sku_id
 *                                     for storefront PDP join. Strongly
 *                                     encouraged for editorial/lifestyle/
 *                                     still_life/tryon/video; prevents
 *                                     orphan assets that the storefront
 *                                     can't find by SKU.
 *   metadata?: Record<string, unknown>
 * }
 *
 * Asset types that the storefront filters by metadata.sku_id (see
 * src/lib/storefront/load-storefront-data.ts:300):
 *   editorial · lifestyle · still_life
 *
 * For these types, callers should pass `skuId` whenever the asset
 * belongs to a specific SKU. Style references and AI inputs that are
 * not meant to appear on a SKU's PDP should use assetType='callout'
 * (intentional separation: AI-input vs AI-output).
 */
const SKU_LINKABLE_ASSET_TYPES = ['editorial', 'lifestyle', 'still_life', 'tryon', 'video'] as const;

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { collectionPlanId, tenantSlug, assetType, name, base64, mimeType, sourceUrl, description, phase, metadata, skuId } = body;

    if ((!collectionPlanId && !tenantSlug) || !assetType || !name) {
      return NextResponse.json(
        { error: 'Either collectionPlanId or tenantSlug is required, plus assetType and name' },
        { status: 400 }
      );
    }

    if (!VALID_ASSET_TYPES.includes(assetType)) {
      return NextResponse.json(
        { error: `Invalid assetType. Must be one of: ${VALID_ASSET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!base64 && !sourceUrl) {
      return NextResponse.json(
        { error: 'Either base64 or sourceUrl is required' },
        { status: 400 }
      );
    }

    // Auth + storage prefix · two contexts share this endpoint:
    //   1. Collection plans (Block 1) — verifyCollectionOwnership, storage
    //      prefix = collectionPlanId.
    //   2. Strategy tenants — requireStrategyAccess, storage prefix =
    //      tenant_id. Pictures land in the SAME 'collection-assets' bucket,
    //      just under <tenant_id>/<assetType>/<file> instead of
    //      <collectionPlanId>/<assetType>/<file>. No collection_assets row
    //      is written for tenant uploads (no FK to satisfy).
    let storagePrefix: string;
    let registerCollectionAsset = false;
    if (collectionPlanId) {
      const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
      if (!ownership.authorized) return ownership.error;
      storagePrefix = collectionPlanId;
      registerCollectionAsset = true;
    } else {
      const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
      if (!access.ok) return access.response;
      storagePrefix = access.tenant.id;
      registerCollectionAsset = false;
    }

    // Soft warning: SKU-linkable types should usually carry skuId. We log
    // when one is missing so we can spot framework regressions in audits
    // — but never block the upload (some flows persist before the SKU
    // exists, e.g. range-plan import).
    if (
      (SKU_LINKABLE_ASSET_TYPES as readonly string[]).includes(assetType) &&
      !skuId &&
      !(metadata?.sku_id)
    ) {
      console.warn(
        `[storage/upload] sku-linkable asset uploaded WITHOUT skuId — assetType=${assetType}, planId=${collectionPlanId}. ` +
        `This will not appear on any storefront PDP. Pass skuId or use assetType='callout' for AI-input refs.`
      );
    }

    // Upload to Supabase Storage — same bucket + same helpers regardless
    // of caller context. storagePrefix is either collectionPlanId or
    // tenant_id from the auth branch above.
    let upload;
    if (sourceUrl) {
      upload = await uploadFromUrl(storagePrefix, assetType, sourceUrl);
    } else {
      upload = await uploadBase64(storagePrefix, assetType, base64, mimeType || 'image/png');
    }

    let assetId: string | null = null;
    if (registerCollectionAsset) {
      // Block 1 path: also register in collection_assets so the asset is
      // discoverable from the collection workspace.
      assetId = await saveAssetRecord({
        collection_plan_id: storagePrefix,
        phase: phase || assetType,
        asset_type: assetType,
        name,
        description,
        url: upload.publicUrl,
        metadata: {
          ...metadata,
          storage_path: upload.storagePath,
          original_source: sourceUrl || 'base64_upload',
          ...(skuId ? { sku_id: skuId } : {}),
        },
        uploaded_by: user.id,
      });
    }

    return NextResponse.json({
      assetId,
      publicUrl: upload.publicUrl,
      storagePath: upload.storagePath,
    });
  } catch (error) {
    console.error('[Storage Upload] Error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
