/**
 * Phase 6 — Artworks Library API.
 *
 *   GET  /api/artworks?planId=X      → user's artworks (filtered by collection if planId)
 *   POST /api/artworks               → create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface ArtworkBody {
  name: string;
  artwork_type: 'graphic' | 'aop_repeat' | 'placement' | 'embroidery_concept';
  collection_plan_id?: string;
  preview_url?: string;
  source_file_url?: string;
  scale_min_cm?: number;
  scale_max_cm?: number;
  aspect_ratio?: string;
  thread_palette?: string[];
  tags?: string[];
  notes?: string;
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const planId = req.nextUrl.searchParams.get('planId');
  const type = req.nextUrl.searchParams.get('type');

  let q = supabaseAdmin
    .from('artworks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (planId) q = q.or(`collection_plan_id.eq.${planId},collection_plan_id.is.null`);
  if (type) q = q.eq('artwork_type', type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artworks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: ArtworkBody;
  try {
    body = (await req.json()) as ArtworkBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.name || !body.artwork_type) {
    return NextResponse.json({ error: 'name and artwork_type required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('artworks')
    .insert({
      user_id: user.id,
      name: body.name,
      artwork_type: body.artwork_type,
      collection_plan_id: body.collection_plan_id ?? null,
      preview_url: body.preview_url ?? null,
      source_file_url: body.source_file_url ?? null,
      scale_min_cm: body.scale_min_cm ?? null,
      scale_max_cm: body.scale_max_cm ?? null,
      aspect_ratio: body.aspect_ratio ?? null,
      thread_palette: body.thread_palette ?? [],
      tags: body.tags ?? [],
      notes: body.notes ?? null,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artwork: data });
}
