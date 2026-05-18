/**
 * SKU verdict resolver — multi-action verdict per SKU.
 *
 * Felipe's rule: each SKU surfaces ALL the actions the engine detected
 * (typically 1-3). A hero with rising returns shows up as both
 * `carryover` and `investigate`. The buyer reads the stack and decides
 * which one to act on.
 *
 * For each action that involves buying (replenish, carryover) we compute
 * a recommended_units anchored on a healthy rotation target:
 *
 *   recommended_units = (velocity_per_day × target_rotation_days × stores_with_stock)
 *                       − (stock_total + pipeline_total)
 *
 * Default rotation is 4 days (Felipe's baseline) but lives per-action so
 * the UI can let the buyer override per SKU.
 *
 * Output is a `SkuVerdict` that becomes the data shape for the PDF
 * overlay + drawer UI: one row per SKU with multiple action chips.
 */

import type { RecommendationCandidate } from './recommend';
import { generateRationale, shouldCarryUnits, type RationaleContext } from './sku-verdict-rationale';

/**
 * The 13 action types a per-SKU verdict can surface (product spec v1, 2026-05-17).
 *
 * Spec source of truth: memory/product-spec_aimily-in-season-2026-05-17.md §4.
 *
 * Three time horizons:
 *  - THIS WEEK / TODAY (urgent operational decision for the Daily/Monday Trading Meeting)
 *  - THIS MONTH (tactical re-balance, planning-level)
 *  - NEXT SEASON (creative direction feed)
 *
 * Two legacy aliases retained for backward compatibility with existing DB rows
 * and prior commits: `investigate` is the pre-split version of
 * `investigate_root_cause` + `promote_push`; `amplify_winner` is the pre-split
 * version of `amplify_in_season` + `amplify_next_season`. New code should not
 * emit these aliases — they'll be removed after the legacy resolver path is
 * deprecated. See feedback_aimily-* memories for context.
 *
 * Explicitly OUT of scope per Felipe (2026-05-17):
 *  - inter-store TRANSFER (allocator/operations layer, not buyer-merch)
 *  - PUSH_ALLOCATION between stores (same — operations layer)
 *  See feedback_aimily-scope-no-inter-store-transfer.md.
 */
export type SkuVerdictAction =
  // ── THIS WEEK / TODAY ──────────────────────────────────────────────────
  | 'kill'
  | 'markdown_accelerate'
  | 'amplify_distribution'
  | 'pull_forward_intake'
  // ── THIS MONTH ─────────────────────────────────────────────────────────
  | 'replenish'
  | 'amplify_in_season'
  | 'promote_push'
  | 'resize_down'
  | 'investigate_root_cause'
  // ── NEXT SEASON (creative direction feed) ──────────────────────────────
  | 'amplify_next_season'
  | 'extend_colors'
  | 'carryover'
  // ── FALLBACK ───────────────────────────────────────────────────────────
  | 'hold'
  // ── LEGACY ALIASES (deprecated, retained for back-compat) ──────────────
  | 'investigate'
  | 'amplify_winner';

/**
 * Stable display order = the Daily/Monday Trading Meeting agenda (spec §6).
 * Most consequential / urgent at the top so the buyer scans the right thing
 * first. THIS-WEEK actions lead; CARRYOVER/HOLD trail. Legacy aliases
 * (`investigate`, `amplify_winner`) collapse to their split equivalents'
 * positions so any persisted DB rows still render in the correct slot.
 */
const ACTION_DISPLAY_ORDER: SkuVerdictAction[] = [
  // THIS WEEK
  'kill',
  'markdown_accelerate',
  'amplify_distribution',
  'pull_forward_intake',
  // THIS MONTH
  'replenish',
  'amplify_in_season',
  'amplify_winner',         // legacy alias — same horizon as amplify_in_season
  'promote_push',
  'resize_down',
  'investigate_root_cause',
  'investigate',            // legacy alias — same horizon as investigate_root_cause
  // NEXT SEASON
  'amplify_next_season',
  'extend_colors',
  'carryover',
  // FALLBACK
  'hold',
];

/**
 * Six Rights of Merchandising (Kincade & Gibson "Merchandising of Fashion
 * Products", ch.4) — every verdict ties to which Right it's optimizing.
 * This is the credibility anchor for a buyer reviewing the verdict pack:
 * they recognize the Six Rights framework from classroom training and see
 * which dimension of their job aimily is helping with.
 */
export type SixRight =
  | 'right_product'
  | 'right_price'
  | 'right_place'
  | 'right_time'
  | 'right_quantity'
  | 'right_promotion';

/**
 * Owner of the verdict — who in the merch organization owns the action.
 * Spec source: Jackson & Shaw "Mastering Fashion Buying and Merchandising
 * Management" (LCF). Maps to the discipline boundary that classroom
 * teaching enforces.
 *
 * - 'buyer' — Buyer (US: DMM/Buyer; ES: Comprador/Compradora)
 * - 'merchandiser' — Merchandiser / Planner (ES: Comercial / Planner Comercial)
 * - 'both' — Joint decision (buyer + merchandiser sign-off together)
 * - 'marketing' — Joint with marketing (for PROMOTE_PUSH)
 * - 'design' — Joint with design team (for AMPLIFY_NEXT_SEASON / EXTEND_COLORS)
 * - 'supply_chain' — Joint with sourcing / supply chain (for PULL_FORWARD_INTAKE)
 */
export type VerdictOwner =
  | 'buyer'
  | 'merchandiser'
  | 'both'
  | 'marketing'
  | 'design'
  | 'supply_chain';

/**
 * Spec mapping: each verdict verb → its Six Right anchor (Kincade & Gibson).
 * Spec source: memory/product-spec_aimily-in-season-2026-05-17.md §4.
 */
export const VERDICT_SIX_RIGHT: Record<SkuVerdictAction, SixRight> = {
  // THIS WEEK
  kill: 'right_product',
  markdown_accelerate: 'right_price',
  amplify_distribution: 'right_place',
  pull_forward_intake: 'right_time',
  // THIS MONTH
  replenish: 'right_quantity',
  amplify_in_season: 'right_quantity',
  promote_push: 'right_promotion',
  resize_down: 'right_quantity',
  investigate_root_cause: 'right_product',
  // NEXT SEASON
  amplify_next_season: 'right_product',
  extend_colors: 'right_product',
  carryover: 'right_product',
  // FALLBACK
  hold: 'right_product',
  // LEGACY ALIASES
  investigate: 'right_product',
  amplify_winner: 'right_quantity',
};

/**
 * Spec mapping: each verdict verb → its owner role(s).
 * Spec source: memory/product-spec_aimily-in-season-2026-05-17.md §4.
 */
export const VERDICT_OWNER: Record<SkuVerdictAction, VerdictOwner> = {
  // THIS WEEK
  kill: 'both',                       // buyer + merchandiser joint sign-off
  markdown_accelerate: 'merchandiser',
  amplify_distribution: 'merchandiser',
  pull_forward_intake: 'supply_chain',
  // THIS MONTH
  replenish: 'merchandiser',
  amplify_in_season: 'both',
  promote_push: 'marketing',
  resize_down: 'buyer',
  investigate_root_cause: 'buyer',
  // NEXT SEASON
  amplify_next_season: 'design',      // buyer + design joint
  extend_colors: 'design',            // buyer + design joint
  carryover: 'both',
  // FALLBACK
  hold: 'buyer',                      // re-evaluation owner
  // LEGACY ALIASES
  investigate: 'buyer',
  amplify_winner: 'both',
};

export interface SkuVerdictInput {
  product_fact_id: string;
  /** All candidates emitted by recommend.ts for this SKU. */
  candidates: RecommendationCandidate[];
  /** Operational metrics needed for the rotation-based quantity math. */
  velocity_7d: number | null;
  velocity_d1: number | null;
  /** B.6 · Stockout-adjusted 7d velocity (= observed × correction factor
   *  accounting for days the SKU was stocked out). Preferred over raw
   *  velocity_7d in replenish math — heroes that ran out get bought
   *  enough next time around. Null when no stockout-suppression data
   *  available (in which case we fall back to observed velocity_7d). */
  velocity_stockout_adjusted_7d: number | null;
  stores_active: number | null;
  stores_with_stock: number | null;
  stock_total: number | null;
  pipeline_total: number | null;
}

