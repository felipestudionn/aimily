/**
 * 02.4 Plan Financiero · Deterministic calculator (Sprint B.4, 2026-05-09)
 *
 * Inputs come from CIS — already confirmed in 02.1, 02.2, 02.3:
 *   - strategy: target_sku_count, sales_target_y1, investment, target_margin_pct, drops
 *   - pricing.tiers: entry/core/hero (used as a fallback when no per-sub price set)
 *   - channels: channel_mix, sell_through_targets, pricing_per_channel, markets
 *   - families.list: subcategory counts (used for revenue mix per family — not in v1)
 *
 * Math is fully deterministic. Sonnet is layered on top for narrative + risk flags
 * (see financial-narrative-prompts.ts). The user can override any number in the UI;
 * recompute() runs on every edit.
 */

import type { DistributionPlan } from '@/lib/ai/distribution-prompts';

export interface FinancialInputs {
  // 02.1
  target_sku_count: number;
  sales_target_y1: number;     // €
  investment: { production: number; marketing: number; total: number };  // €
  target_margin_pct: number;   // 0-100
  drops: number;
  // 02.2
  avg_unit_price: number;      // computed from pricing tiers / per-sub overrides
  // 02.3
  channel_mix: DistributionPlan['channel_mix'];                    // sums to 100
  sell_through_targets: DistributionPlan['sell_through_targets']; // %
  pricing_per_channel: DistributionPlan['pricing_per_channel'];   // wholesale_discount_pct etc.
}

export interface PnL {
  revenue: number;             // = sales_target_y1, blended across channels
  cogs: number;                // computed from margin
  gross_profit: number;        // revenue - cogs
  gross_margin_pct: number;    // computed
  marketing_spend: number;     // = investment.marketing
  net_contribution: number;    // gross_profit - marketing_spend (operating profit before opex/tax)
  net_margin_pct: number;      // net_contribution / revenue × 100
  return_on_investment: number; // net_contribution / investment.total
  units_to_sell: number;       // revenue / blended avg price
  blended_avg_price: number;   // avg price per unit including wholesale/marketplace discounts
}

export interface MonthlyRevenue {
  month: number;        // 1-12
  drop_label?: string;  // e.g. 'Drop 1', if a drop launches this month
  revenue: number;
  cumulative_pct: number; // 0-100
}

export interface ChannelRevenue {
  channel: keyof DistributionPlan['channel_mix'];
  label: string;
  share_pct: number;
  unit_share_pct: number; // % of units (different from revenue % when discounts apply)
  effective_price: number; // avg price after channel discount
  units: number;
  revenue: number;
}

export interface MarkdownCalendar {
  start_week: number;        // typically week 12-16 if sell-through stalls
  initial_markdown_pct: number; // 30%
  deep_markdown_week: number;   // typically week 20+
  deep_markdown_pct: number;    // 50%
  rationale: string;
}

export interface FinancialPlan {
  pnl: PnL;
  monthly_revenue: MonthlyRevenue[];   // 12 months
  channel_revenue: ChannelRevenue[];   // 4 channels
  markdown_calendar: MarkdownCalendar;
  break_even: { week: number | null; revenue_required: number };
}

const CHANNEL_LABELS: Record<keyof DistributionPlan['channel_mix'], string> = {
  dtc_online: 'DTC online',
  dtc_physical: 'DTC propio',
  wholesale: 'Wholesale',
  marketplace: 'Marketplace',
};

/**
 * Compute the full financial plan from already-confirmed CIS inputs.
 * Pure function — no I/O. Re-run on every edit.
 */
