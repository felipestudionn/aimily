/**
 * Last-season actuals hydration · feeds the ActualsDeltaCard
 *
 * The wedge axis Strategy has over Block 2. Returns side-by-side rows of
 * "what we bought last season" vs "what we're recommending now" per family,
 * with deltas flagged.
 *
 * Per Codex v3 R2: hydrates in a single query over strategy_product_facts +
 * strategy_inventory_facts + strategy_family_scores when possible.
 * Materialized view deferred to v3.1 if 121-SKU dogfood query exceeds 500ms.
 *
 * Used by:
 *   · /api/in-season/buy-strategy-prefill-editor (when axis=actuals_delta)
 *   · /api/in-season/buy-strategy-deepen (when axis=actuals_delta)
 *   · /strategy/[tenantSlug]/setup ActualsDeltaCard (initial hydration)
 *   · /strategy/[tenantSlug]/runs/[runId] RunScenariosEditor (per-scenario)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface FamilyActualsDelta {
  family_code: string;
  // Last season (from the most-recent completed run's inputs).
  last_bought_units: number | null;
  last_sold_units: number | null;
  last_sold_through_pct: number | null;
  last_returns_pct: number | null;
  last_margin_pct: number | null;
  last_revenue_eur: number | null;
  // Recommended now (from current run's family_scores + scenarios).
  recommended_buy_units: number | null;
  projected_sell_through_pct: number | null;
  expected_margin_pct: number | null;
  expected_revenue_eur: number | null;
  // Delta + flag.
  units_delta_pct: number | null; // (recommended - last) / last
  delta_flag: 'amplify' | 'hold' | 'shrink' | 'investigate' | 'kill';
}

export interface LastSeasonActualsResult {
  rows: FamilyActualsDelta[];
  /** Latest run id used for actuals reference. Null when tenant has no completed runs. */
  reference_run_id: string | null;
  /** Whether the dataset can be considered complete. Currently true when ≥1
   *  completed run exists; otherwise false and rows = []. */
  has_baseline: boolean;
}

interface ProductFact {
  family_code: string | null;
  total_bought: number | null;
  total_sold: number | null;
  returns_pct: number | null;
  margin_pct_list: number | null;
  pvp: number | null;
}

interface FamilyScore {
  family_code: string;
  sku_count: number;
  hero_count: number;
  dog_count: number;
  family_roi: number | null;
  return_drag_score: number | null;
  saturation_score: number | null;
  share_of_wallet_pct: number | null;
}

function classifyDelta(unitsDeltaPct: number | null, lastSoldThrough: number | null): FamilyActualsDelta['delta_flag'] {
  if (unitsDeltaPct == null) return 'investigate';
  if (unitsDeltaPct >= 0.25) return 'amplify';
  if (unitsDeltaPct >= -0.1) return 'hold';
  if (unitsDeltaPct >= -0.3) return 'shrink';
  // Heavy cut + last season already low sell-through → kill rather than shrink.
  if (lastSoldThrough != null && lastSoldThrough < 0.3) return 'kill';
  return 'shrink';
}

/**
 * Hydrate the per-family actuals-vs-recommended view.
 *
 * @param tenantId Strategy tenant id (RLS-scoped table reads).
 * @param currentRunId Run id whose recommendations are the "now" side. If
 *   omitted, returns last-season actuals only (no projected columns).
 */
