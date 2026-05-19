/**
 * Enriquecedor: para cada SKU con ≥7 días de snapshots persistidos,
 * calcula rotation_td_tr_aj_7d y emptying_rate REALES (no synthetic).
 *
 * Felipe sprint Shopify lane sprint 4 · 2026-05-19.
 *
 * Los classifiers actuales esperan estos campos en SkuScoreInput. Sin
 * snapshots, el orchestrator tendría que sintetizarlos vía retailer
 * profile (graceful degradation memo 2026-05-17). Con snapshots, los
 * datos son nativos y la confianza_dim es máxima.
 *
 * Patrón:
 *   - tenant nuevo o sin cron snapshot configurado → null (sintético)
 *   - tenant con 1-3 snapshots → null (insuficiente para rotation)
 *   - tenant con ≥7 snapshots por SKU → derivado real
 *
 * NO modifica los classifiers; sólo expone un helper que el orchestrator
 * o el route handler llama para enriquecer baseInput antes de scoring.
 */

import {
  fetchInventoryHistory,
  computeRotationFromHistory,
  type InventorySnapshotRow,
} from './snapshots';

export interface RotationEnrichment {
  rotation_td_tr_aj_7d: number | null;
  emptying_rate: number | null;
  avg_stock_7d: number | null;
  source: 'native_snapshots' | 'insufficient_history' | 'no_history';
  snapshots_count: number;
}

/** Carga history para todos los SKUs del run en una sola query y
 *  devuelve un Map product_fact_id → RotationEnrichment. */
export async function enrichWithRotationFromSnapshots(args: {
  tenantId: string;
  /** Map product_fact_id → velocity_7d (units). Necesario para derivar rotation. */
  velocityByPid: Map<string, number | null>;
  days?: number;
}): Promise<Map<string, RotationEnrichment>> {
  const result = new Map<string, RotationEnrichment>();
  const pids = Array.from(args.velocityByPid.keys());
  if (pids.length === 0) return result;

  let history: Map<string, InventorySnapshotRow[]>;
  try {
    history = await fetchInventoryHistory(args.tenantId, pids, args.days ?? 28);
  } catch {
    // si falla la query, todos los SKUs quedan en 'no_history' y el
    // orchestrator sintetiza
    for (const pid of pids) {
      result.set(pid, {
        rotation_td_tr_aj_7d: null,
        emptying_rate: null,
        avg_stock_7d: null,
        source: 'no_history',
        snapshots_count: 0,
      });
    }
    return result;
  }

  for (const pid of pids) {
    const snapshots = history.get(pid) || [];
    const velocity = args.velocityByPid.get(pid) ?? null;
    if (snapshots.length === 0) {
      result.set(pid, {
        rotation_td_tr_aj_7d: null,
        emptying_rate: null,
        avg_stock_7d: null,
        source: 'no_history',
        snapshots_count: 0,
      });
      continue;
    }
    if (snapshots.length < 3) {
      result.set(pid, {
        rotation_td_tr_aj_7d: null,
        emptying_rate: null,
        avg_stock_7d: null,
        source: 'insufficient_history',
        snapshots_count: snapshots.length,
      });
      continue;
    }
    const derived = computeRotationFromHistory(snapshots, velocity);
    result.set(pid, {
      rotation_td_tr_aj_7d: derived.rotation_7d,
      emptying_rate: derived.emptying_rate,
      avg_stock_7d: derived.avg_stock_7d,
      source: 'native_snapshots',
      snapshots_count: snapshots.length,
    });
  }
  return result;
}
