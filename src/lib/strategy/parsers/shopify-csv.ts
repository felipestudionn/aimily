/**
 * Shopify CSV / XLSX bundle parser.
 *
 * Phase-2 ingest format. Smaller mature brands (€40-100K tier) export their
 * data from Shopify's Reports section. Typical bundle:
 *
 *   - Sales by product variant (the headline file)
 *   - Inventory Levels by variant
 *   - Returns by variant
 *
 * In v1 we accept a single XLSX with one or three sheets (Sales / Inventory
 * / Returns), or a single CSV (sales only — inventory + returns optional).
 *
 * Compared to the Zara internal feed, Shopify lacks:
 *   - Per-store granularity below shop level
 *   - Stock pipeline (pendiente, tránsito, ajustado)
 *   - % Devo cli directly (we derive from Returns sheet)
 *   - Pre-aggregated 4-window velocity (we derive d1 / d2 / 7d / 8_14d
 *     from time-bucketed sales)
 *
 * Coverage_dimensions flags reflect what we got.
 */

import * as XLSX from 'xlsx';
import type { ParserResult, ParsedRecord, ParsedSalesWindow } from './types';

const PARSER_VERSION = '1.0.0';

interface SalesRow {
  variant_sku?: string;
  product_title?: string;
  variant_title?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  net_units_sold?: number;
  units_returned?: number;
  net_sales?: number;
  gross_sales?: number;
  total_returns?: number;
  day?: string;
  week?: string;
  month?: string;
}

interface InventoryRow {
  variant_sku?: string;
  location?: string;
  available?: number;
  incoming?: number;
  committed?: number;
  on_hand?: number;
}

interface ReturnsRow {
  variant_sku?: string;
  reason?: string;
  units?: number;
  return_date?: string;
}

/** Felipe 2026-05-19 sprint Shopify lane · Products CSV (Shopify export
 *  "Products by variant SKU") trae 1 fila por variant con metadata + URL
 *  de la imagen (`Image Src`). Una imagen puede aplicar a varias variants
 *  (`Variant Image` lookup) — la asignamos por SKU. */
interface ProductRow {
  variant_sku?: string;
  product_title?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  image_src?: string;       // URL del producto master (cdn.shopify.com)
  variant_image?: string;   // URL específica de la variant (opcional, por color)
  image_position?: number;
  image_alt_text?: string;
  published?: string;
  status?: string;
  cost_per_item?: number;
  compare_at_price?: number;
  variant_price?: number;
}

export interface ShopifyParserOptions {
  observation_date: string; // YYYY-MM-DD anchor
  season_tag: string;
  default_currency?: string;
}