/** One row in the per-SKU action stack. */
export interface SkuVerdictItem {
  action: SkuVerdictAction;
  /** Confidence of the underlying candidate that produced this action. */
  confidence: number;
  /** Human-readable Spanish sentence explaining the situation +
   *  recommendation. Generated by sku-verdict-rationale templates. */
  rationale: string;
  /** Units to buy (only set for `replenish`). Carryover etc. = null
   *  because "mantener" means "no buy". */
  recommended_units: number | null;
  /** Confidence dimensions inherited from the source candidate. */
  confidence_breakdown: {
    data_completeness: number | null;
    identity: number | null;
    demand: number | null;
    margin: number | null;
    creative_fit: number | null;
  };
  /** Evidence + counter-evidence + assumptions for the drawer detail view. */
  evidence: Record<string, unknown>;
  counter_evidence: Record<string, unknown>;
  assumptions: string[];
  /** Optional warning the engine attached to this candidate. */
  data_sufficiency_warning: string | null;
  /** Six Right anchor — which dimension of the buyer's job this verdict
   *  is optimizing (Kincade & Gibson). Optional during transition — when
   *  absent, derive from VERDICT_SIX_RIGHT[action] at the output layer.
   *  Spec source: product-spec §4. */
  six_right?: SixRight;
  /** Owner role(s) responsible for acting on this verdict (Jackson &
   *  Shaw discipline boundary). Optional during transition — when absent,
   *  derive from VERDICT_OWNER[action] at the output layer. */
  owner?: VerdictOwner;
}

/**
 * Enrich a SkuVerdictItem with six_right + owner if they're not already
 * set. Pure derivation from the action via the spec maps — call this at
 * the output boundary so the UI always sees the fields populated, even
 * for items created by appenders that haven't been updated yet.
 *
 * Spec source: memory/product-spec_aimily-in-season-2026-05-17.md §4.
 */
export function enrichVerdictItem(item: SkuVerdictItem): SkuVerdictItem {
  if (item.six_right != null && item.owner != null) return item;
  return {
    ...item,
    six_right: item.six_right ?? VERDICT_SIX_RIGHT[item.action],
    owner: item.owner ?? VERDICT_OWNER[item.action],
  };
}

/** Apply enrichVerdictItem to every item in a verdict's action stack.
 *  Generic over the verdict shape so callers that pass a
 *  ModulatedSkuVerdict (which extends SkuVerdict with modulator_notes)
 *  keep their extension intact. */
export function enrichVerdict<V extends SkuVerdict>(verdict: V): V {
  return {
    ...verdict,
    actions: verdict.actions.map(enrichVerdictItem),
  };
}

export interface SkuVerdict {
  product_fact_id: string;
  /** 1-N actions, ordered by ACTION_DISPLAY_ORDER. Always at least one
   *  (defaults to `hold` when no candidate maps cleanly). */
  actions: SkuVerdictItem[];
  /** Buyer-editable rotation target in days. Default 4d (Felipe's baseline).
   *  Applied to every replenish/carryover action in the stack. */
  target_rotation_days: number;
  /** Days of stock currently on hand at the SKU's velocity. Same number
   *  across all actions for this SKU so we store it at SKU scope. */
  current_stock_days: number | null;
}

/** Default rotation a healthy fast-fashion product should sit at. Comes
 *  from Felipe's explicit guidance ("una rotación de cuatro días sería
 *  sana"). Buyers can override per SKU in the drawer. */
export const DEFAULT_TARGET_ROTATION_DAYS = 4;

/** B.3 · Per-family rotation overrides. The 4-day default is fast-fashion
 *  fluido tops/blouses; tailoring/outerwear/decay-stage SKUs rotate slower.
 *  Lookup is by family_code prefix (Zara coding). Retailer profiles override
 *  this map at runtime — see the retailer-agnostic framework doc. */
export const FAMILY_ROTATION_OVERRIDES_ZARA: Record<string, number> = {
  // Fluidos (tops/blouses/dresses) → 4 days (default)
  'W.A FLUIDOS': 4,
  // Sastrería (tailoring) → 10 days
  'W.A.SASTRE': 10,
  // Capsule "Familias" / "Editions" → 14 days
  'W.E FAMILIAS': 14,
  // Coll. Denim → 7 days
  'W.COLL D': 7,
};

/** Resolve target_rotation_days for a SKU given its family_code, using the
 *  retailer's override map and falling back to the global default. Returns
 *  the longest matching prefix's value (so "W.A.SASTRE CORTO" matches the
 *  "W.A.SASTRE" override even though the suffix differs). */
export function resolveTargetRotationDays(
  familyCode: string | null,
  overrides: Record<string, number> = FAMILY_ROTATION_OVERRIDES_ZARA,
  fallback: number = DEFAULT_TARGET_ROTATION_DAYS
): number {
  if (!familyCode) return fallback;
  const upper = familyCode.toUpperCase();
  let best: { prefix: string; days: number } | null = null;
  for (const [prefix, days] of Object.entries(overrides)) {
    if (upper.startsWith(prefix.toUpperCase())) {
      if (!best || prefix.length > best.prefix.length) {
        best = { prefix, days };
      }
    }
  }
  return best ? best.days : fallback;
}

/** Map a recommend.ts ActionType (candidate-level enum) to our 13-verb verdict
 *  vocabulary (resolver-level enum). Returns null for engine actions that
 *  don't fit at SKU scope (new_sku_proposal, family_extension, tension_flag,
 *  recolor at lineage scope, substitute, geographic_redistribute).
 *
 *  The candidate-level enum (strategy_action_type) is intentionally kept
 *  narrower than the resolver enum — the 13 spec verbs are emitted at the
 *  resolver via dedicated appender functions (appendAmplifyInSeasonAction,
 *  appendAmplifyDistributionAction, appendPromotePushAction, etc.) rather
 *  than as raw candidates. This keeps the DB enum stable and lets resolver
 *  logic combine multiple signals into a single verdict.
 *
 *  Spec source: memory/product-spec_aimily-in-season-2026-05-17.md §4.
 */
function mapActionType(action: string): SkuVerdictAction | null {
  switch (action) {
    case 'kill':
      return 'kill';
    case 'markdown_accelerate':
    case 'markdown_delay':
      return 'markdown_accelerate';
    case 'replenish':
      return 'replenish';
    case 'resize_up':
      return 'carryover';
    case 'resize_down':
      return 'resize_down';
    case 'investigate':
      // Default candidate-level 'investigate' to the new spec verb
      // 'investigate_root_cause'. The split into investigate_root_cause vs
      // promote_push happens at the resolver level via dedicated appenders
      // when the marketing_calendar_flag is set (cause known).
      return 'investigate_root_cause';
    case 'carryover':
      return 'carryover';
    case 'geographic_redistribute':
      // Maps to the in-scope distribution verb. Note: the spec excludes
      // inter-store transfer; this resolver verb only covers warehouse →
      // more stores (per feedback_aimily-scope-no-inter-store-transfer.md).
      // The appender that materializes amplify_distribution enforces the
      // scope guard.
      return 'amplify_distribution';
    default:
      return null;
  }
}

/**
 * Compute target buy units to hit the requested rotation.
 *
 * Math:
 *   velocity_per_day = velocity_stockout_adjusted_7d / 7    (B.6 — backed out from observed)
 *                   || velocity_7d / 7                       (B.2 — 7d/7 is more stable than v_d1)
 *                   || velocity_d1                           (last resort)
 *   coverage_days   = target_rotation_days + lead_time_days  (B.5 — gate by lead time)
 *   target_units    = velocity_per_day × coverage_days
 *   currentStock    = pipeline_total                          (B.4 — pipeline already contains store+warehouse)
 *   gap             = max(0, target_units − currentStock)
 *
 * IMPORTANT: pipeline_total from Zara RNK already includes stock_store +
 * stock_warehouse + stock_in_transit + stock_pending (verified 48/48 SKUs
 * in dogfood corpus 2026-05-17). Do NOT add stock_total separately — that
 * double-counts the on-hand inventory.
 *
 * velocity_7d from Zara RNK is the AGGREGATE units across all stores over
 * the 7-day window — NOT a per-store rate. Do NOT multiply by
 * stores_with_stock.
 *
 * Returns null for units when no velocity data is available.
 */
export function computeReplenishUnits(
  input: Pick<
    SkuVerdictInput,
    'velocity_7d' | 'velocity_d1' | 'velocity_stockout_adjusted_7d'
      | 'stores_with_stock' | 'stock_total' | 'pipeline_total'
  >,
  targetRotationDays: number,
  leadTimeDays: number = 0
): { recommended_units: number | null; current_stock_days: number | null } {
  // B.6: prefer stockout-adjusted velocity when available — heroes that ran
  // out are systematically under-bought if we use observed only.
  // B.2: 7d/7 is preferred over v_d1 because v_d1 alone is too volatile
  // (Mondays vs Saturdays produce 50%+ swings; corpus had SKUs with v_d1=3
  // and v_7d=1216 producing 19,726-day stock-cover artifacts).
  const velocityPerDay =
    input.velocity_stockout_adjusted_7d != null && input.velocity_stockout_adjusted_7d > 0
      ? input.velocity_stockout_adjusted_7d / 7
      : input.velocity_7d != null && input.velocity_7d > 0
      ? input.velocity_7d / 7
      : input.velocity_d1 != null && input.velocity_d1 > 0
      ? input.velocity_d1
      : null;
  if (velocityPerDay == null) {
    return { recommended_units: null, current_stock_days: null };
  }
  // B.4: pipeline_total IS the total committed inventory (store + warehouse
  // + in_transit + pending). Falling back to stock_total only when pipeline
  // is missing (other retailers may report differently — see retailer
  // profile semantics in the framework doc).
  const currentStock = input.pipeline_total ?? input.stock_total ?? 0;
  // B.5: coverage target is rotation + lead-time. A SKU with 9 days of
  // stock and 14-day lead-time needs replenish NOW even if rotation says
  // 4d is fine — by the time the new units arrive, current stock is gone.
  const coverageDays = targetRotationDays + Math.max(0, leadTimeDays);
  const targetUnits = velocityPerDay * coverageDays;
  const gap = Math.max(0, Math.round(targetUnits - currentStock));
  const currentStockDays = velocityPerDay > 0 ? currentStock / velocityPerDay : null;
  return {
    recommended_units: gap,
    current_stock_days: currentStockDays != null ? Math.round(currentStockDays * 10) / 10 : null,
  };
}

