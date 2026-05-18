/**
 * Appenders P0-J (D9 INVESTIGATE por triggers absolutos) + P0-C (hero fallback).
 *
 * Spec source: memory/decision-tree_aimily-in-season-2026-05-18.md §3
 * Sprint cierre P0 · 2026-05-18 · Felipe + Codex audit.
 *
 * D9 absolutos: returns ≥ 0.25 · cannibalization > 0.5 · compra inflada
 *   (bought/shipped < 0.4) · data_sanity_violated. Spec dice "D9 es
 *   compatible con TODAS las decisiones" — no se filtra por exclusión.
 *
 * Hero fallback: pdf_rank ≤ 10 OR velocity_rank ≤ 10 OR units_7d en top-decile,
 *   con returns OK → fuerza emisión de carryover / amplify_in_season /
 *   amplify_next_season aunque demand_score normalizado salga bajo (caso real:
 *   Mandarin Blouse 2548 2 710 con 13k uds/7d que el sistema dejaba como
 *   "carryover único" — debería ser hero stack completo).
 */

import type { SkuVerdict, SkuVerdictItem } from './sku-verdict-resolver';

type V2 = Record<string, unknown>;
type Identity = {
  product_name: string | null;
  family_code: string | null;
  model_ref: string;
  color_ref: string | null;
  color_name: string | null;
};

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Inyecta D9 INVESTIGATE para triggers absolutos no cubiertos por la lógica
 * estándar. Compatible con cualquier otra acción del stack (spec §3 D9).
 */
export function appendInvestigateAbsoluteTriggers(
  verdict: SkuVerdict,
  v2: V2 | null,
  identity: Identity
): SkuVerdict {
  if (!v2) return verdict;

  // No duplicar si ya hay un investigate.
  if (verdict.actions.some((a) => a.action === 'investigate' || a.action === 'investigate_root_cause')) {
    return verdict;
  }

  const returnsPct = num(v2.returns_pct);
  const returnsVsBaseline = num(v2.returns_vs_baseline_score);
  const cannibalization = num(v2.cannibalization_risk_score);
  const boughtPct = num(v2.efficiency_bought_pct);
  const shippedPct = num(v2.efficiency_shipped_pct);
  const dataSanityViolated = v2.data_sanity_violated === true;
  const emptyingRate = num(v2.emptying_rate);

  const reasons: string[] = [];
  let confidence = 0.70;

  // P0-J · returns absolutos
  if (returnsPct != null && returnsPct >= 0.25) {
    reasons.push(
      `Devoluciones absolutas ${Math.round(returnsPct * 100)}% · revisar fit / talla / margin trap`
    );
    confidence = Math.max(confidence, 0.85);
  } else if (returnsVsBaseline != null && returnsVsBaseline >= 2.0) {
    reasons.push(
      `Devoluciones ${returnsVsBaseline.toFixed(1)}× el baseline de su familia · revisar fit`
    );
    confidence = Math.max(confidence, 0.80);
  }

  // P0-H · cannibalization gate
  if (cannibalization != null && cannibalization > 0.5) {
    reasons.push(
      `Otro SKU del estilo absorbiendo demanda (canibalización ${cannibalization.toFixed(2)}) · investigar pair-color antes de reabastecer`
    );
    confidence = Math.max(confidence, 0.78);
  }

  // P0-K · compra inflada
  if (
    boughtPct != null &&
    shippedPct != null &&
    shippedPct > 0 &&
    boughtPct / shippedPct < 0.4 &&
    shippedPct >= 0.30
  ) {
    reasons.push(
      `Compra inflada relativa al éxito en suelo (bought ${Math.round(boughtPct * 100)}% vs shipped ${Math.round(shippedPct * 100)}%) · revisar tamaño del próximo pedido`
    );
    confidence = Math.max(confidence, 0.75);
  }

  // P0-D · datos imposibles
  if (dataSanityViolated) {
    const detail =
      emptyingRate != null && emptyingRate > 5.0
        ? `emptying_rate ${emptyingRate.toFixed(2)} (rotación absurda — posible error de parser)`
        : 'pipeline grande coexistiendo con rotura reportada · contradicción de datos';
    reasons.push(`Datos sospechosos: ${detail} · validar con tienda/almacén antes de decidir`);
    confidence = Math.max(confidence, 0.82);
  }

  if (reasons.length === 0) return verdict;

  const styleName = (identity.product_name || '').trim() || identity.model_ref;
  const rationale = `${styleName}: ${reasons.join(' · ')}.`;

  const investigateItem: SkuVerdictItem = {
    action: 'investigate',
    confidence,
    rationale,
    recommended_units: null,
    confidence_breakdown: {
      data_completeness: null,
      identity: null,
      demand: null,
      margin: null,
      creative_fit: null,
    },
    evidence: {
      returns_pct: returnsPct,
      returns_vs_baseline_score: returnsVsBaseline,
      cannibalization_risk_score: cannibalization,
      efficiency_bought_pct: boughtPct,
      efficiency_shipped_pct: shippedPct,
      data_sanity_violated: dataSanityViolated,
      triggers: reasons,
    },
    counter_evidence: {},
    assumptions: [],
    data_sufficiency_warning: null,
  };

  return { ...verdict, actions: [...verdict.actions, investigateItem] };
}