export function computeFinancialPlan(inputs: FinancialInputs): FinancialPlan {
  const {
    sales_target_y1, investment, target_margin_pct,
    avg_unit_price, channel_mix, sell_through_targets, pricing_per_channel,
    drops,
  } = inputs;

  // ── PnL ─────────────────────────────────────────────────────────────────
  const revenue = sales_target_y1;
  const margin = Math.max(0, Math.min(100, target_margin_pct)) / 100;
  const cogs = revenue * (1 - margin);
  const gross_profit = revenue - cogs;
  const marketing_spend = investment.marketing || 0;
  const net_contribution = gross_profit - marketing_spend;
  const net_margin_pct = revenue > 0 ? (net_contribution / revenue) * 100 : 0;
  const return_on_investment = investment.total > 0 ? net_contribution / investment.total : 0;

  // ── Channel revenue (apply per-channel discount to retail price) ─────────
  // The user's avg_unit_price is the RETAIL price. For wholesale/marketplace,
  // the effective price is avg × (1 - discount/100). The total channel revenue
  // the brand books is `units × effective_price`. We assume channel_mix
  // shares are expressed in REVENUE share — so we back-compute units per
  // channel from that target.
  const channelKeys = Object.keys(channel_mix) as Array<keyof DistributionPlan['channel_mix']>;
  const wsDisc = (pricing_per_channel.wholesale_discount_pct || 0) / 100;
  const mpDisc = (pricing_per_channel.marketplace_discount_pct || 0) / 100;
  const effPrice: Record<string, number> = {
    dtc_online:   avg_unit_price,
    dtc_physical: avg_unit_price,
    wholesale:    avg_unit_price * (1 - wsDisc),
    marketplace:  avg_unit_price * (1 - mpDisc),
  };
  const channel_revenue: ChannelRevenue[] = channelKeys.map(k => {
    const share = (channel_mix[k] || 0) / 100;
    const ch_revenue = revenue * share;
    const price = effPrice[k] || avg_unit_price;
    const units = price > 0 ? ch_revenue / price : 0;
    return {
      channel: k,
      label: CHANNEL_LABELS[k],
      share_pct: channel_mix[k] || 0,
      unit_share_pct: 0, // filled below
      effective_price: Math.round(price),
      units: Math.round(units),
      revenue: Math.round(ch_revenue),
    };
  });
  const total_units = channel_revenue.reduce((s, c) => s + c.units, 0) || 1;
  channel_revenue.forEach(c => {
    c.unit_share_pct = Math.round((c.units / total_units) * 100);
  });
  const blended_avg_price = total_units > 0 ? revenue / total_units : avg_unit_price;
  const units_to_sell = total_units;

  // ── Monthly distribution ─────────────────────────────────────────────────
  // Use sell_through_targets at week 4/8/12/24 + drop count to spread revenue
  // across 12 months. Convert weeks to months (4 weeks ≈ 1 month):
  //   week 4 → end of month 1
  //   week 8 → end of month 2
  //   week 12 → end of month 3
  //   week 24 → end of month 6
  // The remaining (100 - week_24) sells out in months 7-12, with a small
  // markdown bump at month 9 (typical end-of-season clearance).
  const w4  = (sell_through_targets.week_4  || 0) / 100;
  const w8  = (sell_through_targets.week_8  || 0) / 100;
  const w12 = (sell_through_targets.week_12 || 0) / 100;
  const w24 = (sell_through_targets.week_24 || 0) / 100;
  const tail = Math.max(0, 1 - w24);

  // Allocate cumulative revenue % per month
  const cumByMonth: number[] = new Array(12).fill(0);
  cumByMonth[0]  = w4;
  cumByMonth[1]  = w8;
  cumByMonth[2]  = w12;
  // Months 4-6 ramp linearly w12 → w24
  for (let m = 3; m <= 5; m++) {
    cumByMonth[m] = w12 + ((w24 - w12) * (m - 2)) / 4; // rough linear
  }
  cumByMonth[5] = w24;
  // Months 7-12 ramp linearly w24 → 100% (markdown clearance)
  for (let m = 6; m < 12; m++) {
    cumByMonth[m] = w24 + (tail * (m - 5)) / 7;
  }
  cumByMonth[11] = Math.max(cumByMonth[11], 1.0);

  // If multiple drops, second/third drops shift the curve. Approximate by
  // tagging drop labels at evenly spaced months (month 1 + month (12/n_drops)+1).
  const drop_months = new Set<number>();
  for (let d = 0; d < Math.max(1, drops); d++) {
    drop_months.add(1 + Math.round((d * 12) / Math.max(1, drops)));
  }

  const monthly_revenue: MonthlyRevenue[] = [];
  let prevCum = 0;
  for (let i = 0; i < 12; i++) {
    const cum = Math.max(prevCum, Math.min(1, cumByMonth[i]));
    const monthRev = (cum - prevCum) * revenue;
    prevCum = cum;
    monthly_revenue.push({
      month: i + 1,
      drop_label: drop_months.has(i + 1) ? `Drop ${Array.from(drop_months).indexOf(i + 1) + 1}` : undefined,
      revenue: Math.round(monthRev),
      cumulative_pct: Math.round(cum * 100),
    });
  }

  // ── Markdown calendar ────────────────────────────────────────────────────
  // If sell-through at week 12 < 60%, fire initial markdown at week 14.
  // Deep markdown at week 20 if sell-through still < 80%.
  const initial_markdown_week = w12 < 0.6 ? 14 : 18;
  const deep_markdown_week    = w24 < 0.85 ? 20 : 26;
  const initial_markdown_pct  = w12 < 0.5 ? 40 : 30;
  const deep_markdown_pct     = w24 < 0.7 ? 60 : 50;
  const rationaleParts: string[] = [];
  if (w12 < 0.5) rationaleParts.push(`sell-through al 50% en sem 12 indica un riesgo de inventario`);
  else if (w12 < 0.6) rationaleParts.push(`sell-through al 60% en sem 12 — markdown de seguridad`);
  if (w24 < 0.8) rationaleParts.push(`tail por debajo del 80% en sem 24`);
  const markdown_calendar: MarkdownCalendar = {
    start_week: initial_markdown_week,
    initial_markdown_pct,
    deep_markdown_week,
    deep_markdown_pct,
    rationale: rationaleParts.length ? rationaleParts.join('; ') : 'Curva sana — markdowns ligeros end-of-season',
  };

  // ── Break-even ───────────────────────────────────────────────────────────
  // The point at which gross profit equals marketing_spend + production cost.
  // Production is essentially fixed once you place the buy order, so break-even
  // happens when (gross_profit_to_date) ≥ marketing_spend.
  // We need: cumulative_revenue × margin ≥ marketing_spend
  // → cumulative_revenue_required = marketing_spend / margin
  const revenue_required_for_breakeven = margin > 0 ? marketing_spend / margin : 0;
  let break_even_week: number | null = null;
  // Approximate weekly cumulative from monthly: 4 weeks per month, linear within
  let weekly_cum = 0;
  for (let m = 0; m < 12; m++) {
    const monthCum = cumByMonth[m] * revenue;
    const prevMonthCum = m === 0 ? 0 : cumByMonth[m - 1] * revenue;
    for (let w = 1; w <= 4; w++) {
      weekly_cum = prevMonthCum + ((monthCum - prevMonthCum) * w) / 4;
      if (weekly_cum >= revenue_required_for_breakeven) {
        break_even_week = m * 4 + w;
        break;
      }
    }
    if (break_even_week !== null) break;
  }

  return {
    pnl: {
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      gross_profit: Math.round(gross_profit),
      gross_margin_pct: Math.round(target_margin_pct),
      marketing_spend: Math.round(marketing_spend),
      net_contribution: Math.round(net_contribution),
      net_margin_pct: Math.round(net_margin_pct * 10) / 10,
      return_on_investment: Math.round(return_on_investment * 100) / 100,
      units_to_sell: Math.round(units_to_sell),
      blended_avg_price: Math.round(blended_avg_price),
    },
    monthly_revenue,
    channel_revenue,
    markdown_calendar,
    break_even: {
      week: break_even_week,
      revenue_required: Math.round(revenue_required_for_breakeven),
    },
  };
}