/**
 * Build a single SkuVerdictItem from a recommend.ts candidate.
 * Returns null when the candidate's action doesn't map to a SKU-scope
 * verdict (those are filtered out upstream).
 */
function buildVerdictItem(
  candidate: RecommendationCandidate,
  input: SkuVerdictInput,
  targetRotationDays: number,
  identity: { product_name: string | null; family_code: string | null; model_ref: string | null; color_ref: string | null; color_name: string | null },
  leadTimeDays: number = 0
): SkuVerdictItem | null {
  const action = mapActionType(candidate.action_type);
  if (!action) return null;

  // Only `replenish` carries a recommended_units. Carryover = "no buy",
  // markdown = "lower price not raise stock", investigate = "diagnose
  // before acting", etc. Surfacing a number on those confuses the buyer.
  const carry = shouldCarryUnits(action);
  const { recommended_units, current_stock_days } = carry
    ? computeReplenishUnits(input, targetRotationDays, leadTimeDays)
    : { recommended_units: null, current_stock_days: null };

  const evidence = (candidate.evidence as Record<string, unknown>) ?? {};
  // Pull markdown_risk trace into the rationale context so the 3-step
  // ladder logic can pick the right stage (Stage 1 / 2 / Terminal).
  // The classifier writes these into the candidate evidence under
  // traces.markdown_risk; we hoist the two key fields to the top-level
  // context so the rationale doesn't need to know the trace structure.
  const traces = (evidence.traces as Record<string, Record<string, unknown>> | undefined) ?? {};
  const markdownTrace = traces.markdown_risk ?? {};
  const fwocWeeks = typeof markdownTrace.fwoc_weeks === 'number' ? (markdownTrace.fwoc_weeks as number) : null;
  const seasonWeeksRemaining =
    typeof markdownTrace.season_weeks_remaining === 'number'
      ? (markdownTrace.season_weeks_remaining as number)
      : null;
  const rationaleCtx: RationaleContext = {
    product_name: identity.product_name,
    family_code: identity.family_code,
    model_ref: identity.model_ref,
    velocity_7d: input.velocity_7d,
    velocity_ratio: typeof evidence.velocity_ratio === 'number' ? (evidence.velocity_ratio as number) : null,
    returns_pct: typeof evidence.returns_pct === 'number' ? (evidence.returns_pct as number) : null,
    effective_margin: typeof evidence.effective_margin === 'number' ? (evidence.effective_margin as number) : null,
    lifecycle_stage: typeof evidence.lifecycle_stage === 'string' ? (evidence.lifecycle_stage as string) : null,
    sell_through_bought_pct:
      typeof evidence.sell_through_bought_pct === 'number'
        ? (evidence.sell_through_bought_pct as number)
        : null,
    stores_active: input.stores_active,
    current_stock_days,
    recommended_units,
    target_rotation_days: targetRotationDays,
    fwoc_weeks: fwocWeeks,
    season_weeks_remaining: seasonWeeksRemaining,
  };

  return {
    action,
    confidence: Number(candidate.confidence_action) || 0,
    rationale: generateRationale(action, rationaleCtx),
    recommended_units,
    confidence_breakdown: {
      data_completeness: candidate.confidence_data_completeness ?? null,
      identity: candidate.confidence_identity ?? null,
      demand: candidate.confidence_demand ?? null,
      margin: candidate.confidence_margin ?? null,
      creative_fit: candidate.confidence_creative_fit ?? null,
    },
    evidence,
    counter_evidence: (candidate.counter_evidence as Record<string, unknown>) ?? {},
    assumptions: (candidate.assumptions as string[]) ?? [],
    data_sufficiency_warning: candidate.data_sufficiency_warning,
  };
}

/**
 * Resolve a SKU's full set of candidates into a stack of verdict items.
 * Multiple actions for the same SKU are allowed and surfaced — Felipe's
 * rule: "se ponen todas las que haya, puede tener dos o tres acciones".
 *
 * When two candidates collapse to the same SkuVerdictAction (e.g. two
 * markdown variants) we keep the one with higher confidence. When no
 * candidate maps to a usable action, we emit a single `hold`.
 */
export function resolveSkuVerdict(
  input: SkuVerdictInput,
  targetRotationDays: number = DEFAULT_TARGET_ROTATION_DAYS,
  identity: { product_name: string | null; family_code: string | null; model_ref: string | null; color_ref: string | null; color_name: string | null } = {
    product_name: null,
    family_code: null,
    model_ref: null,
    color_ref: null,
    color_name: null,
  },
  leadTimeDays: number = 0
): SkuVerdict {
  // Build items for every candidate that maps to a SKU-scope action.
  const itemsByAction = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const c of input.candidates) {
    const item = buildVerdictItem(c, input, targetRotationDays, identity, leadTimeDays);
    if (!item) continue;
    const existing = itemsByAction.get(item.action);
    if (!existing || item.confidence > existing.confidence) {
      itemsByAction.set(item.action, item);
    }
  }

  // Sort by stable display order so the UI always shows the most
  // consequential action first.
  const actions: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = itemsByAction.get(a);
    if (item) actions.push(item);
  }

  // Diagnostic: current stock days at the SKU's velocity. Same number
  // for the whole SKU (independent of which actions apply).
  const { current_stock_days } = computeReplenishUnits(input, targetRotationDays, leadTimeDays);

  if (actions.length === 0) {
    // No usable signal — emit a hold so the UI always has something to
    // render and the buyer sees "nothing actionable here, reassess".
    const fallback = input.candidates[0];
    const evidence = (fallback?.evidence as Record<string, unknown>) ?? {};
    const fallbackCtx: RationaleContext = {
      product_name: identity.product_name,
      family_code: identity.family_code,
      model_ref: identity.model_ref,
      velocity_7d: input.velocity_7d,
      velocity_ratio: typeof evidence.velocity_ratio === 'number' ? (evidence.velocity_ratio as number) : null,
      returns_pct: typeof evidence.returns_pct === 'number' ? (evidence.returns_pct as number) : null,
      effective_margin: typeof evidence.effective_margin === 'number' ? (evidence.effective_margin as number) : null,
      lifecycle_stage: typeof evidence.lifecycle_stage === 'string' ? (evidence.lifecycle_stage as string) : null,
      sell_through_bought_pct:
        typeof evidence.sell_through_bought_pct === 'number'
          ? (evidence.sell_through_bought_pct as number)
          : null,
      stores_active: input.stores_active,
      current_stock_days,
      recommended_units: null,
      target_rotation_days: targetRotationDays,
    };
    actions.push({
      action: 'hold',
      confidence: 0.3,
      rationale: generateRationale('hold', fallbackCtx),
      recommended_units: null,
      confidence_breakdown: {
        data_completeness: fallback?.confidence_data_completeness ?? null,
        identity: fallback?.confidence_identity ?? null,
        demand: fallback?.confidence_demand ?? null,
        margin: fallback?.confidence_margin ?? null,
        creative_fit: fallback?.confidence_creative_fit ?? null,
      },
      evidence,
      counter_evidence: (fallback?.counter_evidence as Record<string, unknown>) ?? {},
      assumptions: (fallback?.assumptions as string[]) ?? [],
      data_sufficiency_warning:
        fallback?.data_sufficiency_warning ??
        'No clear signal for this SKU — hold and reassess next run',
    });
  }

  return {
    product_fact_id: input.product_fact_id,
    actions,
    target_rotation_days: targetRotationDays,
    current_stock_days,
  };
}

/**
 * Append an `amplify_winner` action when the SKU is materially out-
 * performing its family (Felipe's "vende 2× la media" rule). For these
 * winners, surfacing "carryover" alone is insufficient — the right
 * second-order action is "design the next generation in this winning
 * archetype" so next season captures the demand the current SKU is
 * already proving.
 *
 * Trigger: demand_score ≥ 0.7 (top quintile in family) + hero indicators
 * (sell-through ≥ 50%, returns ≤ 18%). The signal becomes a strong
 * candidate-for-followups for the merchandising team to brief design.
 */
