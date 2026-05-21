/**
 * Helpers para inventory + price daily snapshots.
 *
 * Felipe sprint Shopify lane sprint 3 · 2026-05-19.
 *
 * Shopify (y la mayoría de ERPs) NO expone historial de inventory ni
 * price. Para que los classifiers calculen rotation_7d, emptying_rate,
 * max_sale_no_promo de forma nativa (sin depender del input del
 * cliente), aimily persiste snapshots diarios y los lee para derivar
 * las métricas.
 *
 * Patrón canónico:
 *   1. Cron diario → llama parseShopifyGraphql con credenciales del tenant
 *   2. Por cada SKU del result: upsert en strategy_inventory_snapshots
 *      (UNIQUE (product_fact_id, snapshot_date) hace que re-correr el
 *      mismo día sea idempotente)
 *   3. Classifier lee últimos N días via fetchInventoryHistory(skus, days)
 *      y deriva rotation = velocity_7d / mean(stock últimos 7d)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ParsedRecord } from './parsers/types';

export interface InventorySnapshotRow {
  id?: string;
  tenant_id: string;
  product_fact_id: string;
  snapshot_date: string; // YYYY-MM-DD
  stock_available: number | null;
  stock_on_hand: number | null;
  stock_committed: number | null;
  stock_incoming: number | null;
  pvp: number | null;
  pvp_compare: number | null;
  on_promo: boolean;
  connector_type: 'shopify_graphql' | 'shopify_csv' | 'manual_upload' | 'zara_pdf_extracted';
}

/** Persiste (upsert) snapshots para el día dado a partir de un ParserResult.
 *  Idempotente: si ya hay snapshot para ese SKU+día, hace update. */
export async function persistDailySnapshots(args: {
  tenantId: string;
  snapshotDate: string;
  connectorType: InventorySnapshotRow['connector_type'];
  /** Map de model_ref → product_fact_id (lookup ya hecho por el caller). */
  productFactIdByModelRef: Map<string, string>;
  records: ParsedRecord[];
}): Promise<{ inserted: number; updated: number }> {
  const rows: InventorySnapshotRow[] = [];
  for (const r of args.records) {
    const pid = args.productFactIdByModelRef.get(r.model_ref);
    if (!pid) continue;
    rows.push({
      tenant_id: args.tenantId,
      product_fact_id: pid,
      snapshot_date: args.snapshotDate,
      stock_available: r.stock_available ?? null,
      stock_on_hand: r.stock_store ?? null,
      stock_committed: r.stock_pending ?? null,
      stock_incoming: r.stock_in_transit ?? null,
      pvp: r.pvp ?? null,
      pvp_compare: r.pvp_compare ?? null,
      on_promo: r.on_promo ?? false,
      connector_type: args.connectorType,
    });
  }
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  // Upsert via supabase. Conflict target = (product_fact_id, snapshot_date).
  const { data, error } = await supabaseAdmin
    .from('strategy_inventory_snapshots')
    .upsert(rows, { onConflict: 'product_fact_id,snapshot_date', ignoreDuplicates: false })
    .select('id');
  if (error) {
    throw new Error(`snapshot upsert failed: ${error.message}`);
  }
  return { inserted: data?.length || 0, updated: 0 };
}

/** Carga snapshots de los últimos N días para un set de SKUs. Devuelve un
 *  Map product_fact_id → array de snapshots ordenados por fecha DESC. */
export async function fetchInventoryHistory(
  tenantId: string,
  productFactIds: string[],
  days: number = 28
): Promise<Map<string, InventorySnapshotRow[]>> {
  if (productFactIds.length === 0) return new Map();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceIso = sinceDate.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('strategy_inventory_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('product_fact_id', productFactIds)
    .gte('snapshot_date', sinceIso)
    .order('snapshot_date', { ascending: false });

  if (error) {
    throw new Error(`snapshot history fetch failed: ${error.message}`);
  }
  const byPid = new Map<string, InventorySnapshotRow[]>();
  for (const row of (data || []) as InventorySnapshotRow[]) {
    const arr = byPid.get(row.product_fact_id) || [];
    arr.push(row);
    byPid.set(row.product_fact_id, arr);
  }
  return byPid;
}

/** Deriva rotation y emptying_rate desde snapshots. Si hay menos de 3
 *  snapshots se devuelve null (insuficiente para confidence). */
export function computeRotationFromHistory(
  snapshots: InventorySnapshotRow[],
  velocity7d: number | null
): { rotation_7d: number | null; emptying_rate: number | null; avg_stock_7d: number | null } {
  if (!snapshots || snapshots.length < 3 || velocity7d == null || velocity7d <= 0) {
    return { rotation_7d: null, emptying_rate: null, avg_stock_7d: null };
  }
  // Top 7 últimos (snapshots viene DESC por fecha)
  const last7 = snapshots.slice(0, 7);
  const stocks = last7
    .map((s) => (s.stock_available ?? s.stock_on_hand ?? null))
    .filter((x): x is number => x != null);
  if (stocks.length === 0) {
    return { rotation_7d: null, emptying_rate: null, avg_stock_7d: null };
  }
  const avgStock = stocks.reduce((a, b) => a + b, 0) / stocks.length;
  if (avgStock <= 0) {
    return { rotation_7d: null, emptying_rate: null, avg_stock_7d: 0 };
  }
  // Rotation 7d = velocity / avg_stock (proxy de rotation_td_tr_aj_7d Zara)
  const rotation_7d = Math.round((velocity7d / avgStock) * 1000) / 1000;
  // Emptying = velocity 7d / max stock observado (cuánto se vacía relativo
  // al pico de stock en la ventana)
  const maxStock = Math.max(...stocks);
  const emptying = maxStock > 0 ? Math.round((velocity7d / maxStock) * 1000) / 1000 : null;
  return { rotation_7d, emptying_rate: emptying, avg_stock_7d: Math.round(avgStock) };
}

/** Devuelve max_sale_no_promo + max_sale_promo desde history. Útil para
 *  capacity headroom (D2 markdown / D5 amplify_dist usan este input). */
export function computeMaxSaleFromHistory(
  snapshots: InventorySnapshotRow[],
  /** Map snapshot_date → units vendidas ese día (de orders) */
  unitsByDate: Map<string, number>
): { max_sale_no_promo: number | null; max_sale_promo: number | null } {
  if (!snapshots || snapshots.length === 0) {
    return { max_sale_no_promo: null, max_sale_promo: null };
  }
  let maxNoPromo = 0;
  let maxPromo = 0;
  for (const s of snapshots) {
    const units = unitsByDate.get(s.snapshot_date) || 0;
    if (s.on_promo) {
      if (units > maxPromo) maxPromo = units;
    } else {
      if (units > maxNoPromo) maxNoPromo = units;
    }
  }
  return {
    max_sale_no_promo: maxNoPromo > 0 ? maxNoPromo : null,
    max_sale_promo: maxPromo > 0 ? maxPromo : null,
  };
}
