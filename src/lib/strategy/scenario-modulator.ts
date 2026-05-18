/**
 * Aplica los diales de un escenario al verdict raw de un SKU para
 * producir el verdict bajo ese escenario.
 *
 * Spec: memory/decision-tree_aimily-in-season-2026-05-18.md §8.2
 *
 * CARDINAL: no elimina decisiones — solo las filtra (más estrictas) o
 * gradúa (magnitud + confianza). Si una decisión NO pasa el threshold
 * del escenario, se suprime. Si pasa, su magnitud y confianza se
 * modulan.
 *
 * Las decisiones invariantes a escenario (D3 REPOSICIÓN URGENTE,
 * D4 ADELANTAR PEDIDO, D9 MARCAR REVISIÓN) NO se tocan — pasan tal
 * cual a todos los escenarios.
 */

import type { SkuVerdict, SkuVerdictItem, SkuVerdictAction } from './sku-verdict-resolver';
import type { DecisionDiales } from './scenario-diales';
import { applyExclusionRules } from './exclusion-rules';

/** Mapeo: qué señales V2 evalúa cada decisión para su threshold, y bajo
 *  qué dial del escenario debería pasar. Si la decisión NO está en este
 *  mapa, se considera INVARIANTE y pasa tal cual. */
type V2Signals = Record<string, unknown>;

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Decide si una decisión específica del stack pasa el threshold del
 *  escenario o debe suprimirse. Devuelve true si pasa, false si suprime. */
function passesScenarioThreshold(
  action: SkuVerdictAction,
  item: SkuVerdictItem,
  diales: DecisionDiales,
  v2: V2Signals | null
): boolean {
  const t = diales.thresholds;
  // D3, D4, D9 y D10 son invariantes — siempre pasan.
  // Felipe 2026-05-18 caso #3: D10 REPLICAR CONCEPTO EN NUEVO MODELO
  // pasa a invariante. Replicar concepto es brief a diseño para futuras
  // drops, NO compromete budget/caja de la temporada en curso. La postura
  // comercial regula la inversión PRESENTE, no las decisiones de
  // desarrollo SIGUIENTE.
  if (
    action === 'replenish' ||
    action === 'pull_forward_intake' ||
    action === 'investigate_root_cause' ||
    action === 'investigate' ||
    action === 'amplify_next_season'
  ) {
    return true;
  }
  // D11 carryover, D12 hold también pasan (estados pasivos, no se modulan)
  if (action === 'carryover' || action === 'hold') return true;
  if (!v2) return true; // sin señales v2 no podemos re-evaluar — dejamos pasar

  const aportacion = num(v2.family_contribution_score);
  const demand = num(v2.demand_score) ?? num((item.evidence as Record<string, unknown>)?.demand_score);
  const rotation_health = num(v2.rotation_health_score);
  const markdown_risk = num(v2.markdown_risk_score) ?? num((item.evidence as Record<string, unknown>)?.markdown_risk_score);
  const returns_vs_baseline = num(v2.returns_vs_baseline_score);
  const fleet_coverage = num(v2.fleet_coverage_score);
  const family_ratio = num((item.evidence as Record<string, unknown>)?.family_velocity_ratio);
  const winner_strength = num(v2.color_winner_strength);
  const efficiency_bought = num(v2.efficiency_bought_pct);
  const efficiency_shipped = num(v2.efficiency_shipped_pct);
  const days_in_store = num((item.evidence as Record<string, unknown>)?.days_in_store);

  switch (action) {
    case 'kill': {
      // Trigger combo (no el de emergencia is_unit_economics_negative,
      // que siempre dispara). Si aportación está disponible y SUPERA el
      // umbral del escenario, suprimimos kill (protege estructural).
      const apoTh = t.kill_combo_aportacion_max;
      if (apoTh != null && aportacion != null && aportacion > apoTh) return false;
      return true;
    }
    case 'markdown_accelerate': {
      const mTh = t.markdown_risk_min;
      if (mTh != null && markdown_risk != null && markdown_risk < mTh) return false;
      return true;
    }
    case 'amplify_distribution': {
      const fcTh = t.amplify_dist_fleet_coverage_max;
      const ctTh = t.amplify_dist_contribution_min;
      // dispara si fleet < fcTh AND (demand>=Th OR contribution>=Th)
      if (fcTh != null && fleet_coverage != null && fleet_coverage >= fcTh) return false;
      if (ctTh != null && aportacion != null && aportacion < ctTh) {
        // demand fallback
        const dTh = t.amplify_dist_demand_min ?? 0;
        if (demand == null || demand < dTh) return false;
      }
      return true;
    }
    case 'amplify_in_season':
    case 'amplify_winner': {
      const cTh = t.amplify_in_season_contribution_min;
      const fTh = t.amplify_in_season_family_ratio_min;
      // dispara si aportación >= cTh OR family_ratio >= fTh
      const passC = cTh == null || (aportacion != null && aportacion >= cTh);
      const passF = fTh == null || (family_ratio != null && family_ratio >= fTh);
      // Si NINGUNO pasa, suprimimos. Si AL MENOS UNO pasa, dejamos.
      return passC || passF;
    }
    case 'extend_colors': {
      const wsTh = t.extend_colors_winner_strength_min;
      const ctTh = t.extend_colors_contribution_min;
      if (wsTh != null && winner_strength != null && winner_strength < wsTh) return false;
      if (ctTh != null && aportacion != null && aportacion < ctTh) return false;
      return true;
    }
    case 'resize_down': {
      const bTh = t.resize_down_bought_pct_max;
      const sTh = t.resize_down_shipped_pct_max;
      // dispara si bought < bTh OR shipped < sTh
      const passB = bTh != null && efficiency_bought != null && efficiency_bought < bTh;
      const passS = sTh != null && efficiency_shipped != null && efficiency_shipped < sTh;
      return passB || passS;
    }
    // amplify_next_season ahora invariante (ver early-return arriba).
    default:
      return true;
  }
}

