/* ═══════════════════════════════════════════════════════════════════
   Pure computation layer for Financial Plan. No I/O. Given inputs +
   sources, returns derived numbers. Called by the workspace on every
   input change (cheap — just arithmetic) and by the AI endpoint after
   generating narrative.
   ═══════════════════════════════════════════════════════════════════ */

import type {
  FinancialPlanInputs,
  FinancialPlanSources,
  FinancialPlanDerived,
} from './types';

/** Clamp to [min, max]. */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function computeFinancialPlan(
  inputs: FinancialPlanInputs,
  sources: FinancialPlanSources,
): FinancialPlanDerived {
  const { assumptions, marketing, selectedScenario } = inputs;
  const { productionBudget, targetRevenue, targetMarginPct, drops } = sources;

  /* ── Revenue scenarios ─────────────────────────────────────────
     Scenario's firstYearSalesTarget is the 'target' line, assumed
     at baseline FPST = 60%. Conservative and Stretch are ±20% of
     that — a common sensitivity band used in pre-business plans. */
  const target = targetRevenue;
  const conservative = target * 0.8;
  const stretch = target * 1.2;
  const selected =
    selectedScenario === 'conservative' ? conservative :
    selectedScenario === 'stretch' ? stretch : target;

  /* ── Investment ─────────────────────────────────────────────── */
  const production = productionBudget;
  const development = production * (assumptions.developmentCostPct / 100);
  const workingCapital = production * (assumptions.workingCapitalWeeks / 52);

  // For margin math we always use an assumed marketing number even
  // when the user hasn't committed yet. If 'set', we use the real €.
  const marketingAssumed =
    marketing.status === 'set' && marketing.investment != null
      ? marketing.investment
      : selected * (marketing.assumedPctOfRevenue / 100);
  const marketingEffective = marketing.status === 'set' && marketing.investment != null
    ? marketing.investment
    : 0;

  const total = production + development + marketingEffective + workingCapital;
  const totalWithAssumedMarketing = production + development + marketingAssumed + workingCapital;

  /* ── Margin ─────────────────────────────────────────────────── */
  const grossMargin = selected * (targetMarginPct / 100);
  const grossMarginPct = targetMarginPct;
  const contributionMargin = grossMargin - marketingAssumed;
  const contributionMarginPct = selected > 0 ? (contributionMargin / selected) * 100 : 0;

  /* ── KPIs ────────────────────────────────────────────────────── */
  const roi = totalWithAssumedMarketing > 0
    ? contributionMargin / totalWithAssumedMarketing
    : 0;
  const paybackMonths = contributionMargin > 0
    ? clamp((totalWithAssumedMarketing / contributionMargin) * 12, 0, 99)
    : 99;

  /* ── Cash curve ──────────────────────────────────────────────
     Cash-out: production + development hit at month 0 (paying factories).
     Marketing hits evenly across months 0-5 (launch runway).
     Working capital parked at month 0, unwinds with sell-through.
     Cash-in: revenue arrives per-drop at `launchMonth`, weighted by
     `weight`. If no drops, revenue arrives evenly from month 3-11. */
  const cashCurve: { month: number; cashOut: number; cashIn: number; net: number }[] = [];
  const totalDropWeight = drops.reduce((s, d) => s + d.weight, 0) || 100;
  const fallbackMonths = [3, 5, 7, 9, 11];  // revenue spread if no drops

  let cumOut = 0;
  let cumIn = 0;
  for (let m = 0; m <= 12; m++) {
    // Out: production + dev + WC at m=0, marketing spread 0..5
    if (m === 0) cumOut += production + development + workingCapital;
    if (m <= 5 && marketingEffective > 0) cumOut += marketingEffective / 6;

    // In: per drop or evenly across 5 points
    if (drops.length > 0) {
      for (const d of drops) {
        if (d.launchMonth === m) {
          cumIn += selected * (d.weight / totalDropWeight);
        }
      }
    } else {
      if (fallbackMonths.includes(m)) cumIn += selected / fallbackMonths.length;
    }

    cashCurve.push({ month: m, cashOut: cumOut, cashIn: cumIn, net: cumIn - cumOut });
  }

  return {
    investment: {
      production,
      development,
      marketing: marketingEffective,
      marketingAssumed,
      workingCapital,
      total,
      totalWithAssumedMarketing,
    },
    revenue: { conservative, target, stretch, selected },
    margin: {
      grossMargin,
      grossMarginPct,
      contributionMargin,
      contributionMarginPct,
    },
    kpis: {
      totalInvestment: totalWithAssumedMarketing,
      expectedRevenue: selected,
      grossMarginPct,
      roi,
      paybackMonths,
    },
    cashCurve,
  };
}

/** Empty-sources scaffold for when the user opens the screen before
    selecting a scenario. Prevents NaNs and lets the UI render a
    "select a scenario first" state. */
export function emptySources(): FinancialPlanSources {
  return {
    productionBudget: 0,
    targetRevenue: 0,
    targetMarginPct: 60,
    totalSkus: 0,
    channelMix: [],
    drops: [],
  };
}

/** Small helpers for the UI. */
export function formatEur(v: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(v)) return '—';
  if (opts.compact) {
    if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  }
  return `€${Math.round(v).toLocaleString('en-US')}`;
}

export function formatPct(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v * 10) / 10}%`;
}
