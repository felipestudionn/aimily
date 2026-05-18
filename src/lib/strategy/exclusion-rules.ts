/**
 * Matriz de exclusión cruzada — aplicada al stack final de cada SKU.
 *
 * Spec source: memory/decision-tree_aimily-in-season-2026-05-18.md §4
 *
 * Esta función se llama en DOS puntos del flujo:
 *   1) En el route, sobre el verdict base (sin escenario) tras los
 *      appenders — para limpiar el universo de partida.
 *   2) Dentro de `applyScenarioToVerdict`, tras filtrar por threshold +
 *      modular magnitud/confianza — porque un escenario puede disparar
 *      D2/D8 en SKUs donde D3/D6 ya estaban presentes, y necesitamos que
 *      el bloqueo aplique al stack final (Felipe sprint P0-B · auditoría
 *      Codex 2026-05-18).
 *
 * STEP 1 — bloqueo cardinal protector del hero (caso #1 Bomber 5247/600).
 * STEP 2 — exclusiones cruzadas normales según matriz §4.
 */

export type VerdictItemLite = {
  action: string;
  evidence?: Record<string, unknown>;
};

export function applyExclusionRules<V extends {
  actions: Array<VerdictItemLite>;
  product_fact_id: string;
}>(
  verdict: V,
  v2: Record<string, unknown> | null
): V {
  // STEP 1 · BLOQUEO CARDINAL PROTECTOR DEL HERO (caso #1 Bomber).
  // Si éxito_enviado ≥ 50% O rotura logística, suprime kill / markdown /
  // resize_down de raíz para que no contaminen el cálculo de bloqueos
  // de step 2 (hasKill, hasMarkdown).
  const shippedPct =
    v2 && typeof v2.efficiency_shipped_pct === 'number'
      ? (v2.efficiency_shipped_pct as number)
      : null;
  const isLogisticRupture = v2 && v2.is_logistic_rupture === true;
  // P0-G · Late-season-stuck excepción a la regla anti-Bomber: si el SKU
  // está en decay/exit/mature con markdown_risk alto y pipeline tardío,
  // el ST_shipped acumulado alto NO refuta la rebaja del stock que queda.
  const isLateSeasonStuck = v2 && v2.is_late_season_stuck === true;
  const heroProtection =
    !isLateSeasonStuck &&
    ((shippedPct != null && shippedPct >= 0.50) || isLogisticRupture);

  let workingActions = verdict.actions;
  if (heroProtection) {
    workingActions = workingActions.filter(
      (a) =>
        a.action !== 'kill' &&
        a.action !== 'markdown_accelerate' &&
        a.action !== 'resize_down'
    );
  }

  // STEP 2 · Exclusiones cruzadas normales (matriz §4 del spec).
  const hasAction = (a: string) =>
    workingActions.some((x) => x.action === a);
  const hasKill = hasAction('kill');
  const hasMarkdown = hasAction('markdown_accelerate');
  const hasUrgentReplenish = hasAction('replenish');
  const hasResizeDown = hasAction('resize_down');

  const blocked = new Set<string>();
  if (hasKill) {
    blocked.add('amplify_distribution');
    blocked.add('replenish');
    blocked.add('amplify_in_season');
    blocked.add('pull_forward_intake');
    blocked.add('amplify_next_season');
    blocked.add('extend_colors');
  }
  if (hasMarkdown) {
    blocked.add('amplify_distribution');
    blocked.add('replenish');
    blocked.add('amplify_in_season');
    blocked.add('pull_forward_intake');
  }
  if (hasUrgentReplenish) {
    // "Reposición urgente manda sobre Reponer máx venta" (Felipe).
    blocked.add('amplify_in_season');
  }
  if (hasResizeDown) {
    blocked.add('amplify_next_season');
  }

  // STEP 3 · Bloqueos cardinales por señales absolutas (P0-D/E/H/I/K · 2026-05-18).
  // Estos NO dependen de qué otras acciones disparen. Son invariantes de
  // postura comercial — un SKU con returns 40% no se reabastece en ningún
  // escenario, da igual lo que mande el dial.

  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  const returnsPct = num(v2?.returns_pct);
  const returnsVsBaseline = num(v2?.returns_vs_baseline_score);
  const cannibalization = num(v2?.cannibalization_risk_score);
  const boughtPct = num(v2?.efficiency_bought_pct);
  const shippedPctV2 = num(v2?.efficiency_shipped_pct);
  const dataSanityViolated = v2?.data_sanity_violated === true;
  const emptyingRate = num(v2?.emptying_rate);

  // P0-E · Return-trap: returns absolutos altos → no reabasteces, no
  // amplificas, no replicas, no extiendes colores. Forzamos INVESTIGATE.
  // Trigger: `returns_pct ≥ 0.25` OR `returns_vs_baseline ≥ 2.0`.
  const isReturnTrap =
    (returnsPct != null && returnsPct >= 0.25) ||
    (returnsVsBaseline != null && returnsVsBaseline >= 2.0);
  if (isReturnTrap) {
    blocked.add('replenish');
    blocked.add('pull_forward_intake');
    blocked.add('amplify_distribution');
    blocked.add('amplify_in_season');
    blocked.add('amplify_next_season');
    blocked.add('extend_colors');
    blocked.add('carryover');
  }

  // P0-H · Cannibalization gate: si cannibalization>0.5, otro SKU del
  // estilo está absorbiendo demanda — reabastecer ESTE replica el problema.
  if (cannibalization != null && cannibalization > 0.5) {
    blocked.add('replenish');
    blocked.add('pull_forward_intake');
    blocked.add('amplify_distribution');
  }

  // P0-I · D5/D6 gate ST_shipped: no amplificas un SKU que no vende donde
  // ya está. Si ST_shipped < 0.30, AMPLIFY_DIST + AMPLIFY_IN_SEASON +
  // EXTEND_COLORS bloqueados — primero diagnostica por qué no rota.
  if (shippedPctV2 != null && shippedPctV2 < 0.30) {
    blocked.add('amplify_distribution');
    blocked.add('amplify_in_season');
    blocked.add('extend_colors');
  }

  // P0-K · D8 compra inflada: si bought_pct/shipped_pct < 0.4, la compra
  // es inflada relativa al éxito real en suelo. Reducir compra
  // mecánicamente sin marcar el artefacto es decisión miope —
  // suprimimos D8 (la decisión correcta es INVESTIGATE).
  if (boughtPct != null && shippedPctV2 != null && shippedPctV2 > 0) {
    const ratio = boughtPct / shippedPctV2;
    if (ratio < 0.4 && shippedPctV2 >= 0.30) {
      blocked.add('resize_down');
    }
  }

  // P0-D · Stock sanity: datos verdaderamente imposibles (sanity violated)
  // bloquean buy verbs. Felipe verificó V26: emptying>1 es REAL (rotación
  // acelerada), sólo >5 indica error genuino del parser.
  if (dataSanityViolated || (emptyingRate != null && emptyingRate > 5.0)) {
    blocked.add('replenish');
    blocked.add('pull_forward_intake');
    blocked.add('amplify_distribution');
    blocked.add('amplify_in_season');
  }

  if (blocked.size === 0) {
    return { ...verdict, actions: workingActions };
  }
  return {
    ...verdict,
    actions: workingActions.filter((a) => !blocked.has(a.action)),
  };
}