export function appendAmplifyWinnerAction(
  verdict: SkuVerdict,
  signals: {
    demand_score: number | null;
    sell_through_bought_pct: number | null;
    returns_pct: number | null;
    velocity_7d: number | null;
    family_code: string | null;
    /** 1-based PDF rank — the order the buyer sees in the RNK report. This
     *  is the SOURCE ranking from Zara, generally by revenue. */
    pdf_rank: number | null;
    /** 1-based rank by velocity_7d across the run (1 = highest units). */
    velocity_rank: number | null;
    /** velocity_7d divided by family average velocity. */
    family_velocity_ratio: number | null;
    /** Color names from the creative brief's color_story. When present, the
     *  rationale recommends shooting the winner silhouette in these colors. */
    brief_colors: string[];
    /** Color name of THIS SKU. Excluded from the brief-color suggestions
     *  since proposing the same colour the SKU already sells in is moot. */
    current_color: string | null;
    /** A.5 · Price-anchor for operational rationale. The buyer briefs the
     *  design team with a price slot ("seguir a €29.95" vs "subir a €34.95"). */
    pvp?: number | null;
    /** A.5 · Sibling model_refs that ALSO fire amplify_winner in this run.
     *  Surfaces "el 250 también está en top 10" type context so the buyer
     *  understands which colourways are co-validated. */
    sibling_hero_model_refs?: string[];
    /** Felipe 2026-05-18 caso Bomber 5247/600 — éxito del enviado es la
     *  señal de hero PRIMARIA (no el del comprado, que se distorsiona
     *  cuando la compra se infla mid-season). Si shipped_pct ≥ 0.50
     *  dispara hero independientemente de los demás triggers. */
    sell_through_shipped_pct?: number | null;
  }
): SkuVerdict {
  // A.4.b · Returns hard block (>35%). Used to silently skip — now we
  // annotate the verdict so the buyer sees "we would have called this a
  // hero but returns are eating it; review fit before considering for
  // amplification". Implemented by appending an `investigate` flag in
  // the existing verdict stack when there is no other action present.
  if ((signals.returns_pct ?? 0) > 0.35) {
    // If verdict already carries any signal, we let the existing kill /
    // markdown / investigate speak for itself; we just don't promote to
    // amplify. If verdict is empty, surface "investigate" so the SKU
    // isn't silently un-action'd.
    const wouldHaveFired =
      (signals.pdf_rank != null && signals.pdf_rank <= 10) ||
      ((signals.demand_score ?? 0) >= 0.7 && (signals.sell_through_bought_pct ?? 0) >= 0.5) ||
      (signals.velocity_rank != null && signals.velocity_rank <= 10) ||
      (signals.family_velocity_ratio ?? 0) >= 2.0;
    if (wouldHaveFired && !verdict.actions.some((a) => a.action === 'investigate')) {
      const newItem: SkuVerdictItem = {
        action: 'investigate',
        confidence: 0.7,
        rationale:
          `Mirror señal de hero (top RNK / velocidad / familia) PERO devoluciones al ${Math.round((signals.returns_pct ?? 0) * 100)}% — economía unitaria comprometida. ` +
          `Revisar fit / tech-pack / calidad antes de considerar amplificar a próxima temporada. ` +
          `Si la devolución es estructural (fit), kill; si es de talla específica, ajustar grading.`,
        recommended_units: null,
        confidence_breakdown: {
          data_completeness: null,
          identity: null,
          demand: signals.demand_score ?? null,
          margin: null,
          creative_fit: null,
        },
        evidence: {
          returns_pct: signals.returns_pct,
          hero_signals_present: true,
          hero_blocked_by_returns: true,
          pdf_rank: signals.pdf_rank,
          velocity_rank: signals.velocity_rank,
          family_velocity_ratio: signals.family_velocity_ratio,
        },
        counter_evidence: {},
        assumptions: [
          'Amplify suppressed: returns_pct > 0.35. Investigate ANTES de cualquier replicación.',
        ],
        data_sufficiency_warning: null,
      };
      const map = new Map<SkuVerdictAction, SkuVerdictItem>();
      for (const a of verdict.actions) map.set(a.action, a);
      map.set('investigate', newItem);
      const reordered: SkuVerdictItem[] = [];
      for (const a of ACTION_DISPLAY_ORDER) {
        const item = map.get(a);
        if (item) reordered.push(item);
      }
      return { ...verdict, actions: reordered };
    }
    return verdict;
  }

  // Five independent triggers for hero detection. Any one fires.
  const pdfTopN =
    signals.pdf_rank != null && signals.pdf_rank <= 10;
  const scoreBased =
    (signals.demand_score ?? 0) >= 0.7 &&
    (signals.sell_through_bought_pct ?? 0) >= 0.5;
  const rankBased =
    signals.velocity_rank != null && signals.velocity_rank <= 10;
  const familyBased =
    (signals.family_velocity_ratio ?? 0) >= 2.0;
  // Felipe 2026-05-18 caso Bomber 5247/600: el éxito del enviado es la
  // señal PRIMARIA de hero. Si el suelo está vendiendo el 63% de lo que
  // llega, es hero punto. El éxito del comprado puede ser bajo (la
  // compra final infla el denominador) pero NO refleja la realidad
  // del piso.
  const shippedBased =
    (signals.sell_through_shipped_pct ?? 0) >= 0.50;

  if (!pdfTopN && !scoreBased && !rankBased && !familyBased && !shippedBased) return verdict;
  // Skip if either the split-version or legacy alias is already present.
  if (
    verdict.actions.some(
      (a) => a.action === 'amplify_in_season' || a.action === 'amplify_winner'
    )
  ) {
    return verdict;
  }

  // A.2 · Bifurcate the rationale based on trigger composition.
  // CONFIRMED HERO: pdfTopN + at least one of {vel/score/family/shipped} also fires.
  // ZARA-FLAG ONLY: pdfTopN alone (no corroborating signal from this run).
  const corroboratingFired = scoreBased || rankBased || familyBased || shippedBased;
  const isZaraFlagOnly = pdfTopN && !corroboratingFired;

  // Rationale composition: lead with the strongest visible signal.
  const parts: string[] = [];
  if (signals.pdf_rank != null && signals.pdf_rank <= 10) {
    parts.push(`top ${signals.pdf_rank} del RNK Zara`);
  } else if (signals.velocity_rank != null && signals.velocity_rank <= 10) {
    parts.push(`top ${signals.velocity_rank} en velocidad del run`);
  }
  if ((signals.family_velocity_ratio ?? 0) >= 2.0) {
    parts.push(
      `vende ${signals.family_velocity_ratio!.toFixed(1)}× la media de su familia${
        signals.family_code ? ` ${signals.family_code}` : ''
      }`
    );
  }
  if ((signals.demand_score ?? 0) >= 0.7) {
    parts.push(
      `demand-score ${Math.round((signals.demand_score ?? 0) * 100)}% (top quintil)`
    );
  }
  if ((signals.sell_through_bought_pct ?? 0) >= 0.5) {
    parts.push(
      `sell-through ${Math.round((signals.sell_through_bought_pct ?? 0) * 100)}%`
    );
  }
  // A.2 · Two rationale branches.
  // - CONFIRMED hero (pdf + at least one corroborating signal, OR no pdf
  //   but vel/score/family confirms): full "design 2-3 secuelas" rationale.
  // - ZARA-FLAG-ONLY (pdf_top10 is the only trigger, run-internal signals
  //   don't confirm): scope down to "Zara curated this — investigate why,
  //   don't reflexively replicate".
  const headConfirmed = parts.length > 0
    ? `Hero confirmado: ${parts.join(' · ')}.`
    : 'Hero confirmado.';
  const headZaraFlag = signals.pdf_rank != null
    ? `Zara lo posicionó en top ${signals.pdf_rank} del RNK pero las métricas internas del run no lo confirman como hero ` +
      `(velocidad ${signals.velocity_7d ?? '?'} uds/7d, ` +
      `sell-through ${Math.round((signals.sell_through_bought_pct ?? 0) * 100)}%).`
    : 'Zara lo destacó en el RNK pero las métricas internas no lo confirman.';

  // Surface concrete colours from the brief's color_story so the
  // recommendation is actionable (Felipe: "proponer EL color, no solo
  // identificar el ganador"). Skip the SKU's own colour. Only for
  // confirmed heroes — Zara-flag SKUs shouldn't be amplified by color.
  const currentColorLc = (signals.current_color ?? '').trim().toLowerCase();
  const candidateColors = (signals.brief_colors ?? [])
    .map((c) => (c ?? '').trim())
    .filter(Boolean)
    .filter((c) => c.toLowerCase() !== currentColorLc);
  const briefColorSentence =
    !isZaraFlagOnly && candidateColors.length > 0
      ? ` Probar también la misma silueta en colores del moodboard: ${candidateColors
          .slice(0, 4)
          .join(', ')}.`
      : '';

  // A.5 · Operational anchors: pvp price slot + sibling-hero references.
  // Lifts rationale from "vague" toward "specific brief to design team".
  const pvpAnchor = signals.pvp != null && signals.pvp > 0
    ? ` Mantener el slot de precio €${Number(signals.pvp).toFixed(2)} como ancla.`
    : '';
  const siblingHeroes = (signals.sibling_hero_model_refs ?? []).filter(Boolean);
  const siblingAnchor = siblingHeroes.length > 0
    ? ` Co-validado por el lineage: ${siblingHeroes.slice(0, 3).join(', ')} también dispara amplify.`
    : '';

  // 2026-05-17 spec v1 — amplify split into in_season + next_season.
  // The IN-SEASON rationale focuses on Reorder + Distort NOW (this is
  // what the buyer does THIS week, before any next-season brief). The
  // NEXT-SEASON rationale (in appendAmplifyNextSeasonAction below) keeps
  // the original "diseñar 2-3 secuelas" prose and only fires when there
  // are 4+ weeks of validation data (days_in_store >= 28).
  const rationale = isZaraFlagOnly
    ? `${headZaraFlag} Antes de pedir secuelas, investigar contexto: ¿lanzamiento de cápsula, prioridad merchandiser, newness reciente? Si las métricas mejoran al cabo de 2 semanas, re-evaluar; si se mantienen planas, no replicar.${pvpAnchor}${siblingAnchor}`
    : `${headConfirmed} Reorder ahora + distort hacia las tiendas/tallas/colores donde acelera — no esperar a próxima temporada para captar la demanda.${pvpAnchor}${siblingAnchor}`;

  // Confidence: highest of the four signals (capped at 0.95, no floor).
  // A.6 · Floor 0.70 was inflating weak single-trigger fires — a SKU
  // surviving only by pdf_top10 at rank 9 used to read 77% confidence
  // even when velocity/sell-through said "not a hero". Now: weak fires
  // read 0.55-0.65 honestly, strong multi-trigger fires read 0.85-0.95.
  // scoreBased made proportional: was hard-coded 0.85 regardless of how
  // strong demand × sell_through actually were.
  const demand = signals.demand_score ?? 0;
  const sellThrough = signals.sell_through_bought_pct ?? 0;
  const confScore =
    demand >= 0.7 && sellThrough >= 0.5
      ? Math.min(0.95, 0.70 + ((demand - 0.7) / 0.3) * 0.125 + ((sellThrough - 0.5) / 0.5) * 0.125)
      : 0;
  const confVelRank =
    signals.velocity_rank != null && signals.velocity_rank <= 10
      ? 0.92 - signals.velocity_rank * 0.02
      : 0;
  const confPdfRank =
    signals.pdf_rank != null && signals.pdf_rank <= 10
      ? 0.95 - signals.pdf_rank * 0.02
      : 0;
  const confFamily =
    (signals.family_velocity_ratio ?? 0) >= 2.0
      ? Math.min(0.95, 0.7 + (signals.family_velocity_ratio! - 2) * 0.1)
      : 0;
  const rawConfidence = Math.min(
    0.95,
    Math.max(confScore, confVelRank, confPdfRank, confFamily)
  );
  // A.2 · Zara-flag-only fires cap at 0.60 — the source ranking IS signal,
  // but without internal corroboration it's a curiosity flag, not a hero.
  const confidence = isZaraFlagOnly ? Math.min(0.60, rawConfidence) : rawConfidence;

  const newItem: SkuVerdictItem = {
    action: 'amplify_in_season',
    confidence,
    rationale,
    recommended_units: null,
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: signals.demand_score ?? null,
      margin: null,
      creative_fit: null,
    },
    evidence: {
      demand_score: signals.demand_score,
      sell_through_bought_pct: signals.sell_through_bought_pct,
      returns_pct: signals.returns_pct,
      velocity_7d: signals.velocity_7d,
      family_code: signals.family_code,
      pdf_rank: signals.pdf_rank,
      velocity_rank: signals.velocity_rank,
      family_velocity_ratio: signals.family_velocity_ratio,
      proposed_brief_colors: candidateColors.slice(0, 4),
      is_zara_flag_only: isZaraFlagOnly,
    },
    counter_evidence: {},
    assumptions: [
      'Recomendación operacional: Reorder ahora con distort hacia tiendas/tallas/colores donde acelera.',
    ],
    data_sufficiency_warning: null,
  };

  // Reinsert with stable display order.
  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('amplify_in_season', newItem);
  const reordered: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = map.get(a);
    if (item) reordered.push(item);
  }
  return { ...verdict, actions: reordered };
}

