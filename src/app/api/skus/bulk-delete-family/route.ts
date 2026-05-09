/**
 * POST /api/skus/bulk-delete-family
 *
 * Sprint B.5 (2026-05-09) · Drop a whole family from the collection.
 * The user clicked X next to a family pill (after confirming) — we
 * delete every SKU in that family. Family is also removed from CIS
 * via /api/families-confirm in the same flow.
 *
 * Body: { collectionPlanId, family }
 * Returns: { ok, deleted, planId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Body {
  collectionPlanId?: string;
  family?: string;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Body | null;
  const { collectionPlanId, family } = body || {};

  if (!collectionPlanId || !family) {
    return NextResponse.json(
      { error: 'collectionPlanId and family are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const { data, error } = await supabaseAdmin
    .from('collection_skus')
    .delete()
    .eq('collection_plan_id', collectionPlanId)
    .eq('family', family)
    .select('id');

  if (error) {
    console.error('[bulk-delete-family] failed', error);
    return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: data?.length || 0, planId: collectionPlanId });
}
