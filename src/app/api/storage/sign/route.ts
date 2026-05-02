import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { signShortReadUrl, type ThumbnailOptions } from '@/lib/storage';

/**
 * GET /api/storage/sign?assetId=...&w=400&h=400&q=80&ttl=300
 *
 * Returns a short-lived signed URL (default 60s) for an asset the caller is
 * authorized to read. Verifies ownership through the collection the asset
 * belongs to. Use this for any new UI that needs read access without
 * imprinting a 1-year URL on the row.
 *
 * For thumbnails, pass `w` and optionally `h` and `q` — Supabase serves the
 * transformed image (Image Transformations, Pro plan) so we drop bandwidth
 * ~10× without changing the original.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const url = new URL(req.url);
  const assetId = url.searchParams.get('assetId');
  if (!assetId) {
    return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
  }

  const ttlRaw = url.searchParams.get('ttl');
  const ttlSeconds = ttlRaw ? Math.max(15, Math.min(3600, parseInt(ttlRaw, 10) || 60)) : 60;

  const widthRaw = url.searchParams.get('w');
  const heightRaw = url.searchParams.get('h');
  const qualityRaw = url.searchParams.get('q');
  const transform: ThumbnailOptions | undefined = widthRaw
    ? {
        width: Math.max(1, Math.min(2500, parseInt(widthRaw, 10))),
        ...(heightRaw ? { height: Math.max(1, Math.min(2500, parseInt(heightRaw, 10))) } : {}),
        ...(qualityRaw ? { quality: Math.max(20, Math.min(100, parseInt(qualityRaw, 10))) } : {}),
      }
    : undefined;

  const { data: asset, error: assetErr } = await supabaseAdmin
    .from('collection_assets')
    .select('id, collection_plan_id, metadata, deleted_at')
    .eq('id', assetId)
    .single();

  if (assetErr || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  if (asset.deleted_at) {
    return NextResponse.json({ error: 'Asset has been deleted' }, { status: 410 });
  }

  const ownership = await verifyCollectionOwnership(user.id, asset.collection_plan_id);
  if (!ownership.authorized) return ownership.error;

  const storagePath = (asset.metadata as Record<string, unknown> | null)?.storage_path as string | undefined;
  if (!storagePath) {
    return NextResponse.json({ error: 'Asset has no storage_path' }, { status: 500 });
  }

  try {
    const signedUrl = await signShortReadUrl(storagePath, ttlSeconds, transform);
    return NextResponse.json(
      { url: signedUrl, expiresIn: ttlSeconds },
      {
        headers: {
          // Browser/CDN cache can hold the SAME signed URL for the rest of
          // its life — we don't gain anything by refusing to cache it.
          'Cache-Control': `private, max-age=${Math.max(0, ttlSeconds - 5)}`,
        },
      },
    );
  } catch (e) {
    console.error('[storage/sign] failed', { assetId, error: e });
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 });
  }
}
