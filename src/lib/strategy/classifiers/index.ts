/**
 * Strategy classifiers — deterministic, run BEFORE any LLM call.
 *
 * Per Codex contrapropuesta §3: "Do not let an LLM reason end-to-end over
 * raw observations for enterprise recommendations. That produces impressive
 * demos and indefensible decisions."
 *
 * The 10 classifiers (BP §5):
 *
 *   1. distribution_normalized_velocity — velocity per active day per store
 *   2. returns_penalized_margin         — effective_margin = margin × (1−r) − rev_log_cost × r
 *   3. capacity_aware_demand_ceiling    — current vel vs Mx Vta NP L-D
 *   4. stockout_aware_velocity          — low vel + stockout = not decay, replenish
 *   5. cannibalization_detector         — sibling SKUs with inverse velocity
 *   6. lifecycle_stage_classifier       — new / ramp / peak / decay / mature / exit
 *   7. color_winner_intra_lineage       — top colorways per lineage
 *   8. carryover_survivor               — 2+ seasons with positive perf
 *   9. returns_risk_family              — family-level returns flag
 *  10. family_roi_share_of_wallet       — family ROI + share trend
 *
 * Outputs:
 *   - strategy_sku_scores (per SKU/color per run, 6 confidence dimensions)
 *   - strategy_family_scores (per family per run)
 *
 * Every score includes a classifier_trace JSON with the inputs / thresholds
 * / intermediate calculations so the customer-facing UI can render evidence.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface ClassifierThresholds {
  hero_sell_through_bought_p_min: number;
  hero_returns_pct_max: number;
  hero_distribution_breadth_min: number;
  dog_sell_through_bought_p_max: number;
  dog_velocity_slope_max: number;
  climber_velocity_ratio_min: number;
  climber_runway_days_min: number;
  decay_velocity_ratio_max: number;
  decay_overstock_days_min: number;
  new_days_in_store_max: number;
  mature_days_in_store_min: number;
  color_winner_top_n_per_lineage: number;
  returns_risk_family_p_min: number;
  cannibalization_overlap_min: number;
  cannibalization_inverse_corr_max: number;
}

export interface ClassifierContext {
  tenant_id: string;
  run_id: string;
  algorithm_version_id: string;
  thresholds: ClassifierThresholds;
  reverse_logistics_cost_per_unit: number;
  observation_date: string;
  /** F.2 · Brief context for creative_fit computation. When the run has
   *  a creative brief attached, the orchestrator passes its family_pivot
   *  and color_story; classifier 11 uses them to compute how aligned a
   *  SKU is with the buyer's stated creative direction. Null means no
   *  brief was attached — confidence_creative_fit stays null in that case. */
  brief_family_pivot?: Record<string, number>;
  brief_color_story?: string[];
}

/** F.2 · Compute creative_fit for a SKU given the run's brief.
 *  Returns null when no brief context exists. Otherwise: a 0-1 score
 *  blending family alignment (brief pivot direction for this SKU's family)
 *  + color alignment (does this SKU's color appear in the brief's
 *  color_story?). */
function computeCreativeFit(
  input: SkuScoreInput,
  ctx: ClassifierContext
): number | null {
  const familyPivot = ctx.brief_family_pivot ?? null;
  const colorStory = ctx.brief_color_story ?? null;
  if (!familyPivot && !colorStory) return null;

  let familyScore = 0.5;  // neutral
  if (familyPivot && input.family_code) {
    const pivot = familyPivot[input.family_code];
    if (typeof pivot === 'number') {
      // pivot ∈ [-0.5, +0.5]; map to creative_fit familyScore [0.2, 0.95].
      familyScore = Math.max(0.2, Math.min(0.95, 0.5 + pivot));
    }
  }

  let colorScore = 0.5;
  if (colorStory && colorStory.length > 0) {
    const skuColor = (input.color_ref ?? '').toLowerCase();
    if (skuColor) {
      const inStory = colorStory.some((c) => {
        const k = (c ?? '').toLowerCase().replace(/_/g, ' ');
        return k.length > 0 && (k === skuColor || skuColor.includes(k) || k.includes(skuColor));
      });
      colorScore = inStory ? 0.85 : 0.35;
    }
  }

  return Math.round((familyScore * 0.6 + colorScore * 0.4) * 100) / 100;
}

export type LifecycleStage =
  | 'new'
  | 'ramp'
  | 'peak'
  | 'decay'
  | 'mature'
  | 'exit'
  | 'insufficient_evidence';