/**
 * P0-C · Hero fallback. Si el SKU es claramente hero por señales absolutas
 * (pdf_rank, velocity_rank, units_7d top-decile) pero el sistema NO emitió
 * amplify_in_season / amplify_next_season / carryover, los fuerza. El gate
 * de returns ≤ 0.20 evita falsos positivos en SKUs con margin trap.
 *
 * Caso real: 2548 2 710 (Mandarin Blouse) tenía 13k uds/7d (top-3 absoluto)
 * pero el sistema sólo decía "carryover" porque demand_score normalizado
 * salía bajo. Comprador senior diría: AMPLIFY_IN_SEASON ya.
 */
export function appendHeroFallback(
  verdict: SkuVerdict,
  v2: V2 | null,
  pdfRank: number | null,
  velocityRank: number | null,
  isUnitsTopDecile: boolean,
  identity: Identity
): SkuVerdict {
  if (!v2) return verdict;

  const returnsPct = num(v2.returns_pct);
  const returnsVsBaseline = num(v2.returns_vs_baseline_score);
  const shippedPct = num(v2.efficiency_shipped_pct);

  // Gates para evitar falsos positivos
  if (returnsPct != null && returnsPct >= 0.25) return verdict;
  if (returnsVsBaseline != null && returnsVsBaseline >= 2.0) return verdict;
  if (shippedPct != null && shippedPct < 0.30) return verdict;
  if (v2.data_sanity_violated === true) return verdict;

  const isHero =
    (pdfRank != null && pdfRank <= 10) ||
    (velocityRank != null && velocityRank <= 10) ||
    isUnitsTopDecile;

  if (!isHero) return verdict;

  const hasAmplifyInSeason = verdict.actions.some(
    (a) => a.action === 'amplify_in_season' || a.action === 'amplify_winner'
  );
  const hasAmplifyNextSeason = verdict.actions.some((a) => a.action === 'amplify_next_season');

  // Si alguna otra fuerza ya bloqueó el SKU (kill, markdown, replenish urgente
  // con datos sanos), respetamos. Hero fallback NO debe sobreescribir bloqueos.
  const hasKill = verdict.actions.some((a) => a.action === 'kill');
  const hasMarkdown = verdict.actions.some((a) => a.action === 'markdown_accelerate');
  if (hasKill || hasMarkdown) return verdict;

  const additions: SkuVerdictItem[] = [];
  const styleName = (identity.product_name || '').trim() || identity.model_ref;

  if (!hasAmplifyInSeason) {
    additions.push({
      action: 'amplify_in_season',
      confidence: 0.78,
      rationale: `${styleName} es hero absoluto del corpus (PDF rank ${pdfRank ?? '?'}, velocity rank ${velocityRank ?? '?'}). Comprar unidades adicionales sobre el ritmo natural para amplificar.`,
      recommended_units: null,
      confidence_breakdown: {
        data_completeness: 0.80,
        identity: 0.85,
        demand: 0.75,
        margin: null,
        creative_fit: null,
      },
      evidence: {
        pdf_rank: pdfRank,
        velocity_rank: velocityRank,
        units_top_decile: isUnitsTopDecile,
        hero_fallback: true,
      },
      counter_evidence: {},
      assumptions: ['Hero detectado por ranking absoluto (fallback); demand_score normalizado bajo o NULL'],
      data_sufficiency_warning: null,
    });
  }

  if (!hasAmplifyNextSeason) {
    additions.push({
      action: 'amplify_next_season',
      confidence: 0.75,
      rationale: `${styleName}: brief a diseño para próximas drops · replicar silueta + material en futuros desarrollos.`,
      recommended_units: null,
      confidence_breakdown: {
        data_completeness: 0.80,
        identity: 0.85,
        demand: 0.75,
        margin: null,
        creative_fit: null,
      },
      evidence: {
        pdf_rank: pdfRank,
        velocity_rank: velocityRank,
        hero_fallback: true,
      },
      counter_evidence: {},
      assumptions: ['Hero detectado por ranking absoluto'],
      data_sufficiency_warning: null,
    });
  }

  if (additions.length === 0) return verdict;
  return { ...verdict, actions: [...verdict.actions, ...additions] };
}