/**
 * Append an `amplify_next_season` action — the SEQUEL BRIEF to the
 * design team. Mirrors appendAmplifyWinnerAction's trigger logic but
 * with one additional gate: `days_in_store >= 28` (the canonical "4
 * weeks of validation data" threshold from BoF/IESE Mango case studies
 * and Fisher-Raman 1996 "accurate response" Bayesian-posterior framing).
 *
 * Without enough validation data, in-season amplify can fire (the
 * present-moment Reorder + Distort decision) but next-season amplify
 * should not — committing the design team's next-season cycle to a
 * 14-day-old SKU is premature.
 *
 * The rationale focuses on the design brief itself: silhouette + material
 * + paleta + 2-3 sequels. Suggested colors (brief_colors) become the
 * concrete shortlist.
 *
 * Spec source: memory/product-spec_aimily-in-season-2026-05-17.md §4 Gate 10.
 */
export function appendAmplifyNextSeasonAction(
  verdict: SkuVerdict,
  signals: {
    demand_score: number | null;
    sell_through_bought_pct: number | null;
    returns_pct: number | null;
    velocity_7d: number | null;
    family_code: string | null;
    pdf_rank: number | null;
    velocity_rank: number | null;
    family_velocity_ratio: number | null;
    /** Moodboard palette resolved to [{name, hex|null}] by the caller.
     *  hex resolution: tenant taxonomy first, Spanish color dict second
     *  (see color-name-hex-fallback.ts). Carries the structured shape so
     *  the UI can render proposal chips with correct color even for
     *  moodboard names not yet in the catalog. */
    brief_colors: Array<{ name: string; hex: string | null }>;
    current_color: string | null;
    pvp?: number | null;
    sibling_hero_model_refs?: string[];
    /** Days the SKU has been in store. NO ES UN GATE — solo modula la
     *  confianza del verdict. Felipe 2026-05-18: "desde el día 1, si los
     *  datos son buenos, no hay que esperar. Ahí está la gracia de Zara:
     *  el día 1, si el dato es bueno, ya mete otro color en el pipeline."
     *  Quitamos el bloqueo binario de 28 días que era hubris académico
     *  (Fisher-Raman 1996) — el comprador decide cuándo dismissar la
     *  recomendación, no nosotros. */
    days_in_store: number | null;
    family_contribution_score?: number | null;
    rotation_health_score?: number | null;
  }
): SkuVerdict {
  // Gate único: devoluciones que rompen economía unitaria. Si un SKU
  // devuelve >35%, no proponemos sequel para próxima temporada (estamos
  // dando aire a un fallo de fit/calidad). El comprador querría INVESTIGAR
  // antes que REPLICAR.
  if ((signals.returns_pct ?? 0) > 0.35) return verdict;

  // Hero triggers (mismas señales que in_season). Cualquiera dispara.
  // Estos SON los gates reales — si el SKU no es hero, no proponemos
  // sequel; si es hero, proponemos desde el día 1.
  const pdfTopN = signals.pdf_rank != null && signals.pdf_rank <= 10;
  const scoreBased =
    (signals.demand_score ?? 0) >= 0.7 && (signals.sell_through_bought_pct ?? 0) >= 0.5;
  const rankBased = signals.velocity_rank != null && signals.velocity_rank <= 10;
  const familyBased = (signals.family_velocity_ratio ?? 0) >= 2.0;
  // 2026-05-18 Felipe directive: el baseline del appender usa el threshold
  // MÁS PERMISIVO (Maximizar venta). El modulator filtra hacia adentro per
  // escenario (Balanceada / Conservar). Sin esto los 4 escenarios
  // mostraban casi lo mismo porque el filtro no puede AÑADIR — solo
  // suprimir lo que ya está en el baseline.
  const contributionBased = (signals.family_contribution_score ?? 0) >= 0.10;
  if (!pdfTopN && !scoreBased && !rankBased && !familyBased && !contributionBased) return verdict;
  if (verdict.actions.some((a) => a.action === 'amplify_next_season')) return verdict;

  // 2026-05-18 — Felipe: este verbo es REPLICAR EL CONCEPTO en un modelo
  // nuevo. NO menciona colores (eso es EXTENDER COLORES, otro verbo).
  // NO presume "próxima temporada" — no sabemos cuándo entra el nuevo
  // desarrollo en pipeline (depende de lead times de fabricación y
  // cuándo el equipo de diseño abre el siguiente brief).
  const pvpAnchor =
    signals.pvp != null && signals.pvp > 0
      ? ` Mantener el slot de precio €${Number(signals.pvp).toFixed(2)} como ancla.`
      : '';
  const validationDays = signals.days_in_store ?? 0;
  const siblings = (signals.sibling_hero_model_refs ?? []).filter(Boolean);
  const siblingAnchor =
    siblings.length > 0
      ? ` Otros colorways del mismo estilo (${siblings.slice(0, 3).join(', ')}) también validados como heroes.`
      : '';

  // Rationale frasea según madurez del dato. Día 1 = "señal muy temprana
  // pero ya muy clara". 7-13 días = "primera semana". 14-27 = "ramp
  // confirmado". 28+ = "validado con 4 semanas".
  const maturityLabel =
    validationDays >= 28
      ? `Validado con ${validationDays} días de datos en tienda`
      : validationDays >= 14
        ? `Ramp confirmado a ${validationDays} días (filosofía Zara: con el RNK ya marcando top, no esperamos a las 4 semanas)`
        : validationDays >= 7
          ? `Primera semana en tienda (${validationDays} días) — señal muy clara, replicar el concepto ya para ganar lead time`
          : `Señal muy temprana (${validationDays} días) pero el RNK ya lo marca como hero — Zara abre nuevos modelos desde el día 1 cuando los datos validan`;

  const rationale =
    `${maturityLabel}. ` +
    `Replicar el concepto en un modelo nuevo: misma silueta y material como base de un desarrollo independiente.` +
    pvpAnchor + siblingAnchor;

  // Confianza base por fuerza del trigger.
  const baseConf =
    Math.max(
      pdfTopN ? 0.85 : 0,
      scoreBased ? 0.85 : 0,
      rankBased ? 0.85 : 0,
      familyBased ? 0.85 : 0,
      contributionBased ? 0.85 : 0
    );
  // Dampening por madurez del dato (no es gate — solo modula confianza).
  // Día 1-6: 0.70 cap (señal real pero menos historia que filtre flash-pop).
  // Día 7-13: 0.80 cap.
  // Día 14-27: 0.88 cap.
  // Día 28+: sin dampening (cap original 0.90).
  const maturityCap =
    validationDays >= 28
      ? 0.90
      : validationDays >= 14
        ? 0.88
        : validationDays >= 7
          ? 0.80
          : 0.70;
  const confidence = Math.min(maturityCap, baseConf);

  const newItem: SkuVerdictItem = {
    action: 'amplify_next_season',
    confidence,
    rationale,
    recommended_units: null,
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: signals.demand_score ?? null,
      margin: null,
      creative_fit: null,
    },
    evidence: {
      demand_score: signals.demand_score,
      sell_through_bought_pct: signals.sell_through_bought_pct,
      returns_pct: signals.returns_pct,
      velocity_7d: signals.velocity_7d,
      family_code: signals.family_code,
      pdf_rank: signals.pdf_rank,
      velocity_rank: signals.velocity_rank,
      family_velocity_ratio: signals.family_velocity_ratio,
      days_in_store: signals.days_in_store,
      // Felipe 2026-05-18: este verbo NO carga colores. Los colores son
      // output del verbo EXTENDER COLORES. Replicar concepto = silueta +
      // material + concepto base de un nuevo desarrollo. Sin paleta.
    },
    counter_evidence: {},
    assumptions: [
      'Recomendación estratégica al equipo de diseño: 2-3 secuelas próxima temporada.',
      'Gate: días en tienda >= 28 (4 semanas de validación, Fisher-Raman 1996).',
    ],
    data_sufficiency_warning: null,
  };

  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('amplify_next_season', newItem);
  const reordered: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = map.get(a);
    if (item) reordered.push(item);
  }
  return { ...verdict, actions: reordered };
}

