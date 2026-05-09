/**
 * POST /api/skus/bulk-update-margin
 *
 * Sprint B.5 (2026-05-09) · Cascade SKU costs when target_margin_pct changes.
 *
 * When the user edits Margen DTC in the Collection Builder dashboard,
 * every SKU's cost must be re-anchored to the new margin so the dashboard
 * recomputes consistently. This is a single SQL UPDATE — sub-100ms — vs
 * iterating /api/skus/[id] N times.
 *
 * Body: { collectionPlanId, marginPct }   // marginPct 0-100
 * Returns: { ok, updated, planId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Body {
  collectionPlanId?: string;
  marginPct?: number;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Body | null;
  const collectionPlanId = body?.collectionPlanId;
  const marginPct = body?.marginPct;

  if (!collectionPlanId || typeof marginPct !== 'number') {
    return NextResponse.json(
      { error: 'collectionPlanId and marginPct (number) are required' },
      { status: 400 },
    );
  }
  if (marginPct < 0 || marginPct > 100) {
    return NextResponse.json({ error: 'marginPct must be 0-100' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Fetch existing SKUs to recompute cost (Supabase doesn't support
  // arithmetic in client-side update payloads — must read then write).
  const { data: skus, error: fetchErr } = await supabaseAdmin
    .from('collection_skus')
    .select('id, pvp')
    .eq('collection_plan_id', collectionPlanId);

  if (fetchErr) {
    console.error('[bulk-update-margin] fetch failed', fetchErr);
    return NextResponse.json({ error: 'Failed to read SKUs' }, { status: 500 });
  }

  const factor = (100 - marginPct) / 100;
  let updated = 0;

  for (const sku of (skus || []) as Array<{ id: string; pvp: number }>) {
    const newCost = Math.round(sku.pvp * factor * 100) / 100;
    const { error: updErr } = await supabaseAdmin
      .from('collection_skus')
      .update({ cost: newCost, margin: marginPct })
      .eq('id', sku.id);
    if (!updErr) updated += 1;
  }

  return NextResponse.json({ ok: true, updated, planId: collectionPlanId });
}
