/**
 * Supabase Storage utilities for collection assets.
 *
 * Bucket: collection-assets (private — flipped 2026-05-01)
 * Reads use 1-year signed URLs (createSignedUrl). The bucket was migrated
 * from public to private to stop drop designs leaking via guessable URLs.
 * Path convention: {collection_plan_id}/{asset_type}/{filename}
 *
 * Asset types:
 *   - moodboard  — creative phase moodboard imagery
 *   - render     — design phase 3D product render (gpt-image-1.5)
 *   - sketch     — design phase technical sketch
 *   - lifestyle  — legacy: still-life product shots. Kept for back-compat
 *                  with rows uploaded before the 2026-04-11 split.
 *   - still_life — marketing: product alone as object, zero humans
 *                  (/api/ai/freepik/still-life)
 *   - editorial  — marketing: on-model narrative scene with human model
 *                  (/api/ai/freepik/editorial)
 *   - tryon      — marketing: clean brand-model catalog shot
 *                  (/api/ai/freepik/tryon)
 *   - model      — marketing: brand model portraits
 *                  (/api/ai/freepik/brand-model)
 *   - video      — marketing: Kling 2.1 generated video assets
 */

import { supabaseAdmin } from './supabase-admin';

const BUCKET = 'collection-assets';
/* 1-year TTL for signed read URLs. The bucket is private (see header
   comment); we hand out long-lived signed URLs so the existing
   `<img src=...>` consumers continue to work without an extra
   round-trip. Refresh strategy is documented in
   scripts/migrate-storage-to-private.ts. */
const SIGNED_URL_TTL_SECONDS = 365 * 24 * 3600;

async function signStoragePath(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign storage URL for ${storagePath}: ${error?.message ?? 'no signedUrl'}`);
  }
  return data.signedUrl;
}

export interface ThumbnailOptions {
  /** Target width in pixels, 1–2500. Defaults to 800. */
  width?: number;
  /** Target height in pixels, 1–2500. Optional — omit to keep aspect ratio. */
  height?: number;
  /** JPEG/WebP quality, 20–100. Defaults to 75 for thumbnails. */
  quality?: number;
  /** Resize mode. `cover` (default) crops; `contain` fits inside; `fill` stretches. */
  resize?: 'cover' | 'contain' | 'fill';
  /** Seconds until the URL expires. Defaults to 1 hour for thumbnails. */
  ttlSeconds?: number;
}

/**
 * Sign a Storage URL with on-the-fly image transform (Pro feature).
 * Use this for grid/lookbook/moodboard tiles and any UI that renders
 * a small version of a 4 MB original — Supabase serves a WebP at the
 * exact dimensions, dropping bandwidth ~10×.
 *
 * Pricing: 100 origin images included in Pro/mo, $5 per 1000 after.
 * One unique source path counts as one origin image regardless of how
 * many transform variants we request from it.
 *
 * Source: https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export async function signThumbnailUrl(
  storagePath: string,
  opts: ThumbnailOptions = {},
): Promise<string> {
  const ttl = opts.ttlSeconds ?? 3600;
  const transform: { width: number; height?: number; quality: number; resize: 'cover' | 'contain' | 'fill' } = {
    width: opts.width ?? 800,
    quality: opts.quality ?? 75,
    resize: opts.resize ?? 'cover',
  };
  if (opts.height) transform.height = opts.height;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, ttl, { transform });
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign thumbnail URL for ${storagePath}: ${error?.message ?? 'no signedUrl'}`);
  }
  return data.signedUrl;
}

/**
 * Sign a short-lived read URL (default 60s) for an asset whose ownership has
 * already been verified. Use this from the new /api/storage/sign endpoint
 * when an authenticated UI needs a one-shot URL it can hand to <img> or to
 * a download client without exposing it for a year.
 *
 * For background loaders (CIS prompt context, AI handoff to Freepik) we
 * keep the long-lived URL on the row — those callers don't have a user
 * session to mint short URLs against.
 */
