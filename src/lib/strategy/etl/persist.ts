/**
 * ETL: ParserResult → strategy_raw_records + strategy_product_facts +
 * strategy_inventory_facts + strategy_sales_windows + strategy_efficiency_facts.
 *
 * Idempotent on (tenant_id, source_id, row_index): re-running the parser
 * overwrites raw_records and re-derives facts. Source row is updated with
 * record_count, parse_confidence, coverage_dimensions, parser_warnings,
 * processed_at.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ParserResult, ParsedRecord } from '../parsers/types';

export interface PersistResult {
  source_id: string;
  raw_record_count: number;
  product_fact_count: number;
  inventory_fact_count: number;
  sales_window_count: number;
  efficiency_fact_count: number;
  parser_warnings: string[];
  parse_confidence: number;
}

export async function persistParserResult(
  tenantId: string,
  sourceId: string,
  observationDate: string,
  result: ParserResult
): Promise<PersistResult> {
  // 1. Clean any previous parse output for this source (idempotency).
  await supabaseAdmin.from('strategy_raw_records').delete().eq('source_id', sourceId);
  await supabaseAdmin.from('strategy_product_facts').delete().eq('source_id', sourceId);
  // Cascade deletes will handle inventory/sales/efficiency.

  // 2. Insert raw_records in chunks.
  const rawInserts = result.records.map((r) => ({
    tenant_id: tenantId,
    source_id: sourceId,
    row_index: r.row_index,
    page_coord: r.page_coord,
    raw_json: r.raw,
    original_labels: r.original_labels ?? null,
    extraction_confidence: r.extraction_confidence,
    parser_warnings: r.parser_warnings ?? [],
  }));

  const rawIdMap = new Map<number, string>();
  for (const chunk of Array.from(chunked(rawInserts, 500))) {
    const { data, error } = await supabaseAdmin
      .from('strategy_raw_records')
      .insert(chunk)
      .select('id, row_index');
    if (error) throw new Error(`raw_records insert failed: ${error.message}`);
    for (const r of data || []) {
      rawIdMap.set(r.row_index, r.id);
    }
  }

  // 3. Insert product_facts and capture ids back per row_index.
  const productInserts = result.records.map((r) => ({
    tenant_id: tenantId,
    source_id: sourceId,
    raw_record_id: rawIdMap.get(r.row_index) ?? null,
    observation_date: observationDate,
    model_ref: r.model_ref,
    color_ref: r.color_ref ?? null,
    variant_ref: r.variant_ref ?? null,
    product_name: r.product_name ?? null,
    family_code: r.family_code ?? null,
    subfamily_code: r.subfamily_code ?? null,
    section_code: r.section_code ?? null,
    season_tag: r.season_tag,
    activation_date: r.activation_date ?? null,
    pvp: r.pvp ?? null,
    pvp_compare: r.pvp_compare ?? null,
    markup_pct: r.markup_pct ?? null,
    on_promo: r.on_promo ?? false,
    cluster_size: r.cluster_size ?? null,
    cost_estimate: r.cost_estimate ?? null,
    margin_pct_list: r.margin_pct_list ?? null,
    description_raw: r.description_raw ?? null,
    // Felipe 2026-05-19 sprint Shopify lane: parsers with direct photo
    // access (Shopify Products CSV, Shopify GraphQL) populate this field.
    // Zara PDF parser leaves null — for Zara the image is extracted
    // client-side from the rendered PDF canvas via sku-image-cropper.
    product_image_url: r.product_image_url ?? null,
  }));

  // Build a marker we can use to match returned ids back to ParsedRecord
  // when bulk-inserting. We use (model_ref, color_ref or '', row_index)
  // tuple by including row_index in description_raw — but that's invasive.
  // Cleaner: chunk insert and rely on the returning array order matching
  // insert order, which PostgREST guarantees for a single INSERT statement.
  const productIdByIdx = new Map<number, string>();
  let productInsertOffset = 0;
  for (const chunk of Array.from(chunked(productInserts, 500))) {
    const recordsSubset = result.records.slice(productInsertOffset, productInsertOffset + chunk.length);
    const { data, error } = await supabaseAdmin
      .from('strategy_product_facts')
      .insert(chunk)
      .select('id');
    if (error) throw new Error(`product_facts insert failed: ${error.message}`);
    for (let i = 0; i < (data?.length || 0); i += 1) {
      productIdByIdx.set(recordsSubset[i].row_index, data![i].id);
    }
    productInsertOffset += chunk.length;
  }

  // 4. Inventory facts.
  const inventoryInserts = result.records
    .filter((r) => hasAnyInventorySignal(r))
    .map((r) => ({
      tenant_id: tenantId,
      product_fact_id: productIdByIdx.get(r.row_index)!,
      observation_date: observationDate,
      stock_store: r.stock_store ?? null,
      stock_warehouse: r.stock_warehouse ?? null,
      stock_available: r.stock_available ?? null,
      stock_in_transit: r.stock_in_transit ?? null,
      stock_pending: r.stock_pending ?? null,
      stock_pending_date: r.stock_pending_date ?? null,
      stock_adjusted: r.stock_adjusted ?? null,
      stock_blocked: r.stock_blocked ?? null,
      stock_fabric: r.stock_fabric ?? null,
      days_in_store: r.days_in_store ?? null,
      stores_with_stock: r.stores_with_stock ?? null,
      stores_active: r.stores_active ?? null,
      stores_total: r.stores_total ?? null,
      pipeline_total: r.pipeline_total ?? null,
      cd2_available: r.cd2_available ?? null,
      blocked_per_store: r.blocked_per_store ?? null,
    }));

  let inventoryCount = 0;
  for (const chunk of Array.from(chunked(inventoryInserts, 500))) {
    const { error, count } = await supabaseAdmin
      .from('strategy_inventory_facts')
      .insert(chunk, { count: 'exact' });
    if (error) throw new Error(`inventory_facts insert failed: ${error.message}`);
    inventoryCount += count ?? chunk.length;
  }

  // 5. Sales windows.
  const salesInserts: any[] = [];
  for (const r of result.records) {
    const pid = productIdByIdx.get(r.row_index);
    if (!pid) continue;
    for (const w of r.windows) {
      salesInserts.push({
        tenant_id: tenantId,
        product_fact_id: pid,
        observation_date: observationDate,
        window_type: w.window,
        units: w.units ?? 0,
        gross_commission: w.gross_commission ?? null,
        share_net_sales: w.share_net_sales ?? null,
        importe: w.importe ?? null,
        max_sale_promo: w.max_sale_promo ?? null,
        max_sale_no_promo: w.max_sale_no_promo ?? null,
        stores_with_sale: w.stores_with_sale ?? null,
        rotation_1d: w.rotation_1d ?? null,
        rotation_7d: w.rotation_7d ?? null,
        rotation_td_tr_aj_7d: w.rotation_td_tr_aj_7d ?? null,
        rotation_td_tr_7d: w.rotation_td_tr_7d ?? null,
        emptying_rate: w.emptying_rate ?? null,
        emptying_rate_available: w.emptying_rate_available ?? null,
      });
    }
  }

  let salesCount = 0;
  for (const chunk of Array.from(chunked(salesInserts, 500))) {
    const { error, count } = await supabaseAdmin
      .from('strategy_sales_windows')
      .insert(chunk, { count: 'exact' });
    if (error) throw new Error(`sales_windows insert failed: ${error.message}`);
    salesCount += count ?? chunk.length;
  }

  // 6. Efficiency facts.
  const efficiencyInserts = result.records
    .filter((r) => hasAnyEfficiencySignal(r))
    .map((r) => ({
      tenant_id: tenantId,
      product_fact_id: productIdByIdx.get(r.row_index)!,
      observation_date: observationDate,
      total_bought: r.total_bought ?? null,
      total_sold: r.total_sold ?? null,
      total_shipped: r.total_shipped ?? null,
      sell_through_shipped_pct: r.sell_through_shipped_pct ?? null,
      sell_through_bought_pct: r.sell_through_bought_pct ?? null,
      returns_pct: r.returns_pct ?? null,
    }));

  let efficiencyCount = 0;
  for (const chunk of Array.from(chunked(efficiencyInserts, 500))) {
    const { error, count } = await supabaseAdmin
      .from('strategy_efficiency_facts')
      .insert(chunk, { count: 'exact' });
    if (error) throw new Error(`efficiency_facts insert failed: ${error.message}`);
    efficiencyCount += count ?? chunk.length;
  }

  // 7. Update source metadata.
  await supabaseAdmin
    .from('strategy_sources')
    .update({
      record_count: result.records.length,
      parse_confidence: result.parse_confidence,
      coverage_dimensions: result.coverage_dimensions,
      parser_warnings: result.parser_warnings,
      processed_at: new Date().toISOString(),
      parser_version: result.parser_version,
    })
    .eq('id', sourceId);

  return {
    source_id: sourceId,
    raw_record_count: result.records.length,
    product_fact_count: productIdByIdx.size,
    inventory_fact_count: inventoryCount,
    sales_window_count: salesCount,
    efficiency_fact_count: efficiencyCount,
    parser_warnings: result.parser_warnings,
    parse_confidence: result.parse_confidence,
  };
}

function hasAnyInventorySignal(r: ParsedRecord): boolean {
  return (
    r.stock_store != null ||
    r.stock_warehouse != null ||
    r.stock_available != null ||
    r.stock_in_transit != null ||
    r.stock_pending != null ||
    r.days_in_store != null ||
    r.stores_active != null ||
    r.pipeline_total != null
  );
}

function hasAnyEfficiencySignal(r: ParsedRecord): boolean {
  return (
    r.total_bought != null ||
    r.total_sold != null ||
    r.total_shipped != null ||
    r.sell_through_shipped_pct != null ||
    r.sell_through_bought_pct != null ||
    r.returns_pct != null
  );
}

function* chunked<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}