export interface SkuScoreInput {
  product_fact_id: string;
  identity_node_id: string | null;
  // How many distinct seasons this SKU's lineage has appeared in (computed
  // from the identity_graph members at score time). Drives BP §5.8 carryover
  // survivor detection — a SKU with 2+ seasons of positive performance is
  // a survivor candidate.
  lineage_seasons_present: number;
  season_tag: string;
  model_ref: string;
  color_ref: string | null;
  family_code: string | null;
  pvp: number | null;
  pvp_compare: number | null;
  markup_pct: number | null;
  on_promo: boolean;
  cost_estimate: number | null;
  margin_pct_list: number | null;
  days_in_store: number | null;
  stores_with_stock: number | null;
  stores_active: number | null;
  stock_store: number | null;
  stock_warehouse: number | null;
  stock_in_transit: number | null;
  stock_pending: number | null;
  pipeline_total: number | null;
  total_bought: number | null;
  total_sold: number | null;
  sell_through_shipped_pct: number | null;
  sell_through_bought_pct: number | null;
  returns_pct: number | null;
  velocity_d1: number;
  velocity_d2: number;
  velocity_7d: number;
  velocity_8_14d: number;
  max_sale_no_promo: number | null;
  max_sale_promo: number | null;
  emptying_rate: number | null;
  emptying_rate_available: number | null;
}

export interface SkuScore {
  product_fact_id: string;
  identity_node_id: string | null;
  demand_score: number | null;
  margin_score: number | null;
  effective_margin: number | null;
  return_risk_score: number | null;
  stockout_risk_score: number | null;
  markdown_risk_score: number | null;
  cannibalization_risk_score: number | null;
  distribution_breadth_score: number | null;
  lifecycle_stage: LifecycleStage;
  // Days remaining in the SKU's natural sell window. Drives the
  // replenishment allocator: a V26 (S/S) SKU observed in May has more
  // runway than the same SKU observed in September.
  seasonal_runway_days: number | null;
  seasonal_runway_score: number | null;
  confidence_data_completeness: number;
  confidence_identity: number;
  confidence_demand: number;
  confidence_margin: number;
  confidence_creative_fit: number | null;
  confidence_action: number;
  classifier_traces: Record<string, unknown>;
}

export interface FamilyScore {
  family_code: string;
  family_display_name: string | null;
  family_roi: number | null;
  saturation_score: number | null;
  cannibalization_score: number | null;
  return_drag_score: number | null;
  stock_productivity: number | null;
  share_of_wallet_pct: number | null;
  share_of_wallet_trend: number | null;
  sku_count: number;
  hero_count: number;
  dog_count: number;
  classifier_traces: Record<string, unknown>;
}

export async function loadDefaultAlgorithmVersion(): Promise<{
  id: string;
  thresholds: ClassifierThresholds;
}> {
  const { data, error } = await supabaseAdmin
    .from('strategy_algorithm_versions')
    .select('id, thresholds')
    .eq('is_default', true)
    .single();
  if (error || !data) {
    throw new Error('No default algorithm version found');
  }
  return {
    id: data.id,
    thresholds: data.thresholds as ClassifierThresholds,
  };
}

