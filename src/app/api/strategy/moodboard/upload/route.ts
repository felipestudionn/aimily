/**
 * POST /api/strategy/moodboard/upload
 *
 * Upload a moodboard reference image. Returns a public-ish signed URL the
 * brief discovery endpoint can fetch back. Path convention:
 *
 *   <tenant_id>/moodboards/<timestamp>-<safe_filename>
 *
 * Bucket `strategy-uploads` is private; RLS keys on the tenant_id path
 * segment. Signed URLs valid for 1 year so subsequent runs can reuse the
 * same moodboard images without re-uploading.
 *
 * Body (multipart/form-data):
 *   file:        File (image/jpeg|png|webp|heic, max 25 MB)
 *   tenant_slug: string
 *
 * Returns: { storage_path, signed_url, mime_type, width?, height? }
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'strategy-uploads';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const tenantSlug = form.get('tenant_slug');
  if (typeof tenantSlug !== 'string' || !tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: `Unsupported file type: ${mime}` }, { status: 415 });
  }

  // Normalise via sharp: EXIF rotate, max 2048px, re-encode JPEG q=88.
  // This guarantees a clean image suitable for Claude vision and bounded
  // file size regardless of what the customer uploaded.
  let normalised: Buffer;
  let outWidth = 0;
  let outHeight = 0;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const sharpInstance = sharp(buf, { failOn: 'none' }).rotate();
    const metadata = await sharpInstance.metadata();
    const targetWidth = metadata.width && metadata.width > 2048 ? 2048 : metadata.width;
    const pipeline = sharpInstance.resize(targetWidth, undefined, { fit: 'inside' }).jpeg({
      quality: 88,
      progressive: true,
    });
    normalised = await pipeline.toBuffer();
    const outMeta = await sharp(normalised).metadata();
    outWidth = outMeta.width ?? 0;
    outHeight = outMeta.height ?? 0;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to normalise image', detail: err?.message || String(err) },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200) || 'mood.jpg';
  const path = `${access.tenant.id}/moodboards/${Date.now()}-${safeName}.jpg`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, normalised, { contentType: 'image/jpeg', upsert: false });
  if (upErr) {
    return NextResponse.json(
      { error: 'Storage upload failed', detail: upErr.message },
      { status: 500 }
    );
  }

  // Signed URL valid for 1 year — re-uses the same image across runs without
  // re-uploading. RLS on the bucket gates read access by tenant membership
  // (the signed URL bypasses RLS but still requires our own gate).
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: 'Signed URL creation failed', detail: signErr?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    storage_path: path,
    signed_url: signed.signedUrl,
    mime_type: 'image/jpeg',
    width: outWidth,
    height: outHeight,
  });
}