export async function signShortReadUrl(
  storagePath: string,
  ttlSeconds: number = 60,
  transform?: ThumbnailOptions,
): Promise<string> {
  const opts = transform
    ? {
        transform: {
          width: transform.width ?? 1200,
          ...(transform.height ? { height: transform.height } : {}),
          quality: transform.quality ?? 85,
          resize: transform.resize ?? 'cover',
        },
      }
    : undefined;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, ttlSeconds, opts);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign short URL for ${storagePath}: ${error?.message ?? 'no signedUrl'}`);
  }
  return data.signedUrl;
}

export type AssetType =
  | 'moodboard'
  | 'render'
  | 'sketch'
  | 'lifestyle'
  | 'still_life'
  | 'editorial'
  | 'tryon'
  | 'model'
  | 'video'
  | 'tech_pack'
  | 'material_swatch'
  | 'callout';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
];

/* Magic bytes for common image formats */
const MAGIC_BYTES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
};

function validateFileType(buffer: Buffer | Uint8Array, declaredMime: string): boolean {
  if (!ALLOWED_MIME_TYPES.some((t) => declaredMime.startsWith(t))) return false;
  // For images, verify magic bytes match declared type
  const magic = MAGIC_BYTES[declaredMime];
  if (magic) {
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) return false;
    }
  }
  return true;
}

export interface UploadResult {
  storagePath: string;
  publicUrl: string;
}

export interface AssetRecord {
  id?: string;
  /**
   * Required for Aimily 360 (collection-scoped). Migration 055 made this
   * NULLABLE at the DB level so Studio assets (which have studio_project_id)
   * can omit it. The DB CHECK constraint enforces exactly one of the two.
   */
  collection_plan_id?: string;
  /**
   * Required for Aimily Studio (project-scoped). Set when the asset is
   * generated via /api/studio/generate. Mutually exclusive with
   * collection_plan_id per migration 055.
   */
  studio_project_id?: string;
  phase: string;
  asset_type: string;
  name: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  file_size?: number;
  metadata?: Record<string, unknown>;
  uploaded_by?: string;
}

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the permanent public URL.
 */
export async function uploadToStorage(
  collectionPlanId: string,
  assetType: AssetType,
  fileName: string,
  fileBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Validate file type (MIME + magic bytes)
  if (!validateFileType(fileBuffer instanceof Buffer ? fileBuffer : Buffer.from(fileBuffer), contentType)) {
    throw new Error(`Invalid file type: ${contentType}`);
  }

  // Sanitize filename (prevent path traversal)
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${collectionPlanId}/${assetType}/${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  /* Bucket is private. Hand back a 1-year signed URL so existing
     <img src=…> consumers keep working — `publicUrl` field name kept
     for backwards compatibility with every caller in the app. */
  const signedUrl = await signStoragePath(storagePath);

  return {
    storagePath,
    publicUrl: signedUrl,
  };
}

/**
 * Upload from an external URL (e.g. FAL CDN) — downloads and re-uploads to Supabase.
 * The source URL is validated against the SSRF allowlist first, so the user
 * can't ask us to download from internal hosts or the cloud metadata service.
 * Also enforces a 50 MB hard cap to stop someone making us pull a 5 GB file.
 */
export async function uploadFromUrl(
  collectionPlanId: string,
  assetType: AssetType,
  sourceUrl: string,
  fileName?: string
): Promise<UploadResult> {
  const { ensureSafeExternalUrl } = await import('@/lib/url-allowlist');
  await ensureSafeExternalUrl(sourceUrl);

  const response = await fetch(sourceUrl, {
    /* 30s ceiling so a slow source can't tie up the function for the
       full 5-minute Vercel max. */
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const declaredSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  const MAX_BYTES = 50 * 1024 * 1024;
  if (declaredSize > MAX_BYTES) {
    throw new Error(`Source file too large: ${declaredSize} bytes (max ${MAX_BYTES})`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new Error(`Source file too large after download: ${arrayBuffer.byteLength} bytes`);
  }
  const buffer = Buffer.from(arrayBuffer);
  const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
  const name = fileName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  return uploadToStorage(collectionPlanId, assetType, name, buffer, contentType);
}

/**
 * Upload base64 data (e.g. sketches, moodboard images) to Supabase Storage.
 */
export async function uploadBase64(
  collectionPlanId: string,
  assetType: AssetType,
  base64Data: string,
  mimeType: string = 'image/png',
  fileName?: string
): Promise<UploadResult> {
  // Strip data URI prefix if present
  const raw = base64Data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(raw, 'base64');
  const ext = mimeType.split('/')[1] || 'png';
  const name = fileName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  return uploadToStorage(collectionPlanId, assetType, name, buffer, mimeType);
}

/**
 * Save asset metadata to collection_assets table.
 */
export async function saveAssetRecord(record: AssetRecord): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('collection_assets')
    .insert(record)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save asset record: ${error.message}`);
  }

  return data.id;
}

/**
 * Combined: upload file + save record. Returns public URL + record ID.
 */
