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

/* ─── Aggregate curve · sum per-SKU contributions ─────────────────────── */

const DAY_MS = 1000 * 60 * 60 * 24;

interface SkuForCurve {
  launch_date: string | null;
  expected_sales: number | null;
  buy_units: number | null;
  fulfillment_model?: string;
  lead_time_days?: number | null;
}

export interface AggregateCurvePoint {
  date: Date;
  day_offset: number;        // days from earliest launch
  daily_eur: number;         // sum of all SKU contributions on this day
  cumulative_eur: number;    // running total
  active_skus: number;       // how many SKUs are in their forecast window today
}

export interface AggregateCurveResult {
  points: AggregateCurvePoint[];
  earliest_launch: Date;
  latest_launch: Date;
  total_revenue_eur: number;
  peak_day: Date | null;
  peak_daily_eur: number;
  archetype_id: SalesArchetypeId;
  duration_days: number;
}

/**
 * Build the aggregate sales curve for a collection by SUMMING each SKU's
 * own Gauss curve starting from its own launch_date.
 *
 * Different SKUs can launch on different days — drops, restocks, MTO orders
 * pre-collected over time, etc. The aggregate curve reflects that reality:
 * if all 28 SKUs launch the same day, you see one big peak. If they launch
 * across 4 drops, you see 4 staggered peaks summed into a wave.
 *
 * Returns calendar-anchored points (real dates), not D+N offsets.
 */
export function buildAggregateCurve(
  archetypeId: SalesArchetypeId,
  skus: SkuForCurve[],
): AggregateCurveResult | null {
  // 1. Filter SKUs that have a launch date AND expected sales
  const dated = skus.filter(
    (s): s is SkuForCurve & { launch_date: string; expected_sales: number } =>
      !!s.launch_date && (s.expected_sales || 0) > 0,
  );
  if (dated.length === 0) return null;

  // 2. Find boundaries
  const launchTimes = dated.map((s) => new Date(s.launch_date).getTime());
  const earliest = new Date(Math.min(...launchTimes));
  const latest = new Date(Math.max(...launchTimes));

  // Each archetype has a different forecast horizon
  const horizon =
    archetypeId === 'B' ? 30 : archetypeId === 'C' ? 140 : 180;

  // Total timeline = from earliest launch to latest launch + horizon
  const totalDays =
    Math.ceil((latest.getTime() - earliest.getTime()) / DAY_MS) + horizon;

  // 3. Pre-compute each SKU's individual curve points (indexed by day-from-its-launch)
  const skuCurves = dated.map((s) => {
    const skuLaunch = new Date(s.launch_date);
    const skuLaunchOffset = Math.round(
      (skuLaunch.getTime() - earliest.getTime()) / DAY_MS,
    );
    const curve = computeExpectedCurve({
      archetypeId,
      anchorDate: skuLaunch,
      totalRevenueEur: s.expected_sales,
      totalUnits: s.buy_units || 0,
      durationDays: horizon,
      leadTimeDays: s.lead_time_days || undefined,
    });
    return { skuLaunchOffset, points: curve.points };
  });

  // 4. Aggregate: for each day in [0..totalDays], sum contributions from all SKUs whose curve covers that day
  const points: AggregateCurvePoint[] = [];
  let cumulative = 0;
  let peakDay = 0;
  let peakDaily = 0;

  for (let day = 0; day <= totalDays; day++) {
    let dayTotal = 0;
    let activeCount = 0;
    for (const { skuLaunchOffset, points: curvePoints } of skuCurves) {
      const localDay = day - skuLaunchOffset;
      if (localDay < 0 || localDay >= curvePoints.length) continue;
      const pt = curvePoints[localDay];
      if (pt && pt.expected_revenue_eur > 0) {
        dayTotal += pt.expected_revenue_eur;
        activeCount++;
      }
    }
    cumulative += dayTotal;
    if (dayTotal > peakDaily) {
      peakDaily = dayTotal;
      peakDay = day;
    }
    const date = new Date(earliest.getTime() + day * DAY_MS);
    points.push({
      date,
      day_offset: day,
      daily_eur: Math.round(dayTotal),
      cumulative_eur: Math.round(cumulative),
      active_skus: activeCount,
    });
  }

  return {
    points,
    earliest_launch: earliest,
    latest_launch: latest,
    total_revenue_eur: Math.round(cumulative),
    peak_day: points[peakDay]?.date ?? null,
    peak_daily_eur: Math.round(peakDaily),
    archetype_id: archetypeId,
    duration_days: totalDays,
  };
}

/**
 * Format full date with year in Spanish.
 */
export function fmtDateLong(date: Date | string, locale: 'es' | 'en' = 'es'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
