/**
 * Stripe Connect adapter · 2026-05-19 (Felipe sprint cierre).
 *
 * Sister to shopify-graphql.ts: fetches charges + customers + products from
 * a Stripe-connected brand (aimily.shop storefronts that wired Stripe Buy
 * Button instead of Shopify Buy SDK, or DTC brands paying entirely on
 * Stripe). Normalizes to the canonical `ParsedRecord` shape so the rest
 * of the In-Season engine (classifiers + orchestrator + verdict resolver)
 * operates identically.
 *
 * MVP scope:
 *   - Pulls Products + Prices (Stripe data model)
 *   - Pulls Charges in the last 21d (matches the velocity window)
 *   - Maps charges → sales windows (d1, d2, 7d, 8_14d)
 *   - Refunds aggregated per charge → returns_pct per product
 *
 * Auth: Stripe restricted API key with scopes:
 *   r/products · r/prices · r/charges · r/customers · r/refunds
 *
 * Future iterations:
 *   - Stripe Connect (multi-account brokering) for aimily as platform
 *   - Inventory via Stripe's optional inventory_quantity metadata
 *   - Subscriptions (mapped to lifecycle 'subscription_active' archetype)
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §4.
 */

import type { ParserResult, ParsedRecord, ParsedSalesWindow } from './types';

const PARSER_VERSION = '0.1.0';
const STRIPE_API = 'https://api.stripe.com/v1';

export interface StripeAdapterOptions {
  /** Stripe API key (sk_live_… or sk_test_… ; restricted key preferred). */
  api_key: string;
  /** YYYY-MM-DD anchor for the velocity windows. Defaults to today. */
  observation_date: string;
  season_tag: string;
  /** Safety cap on products + charges fetched. */
  max_products?: number;
  max_charges?: number;
}

interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, string>;
  default_price?: string;
  active: boolean;
  created: number;
  images?: string[];
}

interface StripePrice {
  id: string;
  product: string;
  unit_amount?: number;
  currency: string;
  active: boolean;
  metadata: Record<string, string>;
}

interface StripeCharge {
  id: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  created: number;
  customer?: string | null;
  status: string;
  /** When the merchant attaches the product id as metadata on the charge. */
  metadata: Record<string, string>;
  /** Top-level invoice may pull a line item with price ID. */
  invoice?: string | null;
}

async function stripeFetch<T>(apiKey: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${STRIPE_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Stripe ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as T;
}

interface StripeList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url?: string;
}

