/**
 * POST /api/skus/bulk-trim-lowest
 *
 * Sprint B.5 (2026-05-09) · Trim N SKUs with the lowest expected_sales.
 * Used when the user shrinks the SKU target inline on the Collection
 * Builder dashboard and chooses "Aimily quita los N de menor venta".
 *
 * Body: { collectionPlanId, count }   // count of SKUs to delete
 * Returns: { ok, deleted, planId }
 *
 * Safety: never deletes more SKUs than exist. Skips approved /
 * production-locked rows so we don't kill SKUs already in flight.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Body {
  collectionPlanId?: string;
  count?: number;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Body | null;
  const { collectionPlanId, count } = body || {};

  if (!collectionPlanId || typeof count !== 'number' || count <= 0) {
    return NextResponse.json(
      { error: 'collectionPlanId and positive count are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Pick the N lowest-revenue SKUs that aren't production-approved
  const { data: candidates, error: fetchErr } = await supabaseAdmin
    .from('collection_skus')
    .select('id, expected_sales, production_approved')
    .eq('collection_plan_id', collectionPlanId)
    .order('expected_sales', { ascending: true });

  if (fetchErr) {
    console.error('[bulk-trim-lowest] fetch failed', fetchErr);
    return NextResponse.json({ error: 'Failed to read SKUs' }, { status: 500 });
  }

  const trimmable = ((candidates || []) as Array<{ id: string; expected_sales: number; production_approved: boolean }>)
    .filter(s => !s.production_approved)
    .slice(0, count);

  if (trimmable.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, planId: collectionPlanId });
  }

  const ids = trimmable.map(s => s.id);
  const { error: delErr } = await supabaseAdmin
    .from('collection_skus')
    .delete()
    .in('id', ids);

  if (delErr) {
    console.error('[bulk-trim-lowest] delete failed', delErr);
    return NextResponse.json({ error: 'Failed to trim SKUs' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: trimmable.length, planId: collectionPlanId });
}
