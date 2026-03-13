import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { uploadBase64, uploadFromUrl, saveAssetRecord, type AssetType } from '@/lib/storage';

const VALID_ASSET_TYPES: AssetType[] = ['moodboard', 'render', 'lifestyle', 'tryon', 'sketch', 'video', 'model'];

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
 *   metadata?: Record<string, unknown>
 * }
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { collectionPlanId, assetType, name, base64, mimeType, sourceUrl, description, phase, metadata } = body;

    if (!collectionPlanId || !assetType || !name) {
      return NextResponse.json(
        { error: 'collectionPlanId, assetType, and name are required' },
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

    // Upload to Supabase Storage
    let upload;
    if (sourceUrl) {
      upload = await uploadFromUrl(collectionPlanId, assetType, sourceUrl);
    } else {
      upload = await uploadBase64(collectionPlanId, assetType, base64, mimeType || 'image/png');
    }

    // Save record to collection_assets
    const assetId = await saveAssetRecord({
      collection_plan_id: collectionPlanId,
      phase: phase || assetType,
      asset_type: assetType,
      name,
      description,
      url: upload.publicUrl,
      metadata: {
        ...metadata,
        storage_path: upload.storagePath,
        original_source: sourceUrl || 'base64_upload',
      },
      uploaded_by: user.id,
    });

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