async function fetchAllProducts(apiKey: string, maxProducts: number): Promise<StripeProduct[]> {
  const all: StripeProduct[] = [];
  let starting_after: string | undefined;
  while (all.length < maxProducts) {
    const params: Record<string, string> = { limit: '100', active: 'true' };
    if (starting_after) params.starting_after = starting_after;
    const page = await stripeFetch<StripeList<StripeProduct>>(apiKey, '/products', params);
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return all.slice(0, maxProducts);
}

async function fetchPrices(apiKey: string, productIds: string[]): Promise<Map<string, StripePrice>> {
  const out = new Map<string, StripePrice>();
  // Fetch all active prices, then filter to our products. Stripe doesn't
  // support multi-id filtering in one call so we paginate the whole price list.
  let starting_after: string | undefined;
  let pages = 0;
  while (pages < 50) {
    const params: Record<string, string> = { limit: '100', active: 'true' };
    if (starting_after) params.starting_after = starting_after;
    const page = await stripeFetch<StripeList<StripePrice>>(apiKey, '/prices', params);
    for (const p of page.data) {
      if (productIds.includes(p.product)) out.set(p.id, p);
    }
    if (!page.has_more || page.data.length === 0) break;
    starting_after = page.data[page.data.length - 1].id;
    pages++;
  }
  return out;
}

async function fetchChargesSince(
  apiKey: string,
  fromUnix: number,
  maxCharges: number
): Promise<StripeCharge[]> {
  const all: StripeCharge[] = [];
  let starting_after: string | undefined;
  while (all.length < maxCharges) {
    const params: Record<string, string> = {
      limit: '100',
      'created[gte]': String(fromUnix),
    };
    if (starting_after) params.starting_after = starting_after;
    const page = await stripeFetch<StripeList<StripeCharge>>(apiKey, '/charges', params);
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return all.slice(0, maxCharges);
}

/** Parse Stripe data into ParsedRecord[]. */
export async function parseStripeApi(opts: StripeAdapterOptions): Promise<ParserResult> {
  const anchor = new Date(opts.observation_date);
  const d1Cutoff = new Date(anchor.getTime() - 1 * 86400000);
  const d2Cutoff = new Date(anchor.getTime() - 2 * 86400000);
  const d7Cutoff = new Date(anchor.getTime() - 7 * 86400000);
  const d14Cutoff = new Date(anchor.getTime() - 14 * 86400000);
  const fromUnix = Math.floor((anchor.getTime() - 21 * 86400000) / 1000);

  const maxProducts = opts.max_products ?? 1000;
  const maxCharges = opts.max_charges ?? 5000;

  const products = await fetchAllProducts(opts.api_key, maxProducts);
  const priceMap = await fetchPrices(
    opts.api_key,
    products.map((p) => p.id)
  );
  const charges = await fetchChargesSince(opts.api_key, fromUnix, maxCharges);

  // Build aggregate: each charge contributes to ONE product (via metadata.product_id
  // OR via the price→product lookup if invoice line items can be matched).
  const salesByProduct = new Map<
    string,
    {
      windows: Record<'d1' | 'd2' | '7d' | '8_14d', { units: number; importe: number }>;
      lifetime_units: number;
      lifetime_net_sales: number;
      lifetime_refunded: number;
    }
  >();

  for (const charge of charges) {
    const productId = (charge.metadata?.product_id ?? '').trim();
    if (!productId || !priceMap.has(charge.metadata?.price_id ?? '')) {
      // Without product attribution we cannot count this charge. Skip.
      // Production hardening: fetch invoice.lines for the product id.
      continue;
    }
    if (charge.status !== 'succeeded') continue;
    const importe = charge.amount / 100; // Stripe amounts are in minor units
    const units = parseInt(charge.metadata?.quantity ?? '1', 10);
    const dt = new Date(charge.created * 1000);
    let bucket = salesByProduct.get(productId);
    if (!bucket) {
      bucket = {
        windows: {
          d1: { units: 0, importe: 0 },
          d2: { units: 0, importe: 0 },
          '7d': { units: 0, importe: 0 },
          '8_14d': { units: 0, importe: 0 },
        },
        lifetime_units: 0,
        lifetime_net_sales: 0,
        lifetime_refunded: 0,
      };
      salesByProduct.set(productId, bucket);
    }
    bucket.lifetime_units += units;
    bucket.lifetime_net_sales += importe;
    bucket.lifetime_refunded += charge.amount_refunded / 100;
    if (dt >= d1Cutoff && dt <= anchor) {
      bucket.windows.d1.units += units;
      bucket.windows.d1.importe += importe;
    } else if (dt >= d2Cutoff && dt < d1Cutoff) {
      bucket.windows.d2.units += units;
      bucket.windows.d2.importe += importe;
    }
    if (dt >= d7Cutoff && dt <= anchor) {
      bucket.windows['7d'].units += units;
      bucket.windows['7d'].importe += importe;
    } else if (dt >= d14Cutoff && dt < d7Cutoff) {
      bucket.windows['8_14d'].units += units;
      bucket.windows['8_14d'].importe += importe;
    }
  }

  // Build ParsedRecord[] · one per Stripe product (Stripe doesn't have the
  // variant concept Shopify has, so aimily-SKU = product directly).
  const records: ParsedRecord[] = [];
  let rowIndex = 0;
  for (const p of products) {
    rowIndex += 1;
    const bucket = salesByProduct.get(p.id);
    const defaultPriceObj = p.default_price ? priceMap.get(p.default_price) : null;
    const pvp = defaultPriceObj?.unit_amount ? defaultPriceObj.unit_amount / 100 : null;
    const lifetimeUnits = bucket?.lifetime_units ?? 0;
    const lifetimeNetSales = bucket?.lifetime_net_sales ?? 0;
    const returnsPct =
      lifetimeUnits > 0
        ? Math.min(1, (bucket?.lifetime_refunded ?? 0) / Math.max(1, lifetimeNetSales))
        : null;

    const windows: ParsedSalesWindow[] = (['d1', 'd2', '7d', '8_14d'] as const).map((w) => ({
      window: w,
      units: bucket?.windows[w]?.units ?? 0,
      importe: bucket?.windows[w]?.importe || null,
      gross_commission: null,
      share_net_sales: null,
    }));

    records.push({
      row_index: rowIndex,
      page_coord: null,
      model_ref: p.id, // Stripe product id as SKU
      color_ref: p.metadata?.color ?? null,
      variant_ref: null,
      product_name: p.name,
      family_code: p.metadata?.family ?? p.metadata?.category ?? null,
      subfamily_code: null,
      section_code: null,
      season_tag: opts.season_tag,
      activation_date: p.created ? new Date(p.created * 1000).toISOString().slice(0, 10) : null,
      cluster_size: null,
      description_raw: p.description ?? p.name,
      pvp,
      pvp_compare: null,
      markup_pct: null,
      on_promo: false,
      cost_estimate: null,
      margin_pct_list: null,
      stock_store: null,
      stock_warehouse: null,
      stock_available: parseInt(p.metadata?.inventory_quantity ?? '0', 10) || null,
      stock_in_transit: null,
      stock_pending: null,
      stock_pending_date: null,
      stock_adjusted: null,
      stock_blocked: null,
      stock_fabric: null,
      days_in_store: p.created
        ? Math.floor((anchor.getTime() - p.created * 1000) / 86400000)
        : null,
      stores_with_stock: null,
      stores_active: null,
      stores_total: 1, // Stripe is per-brand, single 'storefront' at brand level
      pipeline_total: null,
      cd2_available: null,
      blocked_per_store: null,
      windows,
      total_bought: null,
      total_sold: lifetimeUnits || null,
      total_shipped: null,
      sell_through_shipped_pct: null,
      sell_through_bought_pct: null,
      returns_pct: returnsPct,
      product_image_url: p.images?.[0] ?? null,
      raw: {
        stripe_product_id: p.id,
        metadata: p.metadata,
        lifetime_units: lifetimeUnits,
        lifetime_net_sales: lifetimeNetSales,
        lifetime_refunded: bucket?.lifetime_refunded ?? 0,
      },
      original_labels: undefined,
      extraction_confidence: 0.85, // Lower than Shopify because Stripe is opt-in metadata
      parser_warnings: [],
    });
  }

  const warnings: string[] = [];
  if (charges.length === 0) {
    warnings.push(
      'No successful charges in last 21 days — velocity empty. Verify the connected Stripe account has activity.'
    );
  }
  // Tracking: how many charges had product attribution. Below 50% triggers
  // a warning so the merchant knows to add metadata.product_id to checkouts.
  let attributedCharges = 0;
  for (const c of charges) {
    if (c.metadata?.product_id) attributedCharges += 1;
  }
  if (charges.length > 0 && attributedCharges / charges.length < 0.5) {
    warnings.push(
      `Only ${attributedCharges}/${charges.length} charges have metadata.product_id — velocity attribution degrades. Add product_id metadata at checkout to fix.`
    );
  }

  return {
    parser_version: PARSER_VERSION,
    records,
    coverage_dimensions: {
      identity: records.length > 0,
      pricing: records.some((r) => r.pvp != null),
      inventory: records.some((r) => r.stock_available != null),
      velocity_d1: records.some((r) => (r.windows.find((w) => w.window === 'd1')?.units || 0) > 0),
      velocity_7d: records.some((r) => (r.windows.find((w) => w.window === '7d')?.units || 0) > 0),
      velocity_8_14d: records.some(
        (r) => (r.windows.find((w) => w.window === '8_14d')?.units || 0) > 0
      ),
      efficiency: false,
      returns: records.some((r) => r.returns_pct != null),
      distribution: false, // Stripe is single-storefront
      geographic: false,
      channel: false,
      size_curve: false,
      weather: false,
      marketing_exposure: false,
      page_traffic: false,
      return_reasons: false,
      markdown_date: false,
      stockout_days: false,
      supplier_lead_time: false,
      margin_after_returns: false,
    },
    parser_warnings: warnings,
    parse_confidence: records.length > 0 ? 0.85 : 0,
  };
}