export async function persistAsset(opts: {
  collectionPlanId: string;
  assetType: AssetType;
  name: string;
  description?: string;
  sourceUrl?: string;
  base64?: string;
  mimeType?: string;
  phase?: string;
  metadata?: Record<string, unknown>;
  uploadedBy?: string;
}): Promise<{ publicUrl: string; assetId: string }> {
  let upload: UploadResult;

  if (opts.sourceUrl) {
    upload = await uploadFromUrl(opts.collectionPlanId, opts.assetType, opts.sourceUrl);
  } else if (opts.base64) {
    upload = await uploadBase64(opts.collectionPlanId, opts.assetType, opts.base64, opts.mimeType);
  } else {
    throw new Error('Either sourceUrl or base64 is required');
  }

  const assetId = await saveAssetRecord({
    collection_plan_id: opts.collectionPlanId,
    phase: opts.phase || opts.assetType,
    asset_type: opts.assetType,
    name: opts.name,
    description: opts.description,
    url: upload.publicUrl,
    metadata: {
      ...opts.metadata,
      storage_path: upload.storagePath,
    },
    uploaded_by: opts.uploadedBy,
  });

  return { publicUrl: upload.publicUrl, assetId };
}

/**
 * Aimily Studio variant of persistAsset.
 *
 * Same flow as persistAsset but the storage path uses studio_project_id as
 * the container prefix, and the DB row is inserted with studio_project_id
 * (collection_plan_id stays NULL — migration 055 allows this).
 *
 * Used by /api/studio/generate to persist Studio outputs.
 */
export async function persistStudioAsset(opts: {
  studioProjectId: string;
  assetType: AssetType;
  name: string;
  description?: string;
  sourceUrl?: string;
  base64?: string;
  mimeType?: string;
  phase?: string;
  metadata?: Record<string, unknown>;
  uploadedBy?: string;
}): Promise<{ publicUrl: string; assetId: string }> {
  let upload: UploadResult;

  // We reuse the existing upload helpers — they use the first arg as the
  // path prefix in storage. For Studio we pass studioProjectId as that
  // prefix so paths look like `{studioProjectId}/{assetType}/{filename}`.
  if (opts.sourceUrl) {
    upload = await uploadFromUrl(opts.studioProjectId, opts.assetType, opts.sourceUrl);
  } else if (opts.base64) {
    upload = await uploadBase64(opts.studioProjectId, opts.assetType, opts.base64, opts.mimeType);
  } else {
    throw new Error('Either sourceUrl or base64 is required');
  }

  const assetId = await saveAssetRecord({
    studio_project_id: opts.studioProjectId,
    phase: opts.phase || opts.assetType,
    asset_type: opts.assetType,
    name: opts.name,
    description: opts.description,
    url: upload.publicUrl,
    metadata: {
      ...opts.metadata,
      storage_path: upload.storagePath,
    },
    uploaded_by: opts.uploadedBy,
  });

  return { publicUrl: upload.publicUrl, assetId };
}

/**
 * Soft-delete an asset.
 *
 * Behavior changed 2026-05-02 (Pro hardening D.6): the row is no longer
 * removed and the Storage object is no longer purged. We mark the row's
 * `deleted_at` so it stops appearing in the UI, but the bytes survive
 * in the bucket. The `cleanup-orphan-storage` cron sweeps anything with
 * `deleted_at < now() - 30 days` once a month, giving a real recovery
 * window for accidental deletes — Supabase's daily DB backups never
 * cover Storage objects, so without this we'd lose a customer's images
 * forever the moment they hit "delete".
 *
 * To restore inside the 30-day window: `update collection_assets
 * set deleted_at = null where id = '...'`. The 1-year signed URL on
 * `url` is still valid, so the asset reappears immediately.
 *
 * Idempotent: re-soft-deleting an already-deleted row is a no-op.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  await supabaseAdmin
    .from('collection_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assetId)
    .is('deleted_at', null);
}

/**
 * Hard-delete an asset (row + Storage object). Reserved for the
 * cleanup-orphan-storage cron and admin-only purge flows. UI code
 * should call `deleteAsset()` instead.
 */
export async function purgeAsset(assetId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('collection_assets')
    .select('metadata')
    .eq('id', assetId)
    .single();

  if (error || !data) return;

  const storagePath = (data.metadata as Record<string, unknown>)?.storage_path as string;
  if (storagePath) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
  }

  await supabaseAdmin.from('collection_assets').delete().eq('id', assetId);
}