export async function loadScoringInputs(
  tenantId: string,
  /** Restrict to facts derived from these source_id rows. Empty/undefined = all tenant facts. */
  sourceSetIds?: string[]
): Promise<SkuScoreInput[]> {
  // Pull every product_fact + its inventory + windows + efficiency + identity_node.
  // We do this in one go for the tenant; for very large tenants v2 will
  // paginate per analysis_run scope.

  // PostgREST auto-resolves the join by FK; we don't need to name the
  // relationship hint (those were INDEX names, not FK names, which broke
  // schema lookup at runtime).
  let query = supabaseAdmin
    .from('strategy_product_facts')
    .select(
      `
      id, model_ref, color_ref, family_code, pvp, pvp_compare, markup_pct, on_promo,
      cost_estimate, margin_pct_list, source_id, season_tag,
      strategy_inventory_facts (
        days_in_store, stores_with_stock, stores_active, stock_store,
        stock_warehouse, stock_in_transit, stock_pending, pipeline_total
      ),
      strategy_sales_windows (
        window_type, units, max_sale_no_promo, max_sale_promo, emptying_rate, emptying_rate_available
      ),
      strategy_efficiency_facts (
        total_bought, total_sold, sell_through_shipped_pct, sell_through_bought_pct, returns_pct
      )
    `
    )
    .eq('tenant_id', tenantId);

  if (sourceSetIds && sourceSetIds.length > 0) {
    query = query.in('source_id', sourceSetIds);
  }
  const { data: products, error: pErr } = await query;

  if (pErr) throw new Error(`scoring inputs fetch failed: ${pErr.message}`);

  // Match each product_fact to its identity_node by member array containment.
  // Also capture how many distinct seasons each lineage has appeared in —
  // required for BP §5.8 carryover survivor classifier.
  const { data: identityNodes } = await supabaseAdmin
    .from('strategy_sku_identity_graph')
    .select('id, member_product_fact_ids, seasons_present')
    .eq('tenant_id', tenantId);

  const identityByProduct = new Map<string, string>();
  const seasonsPresentByNode = new Map<string, number>();
  for (const node of identityNodes || []) {
    for (const pid of node.member_product_fact_ids as string[]) {
      identityByProduct.set(pid, node.id);
    }
    seasonsPresentByNode.set(node.id, ((node.seasons_present as string[]) || []).length);
  }

  const inputs: SkuScoreInput[] = (products || []).map((p: any) => {
    const inv = (p.strategy_inventory_facts || [])[0] || {};
    const eff = (p.strategy_efficiency_facts || [])[0] || {};
    const windows = (p.strategy_sales_windows || []) as Array<any>;
    const velOf = (w: string) =>
      windows.find((x) => x.window_type === w)?.units ?? 0;
    const maxNoPromo =
      windows.find((x) => x.max_sale_no_promo != null)?.max_sale_no_promo ?? null;
    const maxPromo =
      windows.find((x) => x.max_sale_promo != null)?.max_sale_promo ?? null;
    // Pull the worst (highest) emptying_rate across observed windows — that
    // is the strongest signal of stockout pressure on this SKU.
    const emptyingValues = windows
      .map((x) => numOrNull(x.emptying_rate))
      .filter((v): v is number => v != null);
    const emptyingRate = emptyingValues.length > 0 ? Math.max(...emptyingValues) : null;
    const emptyingAvailValues = windows
      .map((x) => numOrNull(x.emptying_rate_available))
      .filter((v): v is number => v != null);
    const emptyingRateAvailable =
      emptyingAvailValues.length > 0 ? Math.max(...emptyingAvailValues) : null;

    const nodeId = identityByProduct.get(p.id) ?? null;
    return {
      product_fact_id: p.id,
      identity_node_id: nodeId,
      lineage_seasons_present: nodeId ? seasonsPresentByNode.get(nodeId) ?? 1 : 1,
      season_tag: p.season_tag,
      model_ref: p.model_ref,
      color_ref: p.color_ref,
      family_code: p.family_code,
      pvp: numOrNull(p.pvp),
      pvp_compare: numOrNull(p.pvp_compare),
      markup_pct: numOrNull(p.markup_pct),
      on_promo: Boolean(p.on_promo),
      cost_estimate: numOrNull(p.cost_estimate),
      margin_pct_list: numOrNull(p.margin_pct_list),
      days_in_store: numOrNull(inv.days_in_store),
      stores_with_stock: numOrNull(inv.stores_with_stock),
      stores_active: numOrNull(inv.stores_active),
      stock_store: numOrNull(inv.stock_store),
      stock_warehouse: numOrNull(inv.stock_warehouse),
      stock_in_transit: numOrNull(inv.stock_in_transit),
      stock_pending: numOrNull(inv.stock_pending),
      pipeline_total: numOrNull(inv.pipeline_total),
      total_bought: numOrNull(eff.total_bought),
      total_sold: numOrNull(eff.total_sold),
      sell_through_shipped_pct: numOrNull(eff.sell_through_shipped_pct),
      sell_through_bought_pct: numOrNull(eff.sell_through_bought_pct),
      returns_pct: numOrNull(eff.returns_pct),
      velocity_d1: velOf('d1'),
      velocity_d2: velOf('d2'),
      velocity_7d: velOf('7d'),
      velocity_8_14d: velOf('8_14d'),
      max_sale_no_promo: maxNoPromo,
      max_sale_promo: maxPromo,
      emptying_rate: emptyingRate,
      emptying_rate_available: emptyingRateAvailable,
    };
  });

  return inputs;
}

/**
 * Score one SKU using all 10 classifiers.
 *
 * The function is pure: takes input + context, returns score. No DB calls
 * (the orchestrator above persists the result).
 */
