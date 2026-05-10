/**
 * Dashboard data loader for Sales Dashboard motor.
 *
 * Aggregates everything the Sales Dashboard needs in a single call:
 *   - Sales strategy from CIS (archetype + channels + KPIs + cadence)
 *   - SKU lineup (from collection_skus, filtered to production_approved
 *     when locked, otherwise all)
 *   - Drops with their mechanic + window dates
 *   - Production orders with their eta + closed_at (Block 3 actuals)
 *   - Aggregate forecast (total revenue, total units, avg margin)
 *   - Block 3 actuals (closed_orders count, dispatched_units, actual margin)
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
  SalesArchetypeId,
  ChannelActivation,
  FulfillmentModel,
  DropMechanic,
} from '@/types/sales-strategy';

interface SkuLite {
  id: string;
  name: string;
  category: string | null;
  family: string | null;
  pvp: number | null;
  cost: number | null;
  margin: number | null;
  expected_sales: number | null;
  buy_units: number | null;
  fulfillment_model: FulfillmentModel;
  lead_time_days: number | null;
  deposit_pct: number | null;
  drop_id: string | null;
  drop_number: number | null;
  launch_date: string | null;
  production_approved: boolean;
  render_url: string | null;
  cost_breakdown: Record<string, unknown> | null;
}

interface DropLite {
  id: string;
  drop_number: number;
  name: string;
  launch_date: string;
  end_date: string | null;
  weeks_active: number | null;
  channels: string[];
  mechanic: DropMechanic;
  window_open_at: string | null;
  window_close_at: string | null;
  waitlist_count: number;
}

interface ProductionOrderLite {
  id: string;
  sku_id: string;
  units: number | null;
  eta: string | null;
  closed_at: string | null;
  status: string | null;
}

export interface SalesDashboardData {
  /** True when the founder confirmed 04.0 Estrategia de Venta. */
  hasStrategy: boolean;
  archetype: {
    id: SalesArchetypeId;
    name: string;
    fulfillment_model: FulfillmentModel;
    drop_mechanic: DropMechanic;
    payment_provider: string;
    capital_intensity: string;
  } | null;
  channelsActivated: ChannelActivation[];
  kpiFocus: string[];
  cadence: {
    drops_frequency_weeks: number;
    posts_per_day: number;
    emails_per_week: number;
  } | null;
  volume: {
    skus_per_drop: number;
    catalog_mode: 'permanent' | 'capsule';
  } | null;

  // SKU lineup
  skus: SkuLite[];
  skuCount: number;

  // Drops
  drops: DropLite[];

  // Production (Block 3 actuals)
  productionOrders: ProductionOrderLite[];
  productionDispatched: number;     // units shipped
  productionPendingDispatch: number; // units in production but not closed

  // Forecast aggregates (Block 2 plan)
  forecastRevenueEur: number;
  forecastUnits: number;
  forecastAvgPvp: number;
  forecastAvgMargin: number;
  forecastSellthrough: number;
  forecastEntryDate: Date | null; // earliest sku entry / drop launch

  // Block 3 actuals
  actualRevenueEur: number;
  actualUnitsDispatched: number;
  actualMarginPct: number;          // weighted avg from cost_breakdown.total_landed
  actualLineupLocked: boolean;      // merchandising.final_selection.locked_at exists

  // Final selection lock timestamp (CIS)
  finalSelectionLockedAt: string | null;
}

