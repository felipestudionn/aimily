import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/projects

   CRUD for studio_projects (the lite brand container per user).

     GET  /api/studio/projects        → list user's active projects
     POST /api/studio/projects        → create new project
                                        body: { brand_name, brand_logo_url?, brand_palette?, brand_fabric_refs? }

   Per-project endpoints live at /api/studio/projects/[id]:
     GET    → load full project + counts
     PATCH  → update brand info
     DELETE → soft delete (sets archived_at)

   RLS enforces ownership at the DB level — this endpoint just routes.

   Reference: .planning/studio/IMPLEMENTATION-PLAN.md §2.4
   ═══════════════════════════════════════════════════════════════════════════ */

interface CreateProjectBody {
  brand_name: string;
  brand_logo_url?: string;
  brand_palette?: string[];
  brand_fabric_refs?: Array<{ url: string; label?: string }>;
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('studio_projects')
    .select('id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs, created_at, updated_at')
    .eq('user_id', user!.id)
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Studio projects] list error:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }

  // Augment with outputs_remaining per project
  const projectIds = (data || []).map((p) => p.id);
  let purchasesByProject: Record<string, { remaining: number; pack_count: number }> = {};
  if (projectIds.length) {
    const { data: purchases } = await supabase
      .from('studio_purchases')
      .select('studio_project_id, outputs_allocated, outputs_consumed')
      .in('studio_project_id', projectIds);

    purchasesByProject = (purchases || []).reduce((acc, p) => {
      const id = p.studio_project_id as string;
      if (!acc[id]) acc[id] = { remaining: 0, pack_count: 0 };
      acc[id].remaining += Math.max(Number(p.outputs_allocated) - Number(p.outputs_consumed), 0);
      acc[id].pack_count += 1;
      return acc;
    }, {} as Record<string, { remaining: number; pack_count: number }>);
  }

  const projects = (data || []).map((p) => ({
    ...p,
    outputs_remaining: purchasesByProject[p.id]?.remaining || 0,
    pack_count: purchasesByProject[p.id]?.pack_count || 0,
  }));

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json()) as CreateProjectBody;

  if (!body.brand_name || typeof body.brand_name !== 'string' || body.brand_name.length < 1) {
    return NextResponse.json({ error: 'brand_name is required' }, { status: 400 });
  }
  if (body.brand_name.length > 200) {
    return NextResponse.json({ error: 'brand_name max 200 chars' }, { status: 400 });
  }

  // Sanitize optional fields
  const palette = Array.isArray(body.brand_palette)
    ? body.brand_palette.filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c)).slice(0, 5)
    : [];
  const fabricRefs = Array.isArray(body.brand_fabric_refs)
    ? body.brand_fabric_refs
        .filter((r) => r && typeof r.url === 'string' && r.url.startsWith('http'))
        .slice(0, 10)
        .map((r) => ({ url: r.url, label: typeof r.label === 'string' ? r.label.slice(0, 100) : undefined }))
    : [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('studio_projects')
    .insert({
      user_id: user!.id,
      brand_name: body.brand_name.trim(),
      brand_logo_url: body.brand_logo_url || null,
      brand_palette: palette,
      brand_fabric_refs: fabricRefs,
    })
    .select('id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[Studio projects] create error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }

  return NextResponse.json({ project: { ...data, outputs_remaining: 0, pack_count: 0 } }, { status: 201 });
}