/** Aplica el modificador de confianza del escenario al item. Capped a
 *  [0.20, 0.98] para evitar extremos. */
function modulateConfidence(action: SkuVerdictAction, conf: number, diales: DecisionDiales): number {
  let mod = 1.0;
  switch (action) {
    case 'kill': mod = diales.confidence_modifier.kill; break;
    case 'markdown_accelerate': mod = diales.confidence_modifier.rebajar; break;
    case 'amplify_distribution': mod = diales.confidence_modifier.amplify_dist; break;
    case 'amplify_in_season':
    case 'amplify_winner': mod = diales.confidence_modifier.amplify_in_season; break;
    case 'extend_colors': mod = diales.confidence_modifier.extend_colors; break;
    case 'resize_down': mod = diales.confidence_modifier.resize_down; break;
    // amplify_next_season invariante (caso #3): sin modulación de confianza por escenario.
    default: mod = 1.0;
  }
  return Math.min(0.98, Math.max(0.20, conf * mod));
}

/** Aplica modulador de magnitud sobre recommended_units cuando aplica.
 *  Felipe 2026-05-18 caso #2: las decisiones de SUPPLY (pull_forward,
 *  replenish) NO son invariantes en magnitud. El DISPARO sí (rotura
 *  manda), pero CUÁNTO comprar/adelantar se gradualiza con el escenario:
 *  - Conservar margen: más prudente con caja
 *  - Balanceada: ritmo natural
 *  - Maximizar venta: empujar fuerte (incluso adelantar TODO el pending)  */