export async function loadSalesDashboardData(
  collectionPlanId: string,
): Promise<SalesDashboardData> {
  // ── 1. CIS · marketing.sales_strategy.* ──
  const { data: cisRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('domain, subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('is_current', true);

  const cis = new Map<string, unknown>();
  for (const r of cisRows ?? []) {
    cis.set(`${r.domain}.${r.subdomain}.${r.key}`, r.value);
  }

  const archetypeId = cis.get('marketing.sales_strategy.archetype_id') as
    | SalesArchetypeId
    | undefined;
  const hasStrategy = !!archetypeId;

  // ── 2. SKUs ──
  const { data: skusRaw } = await supabaseAdmin
    .from('collection_skus')
    .select(
      'id, name, category, family, pvp, cost, margin, expected_sales, buy_units, fulfillment_model, lead_time_days, deposit_pct, drop_id, drop_number, launch_date, production_approved, render_url, cost_breakdown',
    )
    .eq('collection_plan_id', collectionPlanId)
    .order('drop_number', { ascending: true });

  const skus = (skusRaw || []) as SkuLite[];

  // ── 3. Drops ──
  const { data: dropsRaw } = await supabaseAdmin
    .from('drops')
    .select(
      'id, drop_number, name, launch_date, end_date, weeks_active, channels, mechanic, window_open_at, window_close_at, waitlist_count',
    )
    .eq('collection_plan_id', collectionPlanId)
    .order('drop_number', { ascending: true });

  const drops = (dropsRaw || []) as DropLite[];

  // ── 4. Production orders (Block 3 actuals) ──
  const { data: productionOrdersRaw } = await supabaseAdmin
    .from('production_orders')
    .select('id, sku_id, units, eta, closed_at, status')
    .eq('collection_plan_id', collectionPlanId);

  const productionOrders = (productionOrdersRaw || []) as ProductionOrderLite[];

  const productionDispatched = productionOrders
    .filter((p) => p.closed_at !== null)
    .reduce((sum, p) => sum + (p.units || 0), 0);
  const productionPendingDispatch = productionOrders
    .filter((p) => p.closed_at === null)
    .reduce((sum, p) => sum + (p.units || 0), 0);

  // ── 5. Forecast aggregates ──
  const skuCount = skus.length;
  const forecastRevenueEur = skus.reduce(
    (sum, s) => sum + (s.expected_sales || 0),
    0,
  );
  const forecastUnits = skus.reduce((sum, s) => sum + (s.buy_units || 0), 0);
  const forecastAvgPvp = skuCount
    ? skus.reduce((sum, s) => sum + (s.pvp || 0), 0) / skuCount
    : 0;
  const forecastAvgMargin = skuCount
    ? skus.reduce((sum, s) => sum + (s.margin || 0), 0) / skuCount
    : 0;
  const forecastSellthrough = skuCount
    ? skus.reduce((sum, s) => {
        // From s.sale_percentage if present, else default 60
        const sp = (s as unknown as { sale_percentage?: number }).sale_percentage ?? 60;
        return sum + sp;
      }, 0) / skuCount
    : 0;

  // Earliest entry date across drops or sku launch_dates
  const dropLaunchDates = drops
    .map((d) => (d.launch_date ? new Date(d.launch_date) : null))
    .filter((d): d is Date => d !== null);
  const skuLaunchDates = skus
    .map((s) => (s.launch_date ? new Date(s.launch_date) : null))
    .filter((d): d is Date => d !== null);
  const allDates = [...dropLaunchDates, ...skuLaunchDates];
  const forecastEntryDate = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : null;

  // ── 6. Block 3 actuals ──
  const actualUnitsDispatched = productionDispatched;
  // Actual revenue = dispatched units × pvp aggregated
  const actualRevenueEur = skus.reduce((sum, s) => {
    const dispatched = productionOrders
      .filter((p) => p.sku_id === s.id && p.closed_at)
      .reduce((u, p) => u + (p.units || 0), 0);
    return sum + dispatched * (s.pvp || 0);
  }, 0);

  // Actual margin from cost_breakdown.total_landed if present
  const actualMarginEntries = skus
    .map((s) => {
      const cb = s.cost_breakdown as { total_landed?: number } | null;
      if (!cb?.total_landed || !s.pvp) return null;
      return ((s.pvp - cb.total_landed) / s.pvp) * 100;
    })
    .filter((m): m is number => m !== null);
  const actualMarginPct = actualMarginEntries.length
    ? actualMarginEntries.reduce((s, v) => s + v, 0) / actualMarginEntries.length
    : 0;

  const finalSelectionLockedAt =
    (cis.get('merchandising.final_selection.locked_at') as string | undefined) ?? null;

  return {
    hasStrategy,
    archetype: hasStrategy
      ? {
          id: archetypeId!,
          name:
            (cis.get('marketing.sales_strategy.archetype_name') as string) ?? '',
          fulfillment_model:
            (cis.get(
              'marketing.sales_strategy.fulfillment_model_default',
            ) as FulfillmentModel) ?? 'in_stock',
          drop_mechanic:
            (cis.get(
              'marketing.sales_strategy.drop_mechanic_default',
            ) as DropMechanic) ?? 'continuous',
          payment_provider:
            (cis.get(
              'marketing.sales_strategy.payment_provider_primary',
            ) as string) ?? 'stripe_buy_button',
          capital_intensity:
            (cis.get('marketing.sales_strategy.capital_intensity') as string) ??
            'medium',
        }
      : null,
    channelsActivated:
      (cis.get(
        'marketing.sales_strategy.channels_activated',
      ) as ChannelActivation[]) ?? [],
    kpiFocus:
      (cis.get('marketing.sales_strategy.kpi_focus') as string[]) ?? [],
    cadence:
      (cis.get('marketing.sales_strategy.cadence') as {
        drops_frequency_weeks: number;
        posts_per_day: number;
        emails_per_week: number;
      }) ?? null,
    volume:
      (cis.get('marketing.sales_strategy.volume') as {
        skus_per_drop: number;
        catalog_mode: 'permanent' | 'capsule';
      }) ?? null,
    skus,
    skuCount,
    drops,
    productionOrders,
    productionDispatched,
    productionPendingDispatch,
    forecastRevenueEur,
    forecastUnits,
    forecastAvgPvp,
    forecastAvgMargin,
    forecastSellthrough,
    forecastEntryDate,
    actualRevenueEur,
    actualUnitsDispatched,
    actualMarginPct,
    actualLineupLocked: !!finalSelectionLockedAt,
    finalSelectionLockedAt,
  };
}
