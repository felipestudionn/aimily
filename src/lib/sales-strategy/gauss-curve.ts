/**
 * Gauss curve calculator for Sales Dashboard
 *
 * Each archetype has a canonical revenue shape:
 *   A · Brand DTC      → skewed-right with long tail
 *                        ramp 1-30d, peak at d~45, decay to ~50% by d180
 *   B · Creator brand  → spike + decay fast
 *                        peak at d0-1 (drop launch), 70%+ in first 24h,
 *                        decay to near-0 by d14, restock cycles
 *   C · Made-to-Order  → bimodal (deposit + balance)
 *                        first peak d0-30 (deposit collection),
 *                        plateau during production,
 *                        second peak at d+lead_time (balance + ship)
 *
 * The function generates an "expected" revenue curve given:
 *   - archetype id
 *   - anchor date (drop launch / sku entry)
 *   - total revenue target (€)
 *   - duration days
 *
 * Returns array of {day_offset, expected_revenue_eur, expected_units}.
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md §Sales Dashboard
 */

import type {
  SalesArchetypeId,
  GaussCurvePoint,
  GaussCurveExpected,
  CurveShape,
  SalesActionAnchor,
} from '@/types/sales-strategy';

interface GaussInput {
  archetypeId: SalesArchetypeId;
  anchorDate: Date;
  totalRevenueEur: number;
  totalUnits: number;
  durationDays: number;
  /** For MTO only — when does production complete */
  leadTimeDays?: number;
}

/* ─── Shape generators ─────────────────────────────────────────────────── */

/**
 * Gaussian-like shape skewed right with long tail.
 * Peaks at ~peakDay, then decays slowly (long-tail).
 * Used for archetype A · Brand DTC.
 */
function shapeBrandDtc(durationDays: number): number[] {
  const peakDay = 45;
  const sigmaUp = 18;
  const sigmaDown = 90; // long tail
  const out: number[] = [];
  for (let d = 0; d <= durationDays; d++) {
    const sigma = d < peakDay ? sigmaUp : sigmaDown;
    const exp = Math.exp(-Math.pow(d - peakDay, 2) / (2 * sigma * sigma));
    out.push(exp);
  }
  return out;
}

/**
 * Spike + fast decay.
 * Used for archetype B · Creator brand drops.
 */
function shapeCreatorDrop(durationDays: number): number[] {
  const peakDay = 1;
  const sigmaUp = 0.5;
  const sigmaDown = 4; // fast decay
  const out: number[] = [];
  for (let d = 0; d <= durationDays; d++) {
    const sigma = d < peakDay ? sigmaUp : sigmaDown;
    const exp = Math.exp(-Math.pow(d - peakDay, 2) / (2 * sigma * sigma));
    out.push(exp);
  }
  return out;
}

/**
 * Bimodal: deposit peak + balance peak.
 * Used for archetype C · MTO.
 */
function shapeMto(durationDays: number, leadTimeDays: number): number[] {
  const depositPeak = 14; // mid of pre-order window
  const balancePeak = leadTimeDays;
  const sigma1 = 8;
  const sigma2 = 6;
  const out: number[] = [];
  // Approx: deposit half ≈ 50% of revenue, balance half ≈ 50%
  for (let d = 0; d <= durationDays; d++) {
    const e1 = 0.5 * Math.exp(-Math.pow(d - depositPeak, 2) / (2 * sigma1 * sigma1));
    const e2 = 0.5 * Math.exp(-Math.pow(d - balancePeak, 2) / (2 * sigma2 * sigma2));
    out.push(e1 + e2);
  }
  return out;
}

/* ─── Main API ─────────────────────────────────────────────────────────── */

const ANCHOR_BY_ARCHETYPE: Record<SalesArchetypeId, SalesActionAnchor> = {
  A: 'sku_entry',
  B: 'drop_launch',
  C: 'drop_window_open',
};

const SHAPE_BY_ARCHETYPE: Record<SalesArchetypeId, CurveShape> = {
  A: 'skewed_right_long_tail',
  B: 'spike_decay_fast',
  C: 'bimodal_deposit_balance',
};

const GOOD_THRESHOLD_BY_ARCHETYPE: Record<
  SalesArchetypeId,
  GaussCurveExpected['good_threshold']
> = {
  A: {
    metric: 'tail_at_day_180_pct_of_peak',
    value: 50,
    description: 'Tail @D+180 ≥ 50% del peak',
  },
  B: {
    metric: 'sellthrough_first_24h',
    value: 70,
    description: 'Sellthrough primeras 24h ≥ 70%',
  },
  C: {
    metric: 'deposit_to_balance_collection_rate',
    value: 85,
    description: 'Conversión deposit → balance ≥ 85%',
  },
};

export function computeExpectedCurve(input: GaussInput): GaussCurveExpected {
  const { archetypeId, anchorDate, totalRevenueEur, totalUnits, durationDays } = input;
  const leadTimeDays = input.leadTimeDays ?? 56;

  let shape: number[];
  if (archetypeId === 'A') shape = shapeBrandDtc(durationDays);
  else if (archetypeId === 'B') shape = shapeCreatorDrop(durationDays);
  else shape = shapeMto(durationDays, leadTimeDays);

  // Normalize so sum(shape) = 1.0
  const sum = shape.reduce((s, v) => s + v, 0) || 1;
  const normalized = shape.map((v) => v / sum);

  // Cumulative for revenue assignment
  const points: GaussCurvePoint[] = normalized.map((pct, day_offset) => ({
    day_offset,
    expected_revenue_eur: Math.round(pct * totalRevenueEur * 100) / 100,
    expected_units: Math.round(pct * totalUnits * 10) / 10,
  }));

  return {
    shape: SHAPE_BY_ARCHETYPE[archetypeId],
    archetype_id: archetypeId,
    anchor_event: ANCHOR_BY_ARCHETYPE[archetypeId],
    anchor_date: anchorDate.toISOString(),
    duration_days: durationDays,
    points,
    good_threshold: GOOD_THRESHOLD_BY_ARCHETYPE[archetypeId],
  };
}

/**
 * Cumulative curve · for stacked area visualisation.
 * Returns cumulative revenue at each day_offset.
 */
export function cumulativeCurve(
  curve: GaussCurveExpected,
): Array<{ day_offset: number; cumulative_revenue_eur: number }> {
  let acc = 0;
  return curve.points.map((p) => {
    acc += p.expected_revenue_eur;
    return { day_offset: p.day_offset, cumulative_revenue_eur: Math.round(acc) };
  });
}

/**
 * Format anchor date to "DD MMM" in Spanish.
 */
export function fmtDate(date: Date | string, locale: 'es' | 'en' = 'es'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
