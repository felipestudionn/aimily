/**
 * POST /api/skus/bulk-scale-pvp
 *
 * Sprint B.5 (2026-05-09) · Cascade SKU pricing when sales_target_y1 is
 * absorbed via "subir precios" option. Multiplies each SKU's pvp by a
 * factor and re-anchors cost to the current target margin so the margin
 * stays constant after the price scale.
 *
 * Body:
 *   {
 *     collectionPlanId: string,
 *     factor: number,         // e.g. 1.19 = +19% pvp across the board
 *     targetMarginPct: number // 0-100 (used to recompute cost = pvp × (1 - m/100))
 *   }
 * Returns: { ok, updated, planId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Body {
  collectionPlanId?: string;
  factor?: number;
  targetMarginPct?: number;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Body | null;
  const collectionPlanId = body?.collectionPlanId;
  const factor = body?.factor;
  const marginPct = body?.targetMarginPct;

  if (!collectionPlanId || typeof factor !== 'number' || typeof marginPct !== 'number') {
    return NextResponse.json(
      { error: 'collectionPlanId, factor and targetMarginPct are required' },
      { status: 400 },
    );
  }
  if (factor <= 0 || factor > 5) {
    return NextResponse.json({ error: 'factor must be (0, 5]' }, { status: 400 });
  }
  if (marginPct < 0 || marginPct > 100) {
    return NextResponse.json({ error: 'targetMarginPct must be 0-100' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const { data: skus, error: fetchErr } = await supabaseAdmin
    .from('collection_skus')
    .select('id, pvp, buy_units, sale_percentage')
    .eq('collection_plan_id', collectionPlanId);

  if (fetchErr) {
    console.error('[bulk-scale-pvp] fetch failed', fetchErr);
    return NextResponse.json({ error: 'Failed to read SKUs' }, { status: 500 });
  }

  const costFactor = (100 - marginPct) / 100;
  let updated = 0;

  for (const sku of (skus || []) as Array<{ id: string; pvp: number; buy_units: number; sale_percentage: number | null }>) {
    const newPvp = Math.round(sku.pvp * factor * 100) / 100;
    const newCost = Math.round(newPvp * costFactor * 100) / 100;
    const sold = Math.round(sku.buy_units * (sku.sale_percentage ?? 60) / 100);
    const newExpectedSales = Math.round(newPvp * sold * 100) / 100;
    const { error: updErr } = await supabaseAdmin
      .from('collection_skus')
      .update({
        pvp: newPvp,
        cost: newCost,
        margin: marginPct,
        final_price: newPvp,
        expected_sales: newExpectedSales,
      })
      .eq('id', sku.id);
    if (!updErr) updated += 1;
  }

  return NextResponse.json({ ok: true, updated, planId: collectionPlanId });
}
