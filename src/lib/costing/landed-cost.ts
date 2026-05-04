/**
 * BOM-driven landed-cost engine — Phase 2 of the PLM parity plan.
 *
 * Pure function. No DB calls, no LLM. Used by:
 *   - The CostingPanel UI in the Tech Pack header (live margin gauge)
 *   - The PATCH /api/tech-pack handler (saves cost_breakdown alongside
 *     the BOM whenever the user edits a line)
 *   - The /api/ai/costing/suggest-substitutions endpoint (compares
 *     current_margin_pct against target_margin_pct before deciding to
 *     surface substitutions)
 *
 * Source-of-truth contract:
 *   `sku.cost` (numeric) is the canonical financial number consumed by
 *   Range Plan, Production financial recap, PO totals, collection
 *   exports, sales dashboards, and marketing forecasts. We never break
 *   those consumers. `cost_breakdown` is the audit trail + the input
 *   to AI Margin Protection. When `cost_breakdown.materials.source_of_truth
 *   === 'bom'`, the caller is expected to write `total_landed` back to
 *   `sku.cost`. When 'manual', the user override wins and `cost_breakdown`
 *   is purely informational.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface BomLine {
  type: string;
  material: string;
  qty: string;
  unit: string;
  supplier: string;
  /**
   * Cost per `unit`. Stored in `cost_currency` if set (default EUR).
   * The recompute helper converts to EUR via fx_rates before rolling
   * up materials.bom_rolled_up so the canonical landed-cost figure
   * stays consistently in EUR no matter how the factory quotes.
   */
  cost: string;
  /** ISO 4217 currency code (USD, CNY, …). Defaults to EUR. */
  cost_currency?: string;
  /**
   * Catalog link — set when the material was picked from the Materials
   * Library combobox (vs free text). Used by compliance, costing, and
   * vendor portal to dereference catalog entries without fuzzy match.
   */
  material_id?: string;
}

export interface CostBreakdownInput {
  /** BOM rows from tech_pack_data.bom.lines. */
  bomLines: BomLine[];
  /**
   * Optional EUR conversion rates keyed by ISO 4217 (e.g.
   * { USD: 1.1702, CNY: 7.991 }). When provided, lines with a
   * non-EUR cost_currency are converted to EUR before rolling up.
   * Omit for the legacy EUR-only flow.
   */
  fxRates?: Record<string, number>;
  /** Manual material cost override (EUR). Used when source_of_truth='manual'. */
  manualMaterialOverride?: number | null;
  /** Source of truth flag — 'bom' = derive from BOM, 'manual' = user override. */
  materialSourceOfTruth?: 'bom' | 'manual';
  /** Factory hourly rate (EUR/hour). */
  factoryRate?: number;
  /** Hours per unit to make this SKU. */
  laborHours?: number;
  /** Overhead percentage (applied on materials + labor). */
  overheadPct?: number;
  /** Freight origin code (e.g. 'CN', 'IT', 'PT'). */
  freightOrigin?: string;
  /** Freight destination code. */
  freightDestination?: string;
  /** Freight method. */
  freightMethod?: 'sea' | 'air' | 'rail' | 'road';
  /** Freight EUR per unit. */
  freightTotal?: number;
  /** Duties percentage (applied on materials + labor + overhead + freight). */
  dutiesPct?: number;
  /** Brand target margin percentage (e.g. 65 for 65%). */
  targetMarginPct?: number;
  /** Selling price (PVP). Used to compute current_margin_pct. */
  pvp: number;
}

export interface CostBreakdown {
  materials: {
    bom_rolled_up: number;
    manual_override: number | null;
    source_of_truth: 'bom' | 'manual';
    /** The effective material cost used in total_landed. */
    effective: number;
  };
  labor: {
    factory_rate: number;
    hours: number;
    total: number;
  };
  overhead_pct: number;
  overhead_total: number;
  freight: {
    origin: string;
    destination: string;
    method: 'sea' | 'air' | 'rail' | 'road';
    total: number;
  };
  duties_pct: number;
  duties_total: number;
  total_landed: number;
  target_margin_pct: number;
  current_margin_pct: number;
  variance_pct: number;
  last_recalc_at: string;
  ai_suggestions: AiSubstitutionSuggestion[];
}

export interface AiSubstitutionSuggestion {
  bom_line_idx: number;
  current_material: string;
  proposed_material: string;
  proposed_supplier?: string;
  saves_eur: number;
  margin_recovers_pct: number;
  rationale: string;
  /** Aesthetic compatibility check (CIS-driven). */
  aesthetic_match: 'high' | 'medium' | 'low';
}

// ─── Helpers ──────────────────────────────────────────────────────

