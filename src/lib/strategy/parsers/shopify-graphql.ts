/**
 * Shopify GraphQL Admin API adapter · 2026-05-19 (Felipe sprint Shopify lane).
 *
 * Fetches Products + Variants + InventoryLevels + Orders + Returns desde una
 * tienda Shopify y los normaliza al shape canónico `ParsedRecord` que el
 * resto del motor In-Season ya entiende. Plug-and-play con el dispatcher
 * en `/api/in-season/sources/[sourceId]/parse`.
 *
 * Auth: Admin API Access Token (private app token que el cliente genera él
 * mismo desde Shopify admin → Apps → Develop apps → Configure Admin API
 * scopes → Install app → reveal token). Para piloto/demo evitamos el flujo
 * full OAuth + Shopify Partner Program (que añade ~3 semanas de submission).
 *
 * Scopes requeridos: read_products, read_inventory, read_locations,
 *   read_orders, read_returns, read_fulfillments, read_publications,
 *   read_inventory_item_unit_costs (para COGS).
 *
 * IMPORTANTE: por defecto Shopify limita orders a los últimos 60 días.
 * `read_all_orders` requiere app review. Para piloto: el cliente sólo
 * podrá analizar últimas 8 semanas de velocidad — suficiente para mostrar
 * los verbos D2/D6/D7/D10. Lineage detection (carryover, continuidad)
 * degrada hasta que tengamos el scope.
 *
 * Rate limits: 50 points/sec Basic, 500 points/sec Plus. Cada query Product
 * cuesta ~5 puntos. Para 5000 SKUs hace falta paginar 50 productos por
 * página (mejor ratio cost/throughput).
 */

import type { ParserResult, ParsedRecord, ParsedSalesWindow } from './types';
import { aggregateBySkuModelColor } from './shopify-csv';

const PARSER_VERSION = '1.1.0';
const SHOPIFY_API_VERSION = '2026-04';