export function scoreSku(
  input: SkuScoreInput,
  ctx: ClassifierContext,
  /** Per-family velocity-density baselines for normalization. */
  familyBaselines: Map<string, { median_density: number; max_density: number }>,
  /** Per-lineage sibling list for cannibalization detection. */
  lineageSiblings: Map<string, SkuScoreInput[]>
): SkuScore {
  const traces: Record<string, unknown> = {};

  // ── Classifier 1: distribution-normalized velocity ───────────────────────
  const activeStores = input.stores_active ?? null;
  const daysInStore = input.days_in_store ?? null;
  const velocityRaw7d = input.velocity_7d;
  const velocityPerStorePerDay =
    activeStores && daysInStore && daysInStore > 0 && activeStores > 0
      ? velocityRaw7d / Math.min(daysInStore, 7) / activeStores
      : null;
  traces.distribution_normalized_velocity = {
    velocity_7d: velocityRaw7d,
    days_in_store: daysInStore,
    active_stores: activeStores,
    velocity_per_store_per_day: velocityPerStorePerDay,
  };

  // Demand score in [0,1] relative to family baseline.
  let demand_score: number | null = null;
  if (velocityPerStorePerDay != null && input.family_code) {
    const baseline = familyBaselines.get(input.family_code);
    if (baseline && baseline.max_density > 0) {
      demand_score = Math.max(
        0,
        Math.min(1, velocityPerStorePerDay / baseline.max_density)
      );
    }
  }

  // ── Classifier 2: returns-penalized margin ───────────────────────────────
  const listMargin = input.margin_pct_list ?? null; // already 0-1
  const returnsPct = input.returns_pct ?? 0;
  let effective_margin: number | null = null;
  let margin_score: number | null = null;
  if (input.pvp != null && listMargin != null) {
    const listMarginEur = input.pvp * listMargin;
    effective_margin =
      listMarginEur * (1 - returnsPct) -
      ctx.reverse_logistics_cost_per_unit * returnsPct;
    margin_score = effective_margin > 0 ? Math.min(1, effective_margin / (input.pvp * 0.6)) : 0;
  }
  traces.returns_penalized_margin = {
    list_margin_pct: listMargin,
    returns_pct: returnsPct,
    reverse_logistics_cost: ctx.reverse_logistics_cost_per_unit,
    effective_margin,
  };

  // ── Classifier 3: capacity-aware demand ceiling ──────────────────────────
  let capacity_ratio: number | null = null;
  if (input.max_sale_no_promo && input.velocity_d1 > 0) {
    capacity_ratio = input.velocity_d1 / input.max_sale_no_promo;
  }
  traces.capacity_aware_demand_ceiling = {
    velocity_d1: input.velocity_d1,
    max_sale_no_promo: input.max_sale_no_promo,
    capacity_ratio,
  };

  // ── Classifier 4: stockout-aware velocity ────────────────────────────────
  // CORRECTED post-Codex review: the previous version inverted the ratio.
  // "Stockout suppression" means stores ran OUT — so `stores_active`
  // (selling) is much LESS than `stores_with_stock` (carrying) OR the
  // emptying rate is high. We compute both and take the stronger signal.
  //
  // `activation_ratio` = stores_active / stores_with_stock: tells us what
  //                      share of carrying stores are converting. Low = many
  //                      stores have stock but aren't selling (taste mismatch
  //                      or distribution issue, NOT stockout).
  // `Tasa Vaciado`     = stores running out of stock per period. HIGH means
  //                      demand exceeds what the store had — true stockout
  //                      suppression. This is the right signal.
  let activationRatio: number | null = null;
  if (input.stores_with_stock && input.stores_active && input.stores_with_stock > 0) {
    activationRatio = input.stores_active / input.stores_with_stock;
  }
  // Worst (highest) emptying_rate across observed windows.
  const emptyingRate = input.emptying_rate;
  const stockoutSuppressed =
    (emptyingRate != null && emptyingRate >= 0.6 && velocityRaw7d > 0) ||
    (activationRatio != null && activationRatio < 0.5 && velocityRaw7d > 0 && (input.stock_store ?? 0) < 10);
  const stockout_risk_score = stockoutSuppressed
    ? Math.min(1, Math.max(emptyingRate ?? 0, activationRatio != null ? 1 - activationRatio : 0))
    : 0;
  // B.6 · Back out the velocity-IF-stocked from observed velocity. When
  // stockout-suppression is high, the displayed 7-day velocity understates
  // true demand because units couldn't sell when stores ran out. The
  // replenish formula needs this corrected number so heroes that ran out
  // get bought enough next time. Adjustment cap at ~2.5× to avoid wild
  // inflation when the suppression signal is noisy.
  const adjustmentDivisor = stockoutSuppressed
    ? Math.max(0.4, 1 - stockout_risk_score * 0.6)
    : 1;
  const velocity_stockout_adjusted_7d =
    velocityRaw7d > 0 ? Math.round(velocityRaw7d / adjustmentDivisor) : 0;
  traces.stockout_aware_velocity = {
    activation_ratio: activationRatio,
    emptying_rate: emptyingRate,
    stockout_suppressed: stockoutSuppressed,
    observed_velocity_7d: velocityRaw7d,
    adjusted_velocity_7d: velocity_stockout_adjusted_7d,
    adjustment_factor: Math.round((1 / adjustmentDivisor) * 100) / 100,
    note: 'High emptying_rate OR (low activation_ratio AND near-zero in-store stock) flags stockout suppression. adjusted_velocity_7d backs out the velocity-if-stocked using stockout_risk_score × 0.6 as severity, capped at 2.5× observed.',
  };

  // ── Classifier 5: cannibalization detector ───────────────────────────────
  let cannibalization_risk_score: number | null = null;
  const siblings = input.identity_node_id
    ? lineageSiblings.get(input.identity_node_id) || []
    : [];
  if (siblings.length > 1) {
    // Within siblings, look for inverse correlation between this SKU's velocity
    // and the sibling's. Conservatively: if any sibling has very high vel
    // while this one has very low (or vice versa), flag a soft cannibalization
    // signal proportional to the velocity gap.
    let maxSiblingVel = 0;
    for (const s of siblings) {
      if (s.product_fact_id === input.product_fact_id) continue;
      if (s.velocity_7d > maxSiblingVel) maxSiblingVel = s.velocity_7d;
    }
    if (maxSiblingVel > 0 && velocityRaw7d > 0) {
      const ratio = velocityRaw7d / maxSiblingVel;
      cannibalization_risk_score =
        ratio < 0.4 ? Math.min(1, (0.4 - ratio) / 0.4) : 0;
    }
  }
  traces.cannibalization_detector = {
    sibling_count: siblings.length,
    cannibalization_risk: cannibalization_risk_score,
  };

  // ── Classifier 6: lifecycle stage classifier ─────────────────────────────
  //
  // C.1 (2026-05-17 audit) · Priority chain reordered so `exit` is reachable
  // even on aged SKUs. Previously `mature` (≥60 days_in_store) preempted
  // `exit`, hiding late-season dogs. Now: insufficient_evidence → new →
  // exit (catastrophic ST) → ramp → decay → mature → peak → exit (declining).
  let lifecycle: LifecycleStage = 'insufficient_evidence';
  const velocityRatio =
    input.velocity_8_14d > 0 ? input.velocity_7d / input.velocity_8_14d : null;
  const stPct = input.sell_through_bought_pct ?? null;
  const dogSt = ctx.thresholds.dog_sell_through_bought_p_max;
  if (daysInStore == null) {
    lifecycle = 'insufficient_evidence';
  } else if (daysInStore < ctx.thresholds.new_days_in_store_max) {
    lifecycle = 'new';
  } else if (
    // Catastrophic-ST exit: ST < half the dog threshold (e.g. <0.10) and any
    // signal of decline (or stale enough to be in the system 30+ days).
    stPct != null &&
    stPct < dogSt * 0.5 &&
    daysInStore >= 30
  ) {
    lifecycle = 'exit';
  } else if (
    velocityRatio != null &&
    velocityRatio >= ctx.thresholds.climber_velocity_ratio_min
  ) {
    lifecycle = 'ramp';
  } else if (
    velocityRatio != null &&
    velocityRatio <= ctx.thresholds.decay_velocity_ratio_max &&
    !stockoutSuppressed &&
    input.pipeline_total != null &&
    velocityRaw7d > 0 &&
    input.pipeline_total / Math.max(velocityRaw7d / 7, 0.01) >=
      ctx.thresholds.decay_overstock_days_min
  ) {
    lifecycle = 'decay';
  } else if (daysInStore >= ctx.thresholds.mature_days_in_store_min) {
    lifecycle = 'mature';
  } else if (
    velocityRatio != null &&
    Math.abs(velocityRatio - 1) < 0.2 &&
    demand_score != null &&
    demand_score >= 0.6
  ) {
    lifecycle = 'peak';
  } else if (
    stPct != null &&
    stPct < dogSt &&
    velocityRatio != null &&
    velocityRatio < 1
  ) {
    lifecycle = 'exit';
  }
  traces.lifecycle_stage = {
    days_in_store: daysInStore,
    velocity_ratio: velocityRatio,
    stage: lifecycle,
  };

  // ── Classifier 8: carryover survivor (BP §5.8) ───────────────────────────
  // A SKU whose lineage has been present in 2+ seasons AND is currently
  // performing at or above median for its family is a "survivor" — strong
  // carryover candidate. Override lifecycle if we currently classified it
  // as 'mature' so the recommendation flow tags this as carryover_survivor.
  const seasonsPresent = input.lineage_seasons_present ?? 1;
  const familyMedianDensity = input.family_code
    ? familyBaselines.get(input.family_code)?.median_density ?? 0
    : 0;
  const carryoverSurvivor =
    seasonsPresent >= 2 &&
    velocityPerStorePerDay != null &&
    velocityPerStorePerDay >= familyMedianDensity &&
    (input.returns_pct ?? 0) <= ctx.thresholds.hero_returns_pct_max &&
    !stockoutSuppressed;
  if (carryoverSurvivor && (lifecycle === 'mature' || lifecycle === 'peak')) {
    // Already in the right neighbourhood; keep stage but flag in trace.
  }
  traces.carryover_survivor = {
    seasons_present: seasonsPresent,
    family_median_density: familyMedianDensity,
    velocity_per_store_per_day: velocityPerStorePerDay,
    returns_pct: input.returns_pct,
    is_survivor: carryoverSurvivor,
    note:
      'Survivorship bias warning: only SKUs visible in the input feed are evaluated. ' +
      'A "survivor" verdict is conditional on the input including the lineage across the seasons.',
  };

  // ── Classifier 7: distribution breadth score ─────────────────────────────
  let distribution_breadth_score: number | null = null;
  if (input.stores_active != null && input.stores_with_stock != null && input.stores_with_stock > 0) {
    distribution_breadth_score = input.stores_active / input.stores_with_stock;
  }

  // ── Classifier 8: markdown risk score ────────────────────────────────────
  //
  // C.4 (2026-05-17 audit) · Decoupled from lifecycle. Previously only
  // SKUs in `decay` or `exit` got a non-zero score, hiding the
  // mature/ramp/peak SKUs sitting on 60+ days of stock that a senior buyer
  // would mark down. New logic fires markdown_risk for ANY SKU (except
  // `new`) when stockDays ≥ 60 OR (effective_margin ≤ 0.10 AND stockDays
  // ≥ 30) OR original decay/exit. Score = min(1, stockDays / 90) regardless.
  let markdown_risk_score: number | null = null;
  const stockDays =
    input.pipeline_total != null && velocityRaw7d > 0
      ? input.pipeline_total / Math.max(velocityRaw7d / 7, 0.01)
      : 0;
  const marginThinAndOversupplied =
    effective_margin != null &&
    input.pvp != null &&
    input.pvp > 0 &&
    effective_margin / input.pvp <= 0.10 &&
    stockDays >= 30;
  const decayOrExit = lifecycle === 'decay' || lifecycle === 'exit';
  const oversupplied = stockDays >= 60;
  if (lifecycle === 'new') {
    markdown_risk_score = 0;
  } else if (decayOrExit || oversupplied || marginThinAndOversupplied) {
    markdown_risk_score = Math.min(1, stockDays / 90);
  } else {
    markdown_risk_score = 0;
  }
  traces.markdown_risk = {
    stock_days: Math.round(stockDays * 10) / 10,
    fired_by:
      decayOrExit ? 'lifecycle_decay_or_exit'
        : oversupplied ? 'oversupplied_60d'
        : marginThinAndOversupplied ? 'thin_margin_oversupplied'
        : 'no_trigger',
    markdown_risk_score,
  };

  // ── Classifier 9: return risk score (per SKU) ────────────────────────────
  const return_risk_score = Math.min(1, returnsPct * 2);

  // ── Confidence dimensions ────────────────────────────────────────────────
  const expectedFields = [
    input.pvp,
    input.markup_pct,
    input.days_in_store,
    input.stores_active,
    input.stores_with_stock,
    input.total_bought,
    input.total_sold,
    input.returns_pct,
    input.velocity_7d,
    input.velocity_8_14d,
  ];
  const presentCount = expectedFields.filter((v) => v != null).length;
  const confidence_data_completeness = presentCount / expectedFields.length;

  const confidence_identity = input.identity_node_id ? 0.95 : 0.5;

  // F.1 · confidence_demand: continuous over stockout severity instead
  // of the 2-state {0.4, 0.9} flag. Lower stockout_risk → more trust in
  // observed velocity → higher confidence. The data_completeness term
  // captures missing inputs separately.
  const confidence_demand =
    velocityPerStorePerDay != null
      ? Math.max(0.2, Math.min(1, confidence_data_completeness + 0.1 - (stockout_risk_score * 0.5)))
      : 0.3;

  // F.1 · confidence_margin: continuous over the effective_margin signal
  // strength. A SKU with returns_pct + a healthy effective_margin reads
  // higher than one missing returns; very thin or negative margins de-rate.
  const confidence_margin =
    effective_margin != null && input.pvp != null && input.pvp > 0
      ? input.returns_pct != null
        ? Math.max(0.3, Math.min(0.95, 0.6 + (effective_margin / input.pvp) * 0.7))
        : Math.max(0.3, Math.min(0.7, 0.5 + (effective_margin / input.pvp) * 0.4))
      : 0.3;

  // F.2 · confidence_creative_fit: wired from brief alignment when the
  // SkuScoreInput has brief context attached. Stays null when no brief is
  // available — that's a signal the buyer hasn't fed a brief yet, not a bug.
  // Brief alignment = weighted overlap of (family pivot direction × color
  // story membership). Implemented in classifier context, see
  // `computeCreativeFit` in this file.
  const confidence_creative_fit: number | null = computeCreativeFit(input, ctx);

  const confidence_action = Math.min(
    1,
    confidence_data_completeness *
      confidence_identity *
      confidence_demand *
      confidence_margin
  );

  // ── Classifier 11 (new): seasonal runway ───────────────────────────────
  // Days remaining in the SKU's natural sell window from the observation
  // anchor date forward. Replenishment allocator uses this to avoid
  // recommending heavy buy on a summer SKU mid-August (would land in
  // October when nobody wears it).
  const seasonal = computeSeasonalRunway(input.season_tag, ctx.observation_date);
  const seasonal_runway_days = seasonal.runway_days;
  const seasonal_runway_score = seasonal.runway_score;
  traces.seasonal_runway = seasonal;

  return {
    product_fact_id: input.product_fact_id,
    identity_node_id: input.identity_node_id,
    demand_score,
    margin_score,
    effective_margin,
    return_risk_score,
    stockout_risk_score,
    markdown_risk_score,
    cannibalization_risk_score,
    distribution_breadth_score,
    seasonal_runway_days,
    seasonal_runway_score,
    lifecycle_stage: lifecycle,
    confidence_data_completeness,
    confidence_identity,
    confidence_demand,
    confidence_margin,
    confidence_creative_fit,
    confidence_action,
    classifier_traces: traces,
  };
}