/**
 * Append a synthetic `extend_colors` action to a SKU verdict when its
 * lineage has a `recolor` candidate (color winner detected). The
 * recommendation is at the lineage level so all sibling SKUs share it.
 *
 * The action carries the winning color name + confidence; the rationale
 * surfaces both pieces in human language. Returns a new SkuVerdict.
 */
export interface LineageColorWinner {
  color_name: string;
  color_code: string;
  /** D.4 · Resolved hex (from strategy_taxonomies.code_to_hex). Null when
   *  the taxonomy doesn't have a mapping; UI falls back to a neutral
   *  swatch and surfaces a data-sufficiency warning. */
  color_hex: string | null;
  confidence: number;
  rank: string;
  demand_score: number | null;
}

export function appendExtendColorsAction(
  verdict: SkuVerdict,
  winner: LineageColorWinner,
  identity: { product_name: string | null; family_code: string | null; model_ref: string | null; color_ref: string | null; color_name: string | null },
  proposedColors: Array<{ name: string; hex: string | null }> = [],
  /** v2 — Spec §3 Gate 11 stricter: requiere color ganador limpio
   *  (color_winner_strength ≥ 3.0) y aportación estructural ≥ 0.15.
   *  Evita disparar sobre ganadores marginales que solo destacan
   *  ligeramente. Cuando los signals no están disponibles (legacy
   *  candidates persistidos antes de F2), permite pasar sin filtro
   *  (backward compat — el filtro estricto solo se aplica si tenemos
   *  data v2). */
  v2Signals?: {
    color_winner_strength: number | null;
    family_contribution_score: number | null;
  }
): SkuVerdict {
  // 8.1 (2026-05-17) — Output unit = SKU cardinal rule. Color-scope
  // propagation must FILTER by SKU color. extend_colors attaches ONLY
  // to the SKU whose own color IS the winner.
  if (identity.color_ref == null || identity.color_ref !== winner.color_code) {
    return verdict;
  }

  // 2026-05-18 Felipe: baseline permisivo (Maximizar venta). Modulator
  // filtra hacia adentro per escenario (Balanceada / Conservar). Antes
  // tenía 2.0 / 0.15 hardcoded → Balanceada y Maximizar producían
  // idéntico stack porque no había acciones extra que filtro permisivo
  // pudiera dejar pasar.
  //
  // Baseline ahora 1.5 / 0.10 = thresholds más permisivos (Maximizar).
  // Marginal winners por debajo de 1.5× siguen sin propagar.
  if (v2Signals) {
    const strength = v2Signals.color_winner_strength;
    const contribution = v2Signals.family_contribution_score;
    if (strength != null && strength < 1.5) return verdict;
    if (contribution != null && contribution < 0.10) return verdict;
  }

  // If extend_colors already in the stack, keep the higher-confidence one.
  const existing = verdict.actions.find((a) => a.action === 'extend_colors');
  if (existing && existing.confidence >= winner.confidence) return verdict;

  // 2026-05-18 — The verb's OUTPUT is the proposed new colors (from the
  // moodboard color_story, resolved to [{name, hex}] by the caller via
  // tenant-taxonomy-first + Spanish-color-dict fallback). The winner is
  // the ANCHOR mentioned in text only — not an output chip. Filter the
  // winner's own name from proposals so we don't suggest extending into
  // the color the style is already in.
  const winnerLc = (winner.color_name ?? '').trim().toLowerCase();
  const proposed = proposedColors
    .filter((c) => !!c?.name && c.name.trim().toLowerCase() !== winnerLc)
    .slice(0, 5);

  // Honest signal: when the brief has no color_story (or every proposal
  // collapsed against the winner), there's nothing concrete to propose.
  // Suppress the action entirely rather than emit an abstract placeholder.
  // The buyer should never see "consider adjacent tones" without names.
  if (proposed.length === 0) return verdict;

  // Buyer-clean copy: no codes, no validation caveats, no engineering
  // notes. Style name in title case, color names verbatim. Frame the
  // winner as the ANCHOR ("el ganador dentro de su estilo") and the
  // proposals as the OUTPUT ("extiende la paleta hacia ...").
  const styleName = (identity.product_name || '').trim() || identity.model_ref || 'este estilo';
  const winnerName = (winner.color_name || '').replace(/_/g, ' ');
  const proposalsText = proposed.map((p) => p.name.replace(/_/g, ' ')).join(', ');
  const confidencePct = Math.round(winner.confidence * 100);
  const rationale =
    winner.rank === 'top'
      ? `${styleName} en ${winnerName} es el ganador dentro de su estilo, con ${confidencePct}% de confianza. Extiende la paleta del estilo hacia los colores del moodboard: ${proposalsText}.`
      : `${styleName} en ${winnerName} es una variante a evaluar dentro de su estilo. Considera reasignar share de compra hacia los colores del moodboard: ${proposalsText}.`;

  const newItem: SkuVerdictItem = {
    action: 'extend_colors',
    confidence: winner.confidence,
    rationale,
    recommended_units: null,
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: winner.demand_score ?? null,
      margin: null,
      creative_fit: null,
    },
    evidence: {
      anchor_color_name: winner.color_name,
      anchor_color_code: winner.color_code,
      anchor_color_hex: winner.color_hex,
      rank: winner.rank,
      style_family: identity.family_code ?? null,
      // Preserve legacy field name for any downstream consumers that read
      // it; safe to remove after lineage→style rename pass (P2).
      lineage_family: identity.family_code ?? null,
      // 2026-05-18 — UI renders these as chips; the winner is mentioned
      // only in `rationale`. Each entry: {name, hex|null}. hex resolved
      // by caller from tenant taxonomy first, then Spanish color dict.
      proposed_colors: proposed,
      // Legacy field kept for any backwards-compat reader; matches the
      // names list only.
      proposed_adjacent_colors: proposed.map((p) => p.name),
    },
    counter_evidence: {},
    assumptions: [],
    data_sufficiency_warning: null,
  };

  // Reinsert with stable display order.
  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('extend_colors', newItem);
  const reordered: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = map.get(a);
    if (item) reordered.push(item);
  }
  return { ...verdict, actions: reordered };
}

