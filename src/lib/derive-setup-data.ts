/**
 * Derived Setup Data — computed on read, NEVER cached.
 *
 * Replaces the old `collection_plans.setup_data` jsonb cache that was
 * populated by `bridgeMerchToSetup()` once-per-collection and never
 * refreshed. The cache went stale every time the user edited the
 * merchandising workspace, and consumers (24 AI endpoints + dashboard +
 * my-collections + layout + presentation deck) silently drank stale data.
 *
 * Framework rule §9 (added 2026-05-06): "Derived state is computed on
 * read, not cached. If it must be cached, the cache key is bound to the
 * source row's `updated_at`."
 *
 * The `setup_data` column on `collection_plans` is preserved only for
 * narrowly-scoped server-only state (`post_launch_analysis`). Nothing
 * else reads or writes it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';

/* ─── Sub-shapes ─────────────────────────────────────────────────── */

export interface DerivedProductFamily {
  /** Family name as defined in the merchandising workspace */
  name: string;
  /** Share of the collection by subcategory count, 0-100 */
  percentage: number;
}

export interface DerivedPriceSegment {
  name: string;
  minPrice: number;
  maxPrice: number;
  percentage: number;
}

export interface DerivedProductTypeSegment {
  type: 'REVENUE' | 'IMAGEN' | 'ENTRY' | string;
  percentage: number;
}

/* ─── The derived snapshot ───────────────────────────────────────── */

/**
 * Snapshot of merchandising state at the moment of read. All fields
 * are optional because a brand-new collection has no merchandising
 * workspace data yet — every consumer must handle the empty case.
 */
export interface DerivedSetupData {
  /** Total revenue target for the collection in EUR (from budget card). */
  totalSalesTarget?: number;
  /** Average target retail price per pair, EUR. */
  avgPriceTarget?: number;
  /** Target gross margin %, 0-100. */
  targetMargin?: number;
  /** Average planned discount %, 0-100. */
  plannedDiscounts?: number;
  /** Total expected SKUs (estimated from subcategories × 4). */
  expectedSkus?: number;
  /** Number of planned drops in the season. */
  dropsCount?: number;

  /** Free-form first-family label or SKU.category fallback. */
  productCategory?: string;
  /** Family names as flat string array (kept for back-compat consumers). */
  families?: string[];
  /** Family rich shape with proportional shares. */
  productFamilies?: DerivedProductFamily[];
  /** Per-family pricing windows. */
  priceSegments?: DerivedPriceSegment[];
  /** Revenue / Image / Entry split. */
  productTypeSegments?: DerivedProductTypeSegment[];

  /** Lowest minPrice across pricing card. */
  minPrice?: number;
  /** Highest maxPrice across pricing card. */
  maxPrice?: number;
  /** Per-month revenue distribution, length 12, percent points summing to ~100. */
  monthlyDistribution?: number[];
}

/* ─── Pure compute ───────────────────────────────────────────────── */

type MerchFamily = {
  name: string;
  subcategories?: Array<string | { name: string }>;
  priority?: string;
};
type PricingSub = { name: string; minPrice?: number; maxPrice?: number };
type PricingRow = { family: string; subcategories?: PricingSub[] };
type Seg = { name: string; percentage: number };

/**
 * Pure derivation from the merchandising workspace data shape +
 * SKU rows + season label. Has no I/O — easy to unit-test.
 *
 *   merchCardData: collection_workspace_data.data.cardData (or null)
 *   skuCategories: distinct categories present on collection_skus
 *   season:        e.g. "SS27" — drives monthlyDistribution
 */
