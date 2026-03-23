/**
 * Supabase Storage utilities for collection assets.
 *
 * Bucket: collection-assets (public)
 * Path convention: {collection_plan_id}/{asset_type}/{filename}
 *
 * Asset types: moodboard, render, lifestyle, tryon, sketch, video, model
 */

import { supabaseAdmin } from './supabase-admin';

const BUCKET = 'collection-assets';

export type AssetType = 'moodboard' | 'render' | 'lifestyle' | 'tryon' | 'sketch' | 'video' | 'model';

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
  collection_plan_id: string;
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

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Upload from an external URL (e.g. FAL CDN) — downloads and re-uploads to Supabase.
 */
export async function uploadFromUrl(
  collectionPlanId: string,
  assetType: AssetType,
  sourceUrl: string,
  fileName?: string
): Promise<UploadResult> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
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
 * Delete an asset from storage + database.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  // Get the record to find storage path
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
