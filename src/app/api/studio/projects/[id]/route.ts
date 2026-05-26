import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Aimily Studio · per-project endpoint
 *
 *   GET    /api/studio/projects/[id]  → full project + recent assets + pack stats
 *   PATCH  /api/studio/projects/[id]  → update brand info
 *   DELETE /api/studio/projects/[id]  → soft delete (archived_at = now())
 */

interface PatchBody {
  brand_name?: string;
  brand_logo_url?: string | null;
  brand_palette?: string[];
  brand_fabric_refs?: Array<{ url: string; label?: string }>;
}

async function loadProjectForUser(userId: string, projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('studio_projects')
    .select('id, user_id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs, created_at, updated_at, archived_at')
    .eq('id', projectId)
    .single();
  if (error || !data) return null;
  if (data.user_id !== userId) return null;
  return data;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const project = await loadProjectForUser(user!.id, id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supabase = await createClient();

  const [assetsResult, creditResult] = await Promise.all([
    supabase
      .from('collection_assets')
      .select('id, asset_type, name, url, created_at, is_style_memory, style_memory_role, metadata')
      .eq('studio_project_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
    // Global balance (migration 077 — no more per-project pools).
    supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', project.user_id)
      .maybeSingle(),
  ]);

  const assets = assetsResult.data || [];
  const outputs_remaining = creditResult.data?.balance ?? 0;

  return NextResponse.json({
    project,
    assets,
    purchases: [], // legacy field — purchases are now in credit_ledger
    outputs_remaining,
    pack_count: 0,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const project = await loadProjectForUser(user!.id, id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = (await req.json()) as PatchBody;
  const patch: Record<string, unknown> = {};

  if (typeof body.brand_name === 'string') {
    const trimmed = body.brand_name.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      return NextResponse.json({ error: 'brand_name must be 1-200 chars' }, { status: 400 });
    }
    patch.brand_name = trimmed;
  }
  if (body.brand_logo_url === null || typeof body.brand_logo_url === 'string') {
    patch.brand_logo_url = body.brand_logo_url || null;
  }
  if (Array.isArray(body.brand_palette)) {
    patch.brand_palette = body.brand_palette
      .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c))
      .slice(0, 5);
  }
  if (Array.isArray(body.brand_fabric_refs)) {
    patch.brand_fabric_refs = body.brand_fabric_refs
      .filter((r) => r && typeof r.url === 'string' && r.url.startsWith('http'))
      .slice(0, 10)
      .map((r) => ({ url: r.url, label: typeof r.label === 'string' ? r.label.slice(0, 100) : undefined }));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ project }, { status: 200 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('studio_projects')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user!.id)
    .select('id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[Studio project PATCH] error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const supabase = await createClient();
  const { error } = await supabase
    .from('studio_projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user!.id);

  if (error) {
    console.error('[Studio project DELETE] error:', error);
    return NextResponse.json({ error: 'Failed to archive project' }, { status: 500 });
  }

  return NextResponse.json({ archived: true });
}
