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

  // Four independent triggers for hero detection. Any one fires.
  const pdfTopN =
    signals.pdf_rank != null && signals.pdf_rank <= 10;
  const scoreBased =
    (signals.demand_score ?? 0) >= 0.7 &&
    (signals.sell_through_bought_pct ?? 0) >= 0.5;
  const rankBased =
    signals.velocity_rank != null && signals.velocity_rank <= 10;
  const familyBased =
    (signals.family_velocity_ratio ?? 0) >= 2.0;

  if (!pdfTopN && !scoreBased && !rankBased && !familyBased) return verdict;
  // Skip if already present.
  if (verdict.actions.some((a) => a.action === 'amplify_winner')) return verdict;

  // A.2 · Bifurcate the rationale based on trigger composition.
  // CONFIRMED HERO: pdfTopN + at least one of {vel/score/family} also fires.
  // ZARA-FLAG ONLY: pdfTopN alone (no corroborating signal from this run).
  const corroboratingFired = scoreBased || rankBased || familyBased;
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

  const rationale = isZaraFlagOnly
    ? `${headZaraFlag} Antes de pedir secuelas, investigar contexto: ¿lanzamiento de cápsula, prioridad merchandiser, newness reciente? Si las métricas mejoran al cabo de 2 semanas, re-evaluar; si se mantienen planas, no replicar.${pvpAnchor}${siblingAnchor}`
    : `${headConfirmed} Más allá de mantenerlo, diseñar 2-3 secuelas siguiendo este patrón (silueta + material + paleta) captura esa demanda en próxima temporada.${briefColorSentence}${pvpAnchor}${siblingAnchor}`;

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
    action: 'amplify_winner',
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
    },
    counter_evidence: {},
    assumptions: [
      'Recomendación estratégica al equipo de diseño/merch, no operacional.',
    ],
    data_sufficiency_warning: null,
  };

  // Reinsert with stable display order.
  const map = new Map<SkuVerdictAction, SkuVerdictItem>();
  for (const a of verdict.actions) map.set(a.action, a);
  map.set('amplify_winner', newItem);
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
  briefAdjacentColors: string[] = []
): SkuVerdict {
  // 8.1 (2026-05-17) — Output unit = SKU cardinal rule. Color-scope
  // propagation must FILTER by SKU color. extend_colors attaches ONLY
  // to the SKU whose own color IS the winner. Other SKUs in the same
  // style may reference the winning colorway in the rationale of OTHER
  // actions (e.g., amplify_winner) as context, but the extend_colors
  // verb itself is SKU-specific.
  //
  // Pre-fix bug: extend_colors propagated to every SKU in the lineage,
  // even those whose own color was unrelated to the winner. Less
  // catastrophic than the kill propagation (no MATAR on a hero SKU) but
  // still violated the cardinal rule and produced confusing rationales.
  if (identity.color_ref == null || identity.color_ref !== winner.color_code) {
    return verdict;
  }

  // If extend_colors already in the stack, keep the higher-confidence one.
  const existing = verdict.actions.find((a) => a.action === 'extend_colors');
  if (existing && existing.confidence >= winner.confidence) return verdict;

  // D.5 · Propose CONCRETE adjacent colors from the brief's color_story
  // (when present). The old rationale said "extend toward adjacent tones"
  // without naming any; now we list 1-3 brief tones (skipping the winner's
  // own name) so the design team gets an operational shortlist.
  const winnerLc = winner.color_name.trim().toLowerCase();
  const adjacents = briefAdjacentColors
    .map((c) => (c ?? '').trim())
    .filter(Boolean)
    .filter((c) => c.toLowerCase() !== winnerLc)
    .slice(0, 3);
  const adjacentClause = adjacents.length > 0
    ? ` Considera extender la paleta a tonos adyacentes del moodboard: ${adjacents.join(', ')}. Mantén ${winner.color_name} como ancla.`
    : ' Considera extender la paleta con tonos adyacentes para amplificar el winner.';

  // Per-SKU rationale (post 8.1 fix): we know this SKU IS the winner color.
  // Phrase directly to THIS SKU rather than abstractly to the style.
  const rationale =
    winner.rank === 'top'
      ? `Este SKU (color ${winner.color_name}) es el ganador dentro de su estilo (${Math.round(winner.confidence * 100)}% confianza).${adjacentClause}`
      : `Este SKU (color ${winner.color_name}) detectado como variante a evaluar dentro del estilo. Validar si extender o reasignar share de compra.`;

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
      proposed_adjacent_colors: adjacents,
    },
    counter_evidence: {},
    assumptions: [
      'Action applies to THIS SKU (its colorway is the winner within the style). The other colorways are unaffected by this verb.',
    ],
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
  // Phrase the recommendation directly to THIS SKU rather than abstractly
  // to the style/lineage.
  const rationale =
    `Este SKU (color ${loser.color_name}) es el de peor desempeño dentro del estilo ` +
    `(confianza ${Math.round(loser.confidence * 100)}%, return-risk ${
      loser.return_risk != null ? Math.round(loser.return_risk * 100) : '?'
    }%). ` +
    `Considera retirarlo de la próxima temporada en ${familyName} y rebalancear el share ` +
    `hacia los colorways supervivientes del mismo estilo.`;

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
