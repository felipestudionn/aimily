/* ═══════════════════════════════════════════════════════════════════
   GET  /api/tech-pack?skuId=X          → tech pack data for a SKU
   PATCH /api/tech-pack                 → upsert section payload
   Body: { skuId, section: 'header'|'drawings'|..., data: object }
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { TeamPermission } from '@/lib/team-permissions';
import {
  recalculateCostBreakdown,
  type BomLine,
  type CostBreakdown,
} from '@/lib/costing/landed-cost';

const VALID_SECTIONS = new Set([
  'header', 'drawings', 'measurements', 'bom', 'grading', 'factory_notes', 'materials',
]);

/* Resolve the collection that owns a SKU and gate via the team-aware
   permission helper. Owners and any seat with the requested permission
   are allowed; everyone else gets the same "Not found" response so we
   don't leak SKU existence. */
async function gateBySku(userId: string, skuId: string, permission: TeamPermission): Promise<{ collectionPlanId: string } | null> {
  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('collection_plan_id')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return null;
  const check = await verifyCollectionOwnership(userId, sku.collection_plan_id, permission);
  if (!check.authorized) return null;
  return { collectionPlanId: sku.collection_plan_id };
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const skuId = req.nextUrl.searchParams.get('skuId');
  if (!skuId) return NextResponse.json({ error: 'Missing skuId' }, { status: 400 });
  const check = await gateBySku(user!.id, skuId, 'view_all');
  if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabaseAdmin
    .from('tech_pack_data')
    .select('*')
    .eq('sku_id', skuId)
    .maybeSingle();

  return NextResponse.json({ data: data ?? null });
}

export async function PATCH(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  let body: { skuId?: string; section?: string; data?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.skuId || !body.section || !VALID_SECTIONS.has(body.section) || !body.data) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const check = await gateBySku(user!.id, body.skuId, 'edit_design');
  if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Upsert the row, merging the section payload on top of whatever exists.
  const { data: existing } = await supabaseAdmin
    .from('tech_pack_data')
    .select('id')
    .eq('sku_id', body.skuId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('tech_pack_data')
      .update({ [body.section]: body.data })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin
      .from('tech_pack_data')
      .insert({
        collection_plan_id: check.collectionPlanId,
        sku_id: body.skuId,
        [body.section]: body.data,
      });
  }

  // Phase 2 — BOM-driven costing engine.
  // When the BOM section is saved, recompute cost_breakdown from the new
  // lines + the previously-stored factor inputs, and (if source_of_truth
  // is 'bom') sync sku.cost so Range Plan / Production / exports stay
  // consistent with the canonical landed cost number.
  if (body.section === 'bom') {
    const bomLines = (body.data as { lines?: BomLine[] }).lines ?? [];
    const updatedBreakdown = await recomputeAndSyncCost(body.skuId, bomLines);
    return NextResponse.json({ ok: true, costBreakdown: updatedBreakdown });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Recompute the SKU's landed-cost breakdown from the latest BOM lines and
 * the factor inputs already stored on the SKU. Writes cost_breakdown back
 * and (when source_of_truth='bom') syncs sku.cost so downstream consumers
 * never drift. Returns the new breakdown so the caller can hand it to the
 * client without an extra round-trip.
 */
async function recomputeAndSyncCost(
  skuId: string,
  bomLines: BomLine[],
): Promise<CostBreakdown | null> {
  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('id, pvp, cost_breakdown')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return null;

  const prev = (sku.cost_breakdown ?? {}) as Partial<CostBreakdown>;
  const breakdown = recalculateCostBreakdown({
    bomLines,
    manualMaterialOverride: prev.materials?.manual_override ?? null,
    materialSourceOfTruth: prev.materials?.source_of_truth ?? 'bom',
    factoryRate: prev.labor?.factory_rate ?? 0,
    laborHours: prev.labor?.hours ?? 0,
    overheadPct: prev.overhead_pct ?? 0,
    freightOrigin: prev.freight?.origin ?? '',
    freightDestination: prev.freight?.destination ?? '',
    freightMethod: prev.freight?.method ?? 'sea',
    freightTotal: prev.freight?.total ?? 0,
    dutiesPct: prev.duties_pct ?? 0,
    targetMarginPct: prev.target_margin_pct ?? 0,
    pvp: typeof sku.pvp === 'number' ? sku.pvp : 0,
  });
  // Preserve the AI suggestions panel if it was already populated — the
  // suggest-substitutions endpoint owns that field, not this engine.
  breakdown.ai_suggestions = prev.ai_suggestions ?? [];

  const updates: Record<string, unknown> = { cost_breakdown: breakdown };
  if (breakdown.materials.source_of_truth === 'bom' && breakdown.total_landed > 0) {
    updates.cost = breakdown.total_landed;
  }

  await supabaseAdmin.from('collection_skus').update(updates).eq('id', skuId);
  return breakdown;
}
