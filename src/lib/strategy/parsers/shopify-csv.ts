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

  const salesRows = sheetToObjects<SalesRow>(workbook, salesSheet);
  const inventoryRows = inventorySheet
    ? sheetToObjects<InventoryRow>(workbook, inventorySheet)
    : [];
  const returnsRows = returnsSheet
    ? sheetToObjects<ReturnsRow>(workbook, returnsSheet)
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
    bucket.lifetime_returns += toNumber(row.total_returns ?? row.units_returned);

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

  const records: ParsedRecord[] = [];
  let rowIndex = 0;
  for (const [sku, bucket] of Array.from(byVariant.entries())) {
    rowIndex += 1;

    const inv = inventoryBySku.get(sku);
    const returnsUnits = returnsBySku.get(sku) ?? bucket.lifetime_returns;
    const returnsPct =
      bucket.lifetime_units > 0 ? returnsUnits / Math.max(bucket.lifetime_units, 1) : null;

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
      family_code: bucket.product_type || null,
      subfamily_code: null,
      section_code: null,
      season_tag: opts.season_tag,
      activation_date: null,
      cluster_size: null,
      description_raw: [bucket.product_title, bucket.variant_title].filter(Boolean).join(' · '),
      pvp:
        bucket.lifetime_units > 0
          ? Math.round((bucket.lifetime_net_sales / bucket.lifetime_units) * 100) / 100
          : null,
      pvp_compare: null,
      markup_pct: null,
      on_promo: false,
      cost_estimate: null,
      margin_pct_list: null,
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

  const coverage = {
    identity: records.length > 0,
    pricing: records.some((r) => r.pvp != null),
    inventory: inventoryRows.length > 0,
    velocity_d1: records.some((r) => (r.windows.find((w) => w.window === 'd1')?.units || 0) > 0),
    velocity_7d: records.some((r) => (r.windows.find((w) => w.window === '7d')?.units || 0) > 0),
    velocity_8_14d: records.some(
      (r) => (r.windows.find((w) => w.window === '8_14d')?.units || 0) > 0
    ),
    efficiency: false,
    returns: returnsRows.length > 0 || records.some((r) => r.returns_pct != null),
    distribution: false,
    geographic: false,
    channel: false,
    size_curve: records.some((r) => r.variant_ref != null),
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

  return {
    parser_version: PARSER_VERSION,
    records,
    coverage_dimensions: coverage,
    parser_warnings: warnings,
    parse_confidence: records.length > 0 ? 0.85 : 0,
  };
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

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const norm = String(k)
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]+/g, '')
      .replace(/^_+|_+$/g, '');
    out[norm] = v;
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

function inferColorFromVariant(variantTitle?: string): string | null {
  if (!variantTitle) return null;
  // Shopify variant titles like "Black / S" or "Beige / Medium"
  const parts = variantTitle.split(/\s*\/\s*/);
  return parts[0]?.trim().toLowerCase() || null;
}

function inferSizeFromVariant(variantTitle?: string): string | null {
  if (!variantTitle) return null;
  const parts = variantTitle.split(/\s*\/\s*/);
  return parts[1]?.trim() || null;
}