/**
 * Append a synthetic `kill` action with color-scope semantics. Mirrors
 * appendExtendColorsAction but for the loser colors within a lineage.
 *
 * C.5 (2026-05-17 audit) · Previously the engine emitted color-scope
 * `kill` candidates (scope='color', rank='bottom') from
 * generateColorWinnerCandidates, but the resolver had no appender for
 * them — they sat orphaned in the DB and never reached the buyer's UI.
 * This appender propagates each color-loser to every member SKU in the
 * lineage, with rationale "drop this color from next season".
 *
 * To distinguish from a SKU-scope `kill`, the action evidence carries
 * `scope_hint: 'color'` and the rationale phrases the recommendation as
 * "retirar este color" not "matar este SKU".
 */
export interface LineageColorLoser {
  color_name: string;
  color_code: string;
  /** D.4 · Resolved hex (from strategy_taxonomies.code_to_hex). */
  color_hex: string | null;
  confidence: number;
  return_risk: number | null;
  demand_score: number | null;
  margin_score: number | null;
}

export function appendDropColorAction(
  verdict: SkuVerdict,
  loser: LineageColorLoser,
  identity: { product_name: string | null; family_code: string | null; model_ref: string | null; color_ref: string | null; color_name: string | null }
): SkuVerdict {
  // 8.1 (2026-05-17) — Output unit = SKU cardinal rule. Color-scope
  // propagation must FILTER by SKU color. If this SKU's own color does
  // not match the loser color of the lineage, do nothing.
  //
  // Pre-fix bug: every SKU in the lineage received a `kill` action with
  // rationale "color X is the worst performer". Even SKUs whose own
  // color was a winner showed up as "MATAR" because they shared a
  // lineage with a loser colorway. 22/48 SKUs (46%) of the V26 corpus
  // were affected. SKU 1 (color 401, top of RNK PDF, confirmed hero)
  // received a rogue KILL because color 250 in the same lineage was a
  // loser.
  //
  // Post-fix: kill action attaches ONLY to SKUs whose color_ref matches
  // loser.color_code. Other SKUs in the lineage are unaffected by this
  // verb. The rationale of those other SKUs may reference the lineage's
  // color performance as CONTEXT (e.g., inside amplify_winner evidence),
  // but the kill action verb itself stays SKU-specific.
  if (identity.color_ref == null || identity.color_ref !== loser.color_code) {
    return verdict;
  }
  // Don't override a SKU-scope kill — those are stronger signals (the
  // entire SKU is being killed, not just one of its colorways).
  const skuLevelKill = verdict.actions.find(
    (a) => a.action === 'kill' && (a.evidence?.scope_hint as string | undefined) !== 'color'
  );
  if (skuLevelKill) return verdict;

  const existing = verdict.actions.find(
    (a) => a.action === 'kill' && (a.evidence?.scope_hint as string | undefined) === 'color'
  );
  if (existing && existing.confidence >= loser.confidence) return verdict;

  const familyName = identity.family_code ?? 'esta familia';
  // Per-SKU rationale (post 8.1 fix): we know this SKU IS the loser color.
  // Code-first phrasing (2026-05-18 — the seed taxonomy mapping is
  // unverified against the actual Zara catalog; see appendExtendColorsAction
  // for context).
  const loserCodeLabel = identity.color_ref ?? '?';
  const loserNameHint = loser.color_name ? ` · listado como "${loser.color_name}"` : '';
  const rationale =
    `Este SKU (código de color ${loserCodeLabel}${loserNameHint}) es el de peor desempeño dentro del estilo ` +
    `(confianza ${Math.round(loser.confidence * 100)}%, return-risk ${
      loser.return_risk != null ? Math.round(loser.return_risk * 100) : '?'
    }%). ` +
    `Considera retirarlo de la próxima temporada en ${familyName} y rebalancear el share ` +
    `hacia los colorways supervivientes del mismo estilo. ` +
    `Verifica el código contra la foto del PDF — el nombre de la taxonomía está pendiente de validación.`;

  const newItem: SkuVerdictItem = {
    action: 'kill',
    confidence: loser.confidence,
    rationale,
    recommended_units: null,
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: loser.demand_score ?? null,
      margin: loser.margin_score ?? null,
      creative_fit: null,
    },
    evidence: {
      scope_hint: 'color',
      anchor_color_name: loser.color_name,
      anchor_color_code: loser.color_code,
      anchor_color_hex: loser.color_hex,
      rank: 'bottom',
      return_risk: loser.return_risk,
      style_family: identity.family_code ?? null,
      // Preserve legacy field name for any downstream consumers that read
      // it; safe to remove after lineage→style rename pass (P2).
      lineage_family: identity.family_code ?? null,
    },
    counter_evidence: {},
    assumptions: [
      'Action applies to THIS SKU (its colorway is the worst performer within the style). The other colorways of the same style are unaffected.',
    ],
    data_sufficiency_warning: null,
  };

  // Reinsert with stable display order.
  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('kill', newItem);
  const reordered: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = map.get(a);
    if (item) reordered.push(item);
  }
  return { ...verdict, actions: reordered };
}

/**
 * Batch-resolve all SKUs in a run into a verdict-per-SKU map.
 *
 * `inputsByProductFactId` keys the per-SKU operational metrics (velocity,
 * stock, etc.) by product_fact_id. `candidatesByProductFactId` maps the
 * raw candidates emitted by recommend.ts. SKUs that appear in inputs but
 * have no candidates still get a `hold` verdict.
 */
export function resolveAllSkuVerdicts(
  inputsByProductFactId: Map<string, Omit<SkuVerdictInput, 'candidates'>>,
  candidatesByProductFactId: Map<string, RecommendationCandidate[]>,
  identityByProductFactId: Map<string, { product_name: string | null; family_code: string | null; model_ref: string | null; color_ref: string | null; color_name: string | null }>,
  defaultTargetRotationDays: number = DEFAULT_TARGET_ROTATION_DAYS,
  perSkuOverrides?: Map<string, number>
): SkuVerdict[] {
  const out: SkuVerdict[] = [];
  for (const [pid, base] of Array.from(inputsByProductFactId.entries())) {
    const candidates = candidatesByProductFactId.get(pid) ?? [];
    const rotation = perSkuOverrides?.get(pid) ?? defaultTargetRotationDays;
    const identity = identityByProductFactId.get(pid) ?? {
      product_name: null,
      family_code: null,
      model_ref: null,
      color_ref: null,
      color_name: null,
    };
    out.push(
      resolveSkuVerdict(
        { ...base, product_fact_id: pid, candidates },
        rotation,
        identity
      )
    );
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// v2 — NEW APPENDERS para las 2 decisiones que el v1 nunca implementó.
// Spec: memory/decision-map_aimily-in-season-v2-2026-05-18.md §3
// Gates 3 (AMPLIAR DISTRIBUCIÓN) y 4 (ACELERAR ENTRADA).
// Computan en request-time sobre la señales v2 persistidas en
// classifier_traces.v2_signals.
// ═══════════════════════════════════════════════════════════════════════

/**
 * AMPLIAR DISTRIBUCIÓN — Gate 3 del Spec v2.
 *
 * Pregunta: ¿Este SKU está cubriendo bien la flota o le faltan tiendas
 * que podrían venderlo? Output: enviar stock desde almacén (CD1 o CD2)
 * a las tiendas que aún no lo tienen.
 *
 * Disparos:
 *   - fleet_coverage_score < 0.70  (faltan tiendas por activar)
 *   - AND demand_score ≥ 0.5  (no ampliar un dog)
 *   - AND can_replenish_now = true  (hay stock para mandar)
 *   - AND distribution_lift_capacity_stores > 0
 *   - AND returns_vs_baseline_score ≤ 1.5  (no ampliar un return-magnet)
 */
export function appendAmplifyDistributionAction(
  verdict: SkuVerdict,
  signals: {
    fleet_coverage_score: number | null;
    demand_score: number | null;
    family_contribution_score: number | null;
    can_replenish_now: boolean;
    distribution_lift_capacity_stores: number | null;
    returns_vs_baseline_score: number | null;
    cd2_pool_strength: number | null;
    stock_available: number | null;
    cd2_available: number | null;
  },
  identity: {
    product_name: string | null;
    family_code: string | null;
    model_ref: string | null;
    color_ref: string | null;
    color_name: string | null;
  }
): SkuVerdict {
  const fleet = signals.fleet_coverage_score;
  const demand = signals.demand_score ?? 0;
  const lift = signals.distribution_lift_capacity_stores ?? 0;
  const returns = signals.returns_vs_baseline_score;

  // Gate conditions — baseline permissivo (Maximizar venta). Modulator
  // filtra para Conservar/Balanceada per diales del escenario.
  if (fleet == null || fleet >= 0.85) return verdict;
  if (demand < 0.40 && (signals.family_contribution_score ?? 0) < 0.05) return verdict;
  if (!signals.can_replenish_now) return verdict;
  if (lift <= 0) return verdict;
  if (returns != null && returns > 1.5) return verdict;

  // Don't double-fire
  if (verdict.actions.some((a) => a.action === 'amplify_distribution')) {
    return verdict;
  }

  // Confidence proportional to how much room there is + how strong demand is
  const baseConf = Math.min(0.95, 0.55 + (1 - fleet) * 0.4 + demand * 0.1);
  const confidence = Math.round(baseConf * 100) / 100;

  // Stock source — preferimos CD1 (stock_available) si tiene, sino CD2.
  const cd1Stock = signals.stock_available ?? 0;
  const cd2Stock = signals.cd2_available ?? 0;
  const stockSource: 'CD1' | 'CD2' | 'CD1+CD2' =
    cd1Stock > 0 && cd2Stock > 0
      ? 'CD1+CD2'
      : cd2Stock > 0
        ? 'CD2'
        : 'CD1';
  const availableUnits = cd1Stock + cd2Stock;

  // Rationale buyer-clean
  const styleName =
    (identity.product_name || '').trim() || identity.model_ref || 'este SKU';
  const coverPct = Math.round(fleet * 100);
  const rationale =
    `${styleName} está en el ${coverPct}% de la flota (faltan ${lift} tiendas). ` +
    `La demanda y los datos de devoluciones son sanos para mandarlo a más tiendas. ` +
    `Stock disponible desde ${stockSource}: ${availableUnits.toLocaleString('es-ES')} uds. ` +
    `Ampliar cobertura a las ${lift} tiendas restantes para capturar la demanda perdida.`;

  const newItem: SkuVerdictItem = {
    action: 'amplify_distribution',
    confidence,
    rationale,
    recommended_units: null,  // unidades por tienda las decide el allocator
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: signals.demand_score,
      margin: null,
      creative_fit: null,
    },
    evidence: {
      fleet_coverage_score: fleet,
      stores_missing: lift,
      stock_source: stockSource,
      stock_available_units: availableUnits,
      returns_vs_baseline_score: returns,
    },
    counter_evidence: {},
    assumptions: [],
    data_sufficiency_warning: null,
  };

  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('amplify_distribution', newItem);
  const reordered: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = map.get(a);
    if (item) reordered.push(item);
  }
  return { ...verdict, actions: reordered };
}

