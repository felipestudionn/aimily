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
import type { PrefilledEditor } from '@/lib/ai/scenarios-prompts';

interface PricingRow {
  family: string;
  subcategories: { name: string; minPrice: number; maxPrice: number }[];
}

/**
 * Sprint B.1 (2026-05-08) — scenarios shape changed from
 * `{ scenarios[], selectedScenarioId }` to a single chosen archetype
 * editor (`{ editor: PrefilledEditor, chosen_archetype, archetypes }`).
 * Canonical source is now CIS (`merchandising.strategy.chosen_full`)
 * written by /api/strategy-confirm; workspace cache is just the
 * unsaved-draft fallback before confirm.
 */
interface MerchWorkspaceData {
  cardData?: {
    scenarios?: {
      data?: {
        editor?: PrefilledEditor;
        chosen_archetype?: { id: string; name: string };
      };
    };
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

  // Prefer CIS (canonical, written by /api/strategy-confirm) over the
  // workspace draft. Falls back to the in-progress editor for unsaved
  // drafts (so 02.4 still has something to render mid-edit).
  const { data: cisRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'merchandising')
    .eq('subdomain', 'strategy')
    .eq('is_current', true)
    .in('key', ['chosen_full', 'archetype_name', 'chosen_archetype_id']);
  const cisGet = <T = unknown>(k: string): T | undefined =>
    cisRows?.find(r => r.key === k)?.value as T | undefined;
  const cisChosenFull = cisGet<PrefilledEditor>('chosen_full');

  const editor: PrefilledEditor | undefined = cisChosenFull || merch.cardData?.scenarios?.data?.editor;
  const archetypeName = cisGet<string>('archetype_name')
    || merch.cardData?.scenarios?.data?.chosen_archetype?.name
    || undefined;
  const archetypeId = (cisGet<string>('chosen_archetype_id')
    || merch.cardData?.scenarios?.data?.chosen_archetype?.id) as string | undefined;

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
    scenarioId: archetypeId,
    scenarioName: archetypeName,
    productionBudget: editor?.investment_split?.production ?? 0,
    targetRevenue: editor?.sales_target_y1 ?? 0,
    targetMarginPct: editor?.target_margin_pct ?? 60,
    totalSkus: editor?.sku_count ?? 0,
    avgSellingPrice,
    channelMix,
    drops,
  };
}
