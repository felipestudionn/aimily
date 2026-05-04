/**
 * GET /api/esg/sku-rollup?skuId=X       (single SKU)
 * GET /api/esg/sku-rollup?planId=X      (every SKU in a collection)
 *
 * Computes the Higg MSI weighted-average rollup from each SKU's BOM.
 * Lines without a material_id are skipped — we never fabricate an
 * ESG score from a fuzzy name match.
 *
 * Returns:
 *   single skuId  → { sku, rollup, lines: matched_count }
 *   planId        → { skus: [...], collection_summary }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CATALOG } from '@/lib/materials-library';
import { rollupEsg, type EsgTier } from '@/lib/materials-library/higg-annotations';

interface BomLine {
  qty?: string;
  material_id?: string;
  material?: string;
}

function buildLookup(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of CATALOG) {
    if (typeof m.higgMsi === 'number') map[m.id] = m.higgMsi;
  }
  return map;
}

const TIER_RANK: Record<EsgTier, number> = {
  excellent: 0,
  good: 1,
  concern: 2,
  critical: 3,
  unknown: -1,
};

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const skuId = req.nextUrl.searchParams.get('skuId');
  const planId = req.nextUrl.searchParams.get('planId');
  if (!skuId && !planId) {
    return NextResponse.json({ error: 'skuId or planId required' }, { status: 400 });
  }

  const lookup = buildLookup();

  if (skuId) {
    const { data: sku } = await supabaseAdmin
      .from('collection_skus')
      .select('id, name, family, collection_plan_id')
      .eq('id', skuId)
      .maybeSingle();
    if (!sku) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ownership = await verifyCollectionOwnership(user.id, sku.collection_plan_id);
    if (!ownership.authorized) return ownership.error;

    const { data: tp } = await supabaseAdmin
      .from('tech_pack_data')
      .select('bom')
      .eq('sku_id', skuId)
      .maybeSingle();
    const lines = ((tp?.bom as { lines?: BomLine[] } | null)?.lines ?? []) as BomLine[];
    const rollup = rollupEsg({ lines, lookup });
    return NextResponse.json({ sku, rollup });
  }

  // Collection-wide rollup.
  const ownership = await verifyCollectionOwnership(user.id, planId!);
  if (!ownership.authorized) return ownership.error;

  const { data: skus } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, family')
    .eq('collection_plan_id', planId);
  if (!skus) return NextResponse.json({ skus: [], collection_summary: null });

  const skuIds = skus.map((s) => s.id);
  const { data: tps } = await supabaseAdmin
    .from('tech_pack_data')
    .select('sku_id, bom')
    .in('sku_id', skuIds);
  const bomBySku = new Map<string, BomLine[]>();
  for (const tp of tps ?? []) {
    const lines = ((tp.bom as { lines?: BomLine[] } | null)?.lines ?? []) as BomLine[];
    bomBySku.set(tp.sku_id, lines);
  }

  const skuRollups = skus.map((sku) => {
    const lines = bomBySku.get(sku.id) ?? [];
    return { sku, rollup: rollupEsg({ lines, lookup }) };
  });

  const known = skuRollups.filter((r) => r.rollup.tier !== 'unknown');
  const collectionSummary = known.length === 0
    ? { tier: 'unknown' as EsgTier, avg_msi: 0, sku_count: skus.length, scored_count: 0, distribution: { excellent: 0, good: 0, concern: 0, critical: 0 } }
    : (() => {
        const avg = known.reduce((acc, r) => acc + r.rollup.weighted_msi, 0) / known.length;
        const distribution = {
          excellent: known.filter((r) => r.rollup.tier === 'excellent').length,
          good: known.filter((r) => r.rollup.tier === 'good').length,
          concern: known.filter((r) => r.rollup.tier === 'concern').length,
          critical: known.filter((r) => r.rollup.tier === 'critical').length,
        };
        const overallTier: EsgTier =
          avg < 30 ? 'excellent' : avg < 80 ? 'good' : avg < 150 ? 'concern' : 'critical';
        return {
          tier: overallTier,
          avg_msi: Math.round(avg * 10) / 10,
          sku_count: skus.length,
          scored_count: known.length,
          distribution,
        };
      })();

  // Sort skus worst-first so the page shows action items at the top.
  skuRollups.sort((a, b) => {
    const ra = TIER_RANK[a.rollup.tier];
    const rb = TIER_RANK[b.rollup.tier];
    if (ra !== rb) return rb - ra;
    return b.rollup.weighted_msi - a.rollup.weighted_msi;
  });

  return NextResponse.json({ skus: skuRollups, collection_summary: collectionSummary });
}
