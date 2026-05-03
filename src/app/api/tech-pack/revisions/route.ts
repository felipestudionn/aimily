/* ═══════════════════════════════════════════════════════════════════
   GET /api/tech-pack/revisions?skuId=X
     → List of revisions for a SKU, newest first. Light payload (no
     snapshots) — for the history sidebar.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const skuId = req.nextUrl.searchParams.get('skuId');
  if (!skuId) return NextResponse.json({ error: 'Missing skuId' }, { status: 400 });

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('collection_plan_id')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ownership = await verifyCollectionOwnership(user!.id, sku.collection_plan_id);
  if (!ownership.authorized) return ownership.error;

  const { data, error } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select(
      'id, version, is_current, approval_status, approval_chain, change_summary, created_by, created_by_name, created_at, parent_revision_id',
    )
    .eq('sku_id', skuId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ revisions: data ?? [] });
}
