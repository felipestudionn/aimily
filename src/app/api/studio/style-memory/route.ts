import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/style-memory

   Toggle is_style_memory flag on a Studio asset. The ★ button in the
   gallery POSTs here with { asset_id, marked, role? }.

     POST   { asset_id: UUID, marked: true, role?: 'principal' | 'reference' | 'color_anchor' }
            → flag set, returns updated asset row

     DELETE { asset_id: UUID }
            → flag unset (is_style_memory = false, role cleared)

   RLS on collection_assets enforces project ownership; we just write the
   flag here. The flag is read by `loadStudioContext` on subsequent
   generations and injected as style references in the prompt.
   ═══════════════════════════════════════════════════════════════════════════ */

interface PostBody {
  asset_id: string;
  marked: boolean;
  role?: 'principal' | 'reference' | 'color_anchor';
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json()) as PostBody;
  if (!body.asset_id) {
    return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
  }
  if (typeof body.marked !== 'boolean') {
    return NextResponse.json({ error: 'marked must be boolean' }, { status: 400 });
  }
  if (body.role && !['principal', 'reference', 'color_anchor'].includes(body.role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify asset belongs to a studio_project owned by this user
  const { data: asset, error: assetError } = await supabase
    .from('collection_assets')
    .select('id, studio_project_id')
    .eq('id', body.asset_id)
    .single();

  if (assetError || !asset || !asset.studio_project_id) {
    return NextResponse.json({ error: 'Asset not found or not a Studio asset' }, { status: 404 });
  }

  // RLS will block update if the user doesn't own the studio_project — we
  // still issue the update; the row count check below confirms it landed.
  const { data, error } = await supabase
    .from('collection_assets')
    .update({
      is_style_memory: body.marked,
      style_memory_role: body.marked ? body.role || 'principal' : null,
    })
    .eq('id', body.asset_id)
    .select('id, is_style_memory, style_memory_role')
    .single();

  if (error || !data) {
    console.error('[Studio style-memory POST] error:', error);
    return NextResponse.json({ error: 'Failed to update style memory flag' }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get('asset_id');
  if (!assetId) {
    return NextResponse.json({ error: 'asset_id query param is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collection_assets')
    .update({ is_style_memory: false, style_memory_role: null })
    .eq('id', assetId)
    .select('id, is_style_memory')
    .single();

  if (error || !data) {
    console.error('[Studio style-memory DELETE] error:', error);
    return NextResponse.json({ error: 'Failed to unmark' }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}
