import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/download-zip

   GET ?asset_id=UUID
     → streams a ZIP containing the master image (PNG) + every generated
       channel format (JPG) for a single Studio output. ~6–7 MB typical
       (1 PNG @ 1024x1536 + 12 JPGs at varying resolutions).

   Why bundle: clicking 12 download buttons in a row is the actual UX
   complaint. One "Download all (ZIP)" CTA solves the whole download
   panel ergonomics in one click.

   Ownership: asset → studio_project.user_id (RLS-enforced).

   File naming inside the ZIP:
     /{brand}-{output}/master.png
     /{brand}-{output}/instagram-square.jpg
     /{brand}-{output}/instagram-portrait.jpg
     …
   ═══════════════════════════════════════════════════════════════════════════ */

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
  if (!assetId) {
    return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify asset ownership
  const { data: asset } = await supabase
    .from('collection_assets')
    .select('id, studio_project_id, url, name')
    .eq('id', assetId)
    .single();
  if (!asset || !asset.studio_project_id) {
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

  // Load all 12 format rows
  const { data: formats } = await supabase
    .from('studio_output_formats')
    .select('format_key, storage_url')
    .eq('asset_id', assetId);

  const brand = sanitiseSlug(project.brand_name || 'aimily');
  const name = sanitiseSlug(asset.name || 'output');
  const folder = `${brand}-${name}`;

  const zip = new JSZip();
  const dir = zip.folder(folder);
  if (!dir) {
    return NextResponse.json({ error: 'zip init failed' }, { status: 500 });
  }

  // Fetch master + every format in parallel. Bounded by 13 concurrent
  // fetches — small enough to be safe in a single Vercel function call.
  const sources: Array<{ filename: string; url: string }> = [
    { filename: 'master.png', url: asset.url },
    ...(formats || []).map((f) => ({
      filename: `${f.format_key}.jpg`,
      url: f.storage_url,
    })),
  ];

  await Promise.all(
    sources.map(async ({ filename, url }) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) {
          console.error(`[Studio download-zip] fetch failed for ${filename}: ${res.status}`);
          return;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        dir.file(filename, buf);
      } catch (e) {
        console.error(`[Studio download-zip] error for ${filename}:`, e);
      }
    })
  );

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${folder}.zip"`,
      'Cache-Control': 'private, max-age=60',
      'Content-Length': String(zipBuffer.byteLength),
    },
  });
}
