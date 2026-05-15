import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/download

   GET ?asset_id=UUID&format_key=KEY
     → proxies the requested image with Content-Disposition: attachment.

   Why a proxy instead of a direct Supabase URL: Supabase storage public
   URLs don't set `Content-Disposition: attachment`, which means the
   browser's HTML5 download attribute is best-effort cross-origin. The
   proxy guarantees the file is offered as a download with a sensible
   filename like "{brand}-{asset}-instagram-square.jpg" across browsers.

   format_key:
     - "master" → returns the original master image from collection_assets.url
     - one of the 12 STUDIO_FORMATS keys (instagram-square, etc.)

   Ownership: asset → studio_project.user_id chain, RLS-enforced.
   ═══════════════════════════════════════════════════════════════════════════ */

const FORMAT_EXT_MAP: Record<string, string> = {
  'instagram-square': 'jpg',
  'instagram-portrait': 'jpg',
  'instagram-story': 'jpg',
  'tiktok-vertical': 'jpg',
  'pinterest': 'jpg',
  'facebook-ad': 'jpg',
  'linkedin': 'jpg',
  'twitter': 'jpg',
  'web-hero': 'jpg',
  'ecommerce-pdp': 'jpg',
  'print-a4': 'jpg',
  'email-banner': 'jpg',
};

function sanitiseSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'aimily';
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const assetId = req.nextUrl.searchParams.get('asset_id');
  const formatKey = req.nextUrl.searchParams.get('format_key') || 'master';

  if (!assetId) {
    return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
  }
  if (formatKey !== 'master' && !FORMAT_EXT_MAP[formatKey]) {
    return NextResponse.json({ error: 'invalid format_key' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Verify asset ownership + load master url + brand name for filename
  const { data: asset, error: assetError } = await supabase
    .from('collection_assets')
    .select('id, studio_project_id, url, name')
    .eq('id', assetId)
    .single();

  if (assetError || !asset || !asset.studio_project_id) {
    return NextResponse.json({ error: 'asset not found' }, { status: 404 });
  }

  const { data: project } = await supabase
    .from('studio_projects')
    .select('id, user_id, brand_name')
    .eq('id', asset.studio_project_id)
    .single();

  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ error: 'asset not found' }, { status: 404 });
  }

  // 2. Resolve the source URL
  let sourceUrl: string;
  let ext: string;
  if (formatKey === 'master') {
    sourceUrl = asset.url;
    ext = 'png';
  } else {
    const { data: fmt } = await supabase
      .from('studio_output_formats')
      .select('storage_url')
      .eq('asset_id', assetId)
      .eq('format_key', formatKey)
      .single();
    if (!fmt) {
      return NextResponse.json({ error: 'format not generated yet' }, { status: 404 });
    }
    sourceUrl = fmt.storage_url;
    ext = FORMAT_EXT_MAP[formatKey];
  }

  // 3. Fetch + restream with attachment headers
  const upstream = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'source fetch failed' }, { status: 502 });
  }
  const contentType = upstream.headers.get('content-type') || (ext === 'png' ? 'image/png' : 'image/jpeg');
  const filename = `${sanitiseSlug(project.brand_name || 'aimily')}-${sanitiseSlug(asset.name || 'output')}-${formatKey}.${ext}`;
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