const num = (s: string | undefined | null): number => {
  if (s == null || s === '') return 0;
  const n = Number(String(s).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const round = (n: number, decimals = 2): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

// ─── Public API ───────────────────────────────────────────────────

/**
 * Convert a single BOM line's cost to EUR via the provided FX rate
 * map. If the line has no cost_currency or it's EUR, returns the cost
 * unchanged. Returns 0 for missing rates rather than NaN-poisoning
 * the rollup.
 */
export function bomLineCostInEur(
  line: BomLine,
  fxRates?: Record<string, number>,
): number {
  const raw = num(line.cost);
  const ccy = (line.cost_currency || 'EUR').toUpperCase();
  if (ccy === 'EUR' || !fxRates) return raw;
  const rate = fxRates[ccy];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return raw;
  return raw / rate;
}

/**
 * Pure function: BOM lines + factors → CostBreakdown.
 *
 * Idempotent. Safe to call on every BOM edit. Default values keep
 * partially-filled SKUs viable — labor / freight / duties default to 0
 * if the user hasn't entered them, so total_landed degrades to just
 * material cost in the early phases of design.
 */
export function recalculateCostBreakdown(input: CostBreakdownInput): CostBreakdown {
  const {
    bomLines,
    fxRates,
    manualMaterialOverride = null,
    materialSourceOfTruth = 'bom',
    factoryRate = 0,
    laborHours = 0,
    overheadPct = 0,
    freightOrigin = '',
    freightDestination = '',
    freightMethod = 'sea',
    freightTotal = 0,
    dutiesPct = 0,
    targetMarginPct = 0,
    pvp,
  } = input;

  // 1. Materials — sum of (qty × unit cost in EUR) across BOM lines.
  // FX conversion applied per line so a BOM with mixed currencies
  // (e.g. canvas in USD + Italian leather in EUR) rolls up cleanly.
  const bomRolledUp = bomLines.reduce((acc, line) => {
    return acc + num(line.qty) * bomLineCostInEur(line, fxRates);
  }, 0);

  const effectiveMaterial =
    materialSourceOfTruth === 'manual' && manualMaterialOverride != null
      ? manualMaterialOverride
      : bomRolledUp;

  // 2. Labor — factory rate × hours.
  const laborTotal = factoryRate * laborHours;

  // 3. Overhead — applied on materials + labor.
  const overheadTotal = (effectiveMaterial + laborTotal) * (overheadPct / 100);

  // 4. Freight — flat per-unit (already converted to EUR by caller).
  // 5. Duties — applied on materials + labor + overhead + freight.
  const dutiesBase = effectiveMaterial + laborTotal + overheadTotal + freightTotal;
  const dutiesTotal = dutiesBase * (dutiesPct / 100);

  // 6. Total landed.
  const totalLanded = round(dutiesBase + dutiesTotal);

  // 7. Margins.
  const currentMargin =
    pvp > 0 ? round(((pvp - totalLanded) / pvp) * 100, 1) : 0;
  const variance = round(currentMargin - targetMarginPct, 1);

  return {
    materials: {
      bom_rolled_up: round(bomRolledUp),
      manual_override: manualMaterialOverride,
      source_of_truth: materialSourceOfTruth,
      effective: round(effectiveMaterial),
    },
    labor: {
      factory_rate: factoryRate,
      hours: laborHours,
      total: round(laborTotal),
    },
    overhead_pct: overheadPct,
    overhead_total: round(overheadTotal),
    freight: {
      origin: freightOrigin,
      destination: freightDestination,
      method: freightMethod,
      total: round(freightTotal),
    },
    duties_pct: dutiesPct,
    duties_total: round(dutiesTotal),
    total_landed: totalLanded,
    target_margin_pct: targetMarginPct,
    current_margin_pct: currentMargin,
    variance_pct: variance,
    last_recalc_at: new Date().toISOString(),
    ai_suggestions: [],
  };
}

/**
 * Decide if AI Margin Protection should surface to the user.
 *
 * Rule: variance < -3 percentage points AND BOM has at least 1 row
 * with a non-zero cost. Below 3pp threshold the noise is too high
 * (early-stage SKUs always under-margin until the full BOM is filled).
 */
export function shouldOfferMarginProtection(breakdown: CostBreakdown): boolean {
  const hasBom = breakdown.materials.bom_rolled_up > 0;
  const meaningfulShortfall = breakdown.variance_pct < -3;
  return hasBom && meaningfulShortfall;
}

/**
 * Severity of the margin gap, used to drive the gauge color.
 *   green  — at or above target
 *   amber  — within 5pp of target
 *   red    — more than 5pp below target
 */
export function marginSeverity(breakdown: CostBreakdown): 'green' | 'amber' | 'red' {
  const v = breakdown.variance_pct;
  if (v >= 0) return 'green';
  if (v >= -5) return 'amber';
  return 'red';
}

// ─── Defaults (read by the CostingPanel before user input) ────────

/**
 * Factory-rate defaults by region. EUR per hour. Conservative — meant
 * to give the panel a non-zero number while the user is still
 * configuring the actual factory.
 */
export const DEFAULT_FACTORY_RATE_BY_REGION: Record<string, number> = {
  IT: 25,    // Italy
  PT: 18,    // Portugal
  ES: 18,    // Spain
  TN: 6,     // Tunisia
  TR: 8,     // Turkey
  CN: 5,     // China
  VN: 4.5,   // Vietnam
  IN: 4,     // India
  MX: 6.5,   // Mexico
  US: 30,    // United States
  default: 10,
};

/**
 * Customs-duty defaults for EU import (apparel HS chapters 61/62 and
 * footwear chapter 64). Rough percentages — the user adjusts per-SKU
 * when sourcing data is firmer.
 */
export const DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU: Record<string, number> = {
  CN: 12,
  VN: 0,     // EVFTA preferential
  IN: 12,
  TR: 0,     // customs union
  TN: 0,     // EU-Tunisia free trade
  IT: 0,     // intra-EU
  PT: 0,     // intra-EU
  ES: 0,     // intra-EU
  US: 12,
  default: 12,
};