export function computeDerivedSetupData(
  merchCardData: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> | null | undefined,
  skuCategories: string[],
  season: string | null | undefined,
): DerivedSetupData {
  const cd = merchCardData || {};

  /* Families ── shape: cardData.families.data.families[]  */
  const familiesRaw = (cd.families?.data?.families as MerchFamily[] | undefined) || [];
  const subcatCount = familiesRaw.reduce(
    (sum, f) => sum + (Array.isArray(f.subcategories) ? f.subcategories.length : 0),
    0,
  );
  const familyNames = familiesRaw.map(f => f.name);
  const productFamilies: DerivedProductFamily[] = familiesRaw.map(f => ({
    name: f.name,
    percentage:
      subcatCount > 0
        ? Math.round(((f.subcategories?.length || 0) / subcatCount) * 100)
        : 0,
  }));

  /* Pricing ── shape: cardData.pricing.data.pricing[]  */
  const pricingRaw =
    (cd.pricing?.data?.pricing as PricingRow[] | undefined) || [];
  const allMin: number[] = [];
  const allMax: number[] = [];
  pricingRaw.forEach(fam => {
    (fam.subcategories || []).forEach(sub => {
      if (typeof sub.minPrice === 'number' && sub.minPrice > 0) allMin.push(sub.minPrice);
      if (typeof sub.maxPrice === 'number' && sub.maxPrice > 0) allMax.push(sub.maxPrice);
    });
  });
  const minPrice = allMin.length ? Math.min(...allMin) : undefined;
  const maxPrice = allMax.length ? Math.max(...allMax) : undefined;

  const priceSegments: DerivedPriceSegment[] = pricingRaw.map(fam => {
    const mins = (fam.subcategories || []).map(s => s.minPrice ?? 0).filter(p => p > 0);
    const maxs = (fam.subcategories || []).map(s => s.maxPrice ?? 0).filter(p => p > 0);
    return {
      name: fam.family,
      minPrice: mins.length ? Math.min(...mins) : 0,
      maxPrice: maxs.length ? Math.max(...maxs) : 0,
      percentage:
        subcatCount > 0
          ? Math.round(((fam.subcategories?.length || 0) / subcatCount) * 100)
          : 0,
    };
  });

  /* Budget ── shape: cardData.budget.data  */
  const budget = (cd.budget?.data as Record<string, unknown> | undefined) || {};
  const totalSalesTarget =
    typeof budget.totalSalesTarget === 'number' ? budget.totalSalesTarget : undefined;
  const targetMargin =
    typeof budget.targetMargin === 'number' ? budget.targetMargin : undefined;
  const plannedDiscounts =
    typeof budget.avgDiscount === 'number' ? budget.avgDiscount : undefined;
  const avgPriceTarget =
    typeof budget.avgPrice === 'number'
      ? budget.avgPrice
      : allMin.length
        ? Math.round([...allMin, ...allMax].reduce((a, b) => a + b, 0) / (allMin.length + allMax.length))
        : undefined;

  /* Type segmentation ── Image is mapped to IMAGEN for pyramid back-compat */
  const typeSeg = (budget.typeSegmentation as Seg[] | undefined) || [];
  const productTypeSegments: DerivedProductTypeSegment[] = typeSeg.map(s => {
    const upper = s.name.toUpperCase();
    return { type: upper === 'IMAGE' ? 'IMAGEN' : upper, percentage: s.percentage };
  });

  /* Season-driven monthly distribution */
  const seasonU = (season || '').toUpperCase();
  const isSS = seasonU.startsWith('SS') || seasonU.includes('SPRING') || seasonU.includes('SUMMER');
  const monthlyDistribution = isSS
    ? [4, 8, 12, 14, 14, 12, 10, 8, 6, 5, 4, 3]
    : [3, 4, 5, 6, 8, 10, 12, 14, 14, 12, 8, 4];

  /* productCategory: first family or first SKU category */
  const productCategory = familyNames[0] || skuCategories[0] || undefined;

  /* expectedSkus: rough estimate (matches old bridge logic) */
  const expectedSkus = subcatCount > 0 ? subcatCount * 4 : undefined;

  return {
    totalSalesTarget,
    avgPriceTarget,
    targetMargin,
    plannedDiscounts,
    expectedSkus,
    dropsCount: undefined, // not yet captured anywhere; left for future
    productCategory,
    families: familyNames.length > 0 ? familyNames : undefined,
    productFamilies: productFamilies.length > 0 ? productFamilies : undefined,
    priceSegments: priceSegments.length > 0 ? priceSegments : undefined,
    productTypeSegments: productTypeSegments.length > 0 ? productTypeSegments : undefined,
    minPrice,
    maxPrice,
    monthlyDistribution,
  };
}

/* ─── I/O loader (server-side, RLS-bypassing) ────────────────────── */

/**
 * Loads the merchandising workspace + SKU categories + plan season for
 * the given collection and computes the derived snapshot.
 *
 * Server-only: uses supabaseAdmin. Client-side consumers should call
 * `GET /api/derived-setup-data?planId=...` instead, which wraps this
 * with auth + ownership.
 */