/**
 * ACELERAR ENTRADA — Gate 4 del Spec v2.
 *
 * Pregunta: ¿Hay stock pendiente que podríamos pedir al proveedor que
 * adelante? Output: solicitar adelanto del pedido pendiente.
 *
 * Disparos:
 *   - stockout_risk_score ≥ 0.4  (hay rotura observada o inminente)
 *   - AND stock_pending > 0  (hay algo que adelantar — no se adelanta lo
 *     que ya está en tránsito)
 *   - AND demand_score ≥ 0.6  (o aportación estructural ≥ 10%)
 *   - AND pipeline_arrival_runway_days > 14  (vale la pena solo si tarda
 *     más de 2 semanas al ritmo actual)
 */
export function appendPullForwardIntakeAction(
  verdict: SkuVerdict,
  signals: {
    stockout_risk_score: number | null;
    stock_pending: number | null;
    demand_score: number | null;
    family_contribution_score: number | null;
    pipeline_arrival_runway_days: number | null;
    velocity_7d: number | null;
    /** Felipe 2026-05-18 caso Bomber 5247/600 · si el pipeline pendiente
     *  tiene fecha vencida (stock_pending_date < hoy), es ROTURA
     *  LOGÍSTICA — máxima prioridad de adelantar. Bypassa todos los
     *  thresholds normales. */
    is_logistic_rupture?: boolean;
    logistic_rupture_days_overdue?: number | null;
    sell_through_shipped_pct?: number | null;
  },
  identity: {
    product_name: string | null;
    family_code: string | null;
    model_ref: string | null;
    color_ref: string | null;
    color_name: string | null;
  }
): SkuVerdict {
  const stockout = signals.stockout_risk_score ?? 0;
  const pending = signals.stock_pending ?? 0;
  const demand = signals.demand_score ?? 0;
  const contribution = signals.family_contribution_score ?? 0;
  const runway = signals.pipeline_arrival_runway_days;
  const isLogisticRupture = signals.is_logistic_rupture === true;

  // Gate conditions
  if (pending <= 0) return verdict;
  // Rotura logística: bypassa todos los demás thresholds — máxima
  // prioridad de adelantar. El stock pendiente debería haber entrado
  // ya pero no se ha actualizado. Es la señal más fuerte de Adelantar.
  if (!isLogisticRupture) {
    if (demand < 0.6 && contribution < 0.10) return verdict;
    if (runway == null || runway < 14) return verdict;
    const longRunwayHero = runway > 30 && (demand >= 0.7 || contribution >= 0.20);
    if (stockout < 0.4 && !longRunwayHero) return verdict;
  }

  // Don't double-fire
  if (verdict.actions.some((a) => a.action === 'pull_forward_intake')) {
    return verdict;
  }

  // Units to pull forward — half of pending capped by 4 weeks of velocity buffer.
  let unitsToPull: number | null = null;
  if (signals.velocity_7d != null && signals.velocity_7d > 0) {
    const fourWeeksDemand = signals.velocity_7d * 4;
    unitsToPull = Math.min(pending, Math.round(fourWeeksDemand));
  }

  // Confidence: combinar stockout + magnitud de runway.
  const stockoutTerm = Math.min(0.4, stockout * 0.5);
  const runwayTerm = runway != null ? Math.min(0.4, runway / 60 * 0.4) : 0;
  const demandTerm = Math.min(0.2, demand * 0.25);
  // Rotura logística: confianza máxima (≥0.92). El pipeline debería
  // haber entrado ya — no hay duda de que adelantar es lo correcto.
  const confidence = isLogisticRupture
    ? 0.95
    : Math.round(Math.min(0.92, 0.40 + stockoutTerm + runwayTerm + demandTerm) * 100) / 100;

  const styleName =
    (identity.product_name || '').trim() || identity.model_ref || 'este SKU';
  const runwayWeeks = runway != null ? Math.round((runway / 7) * 10) / 10 : null;
  const stockoutPct = Math.round(stockout * 100);
  const overdue = signals.logistic_rupture_days_overdue ?? null;
  const shippedPct = Math.round((signals.sell_through_shipped_pct ?? 0) * 100);
  const rationale = isLogisticRupture
    ? `${styleName}: ROTURA LOGÍSTICA · ${pending.toLocaleString('es-ES')} uds pendientes ` +
      `con fecha de entrada vencida hace ${overdue ?? '?'} día(s). ` +
      (shippedPct >= 50
        ? `El éxito del enviado es ${shippedPct}% — está vendiendo bien lo que llega a tienda; el problema es que no llega. `
        : '') +
      `Llamar al proveedor / supply chain para acelerar la entrada. ` +
      `La rotación baja en tienda NO refleja falta de demanda — refleja que el stock pendiente no se ha actualizado.`
    : `${styleName} tiene ${pending.toLocaleString('es-ES')} uds pendientes ` +
      `que tardarían ~${runwayWeeks ?? '?'} semanas en llegar al ritmo actual` +
      (stockoutPct > 0 ? ` (riesgo de rotura ${stockoutPct}%).` : '.') +
      ` Pedir al proveedor que adelante ~${(unitsToPull ?? 0).toLocaleString('es-ES')} uds.`;

  const newItem: SkuVerdictItem = {
    action: 'pull_forward_intake',
    confidence,
    rationale,
    recommended_units: unitsToPull,
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: signals.demand_score,
      margin: null,
      creative_fit: null,
    },
    evidence: {
      stockout_risk_score: stockout,
      stock_pending: pending,
      pipeline_arrival_runway_days: runway,
      velocity_7d: signals.velocity_7d,
      family_contribution_score: contribution,
      is_logistic_rupture: isLogisticRupture,
      logistic_rupture_days_overdue: signals.logistic_rupture_days_overdue ?? null,
      sell_through_shipped_pct: signals.sell_through_shipped_pct ?? null,
    },
    counter_evidence: {},
    assumptions: [],
    data_sufficiency_warning: null,
  };

  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('pull_forward_intake', newItem);
  const reordered: SkuVerdictItem[] = [];
  for (const a of ACTION_DISPLAY_ORDER) {
    const item = map.get(a);
    if (item) reordered.push(item);
  }
  return { ...verdict, actions: reordered };
}
