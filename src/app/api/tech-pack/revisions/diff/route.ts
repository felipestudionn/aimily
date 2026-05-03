/* ═══════════════════════════════════════════════════════════════════
   GET /api/tech-pack/revisions/diff?from=A&to=B
     → Section-level diff between two revisions of the same SKU. Returns
     which sections changed and which leaf paths within them differ.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { diffRevisions, type RevisionRow } from '@/lib/tech-pack/revisions';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to revision ids' }, { status: 400 });
  }

  const { data: rows, error } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('*')
    .in('id', [from, to]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length !== 2) {
    return NextResponse.json({ error: 'Revisions not found' }, { status: 404 });
  }

  // Both revisions must belong to the same collection (and SKU) — fail
  // closed if a caller tries to diff across collections.
  if (rows[0].collection_plan_id !== rows[1].collection_plan_id) {
    return NextResponse.json({ error: 'Cross-collection diff not allowed' }, { status: 400 });
  }
  if (rows[0].sku_id !== rows[1].sku_id) {
    return NextResponse.json({ error: 'Revisions belong to different SKUs' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user!.id, rows[0].collection_plan_id);
  if (!ownership.authorized) return ownership.error;

  const a = rows.find((r) => r.id === from) as unknown as RevisionRow;
  const b = rows.find((r) => r.id === to) as unknown as RevisionRow;
  const sections = diffRevisions(a, b);

  return NextResponse.json({
    from: { id: a.id, version: a.version, created_at: a.created_at },
    to: { id: b.id, version: b.version, created_at: b.created_at },
    sections,
  });
}
