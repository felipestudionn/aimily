import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Aimily Studio · /api/studio/upload
 *
 *   POST  multipart/form-data
 *     file:               File (image/png|jpeg|webp|heic|heif, max 25MB)
 *     studio_project_id:  UUID (must belong to the authenticated user)
 *     kind:               'product' | 'reference' (used as folder)
 *
 *   Returns: { url: string, storage_path: string, width, height }
 *
 * The file is normalised through sharp (rotate from EXIF, max 2048px,
 * jpeg quality 90) to neutralise giant phone uploads. Uploaded to the
 * `studio-uploads` bucket under `${projectId}/${kind}/${ts}-${rand}.jpg`.
 * Returns a 1-year signed URL — the generate endpoint then passes that
 * URL to gpt-image-1.5 as `image[]`.
 */

const BUCKET = 'studio-uploads';
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
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  const projectId = form.get('studio_project_id');
  const kind = form.get('kind');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (typeof projectId !== 'string' || !projectId) {
    return NextResponse.json({ error: 'studio_project_id is required' }, { status: 400 });
  }
  if (kind !== 'product' && kind !== 'reference') {
    return NextResponse.json({ error: 'kind must be product or reference' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }

  // Verify project ownership (RLS would also block, but be explicit)
  const { data: project } = await supabaseAdmin
    .from('studio_projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ error: 'studio_project not found' }, { status: 404 });
  }

  // Normalise: EXIF rotate, downsize to 2048 max, re-encode JPEG q=90
  let normalised: Buffer;
  let outWidth = 0;
  let outHeight = 0;
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(raw, { failOn: 'none' })
      .rotate()
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true });
    normalised = await pipeline.toBuffer();
    const meta = await sharp(normalised).metadata();
    outWidth = meta.width || 0;
    outHeight = meta.height || 0;
  } catch (e) {
    console.error('[Studio upload] sharp normalisation failed:', e);
    return NextResponse.json({ error: 'Could not process image' }, { status: 422 });
  }

  const rand = Math.random().toString(36).slice(2, 10);
  const storagePath = `${projectId}/${kind}/${Date.now()}-${rand}.jpg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, normalised, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (uploadError) {
    console.error('[Studio upload] storage upload failed:', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Sign for 1 year so the generate endpoint can fetch it directly
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 365 * 24 * 3600);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not sign URL' }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    storage_path: storagePath,
    width: outWidth,
    height: outHeight,
  });
}
