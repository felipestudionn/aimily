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
  tenantId: string
): Promise<SkuScoreInput[]> {
  // Pull every product_fact + its inventory + windows + efficiency + identity_node.
  // We do this in one go for the tenant; for very large tenants v2 will
  // paginate per analysis_run scope.

  const { data: products, error: pErr } = await supabaseAdmin
    .from('strategy_product_facts')
    .select(
      `
      id, model_ref, color_ref, family_code, pvp, pvp_compare, markup_pct, on_promo,
      cost_estimate, margin_pct_list,
      strategy_inventory_facts!strategy_inventory_facts_product_idx (
        days_in_store, stores_with_stock, stores_active, stock_store,
        stock_warehouse, stock_in_transit, stock_pending, pipeline_total
      ),
      strategy_sales_windows!strategy_sales_windows_product_window_idx (
        window_type, units, max_sale_no_promo, max_sale_promo
      ),
      strategy_efficiency_facts!strategy_efficiency_facts_product_idx (
        total_bought, total_sold, sell_through_shipped_pct, sell_through_bought_pct, returns_pct
      )
    `
    )
    .eq('tenant_id', tenantId);

  if (pErr) throw new Error(`scoring inputs fetch failed: ${pErr.message}`);

  // Match each product_fact to its identity_node by member array containment.
  const { data: identityNodes } = await supabaseAdmin
    .from('strategy_sku_identity_graph')
    .select('id, member_product_fact_ids')
    .eq('tenant_id', tenantId);

  const identityByProduct = new Map<string, string>();
  for (const node of identityNodes || []) {
    for (const pid of node.member_product_fact_ids as string[]) {
      identityByProduct.set(pid, node.id);
    }
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

    return {
      product_fact_id: p.id,
      identity_node_id: identityByProduct.get(p.id) ?? null,
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
  let distributionRatio: number | null = null;
  if (input.stores_with_stock && input.stores_active && input.stores_with_stock > 0) {
    distributionRatio = input.stores_active / input.stores_with_stock;
  }
  const stockoutSuppressed =
    distributionRatio != null &&
    distributionRatio < 0.6 &&
    velocityRaw7d > 0;
  let stockout_risk_score = stockoutSuppressed ? 1 - distributionRatio! : 0;
  traces.stockout_aware_velocity = {
    distribution_ratio: distributionRatio,
    stockout_suppressed: stockoutSuppressed,
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
  let lifecycle: LifecycleStage = 'insufficient_evidence';
  const velocityRatio =
    input.velocity_8_14d > 0 ? input.velocity_7d / input.velocity_8_14d : null;
  if (daysInStore == null) {
    lifecycle = 'insufficient_evidence';
  } else if (daysInStore < ctx.thresholds.new_days_in_store_max) {
    lifecycle = 'new';
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
    (input.sell_through_bought_pct ?? 0) < ctx.thresholds.dog_sell_through_bought_p_max &&
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

  // ── Classifier 7: distribution breadth score ─────────────────────────────
  let distribution_breadth_score: number | null = null;
  if (input.stores_active != null && input.stores_with_stock != null && input.stores_with_stock > 0) {
    distribution_breadth_score = input.stores_active / input.stores_with_stock;
  }

  // ── Classifier 8: markdown risk score ────────────────────────────────────
  let markdown_risk_score: number | null = null;
  if (lifecycle === 'decay' || lifecycle === 'exit') {
    const stockDays =
      input.pipeline_total != null && velocityRaw7d > 0
        ? input.pipeline_total / Math.max(velocityRaw7d / 7, 0.01)
        : 0;
    markdown_risk_score = Math.min(1, stockDays / 90);
  } else {
    markdown_risk_score = 0;
  }

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

  const confidence_demand =
    velocityPerStorePerDay != null && !stockoutSuppressed
      ? Math.min(1, confidence_data_completeness + 0.1)
      : 0.4;

  const confidence_margin =
    effective_margin != null
      ? input.returns_pct != null
        ? 0.9
        : 0.6
      : 0.3;

  const confidence_creative_fit: number | null = null; // computed in Bucket B modulation step

  const confidence_action = Math.min(
    1,
    confidence_data_completeness *
      confidence_identity *
      confidence_demand *
      confidence_margin
  );

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