/**
 * Aggregate family-level scores from per-SKU scores.
 * Classifiers 8-10 (returns_risk_family, family_roi_share_of_wallet, color_winner)
 * operate at family / lineage level.
 */
export function aggregateFamilyScores(
  inputs: SkuScoreInput[],
  scores: SkuScore[],
  thresholds: ClassifierThresholds
): FamilyScore[] {
  const byFamily = new Map<
    string,
    {
      members: Array<{ input: SkuScoreInput; score: SkuScore }>;
    }
  >();
  const scoreByPid = new Map(scores.map((s) => [s.product_fact_id, s]));

  for (const i of inputs) {
    const score = scoreByPid.get(i.product_fact_id);
    if (!score || !i.family_code) continue;
    let bucket = byFamily.get(i.family_code);
    if (!bucket) {
      bucket = { members: [] };
      byFamily.set(i.family_code, bucket);
    }
    bucket.members.push({ input: i, score });
  }

  // Compute global revenue for share_of_wallet.
  let globalImporte = 0;
  for (const [, b] of Array.from(byFamily.entries())) {
    for (const m of b.members) {
      globalImporte += (m.input.pvp ?? 0) * (m.input.total_sold ?? 0);
    }
  }

  const out: FamilyScore[] = [];
  for (const [family_code, bucket] of Array.from(byFamily.entries())) {
    const skuCount = bucket.members.length;
    const heroCount = bucket.members.filter(
      (m) =>
        m.score.demand_score != null &&
        m.score.demand_score >= 0.7 &&
        (m.score.margin_score ?? 0) >= 0.5 &&
        (m.score.return_risk_score ?? 0) < 0.5
    ).length;
    const dogCount = bucket.members.filter(
      (m) => m.score.lifecycle_stage === 'exit' || m.score.lifecycle_stage === 'decay'
    ).length;

    // family_roi = Σ(effective_margin × units_sold) / Σ(units_bought × cost)
    let numerator = 0;
    let denominator = 0;
    for (const m of bucket.members) {
      if (m.score.effective_margin != null && m.input.total_sold != null) {
        numerator += m.score.effective_margin * m.input.total_sold;
      }
      if (m.input.total_bought != null && m.input.cost_estimate != null) {
        denominator += m.input.total_bought * m.input.cost_estimate;
      }
    }
    const familyRoi = denominator > 0 ? numerator / denominator : null;

    // Saturation: dog count / sku count
    const saturationScore = skuCount > 0 ? dogCount / skuCount : 0;

    // Return drag: weighted-avg returns_pct
    let weightedReturnsNum = 0;
    let weightedReturnsDen = 0;
    for (const m of bucket.members) {
      if (m.input.returns_pct != null && m.input.total_sold != null) {
        weightedReturnsNum += m.input.returns_pct * m.input.total_sold;
        weightedReturnsDen += m.input.total_sold;
      }
    }
    const returnDragScore =
      weightedReturnsDen > 0 ? weightedReturnsNum / weightedReturnsDen : null;

    // Stock productivity: Σ revenue / Σ pipeline.
    let revenue = 0;
    let pipeline = 0;
    for (const m of bucket.members) {
      revenue += (m.input.pvp ?? 0) * (m.input.total_sold ?? 0);
      pipeline += m.input.pipeline_total ?? 0;
    }
    const stockProductivity = pipeline > 0 ? revenue / pipeline : null;

    // Share of wallet
    const shareOfWalletPct = globalImporte > 0 ? revenue / globalImporte : null;

    // Cannibalization (family-level): average sku cannibalization_risk_score
    let cannSum = 0;
    let cannCount = 0;
    for (const m of bucket.members) {
      if (m.score.cannibalization_risk_score != null) {
        cannSum += m.score.cannibalization_risk_score;
        cannCount += 1;
      }
    }
    const cannibalizationScore = cannCount > 0 ? cannSum / cannCount : null;

    out.push({
      family_code,
      family_display_name: null,
      family_roi: familyRoi,
      saturation_score: saturationScore,
      cannibalization_score: cannibalizationScore,
      return_drag_score: returnDragScore,
      stock_productivity: stockProductivity,
      share_of_wallet_pct: shareOfWalletPct,
      share_of_wallet_trend: null, // requires multi-season comparison; computed at run level when 2+ seasons present
      sku_count: skuCount,
      hero_count: heroCount,
      dog_count: dogCount,
      classifier_traces: {
        returns_risk_flag:
          returnDragScore != null && returnDragScore >= thresholds.returns_risk_family_p_min,
        family_roi_inputs: { numerator, denominator },
        global_importe: globalImporte,
      },
    });
  }

  return out;
}