export async function loadLastSeasonActuals(
  tenantId: string,
  currentRunId?: string
): Promise<LastSeasonActualsResult> {
  // 1. Find the most-recent completed run for tenant — that's the actuals reference.
  const { data: latestRun } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, source_set_ids')
    .eq('tenant_id', tenantId)
    .eq('run_status', 'complete')
    .order('recommending_completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRun) {
    return { rows: [], reference_run_id: null, has_baseline: false };
  }

  // 2. Pull product_facts scoped to the run's source_set_ids (same scope the
  //    classifier saw). Aggregate by family_code in memory — small enough
  //    for typical 121-SKU dogfood; bigger tenants will move to a view.
  const sourceIds = (latestRun.source_set_ids as string[]) || [];
  const factsQuery = supabaseAdmin
    .from('strategy_product_facts')
    .select('family_code, total_bought, total_sold, returns_pct, margin_pct_list, pvp');

  const facts = await (sourceIds.length > 0
    ? factsQuery.in('source_id', sourceIds)
    : factsQuery.eq('tenant_id', tenantId));

  if (facts.error) {
    throw new Error(`loadLastSeasonActuals product_facts failed: ${facts.error.message}`);
  }

  // 3. Family scores from the run we're scoring against — use currentRunId
  //    if supplied, else fall back to the latest completed run's own scores.
  const referenceRunId = currentRunId ?? latestRun.id;
  const scoresRes = await supabaseAdmin
    .from('strategy_family_scores')
    .select('family_code, sku_count, hero_count, dog_count, family_roi, return_drag_score, saturation_score, share_of_wallet_pct')
    .eq('run_id', referenceRunId);
  if (scoresRes.error) {
    throw new Error(`loadLastSeasonActuals family_scores failed: ${scoresRes.error.message}`);
  }

  // 4. Aggregate facts per family.
  const aggregates = new Map<
    string,
    { bought: number; sold: number; returns: number; marginSum: number; revenueEur: number; n: number }
  >();
  for (const f of (facts.data as ProductFact[]) || []) {
    const family = f.family_code ?? 'unknown';
    const bucket = aggregates.get(family) ?? { bought: 0, sold: 0, returns: 0, marginSum: 0, revenueEur: 0, n: 0 };
    bucket.bought += Number(f.total_bought ?? 0);
    bucket.sold += Number(f.total_sold ?? 0);
    bucket.returns += Number(f.returns_pct ?? 0);
    bucket.marginSum += Number(f.margin_pct_list ?? 0);
    bucket.revenueEur += Number(f.total_sold ?? 0) * Number(f.pvp ?? 0);
    bucket.n += 1;
    aggregates.set(family, bucket);
  }

  // 5. Build rows.
  const scoresByFamily = new Map<string, FamilyScore>(
    ((scoresRes.data as FamilyScore[]) || []).map((s) => [s.family_code, s])
  );
  const allFamilies = new Set<string>([
    ...Array.from(aggregates.keys()),
    ...Array.from(scoresByFamily.keys()),
  ]);

  const rows: FamilyActualsDelta[] = [];
  for (const family of Array.from(allFamilies)) {
    const agg = aggregates.get(family);
    const score = scoresByFamily.get(family);

    const lastBought = agg?.bought ?? null;
    const lastSold = agg?.sold ?? null;
    const lastSellThrough =
      agg && agg.bought > 0 ? agg.sold / agg.bought : null;
    const lastReturnsPct = agg && agg.n > 0 ? agg.returns / agg.n : null;
    const lastMarginPct = agg && agg.n > 0 ? agg.marginSum / agg.n : null;
    const lastRevenue = agg?.revenueEur ?? null;

    // Recommended buy is a heuristic derived from family_roi + hero share —
    // we don't have authoritative "recommended buy units" per family until
    // the orchestrator allocates. For prefill, scale last bought by family
    // health: ROI > 1.5 → +25%, hero_count >= 2 → +10%, dog-heavy → -20%.
    let recommendedBuy: number | null = null;
    if (lastBought != null && lastBought > 0) {
      let multiplier = 1.0;
      if (score?.family_roi != null && score.family_roi > 1.5) multiplier += 0.25;
      if ((score?.hero_count ?? 0) >= 2) multiplier += 0.1;
      if ((score?.dog_count ?? 0) > (score?.hero_count ?? 0)) multiplier -= 0.2;
      if ((score?.saturation_score ?? 0) > 0.8) multiplier -= 0.15;
      recommendedBuy = Math.max(0, Math.round(lastBought * multiplier));
    }

    const projectedSellThrough = lastSellThrough != null
      ? Math.min(1, lastSellThrough + (score?.family_roi != null && score.family_roi > 1.5 ? 0.05 : 0))
      : null;

    const expectedMargin = lastMarginPct;

    const expectedRevenue =
      recommendedBuy != null && projectedSellThrough != null && agg != null && agg.n > 0
        ? recommendedBuy * projectedSellThrough * (agg.revenueEur / Math.max(1, agg.sold))
        : null;

    const unitsDeltaPct =
      lastBought != null && lastBought > 0 && recommendedBuy != null
        ? (recommendedBuy - lastBought) / lastBought
        : null;

    rows.push({
      family_code: family,
      last_bought_units: lastBought,
      last_sold_units: lastSold,
      last_sold_through_pct: lastSellThrough,
      last_returns_pct: lastReturnsPct,
      last_margin_pct: lastMarginPct,
      last_revenue_eur: lastRevenue,
      recommended_buy_units: recommendedBuy,
      projected_sell_through_pct: projectedSellThrough,
      expected_margin_pct: expectedMargin,
      expected_revenue_eur: expectedRevenue,
      units_delta_pct: unitsDeltaPct,
      delta_flag: classifyDelta(unitsDeltaPct, lastSellThrough),
    });
  }

  rows.sort((a, b) => (b.last_revenue_eur ?? 0) - (a.last_revenue_eur ?? 0));

  return { rows, reference_run_id: referenceRunId, has_baseline: true };
}
