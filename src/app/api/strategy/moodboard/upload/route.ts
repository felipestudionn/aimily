/**
 * POST /api/strategy/moodboard/upload
 *
 * Upload a moodboard reference image. Returns a private signed URL the
 * brief discovery endpoint can fetch back. Path convention:
 *
 *   <tenant_id>/moodboards/<timestamp>-<safe_filename>
 *
 * Bucket `strategy-uploads` is private; RLS keys on the tenant_id path
 * segment. Signed URLs valid for 1 year so subsequent runs can reuse the
 * same moodboard images without re-uploading.
 *
 * TWO INPUT MODES:
 *   1. multipart/form-data with `file` + `tenant_slug` — direct user upload.
 *   2. application/json with `{ source_url, tenant_slug, source_name? }` —
 *      server-side fetch (used by Pinterest pin import in CreativeBlock so
 *      we don't expose the user to CORS or pin-token issues).
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

interface NormalisedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sourceName: string;
}

async function normaliseBuffer(buf: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharpInstance = sharp(buf, { failOn: 'none' }).rotate();
  const metadata = await sharpInstance.metadata();
  const targetWidth = metadata.width && metadata.width > 2048 ? 2048 : metadata.width;
  const pipeline = sharpInstance.resize(targetWidth, undefined, { fit: 'inside' }).jpeg({
    quality: 88,
    progressive: true,
  });
  const buffer = await pipeline.toBuffer();
  const outMeta = await sharp(buffer).metadata();
  return { buffer, width: outMeta.width ?? 0, height: outMeta.height ?? 0 };
}

export async function POST(req: NextRequest) {
  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');

  let tenantSlug = '';
  let image: NormalisedImage | null = null;

  if (isJson) {
    let body: { source_url?: string; tenant_slug?: string; source_name?: string } | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    tenantSlug = typeof body?.tenant_slug === 'string' ? body.tenant_slug : '';
    const sourceUrl = typeof body?.source_url === 'string' ? body.source_url : '';
    if (!tenantSlug || !sourceUrl) {
      return NextResponse.json(
        { error: 'tenant_slug and source_url are required' },
        { status: 400 }
      );
    }
    // Authorize BEFORE fetching the URL so unauthorized callers can't use
    // this endpoint as a remote-fetch proxy.
    const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
    if (!access.ok) return access.response;

    // Fetch the remote image server-side. Pinterest pin URLs return plain
    // image bytes; we keep this generic so any HTTP(S) image URL works.
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Source fetch failed (${res.status})` },
          { status: 400 }
        );
      }
      const ct = (res.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (!ct.startsWith('image/')) {
        return NextResponse.json(
          { error: `Source is not an image (content-type: ${ct})` },
          { status: 415 }
        );
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) {
        return NextResponse.json(
          { error: `Source too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
          { status: 413 }
        );
      }
      const norm = await normaliseBuffer(buf);
      const sourceName =
        body?.source_name?.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200) ||
        `pin-${Date.now()}.jpg`;
      image = { ...norm, sourceName };
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Failed to fetch + normalise source image', detail: err?.message || String(err) },
        { status: 502 }
      );
    }

    const path = `${access.tenant.id}/moodboards/${Date.now()}-${image.sourceName}.jpg`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, image.buffer, { contentType: 'image/jpeg', upsert: false });
    if (upErr) {
      return NextResponse.json(
        { error: 'Storage upload failed', detail: upErr.message },
        { status: 500 }
      );
    }
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
      width: image.width,
      height: image.height,
    });
  }

  // FormData (file upload) branch
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const tenantSlugField = form.get('tenant_slug');
  if (typeof tenantSlugField !== 'string' || !tenantSlugField) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }
  tenantSlug = tenantSlugField;

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
  let normalised: Buffer;
  let outWidth = 0;
  let outHeight = 0;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const norm = await normaliseBuffer(buf);
    normalised = norm.buffer;
    outWidth = norm.width;
    outHeight = norm.height;
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
