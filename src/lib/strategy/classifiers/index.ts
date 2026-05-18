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
  /** v2 — Synthetic fleet size when SKU's stores_total is null. The Zara
   *  RNK parser doesn't extract stores_total today (0/48 populated in V26
   *  corpus); we approximate the effective fleet as the max of
   *  stores_with_stock observed across the tenant's corpus. Graceful
   *  degradation per memory/feedback_aimily-graceful-degradation-tenant-
   *  input-or-synthetic.md. */
  stores_total_synthetic?: number | null;
  /** v2 — Season weeks remaining for markdown_risk_score (existing) and
   *  for markdown_margin_safety. When the tenant doesn't supply a real
   *  season-end date, falls back to 13 weeks (one quarter, generic
   *  fast-fashion window). */
  season_weeks_remaining?: number;
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

  // v2 — campos del RNK Zara que el v1 dejaba encima de la mesa.
  // Vocabulario retail/moda (memory/decision-map_aimily-in-season-v2-2026-05-18.md).
  //
  // Distribución
  /** Flota total — denominador real para "cuánta cobertura tengo vs la posible". */
  stores_total: number | null;
  /** Tiendas que hicieron al menos una venta ayer (ventana d1).
   *  Actívación diaria = stores_with_sale_d1 / stores_active. */
  stores_with_sale_d1: number | null;
  // Stock
  /** Stock que puedo mover AHORA. Distinto de stock_store + stock_warehouse:
   *  ya descontados los bloqueos y ajustes. Es el denominador de "puedo
   *  reponer" y "puedo ampliar distribución". */
  stock_available: number | null;
  /** Almacén secundario disponible (CD2). Pool alternativo cuando CD1 está
   *  agotado o cuando hay restricciones logísticas. */
  cd2_available: number | null;
  // Eficiencia
  /** Unidades enviadas a tienda cumulativo. Denominador del éxito del enviado;
   *  distinto del comprado (que incluye stock muerto en almacén). */
  total_shipped: number | null;
  // Facturación y peso estratégico (ventana 7d — vista semanal canónica del buyer)
  /** Facturación € en la ventana 7d. Permite ranking de héroes por revenue
   *  (no solo unidades) y cómputo de GMROI preciso. */
  importe_7d: number | null;
  /** Aportación: % de la facturación neta de la familia que representa este
   *  SKU en la ventana 7d. Un SKU con 25% de share es estructuralmente
   *  importante; uno con 0.5% es accesorio aunque tenga velocidad similar. */
  share_net_sales_7d: number | null;
  // Productividad — los KPIs canónicos de merchandising
  /** Rotación 7d ajustada (tienda + tránsito) — EL indicador canónico de
   *  productividad del stock. Unidades vendidas ÷ stock medio del periodo.
   *  >1.0 = excepcional · 0.5-1.0 = sana · <0.5 = estancado. */
  rotation_td_tr_aj_7d: number | null;
  /** Rotación 7d cruda (sin ajuste por tránsito). */
  rotation_td_tr_7d: number | null;
}

export interface SkuScore {
  product_fact_id: string;
  identity_node_id: string | null;

  // v1 signals — kept for backward compat with recommend.ts + resolver
  demand_score: number | null;
  margin_score: number | null;
  effective_margin: number | null;
  return_risk_score: number | null;
  stockout_risk_score: number | null;
  markdown_risk_score: number | null;
  cannibalization_risk_score: number | null;
  distribution_breadth_score: number | null;
  lifecycle_stage: LifecycleStage;
  seasonal_runway_days: number | null;
  seasonal_runway_score: number | null;

  // v2 — Ángulo 1 · Demanda (new derived signals)
  /** Tendencia: +1 acelerando (venta ayer > antesdeayer), -1 decelerando.
   *  Magnitud proporcional al gap relativo. */
  velocity_trend_score: number | null;
  /** Demanda por facturación: rank de importe_7d dentro del corpus.
   *  Captura héroes de revenue que velocity_rank por unidades pierde
   *  (e.g., un caro de €120 con 50 uds pesa más que uno de €30 con 200). */
  revenue_demand_score: number | null;
  /** Aportación pesada por demanda: share_net_sales_7d × demand_score.
   *  Un SKU con 0.3 share es estructuralmente importante incluso si
   *  velocity_rank no es top. Bloquea KILL aunque otras señales lo pidan. */
  family_contribution_score: number | null;
  /** Rotación normalizada vs media de la familia. EL KPI canónico de
   *  productividad. >=0.7 = rotación sana; <=0.3 = estancado. */
  rotation_health_score: number | null;
  /** Activación diaria: tiendas con venta ayer ÷ tiendas activas.
   *  <0.5 = "stocked pero no vendiendo" → señal para INVESTIGAR
   *  (problema en punto de venta, exposición, talla, fit). */
  daily_activation_score: number | null;

