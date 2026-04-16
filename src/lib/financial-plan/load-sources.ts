/* ═══════════════════════════════════════════════════════════════════
   Server-side loader for FinancialPlanSources. Reads:
     - merchandising workspace (selected scenario, pricing, channels)
     - drops table (cash-in timing)
     - collection_timelines (baseline launch month for drop → month math)

   This is intentionally NOT part of loadFullContext() — the AI context
   lock keeps that file untouched. The Financial Plan workspace + the
   presentation loader both call this function directly.
   ═══════════════════════════════════════════════════════════════════ */

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { FinancialPlanSources } from './types';
import type { Scenario } from '@/components/merchandising/ScenariosContent';

interface PricingRow {
  family: string;
  subcategories: { name: string; minPrice: number; maxPrice: number }[];
}

interface MerchWorkspaceData {
  cardData?: {
    scenarios?: { data?: { scenarios?: Scenario[]; selectedScenarioId?: string | null } };
    pricing?: { data?: { pricing?: PricingRow[] } };
    channels?: { data?: Record<string, unknown> };
  };
}

/** Month delta between two ISO dates, clamped to [0, 12]. */
function monthDelta(baseline: string, target: string): number {
  const b = new Date(baseline);
  const t = new Date(target);
  if (Number.isNaN(b.getTime()) || Number.isNaN(t.getTime())) return 0;
  const diff = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  return Math.max(0, Math.min(12, diff));
}

export async function loadFinancialPlanSources(collectionPlanId: string): Promise<FinancialPlanSources> {
  // Merchandising workspace — scenarios + pricing + channels
  const { data: merchRow } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('data')
    .eq('collection_plan_id', collectionPlanId)
    .eq('workspace', 'merchandising')
    .maybeSingle();

  const merch = (merchRow?.data || {}) as MerchWorkspaceData;
  const scenarios = merch.cardData?.scenarios?.data?.scenarios || [];
  const selectedId = merch.cardData?.scenarios?.data?.selectedScenarioId;
  const selected = scenarios.find(s => s.id === selectedId) || null;

  const pricing = merch.cardData?.pricing?.data?.pricing || [];
  const channelsData = (merch.cardData?.channels?.data || {}) as Record<string, unknown>;

  // Weighted avg selling price across all subcategories (midpoint of min/max)
  let priceSum = 0;
  let priceCount = 0;
  for (const row of pricing) {
    for (const sub of row.subcategories || []) {
      const mid = (sub.minPrice + sub.maxPrice) / 2;
      if (mid > 0) { priceSum += mid; priceCount += 1; }
    }
  }
  const avgSellingPrice = priceCount > 0 ? priceSum / priceCount : undefined;

  // Channel mix — channels card stores allocations as { channelAllocations: [{ name, percentage }] }
  // or similar; we normalize to {channel, pct} summing to 100.
  const channelMix: { channel: string; pct: number }[] = [];
  const rawChannels =
    (channelsData.channelAllocations as { name: string; percentage: number }[]) ||
    (channelsData.allocations as { name: string; percentage: number }[]) ||
    [];
  if (Array.isArray(rawChannels)) {
    const total = rawChannels.reduce((s, c) => s + (Number(c.percentage) || 0), 0) || 100;
    for (const c of rawChannels) {
      if (c.name && c.percentage) {
        channelMix.push({ channel: c.name, pct: (Number(c.percentage) / total) * 100 });
      }
    }
  }

  // Drops — real table + timeline baseline for month delta
  const { data: dropRows } = await supabaseAdmin
    .from('drops')
    .select('name, launch_date, expected_sales_weight')
    .eq('collection_plan_id', collectionPlanId);
  const { data: timeline } = await supabaseAdmin
    .from('collection_timelines')
    .select('launch_date')
    .eq('collection_plan_id', collectionPlanId)
    .maybeSingle();

  const baseline = timeline?.launch_date ?? new Date().toISOString();
  const drops = (dropRows || [])
    .filter(d => d.launch_date)
    .map(d => ({
      name: d.name as string,
      launchMonth: monthDelta(baseline, d.launch_date as string),
      weight: Number(d.expected_sales_weight) || 0,
    }));

  return {
    scenarioId: selected?.id,
    scenarioName: selected?.name,
    productionBudget: selected?.financials?.productionBudget ?? 0,
    targetRevenue: selected?.financials?.firstYearSalesTarget ?? 0,
    targetMarginPct: selected?.financials?.targetMargin ?? 60,
    totalSkus: selected?.skuCount ?? 0,
    avgSellingPrice,
    channelMix,
    drops,
  };
}