export async function loadDerivedSetupData(planId: string): Promise<DerivedSetupData> {
  return loadDerivedSetupDataWith(planId, supabaseAdmin);
}

/**
 * Same as `loadDerivedSetupData` but accepts a client. Useful when
 * the caller already has an authenticated supabase client (e.g.
 * SSR-cookie-based) and prefers RLS-protected reads.
 *
 * Sprint B.5 (2026-05-09) — CIS-first read. After Block 2 went canonical
 * (02.1-02.4 write to merchandising.{strategy,families,pricing,channels,
 * budget}.* in collection_decisions), the legacy workspace_data shape
 * stopped being populated by confirms. The Collection Builder dashboard
 * (Ingresos, SKUs, Familias, Margen…) was rendering all zeros despite
 * Block 2 being closed. We now read CIS first; if CIS keys are absent
 * we fall back to the legacy workspace_data path so brand-new collections
 * still gracefully render the empty state and any pre-canonical
 * collections (none in production yet) still work.
 */
export async function loadDerivedSetupDataWith(
  planId: string,
  client: SupabaseClient,
): Promise<DerivedSetupData> {
  const [planRes, wsRes, skuRes, cisRes] = await Promise.all([
    client.from('collection_plans').select('season').eq('id', planId).single(),
    client
      .from('collection_workspace_data')
      .select('data')
      .eq('collection_plan_id', planId)
      .eq('workspace', 'merchandising')
      .maybeSingle(),
    client
      .from('collection_skus')
      .select('category')
      .eq('collection_plan_id', planId),
    client
      .from('collection_decisions')
      .select('subdomain, key, value')
      .eq('collection_plan_id', planId)
      .eq('domain', 'merchandising')
      .eq('is_current', true)
      .in('subdomain', ['strategy', 'families', 'pricing', 'channels', 'budget']),
  ]);

  const skuCategories = Array.from(
    new Set(
      ((skuRes.data || []) as Array<{ category: string | null }>)
        .map(r => r.category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0),
    ),
  );
  const season = planRes.data?.season ?? null;

  // Try CIS first
  const cisRows = (cisRes.data || []) as Array<{ subdomain: string; key: string; value: unknown }>;
  if (cisRows.length > 0) {
    const cisDerived = computeDerivedFromCis(cisRows, skuCategories, season);
    if (cisDerived) return cisDerived;
  }

  // Legacy fallback (pre-canonical collections, brand new w/ no Block 2 data)
  const merchData = (wsRes.data?.data as { cardData?: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> } | null)?.cardData;
  return computeDerivedSetupData(merchData, skuCategories, season);
}

/* ─── CIS-aware derivation (Block 2 canonical pattern) ───────────── */

interface CisFamily {
  name: string;
  count?: number;
  subcategories?: Array<{ name: string; count?: number; evidence?: string }>;
}
interface CisPricingTier { min?: number; max?: number; anchored_by?: string[] }
interface CisPricingTiers { entry?: CisPricingTier; core?: CisPricingTier; hero?: CisPricingTier }
interface CisBudgetPnl { revenue?: number; gross_margin_pct?: number; blended_avg_price?: number; units_to_sell?: number }
interface CisMonthlyRevenue { month: number; revenue: number; cumulative_pct?: number; drop_label?: string }
interface CisChannelMix { wholesale_discount_pct?: number; marketplace_discount_pct?: number }
interface CisChannelsPlan { pricing_per_channel?: CisChannelMix; channel_mix?: { wholesale?: number; marketplace?: number } }

/**
 * Derive the legacy DerivedSetupData snapshot from the canonical CIS keys
 * (Block 2 post-Sprint B.1-B.4). Returns null if no CIS data found, so
 * the caller can fall back to legacy workspace_data.
 */