  // v2 — Ángulo 2 · Margen
  /** ¿Ya hay una rebaja aplicada? (PVP < PVP referencia) */
  markdown_already_applied: boolean;
  /** Escalón canónico actual de rebaja:
   *  0 = sin rebaja · 1 = -25/-30% · 2 = -40/-60% · 3 = -70%+ */
  markdown_stage: 0 | 1 | 2 | 3;
  /** Elasticidad: (max_sale_promo / max_sale_no_promo) − 1.
   *  >0 = la promo empuja unidades. Cuanto más alto, más sentido tiene
   *  REBAJAR o PROMOVER. */
  price_elasticity_score: number | null;
  /** Margen real sobre el suelo: effective_margin × éxito_del_enviado.
   *  Lo que el suelo entrega de verdad, no lo que el plan asumía. */
  shipped_margin_eur: number | null;

  // v2 — Ángulo 3 · Techo de demanda
  /** Utilización de capacidad: venta_d1 / max_sale_no_promo. */
  capacity_utilization: number | null;
  /** Espacio que queda al techo: 1 − capacity_utilization. */
  capacity_headroom: number | null;
  /** Techo con promo (max_sale_promo). Cuántas uds/día puede llegar a
   *  hacer en su mejor día con descuento. */
  promo_capacity_ceiling: number | null;

  // v2 — Ángulo 4 · Agotamiento (stockout_risk_score ya existe)
  /** ¿Puedo reponer AHORA? stock_available > 0 OR cd2_available > 0. */
  can_replenish_now: boolean;
  /** Días que tardaría el pipeline en llegar al ritmo actual de venta. */
  pipeline_arrival_runway_days: number | null;
  /** Activación de HOY: stores_with_sale_d1 / stores_with_stock.
   *  Distinto de daily_activation_score (que usa stores_active = stores
   *  que han vendido en algún momento). */
  activation_ratio_today: number | null;

  // v2 — Ángulo 5 · Canibalización (cannibalization_risk_score ya existe)
  /** Fuerza del color ganador dentro del estilo:
   *  share del #1 / media del resto. >=3.0 = ganador limpio (dispara
   *  EXTENDER COLORES). <2.0 = ganadores marginales (no propaga). */
  color_winner_strength: number | null;
  /** Concentración Gini del share entre hermanos del estilo.
   *  0 = balanceado · 1 = uno se lleva todo. */
  share_concentration_gini: number | null;
  /** Varianza de devoluciones entre hermanos. Alta = una variante es la
   *  manzana podrida del estilo (señal para MARCAR REVISIÓN). */
  sibling_returns_variance: number | null;

  // v2 — Ángulo 6 · Ciclo (lifecycle_stage ya existe)
  /** Rotación subiendo / bajando / estable esta semana. */
  rotation_stage_signal: 'rising' | 'falling' | 'stable' | null;
  /** Doble lectura de eficiencia: éxito del comprado (la decisión inicial). */
  efficiency_bought_pct: number | null;
  /** Éxito del enviado (la realidad en suelo, lo que el merchandiser ve). */
  efficiency_shipped_pct: number | null;

  // v2 — Ángulo 7 · Cobertura (distribution_breadth_score ya existe)
  /** Cobertura de flota: stores_with_stock / stores_total.
   *  Cuando stores_total es null, usa stores_total_synthetic del ctx. */
  fleet_coverage_score: number | null;
  /** Tiendas que faltan por activar — denominador de AMPLIAR DISTRIBUCIÓN. */
  distribution_lift_capacity_stores: number | null;
  /** Fuerza del CD2: cd2_available / pipeline_total. */
  cd2_pool_strength: number | null;

  // v2 — Ángulo 8 · Riesgo de rebaja (markdown_risk_score ya existe)
  /** Estimación de unidades adicionales que libera el siguiente escalón:
   *  derivado de max_sale_promo − max_sale_no_promo × días estimados. */
  markdown_lift_estimate_units: number | null;
  /** Siguiente escalón canónico (NUNCA bajar — Felipe ratchet duro).
   *  Si stage=0 → 1; si 1 → 2; si 2 → 3; si 3 → null (terminal). */
  markdown_ladder_next_step: 0 | 1 | 2 | 3 | null;
  /** ¿La rebaja propuesta sigue dejando margen positivo?
   *  shipped_margin − descuento_eur. */
  markdown_margin_safety_eur: number | null;

