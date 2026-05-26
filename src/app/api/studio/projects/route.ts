import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
  /**
   * When set, the new project soft-links to this collection as its brand
   * source. brand_name + brand_palette are then resolved live from the
   * collection's CIS at read time (see lib/studio/effective-brand.ts).
   * The values posted in this body still get stored as the local snapshot
   * fallback for the case the source collection is later deleted.
   */
  brand_source_collection_id?: string;
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

  // Migration 077: credits live in the user's global user_credits.balance
  // rather than a per-project pool. Every project now reports the same
  // global remaining count so the dashboard can show a single balance
  // (and consumers can show it however they want — total or per-card).
  const { data: creditRow } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user!.id)
    .maybeSingle();
  const outputs_remaining = creditRow?.balance ?? 0;

  const projects = (data || []).map((p) => ({
    ...p,
    outputs_remaining,
    pack_count: 0, // legacy field — kept for response back-compat
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

  // Verify the user owns the linked collection before storing the FK —
  // otherwise we'd let a malicious caller inherit brand from someone else's
  // collection (RLS on collection_decisions would block reads anyway, but
  // we want to fail loudly at create time, not silently at first render).
  let brandSourceCollectionId: string | null = null;
  if (body.brand_source_collection_id) {
    if (!/^[0-9a-f-]{36}$/i.test(body.brand_source_collection_id)) {
      return NextResponse.json({ error: 'brand_source_collection_id must be a uuid' }, { status: 400 });
    }
    const { data: linkedCollection } = await supabaseAdmin
      .from('collection_plans')
      .select('id, user_id')
      .eq('id', body.brand_source_collection_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!linkedCollection || linkedCollection.user_id !== user!.id) {
      return NextResponse.json(
        { error: 'brand_source_collection_id is not a collection you own' },
        { status: 403 },
      );
    }
    brandSourceCollectionId = linkedCollection.id;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('studio_projects')
    .insert({
      user_id: user!.id,
      brand_name: body.brand_name.trim(),
      brand_logo_url: body.brand_logo_url || null,
      brand_palette: palette,
      brand_fabric_refs: fabricRefs,
      brand_source_collection_id: brandSourceCollectionId,
    })
    .select('id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs, brand_source_collection_id, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[Studio projects] create error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }

  return NextResponse.json({ project: { ...data, outputs_remaining: 0, pack_count: 0 } }, { status: 201 });
}
