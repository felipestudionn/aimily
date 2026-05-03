import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED = [
  'name', 'artwork_type', 'collection_plan_id', 'preview_url', 'source_file_url',
  'scale_min_cm', 'scale_max_cm', 'aspect_ratio', 'thread_palette', 'tags', 'notes',
];

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED) if (k in body) updates[k] = body[k];
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('artworks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ artwork: data });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('artworks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