/**
 * Build per-family velocity-density baselines for normalization.
 */
export function buildFamilyBaselines(
  inputs: SkuScoreInput[]
): Map<string, { median_density: number; max_density: number }> {
  const byFamily = new Map<string, number[]>();
  for (const i of inputs) {
    if (!i.family_code) continue;
    if (i.stores_active == null || i.days_in_store == null || i.days_in_store <= 0) continue;
    if (i.stores_active <= 0) continue;
    const density = i.velocity_7d / Math.min(i.days_in_store, 7) / i.stores_active;
    if (!Number.isFinite(density)) continue;
    let arr = byFamily.get(i.family_code);
    if (!arr) {
      arr = [];
      byFamily.set(i.family_code, arr);
    }
    arr.push(density);
  }

  const out = new Map<string, { median_density: number; max_density: number }>();
  for (const [family, vals] of Array.from(byFamily.entries())) {
    if (vals.length === 0) continue;
    vals.sort((a, b) => a - b);
    const median_density = vals[Math.floor(vals.length / 2)];
    const max_density = vals[vals.length - 1] || 1;
    out.set(family, { median_density, max_density });
  }
  return out;
}

/**
 * Build sibling map indexed by identity_node_id.
 */
export function buildLineageSiblings(
  inputs: SkuScoreInput[]
): Map<string, SkuScoreInput[]> {
  const out = new Map<string, SkuScoreInput[]>();
  for (const i of inputs) {
    if (!i.identity_node_id) continue;
    let arr = out.get(i.identity_node_id);
    if (!arr) {
      arr = [];
      out.set(i.identity_node_id, arr);
    }
    arr.push(i);
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Seasonal runway: how many days of natural sell window remain for this
 * SKU from the observation anchor date forward.
 *
 *   Spanish convention:
 *     V = Verano (spring/summer) → Mar–Sep, peak Apr–Aug
 *     I = Invierno (winter) → Sep–Mar, peak Oct–Feb
 *   English convention:
 *     SS = Spring/Summer → same as V
 *     FW/AW = Fall/Winter → same as I
 *
 * Compound tags like "I26+V26" use the LATEST season segment (the SKU
 * carried over into the more recent one).
 *
 * Output:
 *   runway_days = max(0, season_end - observation_date) capped at 240
 *   runway_score = runway_days / 180 capped at 1
 *
 * Score interpretation:
 *   1.0 = full season ahead (e.g. V26 observed in March 2026)
 *   0.5 = half a season ahead (e.g. V26 observed in May–Jun)
 *   0.1 = season ending (e.g. V26 observed in late August)
 *   0.0 = season ended (re-buying makes no sense without next season's tag)
 */
export function computeSeasonalRunway(
  seasonTag: string | undefined | null,
  observationDate: string
): {
  season_year: number | null;
  season_kind: 'spring_summer' | 'fall_winter' | 'unknown';
  season_end_date: string | null;
  runway_days: number | null;
  runway_score: number | null;
  note: string;
} {
  if (!seasonTag) {
    return {
      season_year: null,
      season_kind: 'unknown',
      season_end_date: null,
      runway_days: null,
      runway_score: null,
      note: 'No season_tag — runway cannot be computed.',
    };
  }
  // Use the LATEST segment for compound tags.
  const segments = seasonTag.split('+').map((s) => s.trim());
  const latest = segments[segments.length - 1];
  const m = latest.match(/^(V|I|SS|FW|AW)\s?(\d{2,4})$/i);
  if (!m) {
    return {
      season_year: null,
      season_kind: 'unknown',
      season_end_date: null,
      runway_days: null,
      runway_score: null,
      note: `Unrecognized season_tag format: "${seasonTag}"`,
    };
  }
  const prefix = m[1].toUpperCase();
  let yearRaw = m[2];
  if (yearRaw.length === 2) yearRaw = `20${yearRaw}`;
  const year = parseInt(yearRaw, 10);

  // S/S season ends Sep 30 of the same year.
  // F/W season ends Mar 31 of the FOLLOWING year.
  const kind: 'spring_summer' | 'fall_winter' =
    prefix === 'V' || prefix === 'SS' ? 'spring_summer' : 'fall_winter';
  const seasonEnd =
    kind === 'spring_summer'
      ? new Date(Date.UTC(year, 8, 30)) // Sep 30
      : new Date(Date.UTC(year + 1, 2, 31)); // Mar 31 of year+1
  const obs = new Date(observationDate);
  const dayMs = 24 * 60 * 60 * 1000;
  const runwayDaysRaw = Math.round((seasonEnd.getTime() - obs.getTime()) / dayMs);
  const runwayDays = Math.max(0, Math.min(240, runwayDaysRaw));
  const runwayScore = Math.max(0, Math.min(1, runwayDays / 180));

  return {
    season_year: year,
    season_kind: kind,
    season_end_date: seasonEnd.toISOString().slice(0, 10),
    runway_days: runwayDays,
    runway_score: runwayScore,
    note: `${kind === 'spring_summer' ? 'S/S' : 'F/W'} ${year} → ${runwayDays}d remaining`,
  };
}
