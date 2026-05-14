/**
 * Sync the `collection_skus.cost` column with the BOM-derived landed cost.
 *
 * Background: `sku.cost` is consumed by Range Plan, financial recap, AI
 * prompts (materialsBudget anchor!), Sales Dashboard, etc. If it drifts
 * from the BOM, downstream proposals become meaningless — the
 * cost-aware materials AI was returning €25 worth of jersey for a €320
 * retail dress because the broken sku.cost of €1414 made the
 * materialsBudget = €777, big enough that the AI saw no constraint to
 * push UP. With sku.cost synced to reality (€60-90), the AI's budget
 * lands on the right magnitude and proposals become coherent.
 *
 * Called from:
 *   · /api/skus/[id] PATCH        — when material_zones, production_origin,
 *                                    or origin changes
 *   · /api/tech-pack         PATCH — when bom or cost_breakdown changes
 *
 * Idempotent. Awaits the write so the next AI call (e.g. an immediate
 * regenerate-materials after the user just edited the BOM) reads the
 * fresh value.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  recalculateCostBreakdown,
  DEFAULT_FACTORY_RATE_BY_REGION,
  DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU,
  DEFAULT_LABOR_HOURS_BY_CATEGORY,
  DEFAULT_FREIGHT_EUR_BY_ORIGIN,
  type BomLine,
  type CostBreakdown,
} from './landed-cost';

interface SyncResult {
  /** New sku.cost value (EUR). */
  cost: number;
  /** Whether we actually wrote to the DB (false if nothing meaningful changed). */
  persisted: boolean;
}

/**
 * Recompute sku.cost from the SKU's current state (material_zones,
 * production_origin, category) and persist it. Returns the new value
 * regardless of whether it was written.
 *
 * When `costBreakdown` is provided (e.g. the user just edited it via
 * the CostingPanel), it wins as the source of truth for the factor
 * inputs (laborHours, overheadPct, freight, duties). Otherwise we fall
 * back to industry defaults indexed by category + origin.
 */
export async function syncSkuCost(
  skuId: string,
  costBreakdown?: Partial<CostBreakdown> | null,
): Promise<SyncResult> {
  // Pull the SKU's current state — we need material_zones, origin,
  // pvp, current cost (to short-circuit if unchanged).
  const { data: sku, error } = await supabaseAdmin
    .from('collection_skus')
    .select('id, cost, pvp, category, origin, production_origin, material_zones')
    .eq('id', skuId)
    .single();

  if (error || !sku) {
    console.error('[syncSkuCost] SKU fetch failed', error);
    return { cost: 0, persisted: false };
  }

  // Resolve sourcing region: production_origin (ISO code) wins, else
  // the legacy origin enum, else 'default'.
  const sourcingRegion = (sku.production_origin as string) || (sku.origin as string) || 'default';

  // Derive BOM lines from material_zones if no cost_breakdown is
  // provided. Same per-unit cost resolution the seeder uses, so the
  // landed-cost engine and the BOM seeder agree on numbers.
  type Zone = {
    zone?: string;
    material?: string;
    cost_total?: number;
    cost_per_unit?: string;
    consumption?: string;
    cost_currency?: string;
  };
  const zones = (sku.material_zones as Zone[] | null) || [];

  const bomLines: BomLine[] = zones.map((z) => {
    const consumption = z.consumption || '';
    const consumptionMatch = consumption.match(/^([\d.]+)\s*(.+)?$/);
    const qtyNum = Number(consumptionMatch?.[1] || '1') || 1;
    const unit = consumptionMatch?.[2]?.trim() || 'pcs';
    const cpuMatch = (z.cost_per_unit || '').match(/([\d.]+)/);
    let costPerUnit = 0;
    if (cpuMatch) costPerUnit = Number(cpuMatch[1]);
    else if (z.cost_total != null && qtyNum > 0) costPerUnit = z.cost_total / qtyNum;
    return {
      type: z.zone || '',
      material: z.material || '',
      qty: String(qtyNum),
      unit,
      supplier: '',
      cost: costPerUnit > 0 ? costPerUnit.toFixed(2) : '',
      cost_currency: z.cost_currency || 'EUR',
    };
  });

  // Resolve factor inputs: prefer the costBreakdown if the caller
  // passed one (e.g. user just dragged a slider in CostingPanel),
  // otherwise fall back to industry defaults.
  const category = (sku.category as string) || 'default';
  const factoryRate = costBreakdown?.labor?.factory_rate ??
    (DEFAULT_FACTORY_RATE_BY_REGION[sourcingRegion] ?? DEFAULT_FACTORY_RATE_BY_REGION.default);
  const laborHours = (costBreakdown?.labor?.hours && costBreakdown.labor.hours > 0)
    ? costBreakdown.labor.hours
    : (DEFAULT_LABOR_HOURS_BY_CATEGORY[category] ?? DEFAULT_LABOR_HOURS_BY_CATEGORY.default);
  const overheadPct = costBreakdown?.overhead_pct ?? 15;
  const freightTotal = (costBreakdown?.freight?.total && costBreakdown.freight.total > 0)
    ? costBreakdown.freight.total
    : (DEFAULT_FREIGHT_EUR_BY_ORIGIN[sourcingRegion] ?? DEFAULT_FREIGHT_EUR_BY_ORIGIN.default);
  const dutiesPct = costBreakdown?.duties_pct ??
    (DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU[sourcingRegion] ?? DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU.default);

  const breakdown = recalculateCostBreakdown({
    bomLines,
    factoryRate,
    laborHours,
    overheadPct,
    freightOrigin: sourcingRegion,
    freightDestination: 'ES',
    freightMethod: 'sea',
    freightTotal,
    dutiesPct,
    targetMarginPct: 0,
    pvp: Number(sku.pvp) || 0,
    materialSourceOfTruth: 'bom',
  });

  const newCost = breakdown.total_landed;

  // Short-circuit if nothing changed (or if BOM is empty — no point
  // wiping a legacy cost with €0).
  if (newCost <= 0) return { cost: Number(sku.cost) || 0, persisted: false };
  const oldCost = Number(sku.cost) || 0;
  if (Math.abs(oldCost - newCost) < 0.01) return { cost: oldCost, persisted: false };

  const { error: updateError } = await supabaseAdmin
    .from('collection_skus')
    .update({ cost: newCost })
    .eq('id', skuId);

  if (updateError) {
    console.error('[syncSkuCost] update failed', updateError);
    return { cost: oldCost, persisted: false };
  }

  return { cost: newCost, persisted: true };
}