export function parseShopifyCsvOrXlsx(
  bytes: Uint8Array,
  opts: ShopifyParserOptions
): ParserResult {
  const workbook = XLSX.read(bytes, { type: 'array' });

  const salesSheet =
    findSheet(workbook, ['sales by variant', 'sales_by_variant', 'sales', 'product variant sales']) ||
    workbook.SheetNames[0];
  const inventorySheet = findSheet(workbook, ['inventory', 'inventory levels']);
  const returnsSheet = findSheet(workbook, ['returns', 'returns by variant']);
  // Felipe 2026-05-19 · Products sheet (con `Image Src`) — opcional, pero
  // si está, Aimily Design usa esas fotos directamente sin recortar el PDF.
  const productsSheet = findSheet(workbook, [
    'products', 'product list', 'products by variant', 'product variants',
  ]);

  const salesRows = sheetToObjects<SalesRow>(workbook, salesSheet);
  const inventoryRows = inventorySheet
    ? sheetToObjects<InventoryRow>(workbook, inventorySheet)
    : [];
  const returnsRows = returnsSheet
    ? sheetToObjects<ReturnsRow>(workbook, returnsSheet)
    : [];
  const productRows = productsSheet
    ? sheetToObjects<ProductRow>(workbook, productsSheet)
    : [];

  // Pre-aggregate by variant_sku across time buckets.
  const anchor = new Date(opts.observation_date);
  const d1Cutoff = addDays(anchor, -1);
  const d2Cutoff = addDays(anchor, -2);
  const d7Cutoff = addDays(anchor, -7);
  const d14Cutoff = addDays(anchor, -14);

  const byVariant = new Map<
    string,
    {
      product_title: string;
      variant_title?: string;
      vendor?: string;
      product_type?: string;
      tags?: string;
      windows: Record<'d1' | 'd2' | '7d' | '8_14d', { units: number; importe: number }>;
      lifetime_units: number;
      lifetime_net_sales: number;
      lifetime_returns: number;
    }
  >();

  for (const row of salesRows) {
    const sku = row.variant_sku?.trim();
    if (!sku) continue;
    let bucket = byVariant.get(sku);
    if (!bucket) {
      bucket = {
        product_title: row.product_title || sku,
        variant_title: row.variant_title,
        vendor: row.vendor,
        product_type: row.product_type,
        tags: row.tags,
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
      byVariant.set(sku, bucket);
    }

    const units = toNumber(row.net_units_sold);
    const importe = toNumber(row.net_sales);
    bucket.lifetime_units += units;
    bucket.lifetime_net_sales += importe;
    // Returns: prefer units_returned (clean integer units). `total_returns`
    // is often a euros amount in Shopify exports — do NOT add it as units.
    // Codex P1 fix.
    bucket.lifetime_returns += toNumber(row.units_returned);

    const dt = parseDate(row.day || row.week || row.month);
    if (dt) {
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
  }

  // Inventory aggregation per SKU.
  const inventoryBySku = new Map<
    string,
    { stock_store: number; stock_in_transit: number; stock_pending: number }
  >();
  for (const row of inventoryRows) {
    const sku = row.variant_sku?.trim();
    if (!sku) continue;
    let inv = inventoryBySku.get(sku);
    if (!inv) {
      inv = { stock_store: 0, stock_in_transit: 0, stock_pending: 0 };
      inventoryBySku.set(sku, inv);
    }
    inv.stock_store += toNumber(row.available) + toNumber(row.on_hand);
    inv.stock_in_transit += toNumber(row.incoming);
    inv.stock_pending += toNumber(row.committed);
  }

  // Returns aggregation per SKU.
  const returnsBySku = new Map<string, number>();
  for (const row of returnsRows) {
    const sku = row.variant_sku?.trim();
    if (!sku) continue;
    returnsBySku.set(sku, (returnsBySku.get(sku) || 0) + toNumber(row.units));
  }

  // Products index per SKU. Prefers `variant_image` (specific per color)
  // over `image_src` (product master). Also captures cost + compare price
  // which the Sales sheet doesn't carry.
  const productsBySku = new Map<
    string,
    {
      image_url: string | null;
      cost_per_item: number | null;
      compare_at_price: number | null;
      variant_price: number | null;
      product_type: string | null;
      vendor: string | null;
      published: string | null;
    }
  >();
  for (const row of productRows) {
    const sku = row.variant_sku?.trim();
    if (!sku) continue;
    // first-wins (Products CSV often has multiple image rows per SKU; the
    // first row is the master image at position 1)
    if (productsBySku.has(sku)) continue;
    productsBySku.set(sku, {
      image_url: (row.variant_image || row.image_src || null)?.toString().trim() || null,
      cost_per_item: row.cost_per_item != null ? toNumber(row.cost_per_item) : null,
      compare_at_price: row.compare_at_price != null ? toNumber(row.compare_at_price) : null,
      variant_price: row.variant_price != null ? toNumber(row.variant_price) : null,
      product_type: row.product_type?.toString() || null,
      vendor: row.vendor?.toString() || null,
      published: row.published?.toString() || null,
    });
  }

  const records: ParsedRecord[] = [];
  let rowIndex = 0;
  for (const [sku, bucket] of Array.from(byVariant.entries())) {
    rowIndex += 1;

    const inv = inventoryBySku.get(sku);
    const product = productsBySku.get(sku);
    const returnsUnits = returnsBySku.get(sku) ?? bucket.lifetime_returns;
    const returnsPct =
      bucket.lifetime_units > 0 ? returnsUnits / Math.max(bucket.lifetime_units, 1) : null;

    // Pricing prefers Products CSV explicit values over Sales-derived avg.
    const pvp =
      product?.variant_price != null
        ? product.variant_price
        : bucket.lifetime_units > 0
          ? Math.round((bucket.lifetime_net_sales / bucket.lifetime_units) * 100) / 100
          : null;
    const pvpCompare = product?.compare_at_price ?? null;
    const onPromo = pvpCompare != null && pvp != null && pvpCompare > pvp;
    const costEstimate = product?.cost_per_item ?? null;
    const marginPctList =
      pvp != null && costEstimate != null && pvp > 0
        ? Math.round(((pvp - costEstimate) / pvp) * 1000) / 1000
        : null;
    const markupPct =
      pvp != null && costEstimate != null && costEstimate > 0
        ? Math.round(((pvp - costEstimate) / costEstimate) * 1000) / 1000
        : null;

    const windows: ParsedSalesWindow[] = (['d1', 'd2', '7d', '8_14d'] as const).map(
      (w) => ({
        window: w,
        units: bucket.windows[w].units,
        importe: bucket.windows[w].importe || null,
        gross_commission: null,
        share_net_sales: null,
      })
    );

    const colorRef = inferColorFromVariant(bucket.variant_title);
    const sizeRef = inferSizeFromVariant(bucket.variant_title);

    records.push({
      row_index: rowIndex,
      page_coord: null,
      model_ref: sku,
      color_ref: colorRef,
      variant_ref: sizeRef,
      product_name: bucket.product_title,
      family_code: product?.product_type || bucket.product_type || null,
      subfamily_code: null,
      section_code: null,
      season_tag: opts.season_tag,
      activation_date: product?.published || null,
      cluster_size: null,
      description_raw: [bucket.product_title, bucket.variant_title].filter(Boolean).join(' · '),
      pvp,
      pvp_compare: pvpCompare,
      markup_pct: markupPct,
      on_promo: onPromo,
      cost_estimate: costEstimate,
      margin_pct_list: marginPctList,
      stock_store: inv?.stock_store ?? null,
      stock_warehouse: null,
      stock_available: inv ? inv.stock_store : null,
      stock_in_transit: inv?.stock_in_transit ?? null,
      stock_pending: inv?.stock_pending ?? null,
      stock_pending_date: null,
      stock_adjusted: null,
      stock_blocked: null,
      stock_fabric: null,
      days_in_store: null,
      stores_with_stock: null,
      stores_active: null,
      stores_total: null,
      pipeline_total:
        inv != null ? inv.stock_store + inv.stock_in_transit + inv.stock_pending : null,
      cd2_available: null,
      blocked_per_store: null,
      windows,
      total_bought: null,
      total_sold: bucket.lifetime_units || null,
      total_shipped: null,
      sell_through_shipped_pct: null,
      sell_through_bought_pct: null,
      returns_pct: returnsPct,
      // Shopify product master image — alimenta directamente Aimily Design
      // (extend_colors + amplify_next_season). Sin necesidad de recortar PDF.
      product_image_url: product?.image_url ?? null,
      raw: {
        sku,
        product_title: bucket.product_title,
        variant_title: bucket.variant_title,
        vendor: bucket.vendor,
        tags: bucket.tags,
        lifetime_units: bucket.lifetime_units,
        lifetime_net_sales: bucket.lifetime_net_sales,
        inventory: inv ?? null,
        returns_units: returnsUnits,
      },
      original_labels:
        bucket.product_type || bucket.vendor
          ? {
              ...(bucket.product_type ? { product_type: bucket.product_type } : {}),
              ...(bucket.vendor ? { vendor: bucket.vendor } : {}),
            }
          : undefined,
      extraction_confidence: 0.9,
      parser_warnings: [],
    });
  }

  // Felipe 2026-05-19 · sprint Shopify lane — Agregación model+color.
  //
  // Shopify exporta 1 fila por (model+color+talla). Para decisiones de
  // merchandising "talla" no aporta señal (un buyer decide qué hacer
  // con el modelo y el color, no con la M vs la L). Aimily-SKU = modelo
  // + calidad + color, consistente con Zara. Aquí colapsamos los rows
  // por (product_name + color_ref) y sumamos numéricos. Las tallas
  // individuales se preservan en `raw.size_breakdown` para drill-down.
  const aggregatedRecords = aggregateBySkuModelColor(records);
  // Re-asignar índices secuenciales tras el collapse — los downstream
  // (UI ranking + identity graph) usan row_index para orden determinista.
  aggregatedRecords.forEach((r, i) => (r.row_index = i + 1));

  const coverage = {
    identity: aggregatedRecords.length > 0,
    // pricing flag ahora más rico: además de pvp, marca true si tenemos
    // pvp_compare (compare-at-price) o cost (COGS via InventoryItem) —
    // habilita markup_pct, margin_pct_list, on_promo en el motor.
    pricing: aggregatedRecords.some((r) => r.pvp != null || r.cost_estimate != null),
    inventory: inventoryRows.length > 0,
    velocity_d1: aggregatedRecords.some((r) => (r.windows.find((w) => w.window === 'd1')?.units || 0) > 0),
    velocity_7d: aggregatedRecords.some((r) => (r.windows.find((w) => w.window === '7d')?.units || 0) > 0),
    velocity_8_14d: aggregatedRecords.some(
      (r) => (r.windows.find((w) => w.window === '8_14d')?.units || 0) > 0
    ),
    efficiency: false,
    returns: returnsRows.length > 0 || aggregatedRecords.some((r) => r.returns_pct != null),
    distribution: false,
    geographic: false,
    channel: false,
    size_curve: aggregatedRecords.some((r) => Array.isArray((r.raw as { size_breakdown?: unknown[] })?.size_breakdown) && ((r.raw as { size_breakdown: unknown[] }).size_breakdown.length > 0)),
    weather: false,
    marketing_exposure: false,
    page_traffic: false,
    return_reasons: returnsRows.some((r) => r.reason != null),
    markdown_date: false,
    stockout_days: false,
    supplier_lead_time: false,
    margin_after_returns: false,
  };

  const warnings: string[] = [];
  if (inventoryRows.length === 0)
    warnings.push('No Inventory sheet — stock pipeline missing, classifier confidence reduced');
  if (returnsRows.length === 0)
    warnings.push('No Returns sheet — returns_pct derived from sales aggregate; effective margin imprecise');
  if (productRows.length === 0)
    warnings.push('No Products sheet — Aimily Design photo flow degraded, no compare-at-price, no COGS; classifier confidence reduced for pricing-dependent verbs');

  return {
    parser_version: PARSER_VERSION,
    records: aggregatedRecords,
    coverage_dimensions: coverage,
    parser_warnings: warnings,
    parse_confidence: aggregatedRecords.length > 0 ? 0.85 : 0,
  };
}

/**
 * Colapsa variantes Shopify a aimily-SKU (model + color). Las talla-only
 * variantes (Option1=Size) se aggregan TODAS en una sola fila; las
 * color+size se aggregan POR color.
 *
 * Aggregation rules:
 *   - lifetime_units (total_sold), windows.{d1,d2,7d,8_14d}.units → SUM
 *   - stock_store, stock_in_transit, stock_pending, pipeline_total → SUM
 *   - returns_pct → SUM(returns_units) / SUM(units_sold) recalculado
 *   - pvp → revenue-weighted average (sum(net_sales) / sum(units))
 *   - pvp_compare, cost_estimate, margin_pct_list, markup_pct → first non-null
 *   - product_image_url → first non-null
 *   - model_ref → primer variant_sku del grupo (alfabético) — keep como
 *     "representative SKU" del aimily-SKU
 *   - color_ref → constante por grupo (key)
 *   - variant_ref → null (talla agregada)
 *   - raw.size_breakdown → array { sku, size, lifetime_units, stock }
 */
function aggregateBySkuModelColor(records: ParsedRecord[]): ParsedRecord[] {
  const groups = new Map<string, ParsedRecord[]>();
  for (const r of records) {
    // Clave de agrupación. Usamos product_name (= product_title) + color_ref.
    // Si product_name está vacío, fallback a model_ref (single-row group).
    const productKey = (r.product_name ?? r.model_ref ?? '').trim().toLowerCase();
    const colorKey = (r.color_ref ?? '_no_color_').trim().toLowerCase();
    const key = `${productKey}::${colorKey}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const aggregated: ParsedRecord[] = [];
  for (const [, variantsRaw] of Array.from(groups.entries())) {
    // Sort variants by model_ref para determinismo (talla "S" antes que "XL"
    // por orden alfabético del SKU, no por orden semántico de talla — el
    // representative_sku se toma del primer alfabético).
    const variants = [...variantsRaw].sort((a, b) =>
      (a.model_ref ?? '').localeCompare(b.model_ref ?? '')
    );
    if (variants.length === 1) {
      // Producto sin tallas (ya está en granularidad model+color). Aún
      // así emitimos `variant_ref = null` y un size_breakdown mínimo
      // para consistencia downstream.
      const v = variants[0];
      const sizeFromVariant =
        (v.raw as { variant_title?: string })?.variant_title
          ? inferSizeFromVariant((v.raw as { variant_title?: string }).variant_title)
          : null;
      aggregated.push({
        ...v,
        variant_ref: null,
        raw: {
          ...v.raw,
          size_breakdown: [
            {
              sku: v.model_ref,
              size: sizeFromVariant,
              lifetime_units: v.total_sold ?? 0,
              stock_store: v.stock_store ?? 0,
            },
          ],
          variants_aggregated: 1,
        },
      });
      continue;
    }
    // 2+ variantes (multi-size). Aggregate.
    const sumUnits = (key: 'd1' | 'd2' | '7d' | '8_14d'): number =>
      variants.reduce((acc, v) => acc + (v.windows.find((w) => w.window === key)?.units ?? 0), 0);
    const sumImporte = (key: 'd1' | 'd2' | '7d' | '8_14d'): number =>
      variants.reduce((acc, v) => acc + (v.windows.find((w) => w.window === key)?.importe ?? 0), 0);
    const lifetimeUnits = variants.reduce(
      (acc, v) => acc + ((v.raw as { lifetime_units?: number })?.lifetime_units ?? v.total_sold ?? 0),
      0
    );
    const lifetimeNetSales = variants.reduce(
      (acc, v) => acc + ((v.raw as { lifetime_net_sales?: number })?.lifetime_net_sales ?? 0),
      0
    );
    const totalReturnsUnits = variants.reduce(
      (acc, v) => acc + ((v.raw as { returns_units?: number })?.returns_units ?? 0),
      0
    );
    const aggregatePvp =
      lifetimeUnits > 0
        ? Math.round((lifetimeNetSales / lifetimeUnits) * 100) / 100
        : variants.find((v) => v.pvp != null)?.pvp ?? null;
    const firstNonNull = <T>(getter: (r: ParsedRecord) => T | null | undefined): T | null => {
      for (const v of variants) {
        const x = getter(v);
        if (x != null) return x as T;
      }
      return null;
    };
    const stockStore = variants.reduce((acc, v) => acc + (v.stock_store ?? 0), 0);
    const stockInTransit = variants.reduce((acc, v) => acc + (v.stock_in_transit ?? 0), 0);
    const stockPending = variants.reduce((acc, v) => acc + (v.stock_pending ?? 0), 0);
    const head = variants[0];
    aggregated.push({
      row_index: 0, // se reasigna fuera del aggregate
      page_coord: null,
      model_ref: head.model_ref, // primer variant_sku como representante
      color_ref: head.color_ref,
      variant_ref: null, // talla colapsada
      product_name: head.product_name,
      family_code: head.family_code,
      subfamily_code: head.subfamily_code,
      section_code: head.section_code,
      season_tag: head.season_tag,
      activation_date: head.activation_date,
      cluster_size: head.cluster_size,
      description_raw: head.description_raw,
      pvp: aggregatePvp,
      pvp_compare: firstNonNull((r) => r.pvp_compare),
      markup_pct: firstNonNull((r) => r.markup_pct),
      on_promo: variants.some((v) => v.on_promo),
      cost_estimate: firstNonNull((r) => r.cost_estimate),
      margin_pct_list: firstNonNull((r) => r.margin_pct_list),
      stock_store: stockStore,
      stock_warehouse: null,
      stock_available: stockStore,
      stock_in_transit: stockInTransit,
      stock_pending: stockPending,
      stock_pending_date: null,
      stock_adjusted: null,
      stock_blocked: null,
      stock_fabric: null,
      days_in_store: null,
      stores_with_stock: null,
      stores_active: null,
      stores_total: null,
      pipeline_total: stockStore + stockInTransit + stockPending,
      cd2_available: null,
      blocked_per_store: null,
      windows: (['d1', 'd2', '7d', '8_14d'] as const).map((w) => ({
        window: w,
        units: sumUnits(w),
        importe: sumImporte(w) || null,
        gross_commission: null,
        share_net_sales: null,
      })),
      total_bought: null,
      total_sold: lifetimeUnits || null,
      total_shipped: null,
      sell_through_shipped_pct: null,
      sell_through_bought_pct: null,
      returns_pct: lifetimeUnits > 0 ? totalReturnsUnits / lifetimeUnits : null,
      product_image_url: firstNonNull((r) => r.product_image_url),
      raw: {
        aimily_sku_unit: 'model+color',
        representative_sku: head.model_ref,
        variants_aggregated: variants.length,
        size_breakdown: variants.map((v) => ({
          sku: v.model_ref,
          size:
            (v.raw as { variant_title?: string })?.variant_title
              ? inferSizeFromVariant((v.raw as { variant_title?: string }).variant_title)
              : null,
          lifetime_units: (v.raw as { lifetime_units?: number })?.lifetime_units ?? v.total_sold ?? 0,
          stock_store: v.stock_store ?? 0,
        })),
        lifetime_units: lifetimeUnits,
        lifetime_net_sales: lifetimeNetSales,
        returns_units: totalReturnsUnits,
      },
      original_labels: head.original_labels,
      extraction_confidence: head.extraction_confidence,
      parser_warnings: head.parser_warnings,
    });
  }
  return aggregated;
}

function findSheet(workbook: XLSX.WorkBook, candidates: string[]): string | undefined {
  const lower = workbook.SheetNames.map((n) => ({ n, l: n.toLowerCase() }));
  for (const c of candidates) {
    const hit = lower.find((s) => s.l.includes(c));
    if (hit) return hit.n;
  }
  return undefined;
}

function sheetToObjects<T>(workbook: XLSX.WorkBook, sheetName: string | undefined): T[] {
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });
  return rows.map((r) => normalizeKeys(r) as T);
}

/**
 * Shopify report header alias map — different Shopify export versions use
 * different column names for the same data. We normalize them all to a
 * canonical key. Codex P1 fix: previous parser silently lost columns from
 * any export that didn't use the exact names we expected.
 */
const HEADER_ALIASES: Record<string, string> = {
  // SKU identity
  product_variant_sku: 'variant_sku',
  variant_sku: 'variant_sku',
  sku: 'variant_sku',
  product_sku: 'variant_sku',

  // Product / variant titles
  product_title: 'product_title',
  product_name: 'product_title',
  title: 'product_title',
  product: 'product_title',
  product_variant_title: 'variant_title',
  variant_title: 'variant_title',
  variant: 'variant_title',

  // Vendor / type / tags
  product_vendor: 'vendor',
  vendor: 'vendor',
  product_type: 'product_type',
  type: 'product_type',
  product_tags: 'tags',
  tags: 'tags',

  // Sales metrics — Shopify variants
  net_items_sold: 'net_units_sold',
  net_units_sold: 'net_units_sold',
  units_sold: 'net_units_sold',
  net_quantity: 'net_units_sold',
  net_sales: 'net_sales',
  gross_sales: 'gross_sales',
  total_sales: 'gross_sales',

  // Returns
  units_returned: 'units_returned',
  returns: 'units_returned',
  return_quantity: 'units_returned',
  total_returns: 'units_returned',
  return_amount: 'return_amount',

  // Time bucket
  day: 'day',
  date: 'day',
  week: 'week',
  month: 'month',

  // Inventory
  available: 'available',
  inventory_available: 'available',
  on_hand: 'on_hand',
  inventory_on_hand: 'on_hand',
  incoming: 'incoming',
  inventory_incoming: 'incoming',
  committed: 'committed',
  inventory_committed: 'committed',
  location: 'location',
  inventory_location: 'location',

  // Returns sheet
  reason: 'reason',
  return_reason: 'reason',
  return_date: 'return_date',
  date_of_return: 'return_date',

  // Products CSV — Shopify standard export columns + variants
  image_src: 'image_src',
  image_url: 'image_src',
  product_image_src: 'image_src',
  product_image_url: 'image_src',
  image: 'image_src',
  variant_image: 'variant_image',
  variant_image_src: 'variant_image',
  variant_image_url: 'variant_image',
  image_position: 'image_position',
  image_alt_text: 'image_alt_text',
  cost_per_item: 'cost_per_item',
  variant_cost_per_item: 'cost_per_item',
  cost: 'cost_per_item',
  unit_cost: 'cost_per_item',
  compare_at_price: 'compare_at_price',
  variant_compare_at_price: 'compare_at_price',
  variant_price: 'variant_price',
  price: 'variant_price',
  published: 'published',
  status: 'status',
};

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const norm = String(k)
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]+/g, '')
      .replace(/^_+|_+$/g, '');
    const canonical = HEADER_ALIASES[norm] || norm;
    // First win — never overwrite a canonical key that's already populated
    // with a more authoritative value from an earlier column.
    if (out[canonical] === undefined || out[canonical] === null || out[canonical] === '') {
      out[canonical] = v;
    }
  }
  return out;
}

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Detecta si un token de variant_title parece talla (XS/S/M/L/XL/2XL,
 *  small/medium/large/x-large/extra large, valores numéricos 28/30/36
 *  típicos de jeans, etc.). Felipe 2026-05-19 — necesario para
 *  distinguir productos mono-color con variantes solo de talla
 *  ("S / M / L / XL") de productos con color + talla
 *  ("Indigo / S"). En el primer caso color_ref = null y la talla NO va
 *  a parts[0] como color. */
const SIZE_TOKEN_RE = new RegExp(
  '^(' +
    'x{0,3}s|x{0,3}l|m|xxxl|' +
    'small|medium|large|x-?small|xs-?small|x-?large|extra ?large|xx-?large|xxx-?large|' +
    'one ?size|os|onesize|tall|petite|' +
    '\\d{1,2}(\\.\\d)?|' + // numeric sizes 28, 30, 36, 5.5
    '\\d{1,2}-\\d{1,2}' + // ranges 4-6, 12-14
    ')$',
  'i'
);

function isSizeToken(s: string | undefined | null): boolean {
  if (!s) return false;
  return SIZE_TOKEN_RE.test(s.trim());
}

function inferColorFromVariant(variantTitle?: string): string | null {
  if (!variantTitle) return null;
  // Si la 1ª parte parece talla, no es color (producto mono-color con
  // solo variantes de talla). Si NO parece talla, es el color.
  const parts = variantTitle.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (isSizeToken(parts[0])) return null; // producto solo con tallas
  return parts[0]?.toLowerCase() || null;
}

function inferSizeFromVariant(variantTitle?: string): string | null {
  if (!variantTitle) return null;
  const parts = variantTitle.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  // Si la 1ª parte ES talla, esa es la talla. Si NO, la talla está en parts[1].
  if (isSizeToken(parts[0])) return parts[0];
  return parts[1] ?? null;
}