const PRODUCTS_QUERY = /* GraphQL */ `
  query ProductsPage($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          handle
          title
          vendor
          productType
          tags
          publishedAt
          status
          totalInventory
          media(first: 1) {
            edges { node { ... on MediaImage { image { url } } } }
          }
          variants(first: 30) {
            edges {
              node {
                id
                sku
                barcode
                title
                price
                compareAtPrice
                inventoryQuantity
                image { url }
                selectedOptions { name value }
                inventoryItem {
                  id
                  unitCost { amount }
                  inventoryLevels(first: 10) {
                    edges {
                      node {
                        location { id name isActive fulfillsOnlineOrders }
                        quantities(names: ["available", "on_hand", "committed", "incoming", "reserved"]) {
                          name
                          quantity
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const ORDERS_QUERY = /* GraphQL */ `
  query OrdersPage($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          processedAt
          cancelledAt
          displayFinancialStatus
          displayFulfillmentStatus
          lineItems(first: 30) {
            edges {
              node {
                sku
                quantity
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
          returns(first: 5) {
            edges {
              node {
                totalQuantity
                returnLineItems(first: 10) {
                  edges {
                    node {
                      ... on ReturnLineItem {
                        returnReason
                        quantity
                        fulfillmentLineItem { lineItem { sku } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface ShopifyGraphqlOptions {
  shop_domain: string;       // "store.myshopify.com" o subdominio
  access_token: string;      // Admin API access token (private app)
  observation_date: string;  // YYYY-MM-DD anchor
  season_tag: string;
  max_products?: number;     // safety cap (default 5000)
}

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  publishedAt: string | null;
  status: string;
  totalInventory: number | null;
  media: { edges: Array<{ node: { image?: { url: string } } }> };
  variants: { edges: Array<{ node: VariantNode }> };
};

type VariantNode = {
  id: string;
  sku: string | null;
  barcode: string | null;
  title: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number | null;
  image: { url: string } | null;
  selectedOptions: Array<{ name: string; value: string }>;
  inventoryItem: {
    id: string;
    unitCost: { amount: string } | null;
    inventoryLevels: {
      edges: Array<{
        node: {
          location: { id: string; name: string; isActive: boolean; fulfillsOnlineOrders: boolean };
          quantities: Array<{ name: string; quantity: number }>;
        };
      }>;
    };
  };
};

type OrderNode = {
  id: string;
  processedAt: string;
  cancelledAt: string | null;
  lineItems: {
    edges: Array<{
      node: {
        sku: string | null;
        quantity: number;
        originalUnitPriceSet: { shopMoney: { amount: string } };
      };
    }>;
  };
  returns: {
    edges: Array<{
      node: {
        totalQuantity: number;
        returnLineItems: {
          edges: Array<{
            node: {
              returnReason: string | null;
              quantity: number;
              fulfillmentLineItem: { lineItem: { sku: string | null } } | null;
            };
          }>;
        };
      };
    }>;
  };
};

async function shopifyFetch<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Shopify GraphQL ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) {
    throw new Error('Shopify GraphQL: empty data');
  }
  return json.data;
}

type ProductsPageResponse = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{ node: ProductNode }>;
  };
};

/** Pagina todos los productos. Concurrencia secuencial para respetar
 *  rate limits Basic (50pt/s). */
async function fetchAllProducts(
  shopDomain: string,
  accessToken: string,
  maxProducts: number
): Promise<ProductNode[]> {
  const all: ProductNode[] = [];
  let cursor: string | null = null;
  // Page size 20 keeps single-query cost below Shopify's 1000-pt hard limit.
  // Cost: 20 products × (30 variants × (1 + 10 inventoryLevels)) ≈ 660 pts.
  const pageSize = 20;
  while (all.length < maxProducts) {
    const data: ProductsPageResponse = await shopifyFetch<ProductsPageResponse>(
      shopDomain,
      accessToken,
      PRODUCTS_QUERY,
      {
        first: Math.min(pageSize, maxProducts - all.length),
        after: cursor,
      }
    );
    all.push(...data.products.edges.map((e: { node: ProductNode }) => e.node));
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }
  return all;
}

/** Pagina órdenes en los últimos N días. Por defecto 60d (límite Shopify
 *  sin `read_all_orders`). El query KQL `processed_at:>=YYYY-MM-DD` es lo
 *  más rápido para filtrar — agrupado client-side por SKU + fecha. */
type OrdersPageResponse = {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{ node: OrderNode }>;
  };
};

async function fetchOrdersLastDays(
  shopDomain: string,
  accessToken: string,
  fromDate: string
): Promise<OrderNode[]> {
  const all: OrderNode[] = [];
  let cursor: string | null = null;
  // Orders query cost: 50 × (1 + 30 lineItems + 5 returns × 10 returnLineItems) ≈ 4050.
  // Drop to 25 per page to stay below 1000-pt cap with returns expansion.
  const pageSize = 25;
  while (true) {
    const data: OrdersPageResponse = await shopifyFetch<OrdersPageResponse>(
      shopDomain,
      accessToken,
      ORDERS_QUERY,
      {
        first: pageSize,
        after: cursor,
        query: `processed_at:>=${fromDate}`,
      }
    );
    all.push(...data.orders.edges.map((e: { node: OrderNode }) => e.node));
    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }
  return all;
}

function inferColorFromOptions(opts: Array<{ name: string; value: string }>): string | null {
  const colorOpt = opts.find((o) => /color|colour|colore/i.test(o.name));
  return colorOpt?.value?.toLowerCase()?.trim() || null;
}

function inferSizeFromOptions(opts: Array<{ name: string; value: string }>): string | null {
  const sizeOpt = opts.find((o) => /size|talla|tamaño|gr[oö][sß]e/i.test(o.name));
  return sizeOpt?.value?.trim() || null;
}

function sumLevels(variant: VariantNode, predicate: (name: string) => boolean): number {
  let total = 0;
  for (const lvl of variant.inventoryItem.inventoryLevels.edges) {
    for (const q of lvl.node.quantities) {
      if (predicate(q.name)) total += q.quantity || 0;
    }
  }
  return total;
}

function countLocations(variant: VariantNode, predicate: (n: { available: number }) => boolean): number {
  let count = 0;
  for (const lvl of variant.inventoryItem.inventoryLevels.edges) {
    const available = lvl.node.quantities.find((q) => q.name === 'available')?.quantity || 0;
    if (predicate({ available })) count += 1;
  }
  return count;
}

export async function parseShopifyGraphql(opts: ShopifyGraphqlOptions): Promise<ParserResult> {
  const anchor = new Date(opts.observation_date);
  const d1Cutoff = addDays(anchor, -1);
  const d2Cutoff = addDays(anchor, -2);
  const d7Cutoff = addDays(anchor, -7);
  const d14Cutoff = addDays(anchor, -14);
  // Orders: fetch últimos 14 días + cushion para velocity_8_14d
  const ordersFromDate = addDays(anchor, -21).toISOString().slice(0, 10);

  const [products, orders] = await Promise.all([
    fetchAllProducts(opts.shop_domain, opts.access_token, opts.max_products ?? 5000),
    fetchOrdersLastDays(opts.shop_domain, opts.access_token, ordersFromDate),
  ]);

  // Build velocity windows + returns per SKU from orders.
  const salesBySku = new Map<
    string,
    {
      windows: Record<'d1' | 'd2' | '7d' | '8_14d', { units: number; importe: number }>;
      lifetime_units: number;
      lifetime_net_sales: number;
      lifetime_returns: number;
    }
  >();
  for (const order of orders) {
    const dt = new Date(order.processedAt);
    if (Number.isNaN(dt.getTime()) || order.cancelledAt) continue;
    for (const li of order.lineItems.edges) {
      const sku = li.node.sku?.trim();
      if (!sku) continue;
      const units = li.node.quantity || 0;
      const price = parseFloat(li.node.originalUnitPriceSet.shopMoney.amount || '0');
      const importe = units * price;
      let bucket = salesBySku.get(sku);
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
          lifetime_returns: 0,
        };
        salesBySku.set(sku, bucket);
      }
      bucket.lifetime_units += units;
      bucket.lifetime_net_sales += importe;
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
    // Returns: agregadas por SKU
    for (const ret of order.returns.edges) {
      for (const rli of ret.node.returnLineItems.edges) {
        const sku = rli.node.fulfillmentLineItem?.lineItem?.sku?.trim();
        if (!sku) continue;
        let bucket = salesBySku.get(sku);
        if (!bucket) continue;
        bucket.lifetime_returns += rli.node.quantity || 0;
      }
    }
  }

  // Build ParsedRecord array. One record per VARIANT (= SKU).
  const records: ParsedRecord[] = [];
  let rowIndex = 0;

  for (const product of products) {
    const productMasterImage = product.media.edges[0]?.node?.image?.url || null;

    for (const vEdge of product.variants.edges) {
      const v = vEdge.node;
      const sku = v.sku?.trim();
      if (!sku) continue;
      rowIndex += 1;

      const bucket = salesBySku.get(sku);
      const lifetimeUnits = bucket?.lifetime_units ?? 0;
      const lifetimeReturns = bucket?.lifetime_returns ?? 0;
      const returnsPct = lifetimeUnits > 0 ? lifetimeReturns / lifetimeUnits : null;

      const windows: ParsedSalesWindow[] = (['d1', 'd2', '7d', '8_14d'] as const).map((w) => ({
        window: w,
        units: bucket?.windows[w]?.units ?? 0,
        importe: bucket?.windows[w]?.importe || null,
        gross_commission: null,
        share_net_sales: null,
      }));

      const pvp = parseFloat(v.price);
      const pvpCompare = v.compareAtPrice ? parseFloat(v.compareAtPrice) : null;
      const cost = v.inventoryItem.unitCost ? parseFloat(v.inventoryItem.unitCost.amount) : null;
      const margin =
        pvp && pvp > 0 && cost != null ? Math.round(((pvp - cost) / pvp) * 1000) / 1000 : null;
      const markup =
        cost && cost > 0 && pvp != null ? Math.round(((pvp - cost) / cost) * 1000) / 1000 : null;

      const stockAvailable = sumLevels(v, (n) => n === 'available');
      const stockOnHand = sumLevels(v, (n) => n === 'on_hand');
      const stockIncoming = sumLevels(v, (n) => n === 'incoming');
      const stockCommitted = sumLevels(v, (n) => n === 'committed');

      const storesTotal = v.inventoryItem.inventoryLevels.edges.filter(
        (l) => l.node.location.isActive
      ).length;
      const storesWithStock = countLocations(v, (n) => n.available > 0);
      const storesActive = v.inventoryItem.inventoryLevels.edges.filter(
        (l) => l.node.location.fulfillsOnlineOrders && l.node.location.isActive
      ).length;

      // days_in_store desde publishedAt
      let daysInStore: number | null = null;
      if (product.publishedAt) {
        const pub = new Date(product.publishedAt);
        if (!Number.isNaN(pub.getTime())) {
          daysInStore = Math.max(0, Math.floor((anchor.getTime() - pub.getTime()) / 86400000));
        }
      }

      records.push({
        row_index: rowIndex,
        page_coord: null,
        model_ref: sku,
        color_ref: inferColorFromOptions(v.selectedOptions),
        variant_ref: inferSizeFromOptions(v.selectedOptions),
        product_name: product.title,
        family_code: product.productType || null,
        subfamily_code: null,
        section_code: null,
        season_tag: opts.season_tag,
        activation_date: product.publishedAt?.slice(0, 10) || null,
        cluster_size: null,
        description_raw: [product.title, v.title].filter(Boolean).join(' · '),
        pvp: Number.isFinite(pvp) ? pvp : null,
        pvp_compare: pvpCompare,
        markup_pct: markup,
        on_promo: pvpCompare != null && pvp != null && pvpCompare > pvp,
        cost_estimate: cost,
        margin_pct_list: margin,
        stock_store: stockOnHand > 0 ? stockOnHand : stockAvailable,
        stock_warehouse: null,
        stock_available: stockAvailable,
        stock_in_transit: stockIncoming,
        stock_pending: stockCommitted,
        stock_pending_date: null,
        stock_adjusted: null,
        stock_blocked: null,
        stock_fabric: null,
        days_in_store: daysInStore,
        stores_with_stock: storesWithStock,
        stores_active: storesActive,
        stores_total: storesTotal,
        pipeline_total: stockAvailable + stockIncoming + stockCommitted,
        cd2_available: null,
        blocked_per_store: null,
        windows,
        total_bought: null,                  // requiere PO app (Prediko/Cogsy)
        total_sold: lifetimeUnits || null,
        total_shipped: null,                 // derivable de Fulfillments (no implementado v1)
        sell_through_shipped_pct: null,
        sell_through_bought_pct: null,
        returns_pct: returnsPct,
        product_image_url: v.image?.url || productMasterImage,
        raw: {
          shopify_product_id: product.id,
          shopify_variant_id: v.id,
          handle: product.handle,
          tags: product.tags,
          vendor: product.vendor,
          status: product.status,
          inventory_locations: v.inventoryItem.inventoryLevels.edges.map((l) => ({
            location_id: l.node.location.id,
            location_name: l.node.location.name,
            quantities: l.node.quantities,
          })),
          lifetime_units: lifetimeUnits,
          lifetime_net_sales: bucket?.lifetime_net_sales ?? 0,
          lifetime_returns: lifetimeReturns,
        },
        original_labels: product.productType
          ? { product_type: product.productType }
          : undefined,
        extraction_confidence: 0.95, // GraphQL es authoritative — más confianza que CSV
        parser_warnings: [],
      });
    }
  }

  // CARDINAL RULE: aimily-SKU = model + color (Felipe's rule, applied to ALL
  // Shopify lanes). The CSV parser already collapses size variants via
  // aggregateBySkuModelColor; we apply the SAME transformation here so the
  // GraphQL ingest produces the same ranking granularity as the CSV path.
  // Without this, "Alaro Lace Up" shows 6 rows (one per size) — useless
  // for merch decisions.
  const aggregatedRecords = aggregateBySkuModelColor(records);
  // Re-assign row_index post-aggregation
  aggregatedRecords.forEach((r, i) => { r.row_index = i + 1; });

  const coverage = {
    identity: aggregatedRecords.length > 0,
    pricing: aggregatedRecords.some((r) => r.pvp != null || r.cost_estimate != null),
    inventory: aggregatedRecords.some((r) => r.stock_available != null),
    velocity_d1: aggregatedRecords.some((r) => (r.windows.find((w) => w.window === 'd1')?.units || 0) > 0),
    velocity_7d: aggregatedRecords.some((r) => (r.windows.find((w) => w.window === '7d')?.units || 0) > 0),
    velocity_8_14d: aggregatedRecords.some(
      (r) => (r.windows.find((w) => w.window === '8_14d')?.units || 0) > 0
    ),
    efficiency: false,             // requiere PO app
    returns: aggregatedRecords.some((r) => r.returns_pct != null),
    distribution: aggregatedRecords.some((r) => (r.stores_total ?? 0) > 1),
    geographic: false,
    channel: false,
    // size_curve = true if any aggregated SKU has size_breakdown with >1 entries
    size_curve: aggregatedRecords.some(
      (r) => Array.isArray((r.raw as { size_breakdown?: unknown[] })?.size_breakdown) &&
             ((r.raw as { size_breakdown: unknown[] }).size_breakdown.length > 1)
    ),
    weather: false,
    marketing_exposure: false,
    page_traffic: false,
    return_reasons: false,         // capturado en raw, no exposed top-level
    markdown_date: false,
    stockout_days: false,
    supplier_lead_time: false,     // requiere PO app
    margin_after_returns: false,
  };

  const warnings: string[] = [];
  if (orders.length === 0) {
    warnings.push('No orders in last 21 days — velocity windows empty. Verify shop has recent activity or request read_all_orders scope.');
  }
  const skusWithCost = aggregatedRecords.filter((r) => r.cost_estimate != null).length;
  if (skusWithCost === 0) {
    warnings.push('No COGS data — InventoryItem.unitCost is null across all variants. Either the shop has not entered cost-per-item, or read_inventory_item_unit_costs scope is missing. Margin verbs degrade.');
  }
  if (aggregatedRecords.some((r) => (r.stores_total ?? 0) <= 1)) {
    warnings.push('Single-location DTC topology — distribution verbs (AMPLIFY_DISTRIBUTION) degrade. Multi-store metrics will be synthesized.');
  }
  if (aggregatedRecords.length < records.length) {
    warnings.push(
      `Aggregated ${records.length} Shopify variants → ${aggregatedRecords.length} aimily-SKUs (model+color). Size variants collapsed per Felipe's cardinal rule.`
    );
  }

  return {
    parser_version: PARSER_VERSION,
    records: aggregatedRecords,
    coverage_dimensions: coverage,
    parser_warnings: warnings,
    parse_confidence: aggregatedRecords.length > 0 ? 0.92 : 0,
  };
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