  // v2 — Ángulo 9 · Devoluciones (return_risk_score ya existe)
  /** Devoluciones relativas a la familia: returns_pct / family_baseline.
   *  >=2.0 = anómalo para la categoría. */
  returns_vs_baseline_score: number | null;
  /** Euros en juego: total_sold × PVP × returns_pct + logística inversa. */
  returns_value_at_risk_eur: number | null;
  /** Economía unitaria rota: effective_margin < 0 AND returns ≥ 30%.
   *  Dispara KILL de emergencia incluso si la velocidad es alta. */
  is_unit_economics_negative: boolean;

  // v2 — Ángulo 10 · Continuidad
  /** ¿Es superviviente probado? ≥2 temporadas + rotación sana +
   *  devoluciones normales + sin rotura. */
  is_survivor: boolean;
  /** Fuerza de continuidad: temporadas × rotación × aportación. */
  continuity_strength: number | null;
  /** Consistencia entre temporadas (varianza de velocidad).
   *  Stable / fluctuating / null (insufficient data). */
  lineage_consistency: 'stable' | 'fluctuating' | null;
  /** Elegible para plan de básicos: superviviente + fuerza alta +
   *  categoría admite básicos. */
  staple_eligibility: boolean;

  // Confidence (unchanged)
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
        days_in_store, stores_with_stock, stores_active, stores_total,
        stock_store, stock_warehouse, stock_available,
        stock_in_transit, stock_pending, pipeline_total, cd2_available
      ),
      strategy_sales_windows (
        window_type, units, max_sale_no_promo, max_sale_promo,
        importe, share_net_sales, stores_with_sale,
        rotation_td_tr_aj_7d, rotation_td_tr_7d,
        emptying_rate, emptying_rate_available
      ),
      strategy_efficiency_facts (
        total_bought, total_sold, total_shipped,
        sell_through_shipped_pct, sell_through_bought_pct, returns_pct
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

    // v2 — campos por-ventana del RNK Zara que el v1 dejaba sin leer.
    // Ventana canónica para la vista semanal del comprador = 7d.
    // Ventana canónica para "ayer" = d1 (activación diaria, tiendas con
    // venta ayer).
    const w7 = windows.find((x) => x.window_type === '7d') ?? {};
    const wD1 = windows.find((x) => x.window_type === 'd1') ?? {};
    // Rotación: el parser duplica el mismo valor en cada ventana. Tomamos
    // el primero no-null para tolerar variaciones de parser.
    const rotationAj =
      windows.map((x) => numOrNull(x.rotation_td_tr_aj_7d)).find((v) => v != null) ??
      null;
    const rotationCru =
      windows.map((x) => numOrNull(x.rotation_td_tr_7d)).find((v) => v != null) ??
      null;

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
      // v2 — Distribución
      stores_total: numOrNull(inv.stores_total),
      stores_with_sale_d1: numOrNull(wD1.stores_with_sale),
      // v2 — Stock
      stock_available: numOrNull(inv.stock_available),
      cd2_available: numOrNull(inv.cd2_available),
      // v2 — Eficiencia
      total_shipped: numOrNull(eff.total_shipped),
      // v2 — Facturación y peso estratégico (ventana 7d)
      importe_7d: numOrNull(w7.importe),
      share_net_sales_7d: numOrNull(w7.share_net_sales),
      // v2 — Productividad (rotaciones canónicas)
      rotation_td_tr_aj_7d: rotationAj,
      rotation_td_tr_7d: rotationCru,
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
  /** Per-family baselines (v2: rotation + returns + revenue + density). */
  familyBaselines: Map<string, FamilyBaseline>,
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

  // ── Classifier 8: markdown risk score (FWOC vs season-end weeks) ────────
  //
  // Spec v1 (2026-05-17) — reframed from `stock_days / 90` to the canonical
  // unit `Forward Weeks of Cover / Season Weeks Remaining`. Sources:
  //   - Caro & Gallien 2012 (Operations Research): the documented Zara
  //     clearance trigger is "estimated time to sell remaining stock at
  //     current rate vs. time remaining in clearance window". Stock-days
  //     denominator (90) was an absolute number with no season anchor.
  //   - Goworek "Fashion Buying" Ch.10: markdowns are triggered when
  //     forward weeks of cover exceeds remaining selling window.
  //   - Smith & Achabal 1998 (Mgmt Sci) clearance-pricing optimal control.
  //
  // The new score = FWOC / season_weeks_remaining, capped at 1.
  //   FWOC = pipeline_total / (velocity_7d/7) / 7   (weeks of cover)
  //   season_weeks_remaining = days remaining in season ÷ 7 (synth fallback)
  //
  // When season metadata is unknown (no season-end date inferable from the
  // tenant), we fall back to a retailer-profile default of 13 weeks (one
  // quarter, the generic fast-fashion season window). The synthetic source
  // is flagged on the trace so the UI can label the score as estimated.
  //
  // C.4 trigger conditions unchanged: fires when SKU is past `new` AND
  // (decay/exit lifecycle, oversupplied >=60d kept as the safety net, OR
  // thin margin + oversupplied). The reframe is to the SCORE unit, not the
  // trigger gate.
  let markdown_risk_score: number | null = null;
  const stockDays =
    input.pipeline_total != null && velocityRaw7d > 0
      ? input.pipeline_total / Math.max(velocityRaw7d / 7, 0.01)
      : 0;
  // FWOC (forward weeks of cover) = stockDays / 7.
  const fwoc = stockDays / 7;
  // Season weeks remaining — synthetic default 13 (one quarter) when not
  // provided via input.season_weeks_remaining. Future: tenant supplies real
  // season-end date via the planning OTB feed (graceful-degradation pattern,
  // per memory/feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md).
  const seasonWeeksRemaining =
    (input as { season_weeks_remaining?: number | null }).season_weeks_remaining ??
    13;
  const fwocRatio = seasonWeeksRemaining > 0 ? fwoc / seasonWeeksRemaining : 0;
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
    // Score: FWOC / season_weeks_remaining (Caro & Gallien 2012 canon).
    // Capped at 1; ratios above 1 mean "you will not sell out at this rate
    // before the season closes — markdown urgent".
    markdown_risk_score = Math.min(1, fwocRatio);
  } else {
    markdown_risk_score = 0;
  }
  traces.markdown_risk = {
    stock_days: Math.round(stockDays * 10) / 10,
    fwoc_weeks: Math.round(fwoc * 10) / 10,
    season_weeks_remaining: seasonWeeksRemaining,
    fwoc_ratio: Math.round(fwocRatio * 100) / 100,
    season_weeks_source:
      (input as { season_weeks_remaining?: number | null }).season_weeks_remaining != null
        ? 'tenant'
        : 'synthetic_default_13',
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

  // ═════════════════════════════════════════════════════════════════════
  // v2 — SEÑALES DERIVADAS DE LOS 10 ÁNGULOS DE LECTURA
  // Spec: memory/decision-map_aimily-in-season-v2-2026-05-18.md §2
  // Cada bloque corresponde a un ángulo. Las señales aquí calculadas
  // alimentan los disparos de las 12 decisiones (F3, próxima fase).
  // ═════════════════════════════════════════════════════════════════════
  const familyBaseline = input.family_code
    ? familyBaselines.get(input.family_code) ?? null
    : null;

  // ── Ángulo 1 · Demanda ──────────────────────────────────────────────────
  // velocity_trend_score: acelerando (+1) vs decelerando (−1). Magnitud
  // proporcional al gap relativo entre venta ayer y antesdeayer.
  let velocity_trend_score: number | null = null;
  if (input.velocity_d1 > 0 || input.velocity_d2 > 0) {
    const avg = (input.velocity_d1 + input.velocity_d2) / 2;
    if (avg > 0) {
      velocity_trend_score = Math.max(
        -1,
        Math.min(1, (input.velocity_d1 - input.velocity_d2) / avg)
      );
    }
  }
  // revenue_demand_score: importe vs máximo de la familia. Captura héroes
  // de revenue que velocity-rank por unidades pierde.
  let revenue_demand_score: number | null = null;
  if (input.importe_7d != null && familyBaseline && familyBaseline.max_importe_7d > 0) {
    revenue_demand_score = Math.max(
      0,
      Math.min(1, input.importe_7d / familyBaseline.max_importe_7d)
    );
  }
  // family_contribution_score: aportación directa. Bloquea KILL aunque
  // otras señales lo pidan si el SKU representa >5% de la familia.
  const family_contribution_score: number | null =
    input.share_net_sales_7d != null
      ? Math.max(0, Math.min(1, input.share_net_sales_7d))
      : null;
  // rotation_health_score: rotación ajustada normalizada vs máximo de
  // la familia. EL KPI canónico de productividad del stock.
  let rotation_health_score: number | null = null;
  if (
    input.rotation_td_tr_aj_7d != null &&
    familyBaseline &&
    familyBaseline.max_rotation_aj > 0
  ) {
    rotation_health_score = Math.max(
      0,
      Math.min(1, input.rotation_td_tr_aj_7d / familyBaseline.max_rotation_aj)
    );
  }
  // daily_activation_score: tiendas con venta ayer / tiendas activas.
  // <0.5 = "stocked pero no vendiendo" → señal de problema en suelo.
  let daily_activation_score: number | null = null;
  if (
    input.stores_with_sale_d1 != null &&
    input.stores_active != null &&
    input.stores_active > 0
  ) {
    daily_activation_score = Math.max(
      0,
      Math.min(1, input.stores_with_sale_d1 / input.stores_active)
    );
  }
  traces.demanda_v2 = {
    velocity_trend_score,
    revenue_demand_score,
    family_contribution_score,
    rotation_health_score,
    daily_activation_score,
    rotation_observed: input.rotation_td_tr_aj_7d,
    rotation_family_max: familyBaseline?.max_rotation_aj ?? null,
    importe_7d: input.importe_7d,
    share_net_sales_7d: input.share_net_sales_7d,
  };

  // ── Ángulo 2 · Margen ───────────────────────────────────────────────────
  const markdown_already_applied =
    input.pvp != null && input.pvp_compare != null && input.pvp_compare > input.pvp;
  // Escalón canónico moda (Felipe: ratchet duro, prohibido bajar):
  // 0 = sin rebaja · 1 = -25/-30% · 2 = -40/-60% · 3 = -70%+
  let markdown_stage: 0 | 1 | 2 | 3 = 0;
  if (markdown_already_applied && input.pvp != null && input.pvp_compare != null && input.pvp_compare > 0) {
    const discount = 1 - input.pvp / input.pvp_compare;
    if (discount >= 0.65) markdown_stage = 3;
    else if (discount >= 0.35) markdown_stage = 2;
    else if (discount >= 0.20) markdown_stage = 1;
  }
  // price_elasticity_score: (max_promo / max_no_promo) − 1. Cuánto más
  // empujan unidades los días con promoción. >0.5 = elasticidad fuerte.
  let price_elasticity_score: number | null = null;
  if (
    input.max_sale_promo != null &&
    input.max_sale_no_promo != null &&
    input.max_sale_no_promo > 0
  ) {
    price_elasticity_score = input.max_sale_promo / input.max_sale_no_promo - 1;
  }
  // shipped_margin_eur: margen efectivo × éxito del enviado. Lo que el
  // suelo entrega de verdad, no lo que el plan asumía sobre lo comprado.
  let shipped_margin_eur: number | null = null;
  if (effective_margin != null && input.sell_through_shipped_pct != null) {
    shipped_margin_eur = effective_margin * input.sell_through_shipped_pct;
  }
  traces.margen_v2 = {
    markdown_already_applied,
    markdown_stage,
    price_elasticity_score,
    shipped_margin_eur,
  };

  // ── Ángulo 3 · Techo de demanda ────────────────────────────────────────
  const capacity_utilization = capacity_ratio;  // existing v1 computation
  const capacity_headroom =
    capacity_utilization != null ? Math.max(0, 1 - capacity_utilization) : null;
  const promo_capacity_ceiling = input.max_sale_promo;

  // ── Ángulo 4 · Agotamiento — señales adicionales ───────────────────────
  // can_replenish_now: ¿hay stock para mover AHORA?
  const can_replenish_now =
    (input.stock_available ?? 0) > 0 || (input.cd2_available ?? 0) > 0;
  // pipeline_arrival_runway_days: cuántos días tardaría el pipeline en
  // llegar al ritmo actual de venta. Si es muy largo, ACELERAR ENTRADA.
  let pipeline_arrival_runway_days: number | null = null;
  if (input.pipeline_total != null && velocityRaw7d > 0) {
    pipeline_arrival_runway_days = input.pipeline_total / (velocityRaw7d / 7);
  }
  // activation_ratio_today: tiendas con venta ayer / tiendas con stock.
  // Distinto de daily_activation_score (que usa stores_active = históricas).
  let activation_ratio_today: number | null = null;
  if (
    input.stores_with_sale_d1 != null &&
    input.stores_with_stock != null &&
    input.stores_with_stock > 0
  ) {
    activation_ratio_today = input.stores_with_sale_d1 / input.stores_with_stock;
  }

  // ── Ángulo 5 · Canibalización — señales adicionales ────────────────────
  let color_winner_strength: number | null = null;
  let share_concentration_gini: number | null = null;
  let sibling_returns_variance: number | null = null;
  if (input.identity_node_id) {
    const allSiblings = lineageSiblings.get(input.identity_node_id) ?? [];
    if (allSiblings.length > 1) {
      // Color winner strength: my share / mean(other siblings' share).
      const myShare = input.share_net_sales_7d ?? 0;
      const otherShares = allSiblings
        .filter((s) => s.product_fact_id !== input.product_fact_id)
        .map((s) => s.share_net_sales_7d ?? 0);
      const otherMean =
        otherShares.length > 0
          ? otherShares.reduce((a, b) => a + b, 0) / otherShares.length
          : 0;
      if (otherMean > 0) {
        color_winner_strength = myShare / otherMean;
      }
      // Gini coefficient of shares across siblings.
      const allShares = allSiblings.map((s) => s.share_net_sales_7d ?? 0);
      const totalShare = allShares.reduce((a, b) => a + b, 0);
      if (totalShare > 0 && allShares.length > 1) {
        const sorted = allShares.slice().sort((a, b) => a - b);
        let weightedSum = 0;
        for (let i = 0; i < sorted.length; i++) {
          weightedSum += (i + 1) * sorted[i];
        }
        share_concentration_gini =
          (2 * weightedSum) / (sorted.length * totalShare) -
          (sorted.length + 1) / sorted.length;
      }
      // Sibling returns variance (std dev).
      const returnsArr = allSiblings.map((s) => s.returns_pct ?? 0);
      if (returnsArr.length > 1) {
        const mean = returnsArr.reduce((a, b) => a + b, 0) / returnsArr.length;
        const variance =
          returnsArr.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
          returnsArr.length;
        sibling_returns_variance = Math.sqrt(variance);
      }
    }
  }

  // ── Ángulo 6 · Ciclo — eficiencia dual ─────────────────────────────────
  const efficiency_bought_pct = input.sell_through_bought_pct;
  const efficiency_shipped_pct = input.sell_through_shipped_pct;
  // rotation_stage_signal requires multi-period rotation history we don't
  // ingest yet (V26 is a single snapshot). Honest null — will be wired
  // when 2+ period data is available (also unblocks the backtest engine
  // per audit H.1).
  const rotation_stage_signal: 'rising' | 'falling' | 'stable' | null = null;

  // ── Ángulo 7 · Cobertura — señales adicionales ─────────────────────────
  // Synthetic fallback: when stores_total is null (Zara parser doesn't
  // extract it), use the corpus-wide max(stores_with_stock) as effective
  // fleet size (per graceful-degradation cardinal rule).
  const effectiveStoresTotal =
    input.stores_total ?? ctx.stores_total_synthetic ?? null;
  let fleet_coverage_score: number | null = null;
  if (
    input.stores_with_stock != null &&
    effectiveStoresTotal != null &&
    effectiveStoresTotal > 0
  ) {
    fleet_coverage_score = Math.max(
      0,
      Math.min(1, input.stores_with_stock / effectiveStoresTotal)
    );
  }
  let distribution_lift_capacity_stores: number | null = null;
  if (effectiveStoresTotal != null && input.stores_with_stock != null) {
    distribution_lift_capacity_stores = Math.max(
      0,
      effectiveStoresTotal - input.stores_with_stock
    );
  }
  let cd2_pool_strength: number | null = null;
  if (
    input.cd2_available != null &&
    input.pipeline_total != null &&
    input.pipeline_total > 0
  ) {
    cd2_pool_strength = input.cd2_available / input.pipeline_total;
  }
  traces.cobertura_v2 = {
    stores_total_source: input.stores_total != null ? 'tenant' : 'synthetic',
    stores_total_effective: effectiveStoresTotal,
    fleet_coverage_score,
    distribution_lift_capacity_stores,
    cd2_pool_strength,
  };

  // ── Ángulo 8 · Riesgo de rebaja — señales adicionales ──────────────────
  // markdown_lift_estimate_units: estimación semanal de unidades
  // adicionales que libera el escalón siguiente. Conservadora — asume
  // que el día pico con promo se repite a lo largo de la semana al
  // ritmo medio entre max_promo y max_no_promo. Real lift depende de
  // duración + cadencia de la promoción.
  let markdown_lift_estimate_units: number | null = null;
  if (input.max_sale_promo != null && input.max_sale_no_promo != null) {
    markdown_lift_estimate_units = Math.max(
      0,
      (input.max_sale_promo - input.max_sale_no_promo) * 7
    );
  }
  // markdown_ladder_next_step — ratchet duro: nunca bajar de escalón.
  const markdown_ladder_next_step: 0 | 1 | 2 | 3 | null =
    markdown_stage === 0
      ? 1
      : markdown_stage === 1
        ? 2
        : markdown_stage === 2
          ? 3
          : null; // stage 3 is terminal
  // markdown_margin_safety_eur: margen efectivo MENOS descuento del
  // siguiente escalón. Si negativo, REBAJAR destruye economía.
  let markdown_margin_safety_eur: number | null = null;
  if (
    effective_margin != null &&
    input.pvp != null &&
    markdown_ladder_next_step != null
  ) {
    const nextDiscountPct =
      markdown_ladder_next_step === 1
        ? 0.275 // -25/-30 midpoint
        : markdown_ladder_next_step === 2
          ? 0.50 // -40/-60 midpoint
          : 0.75; // -70+ floor estimate
    const discountEur = input.pvp * nextDiscountPct;
    markdown_margin_safety_eur = effective_margin - discountEur;
  }

  // ── Ángulo 9 · Devoluciones — señales adicionales ──────────────────────
  let returns_vs_baseline_score: number | null = null;
  if (
    input.returns_pct != null &&
    familyBaseline &&
    familyBaseline.weighted_returns_baseline > 0
  ) {
    returns_vs_baseline_score =
      input.returns_pct / familyBaseline.weighted_returns_baseline;
  }
  let returns_value_at_risk_eur: number | null = null;
  if (
    input.total_sold != null &&
    input.pvp != null &&
    input.returns_pct != null
  ) {
    const returnedUnits = input.total_sold * input.returns_pct;
    returns_value_at_risk_eur =
      returnedUnits * (input.pvp + ctx.reverse_logistics_cost_per_unit);
  }
  // is_unit_economics_negative — emergency kill trigger.
  const is_unit_economics_negative =
    effective_margin != null &&
    effective_margin < 0 &&
    (input.returns_pct ?? 0) >= 0.30;

  // ── Ángulo 10 · Continuidad — señales adicionales ──────────────────────
  const is_survivor = carryoverSurvivor;
  let continuity_strength: number | null = null;
  if (
    input.lineage_seasons_present &&
    input.rotation_td_tr_aj_7d != null &&
    input.share_net_sales_7d != null
  ) {
    continuity_strength = Math.max(
      0,
      Math.min(
        1,
        Math.min(1, input.lineage_seasons_present / 3) * 0.3 +
          (rotation_health_score ?? 0) * 0.4 +
          Math.min(1, input.share_net_sales_7d / 0.20) * 0.3
      )
    );
  }
  // lineage_consistency — requires multi-period sibling history. Honest
  // null until 2+ period data is ingested.
  const lineage_consistency: 'stable' | 'fluctuating' | null = null;
  const staple_eligibility = is_survivor && (continuity_strength ?? 0) >= 0.50;

  // Persistir todas las señales v2 al trace para que la route las pueda
  // leer sin necesidad de recomputar. Mirror exacto de los campos
  // retornados — actualizar JUNTOS si cambia uno.
  traces.v2_signals = {
    // Ángulo 1
    velocity_trend_score,
    revenue_demand_score,
    family_contribution_score,
    rotation_health_score,
    /** Rotación observada absoluta (input.rotation_td_tr_aj_7d). La
     *  UI muestra este valor en la fila comercial; el _health_score es
     *  la versión normalizada vs familia. */
    rotation_aj_7d_observed: input.rotation_td_tr_aj_7d,
    daily_activation_score,
    // Ángulo 2
    markdown_already_applied,
    markdown_stage,
    price_elasticity_score,
    shipped_margin_eur,
    // Ángulo 3
    capacity_utilization,
    capacity_headroom,
    promo_capacity_ceiling,
    // Ángulo 4
    can_replenish_now,
    pipeline_arrival_runway_days,
    activation_ratio_today,
    // Ángulo 5
    color_winner_strength,
    share_concentration_gini,
    sibling_returns_variance,
    // Ángulo 6
    rotation_stage_signal,
    efficiency_bought_pct,
    efficiency_shipped_pct,
    // Ángulo 7
    fleet_coverage_score,
    distribution_lift_capacity_stores,
    cd2_pool_strength,
    // Ángulo 8
    markdown_lift_estimate_units,
    markdown_ladder_next_step,
    markdown_margin_safety_eur,
    // Ángulo 9
    returns_vs_baseline_score,
    returns_value_at_risk_eur,
    is_unit_economics_negative,
    // Ángulo 10
    is_survivor,
    continuity_strength,
    lineage_consistency,
    staple_eligibility,
  };

  return {
    product_fact_id: input.product_fact_id,
    identity_node_id: input.identity_node_id,
    // v1 signals
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
    // v2 — Ángulo 1 Demanda
    velocity_trend_score,
    revenue_demand_score,
    family_contribution_score,
    rotation_health_score,
    daily_activation_score,
    // v2 — Ángulo 2 Margen
    markdown_already_applied,
    markdown_stage,
    price_elasticity_score,
    shipped_margin_eur,
    // v2 — Ángulo 3 Techo
    capacity_utilization,
    capacity_headroom,
    promo_capacity_ceiling,
    // v2 — Ángulo 4 Agotamiento
    can_replenish_now,
    pipeline_arrival_runway_days,
    activation_ratio_today,
    // v2 — Ángulo 5 Canibalización
    color_winner_strength,
    share_concentration_gini,
    sibling_returns_variance,
    // v2 — Ángulo 6 Ciclo
    rotation_stage_signal,
    efficiency_bought_pct,
    efficiency_shipped_pct,
    // v2 — Ángulo 7 Cobertura
    fleet_coverage_score,
    distribution_lift_capacity_stores,
    cd2_pool_strength,
    // v2 — Ángulo 8 Rebaja
    markdown_lift_estimate_units,
    markdown_ladder_next_step,
    markdown_margin_safety_eur,
    // v2 — Ángulo 9 Devoluciones
    returns_vs_baseline_score,
    returns_value_at_risk_eur,
    is_unit_economics_negative,
    // v2 — Ángulo 10 Continuidad
    is_survivor,
    continuity_strength,
    lineage_consistency,
    staple_eligibility,
    // Confidence
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

export interface FamilyBaseline {
  /** v1 — velocity density (unidades / día / tienda) median+max */
  median_density: number;
  max_density: number;
  /** v2 — rotación ajustada 7d, mediana + máximo de la familia.
   *  Permite normalizar rotation_health_score: SKUs cuya rotación está
   *  cerca del máximo de su familia son los héroes productivos. */
  median_rotation_aj: number;
  max_rotation_aj: number;
  /** v2 — baseline de devoluciones pesada por unidades vendidas.
   *  Si el SKU está 2× por encima, las devoluciones son anómalas para
   *  esta categoría, no problema general de moda devolutiva. */
  weighted_returns_baseline: number;
  /** v2 — importe mediano y máximo de la familia. Para rankear héroes
   *  por revenue contribution. */
  median_importe_7d: number;
  max_importe_7d: number;
}

/**
 * Build per-family baselines for v2 normalization.
 * Velocity density (existing) + rotation + returns + importe (v2).
 */
export function buildFamilyBaselines(
  inputs: SkuScoreInput[]
): Map<string, FamilyBaseline> {
  const densityByFamily = new Map<string, number[]>();
  const rotationByFamily = new Map<string, number[]>();
  const returnsByFamily = new Map<string, { rp: number; sold: number }[]>();
  const importeByFamily = new Map<string, number[]>();

  for (const i of inputs) {
    if (!i.family_code) continue;
    const fam = i.family_code;
    // Density
    if (i.stores_active != null && i.days_in_store != null && i.days_in_store > 0 && i.stores_active > 0) {
      const density = i.velocity_7d / Math.min(i.days_in_store, 7) / i.stores_active;
      if (Number.isFinite(density)) {
        const arr = densityByFamily.get(fam) ?? [];
        arr.push(density);
        densityByFamily.set(fam, arr);
      }
    }
    // Rotación ajustada
    if (i.rotation_td_tr_aj_7d != null && i.rotation_td_tr_aj_7d > 0) {
      const arr = rotationByFamily.get(fam) ?? [];
      arr.push(i.rotation_td_tr_aj_7d);
      rotationByFamily.set(fam, arr);
    }
    // Devoluciones pesadas por unidades
    if (i.returns_pct != null && i.total_sold != null) {
      const arr = returnsByFamily.get(fam) ?? [];
      arr.push({ rp: i.returns_pct, sold: i.total_sold });
      returnsByFamily.set(fam, arr);
    }
    // Importe 7d
    if (i.importe_7d != null && i.importe_7d > 0) {
      const arr = importeByFamily.get(fam) ?? [];
      arr.push(i.importe_7d);
      importeByFamily.set(fam, arr);
    }
  }

  const out = new Map<string, FamilyBaseline>();
  const allFams = new Set<string>([
    ...Array.from(densityByFamily.keys()),
    ...Array.from(rotationByFamily.keys()),
    ...Array.from(returnsByFamily.keys()),
    ...Array.from(importeByFamily.keys()),
  ]);
  for (const fam of Array.from(allFams)) {
    const densities = (densityByFamily.get(fam) ?? []).slice().sort((a, b) => a - b);
    const rotations = (rotationByFamily.get(fam) ?? []).slice().sort((a, b) => a - b);
    const returns = returnsByFamily.get(fam) ?? [];
    const importes = (importeByFamily.get(fam) ?? []).slice().sort((a, b) => a - b);

    const median = (arr: number[]) => arr.length > 0 ? arr[Math.floor(arr.length / 2)] : 0;
    const max = (arr: number[]) => arr.length > 0 ? arr[arr.length - 1] : 0;

    // Weighted returns baseline.
    let rwNum = 0, rwDen = 0;
    for (const r of returns) {
      rwNum += r.rp * r.sold;
      rwDen += r.sold;
    }
    const weighted_returns_baseline = rwDen > 0 ? rwNum / rwDen : 0;

    out.set(fam, {
      median_density: median(densities),
      max_density: max(densities) || 1,
      median_rotation_aj: median(rotations),
      max_rotation_aj: max(rotations) || 1,
      weighted_returns_baseline,
      median_importe_7d: median(importes),
      max_importe_7d: max(importes) || 1,
    });
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
