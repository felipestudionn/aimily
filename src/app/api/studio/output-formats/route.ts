import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/output-formats

   GET ?asset_id=UUID
     → returns the 12 channel-derived formats for a given Studio asset.

   Read-only. Ownership chain: collection_assets → studio_projects.user_id.
   RLS on collection_assets enforces this transparently when called via the
   user-scoped Supabase client.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const assetId = req.nextUrl.searchParams.get('asset_id');
  if (!assetId) {
    return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Verify the asset belongs to a studio_project owned by this user.
  const { data: asset, error: assetError } = await supabase
    .from('collection_assets')
    .select('id, studio_project_id, url, name, asset_type, metadata, created_at')
    .eq('id', assetId)
    .single();

  if (assetError || !asset || !asset.studio_project_id) {
    return NextResponse.json({ error: 'asset not found' }, { status: 404 });
  }

  const { data: project, error: projError } = await supabase
    .from('studio_projects')
    .select('id, user_id')
    .eq('id', asset.studio_project_id)
    .single();

  if (projError || !project || project.user_id !== user!.id) {
    return NextResponse.json({ error: 'asset not found' }, { status: 404 });
  }

  // 2. Load the 12 derived formats.
  const { data: formats } = await supabase
    .from('studio_output_formats')
    .select('format_key, storage_url, width, height, file_size, created_at')
    .eq('asset_id', assetId)
    .order('format_key', { ascending: true });

  return NextResponse.json({
    asset: {
      id: asset.id,
      name: asset.name,
      url: asset.url,
      asset_type: asset.asset_type,
      created_at: asset.created_at,
      metadata: asset.metadata || null,
    },
    formats: formats || [],
  });
}