function computeDerivedFromCis(
  rows: Array<{ subdomain: string; key: string; value: unknown }>,
  skuCategories: string[],
  season: string | null | undefined,
): DerivedSetupData | null {
  const get = (subdomain: string, key: string): unknown =>
    rows.find(r => r.subdomain === subdomain && r.key === key)?.value;

  const families = (get('families', 'list') as CisFamily[] | undefined) || [];
  const tiers = get('pricing', 'tiers') as CisPricingTiers | undefined;
  const pnl = get('budget', 'pnl') as CisBudgetPnl | undefined;
  const monthly = (get('budget', 'monthly_revenue') as CisMonthlyRevenue[] | undefined) || [];
  const channelsPlan = get('channels', 'plan_full') as CisChannelsPlan | undefined;

  // Strategy values (preferred sources for top-line numbers)
  const targetSku = get('strategy', 'target_sku_count') as number | undefined;
  const salesTargetY1 = get('strategy', 'sales_target_y1') as number | undefined;
  const targetMarginPct = get('strategy', 'target_margin_pct') as number | undefined;
  const dropsObj = get('strategy', 'drops') as { count?: number } | undefined;

  // No CIS Block 2 signal → caller should use legacy
  if (!families.length && !targetSku && !pnl) return null;

  // Volume: prefer families.count sum (the user-edited final state) over
  // strategy.target_sku_count which was set at 02.1 confirm and may be stale
  // if 02.2 reshuffled the family counts.
  const totalSkusFromFamilies = families.reduce((s, f) => s + (f.count || 0), 0);
  const expectedSkus = totalSkusFromFamilies > 0 ? totalSkusFromFamilies : targetSku;

  // Family shares
  const productFamilies: DerivedProductFamily[] = families.map(f => ({
    name: f.name,
    percentage: totalSkusFromFamilies > 0
      ? Math.round(((f.count || 0) / totalSkusFromFamilies) * 100)
      : 0,
  }));
  const familyNames = families.map(f => f.name);

  // Per-family pricing — the canonical pattern uses GLOBAL tiers
  // (entry/core/hero anchored to direct competitors). Project the same
  // tier midpoint across every family for now; downstream consumers can
  // refine via per-subcategory overrides when 02.2 ships per-sub pricing.
  const coreMin = tiers?.core?.min ?? 0;
  const coreMax = tiers?.core?.max ?? 0;
  const priceSegments: DerivedPriceSegment[] = families.map(f => ({
    name: f.name,
    minPrice: coreMin,
    maxPrice: coreMax,
    percentage: totalSkusFromFamilies > 0
      ? Math.round(((f.count || 0) / totalSkusFromFamilies) * 100)
      : 0,
  }));
  const minPrice = tiers?.entry?.min || tiers?.core?.min;
  const maxPrice = tiers?.hero?.max || tiers?.core?.max;

  // Avg price: prefer the budget calculator's blended price (it accounts for
  // wholesale/marketplace discounts), fall back to core tier midpoint.
  const avgPriceTarget = pnl?.blended_avg_price ||
    (coreMin && coreMax ? Math.round((coreMin + coreMax) / 2) : undefined);

  // Discounts: use the wholesale discount as the headline number for the
  // Collection Builder dashboard (most negotiable lever for the user).
  const plannedDiscounts = channelsPlan?.pricing_per_channel?.wholesale_discount_pct;

  // Monthly distribution: prefer budget's computed cumulative_pct curve
  // (drives marketing/sell-through against actual drop calendar).
  let monthlyDistribution: number[] | undefined;
  if (monthly.length === 12) {
    const totalRev = monthly.reduce((s, m) => s + (m.revenue || 0), 0) || 1;
    monthlyDistribution = monthly.map(m => Math.round(((m.revenue || 0) / totalRev) * 100));
  } else {
    const seasonU = (season || '').toUpperCase();
    const isSS = seasonU.startsWith('SS') || seasonU.includes('SPRING') || seasonU.includes('SUMMER');
    monthlyDistribution = isSS
      ? [4, 8, 12, 14, 14, 12, 10, 8, 6, 5, 4, 3]
      : [3, 4, 5, 6, 8, 10, 12, 14, 14, 12, 8, 4];
  }

  return {
    totalSalesTarget: salesTargetY1 || pnl?.revenue,
    avgPriceTarget,
    targetMargin: targetMarginPct ?? pnl?.gross_margin_pct,
    plannedDiscounts,
    expectedSkus,
    dropsCount: dropsObj?.count,
    productCategory: familyNames[0] || skuCategories[0],
    families: familyNames.length > 0 ? familyNames : undefined,
    productFamilies: productFamilies.length > 0 ? productFamilies : undefined,
    priceSegments: priceSegments.length > 0 ? priceSegments : undefined,
    productTypeSegments: undefined, // Not in canonical Block 2 — legacy only
    minPrice,
    maxPrice,
    monthlyDistribution,
  };
}