function modulateMagnitude(action: SkuVerdictAction, item: SkuVerdictItem, diales: DecisionDiales): SkuVerdictItem {
  const units = item.recommended_units;
  switch (action) {
    case 'amplify_distribution': {
      const mul = diales.magnitude.amplify_dist_stores_multiplier;
      return units != null && mul !== 1.0
        ? { ...item, recommended_units: Math.round(units * mul) }
        : item;
    }
    case 'amplify_in_season':
    case 'amplify_winner': {
      const mul = diales.magnitude.amplify_in_season_units_multiplier;
      return units != null && mul !== 1.0
        ? { ...item, recommended_units: Math.round(units * mul) }
        : item;
    }
    case 'resize_down': {
      const mul = diales.magnitude.resize_down_multiplier;
      return units != null && mul !== 1.0
        ? { ...item, recommended_units: Math.round(units * mul) }
        : item;
    }
    case 'pull_forward_intake': {
      // Recalcular desde evidence raw: min(stock_pending, velocity_7d × weeks)
      // Si weeks = Infinity (Maximizar) → adelantar TODO el pending.
      const ev = item.evidence as Record<string, unknown>;
      const pending = num(ev.stock_pending);
      const velocity7d = num(ev.velocity_7d);
      const weeks = diales.magnitude.pull_forward_weeks_of_cover;
      if (pending == null || pending <= 0) return item;
      let newUnits: number;
      if (weeks === Infinity) {
        newUnits = pending;
      } else if (velocity7d != null && velocity7d > 0) {
        newUnits = Math.min(pending, Math.round(velocity7d * weeks));
      } else {
        return item; // sin velocity, no podemos recalcular
      }
      // Reescribir rationale para reflejar la magnitud del escenario
      const styleName =
        (typeof ev._style_name === 'string' ? ev._style_name : '') || 'este SKU';
      const overdue = num(ev.logistic_rupture_days_overdue);
      const isRupture = ev.is_logistic_rupture === true;
      const newRationale = isRupture
        ? `ROTURA LOGÍSTICA · ${pending.toLocaleString('es-ES')} uds pendientes con fecha de entrada vencida hace ${overdue ?? '?'} día(s). ` +
          (weeks === Infinity
            ? `Adelantar TODO el pedido pendiente (${pending.toLocaleString('es-ES')} uds).`
            : `Adelantar ${newUnits.toLocaleString('es-ES')} uds (≈${weeks} semanas de cobertura al ritmo actual).`)
        : weeks === Infinity
          ? `Adelantar TODO el pedido pendiente (${pending.toLocaleString('es-ES')} uds) para meter en tienda lo antes posible.`
          : `Adelantar ${newUnits.toLocaleString('es-ES')} uds del pendiente (≈${weeks} semanas de cobertura).`;
      return { ...item, recommended_units: newUnits, rationale: newRationale };
    }
    case 'replenish': {
      // Recalcular target = velocity × (cover_target_days + lead_time_days)
      // gap = max(0, target - pipeline_total). Inputs leídos desde evidence
      // raw que buildVerdictItem ahora persiste.
      const ev = item.evidence as Record<string, unknown>;
      const velocityPerDay = num(ev._raw_velocity_per_day);
      const pipelineTotal = num(ev._raw_pipeline_total);
      const leadTime = num(ev._raw_lead_time_days) ?? 0;
      const targetCoverDays = diales.magnitude.replenish_target_cover_days;
      if (velocityPerDay == null || velocityPerDay <= 0) return item;
      const coverageDays = targetCoverDays + leadTime;
      const targetUnits = velocityPerDay * coverageDays;
      const gap = Math.max(0, Math.round(targetUnits - (pipelineTotal ?? 0)));
      // Mantener rationale base; el footer mostrará la cantidad correcta
      return { ...item, recommended_units: gap };
    }
    default:
      return item;
  }
}

/** Aplica el escenario completo a un verdict stack: filtra decisiones
 *  que no pasan threshold + modula magnitud + modula confianza. */
export function applyScenarioToVerdict<V extends SkuVerdict>(
  verdict: V,
  diales: DecisionDiales,
  v2: V2Signals | null
): V {
  const survivors = verdict.actions
    .filter((a) => passesScenarioThreshold(a.action, a, diales, v2))
    .map((a) => {
      const withMag = modulateMagnitude(a.action, a, diales);
      const newConf = modulateConfidence(a.action, withMag.confidence, diales);
      return { ...withMag, confidence: newConf };
    });
  // P0-B · Aplicar exclusión post-modulación. Un escenario puede destapar
  // D2/D8 con umbral más bajo (e.g., Conservar margen markdown_risk≥0.30),
  // y debemos garantizar que el stack final NO mezcla markdown/kill con
  // replenish/amplify. Caso real: SKUs 5107 96 712 + 2127 67 620 emitían
  // MARKDOWN + REPLENISH + RESIZE_DOWN simultáneos pre-fix (auditoría Codex).
  const cleaned = applyExclusionRules({ ...verdict, actions: survivors }, v2 ?? null);
  return cleaned as V;
}
