/* ═══════════════════════════════════════════════════════════════════
   POST /api/presentation/share  — create a share link
   GET  /api/presentation/share?collectionId=X — list the caller's
                                                 shares for a collection
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateShareToken } from '@/lib/presentation/share-token';

export const runtime = 'nodejs';

interface CreateBody {
  collectionId: string;
  themeId?: string;
  coverSubtitle?: string;
  /* Unix seconds when the link should stop working. Undefined = never. */
  expiresAt?: number | null;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { collectionId, themeId = 'editorial-heritage', coverSubtitle, expiresAt } = body;
  if (!collectionId) {
    return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 });
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  const token = generateShareToken();
  const { error } = await supabaseAdmin
    .from('presentation_shares')
    .insert({
      token,
      collection_plan_id: collectionId,
      theme_id: themeId,
      cover_subtitle: coverSubtitle ?? null,
      expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
      created_by: user!.id,
    });
  if (error) {
    console.error('[api/presentation/share] insert failed:', error);
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
  }

  return NextResponse.json({ token });
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const collectionId = req.nextUrl.searchParams.get('collectionId');
  if (!collectionId) {
    return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 });
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  const { data, error } = await supabaseAdmin
    .from('presentation_shares')
    .select('token, theme_id, expires_at, views_count, last_viewed_at, created_at')
    .eq('collection_plan_id', collectionId)
    .eq('created_by', user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to list shares' }, { status: 500 });
  }
  return NextResponse.json({ shares: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('presentation_shares')
    .delete()
    .eq('token', token)
    .eq('created_by', user!.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
