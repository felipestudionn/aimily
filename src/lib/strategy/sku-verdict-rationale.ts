/**
 * Per-SKU rationale generator.
 *
 * Felipe's rule: every SKU verdict surfaces a human sentence explaining
 * the situation. "Investigar" alone is opaque; "Vende rápido pero 24%
 * devoluciones — revisar tech-pack" tells the buyer what to do and why.
 *
 * Deterministic templates per action type. Each template reads the
 * relevant fields from the candidate's evidence + the SKU's identity
 * and renders a Spanish sentence with concrete numbers.
 *
 * No LLM call — runs cheap, predictable, and at scale (48 SKUs in a few
 * milliseconds). LLM-generated narrative still lives at scenario scope
 * (narrative.ts) for the executive-summary layer.
 */

import type { SkuVerdictAction } from './sku-verdict-resolver';

export interface RationaleContext {
  product_name: string | null;
  family_code: string | null;
  model_ref: string | null;
  /** Velocity in units / 7d (typically from evidence.velocity_7d). */
  velocity_7d: number | null;
  /** Velocity ratio current/8-14d (>1 accelerating, <1 decelerating). */
  velocity_ratio: number | null;
  /** Returns percentage (0..1). */
  returns_pct: number | null;
  /** Effective margin after returns (-1..+1). */
  effective_margin: number | null;
  /** Lifecycle stage from classifier. */
  lifecycle_stage: string | null;
  /** Sell-through % of original buy (0..1). */
  sell_through_bought_pct: number | null;
  /** Active stores selling. */
  stores_active: number | null;
  /** Days of stock at current velocity. */
  current_stock_days: number | null;
  /** Recommended buy units (replenish only). */
  recommended_units: number | null;
  /** Target rotation in days (4 default). */
  target_rotation_days: number;
}

function pct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

function num(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

/**
 * Generate a 1-2 sentence Spanish rationale for the given action +
 * context. Never returns empty — always at least a generic fallback.
 */
export function generateRationale(
  action: SkuVerdictAction,
  ctx: RationaleContext
): string {
  switch (action) {
    case 'replenish': {
      const parts: string[] = [];
      if (ctx.current_stock_days != null && ctx.current_stock_days < ctx.target_rotation_days) {
        parts.push(
          `Stock cubre ${ctx.current_stock_days}d vs objetivo ${ctx.target_rotation_days}d`
        );
      }
      if (ctx.velocity_7d != null) {
        parts.push(`vende ${num(ctx.velocity_7d)} uds/7d`);
      }
      if (ctx.velocity_ratio != null && ctx.velocity_ratio >= 1.1) {
        parts.push('demanda acelerando');
      }
      const head = parts.length > 0 ? parts.join(', ') + '.' : 'Demanda no cubierta.';
      const tail =
        ctx.recommended_units != null && ctx.recommended_units > 0
          ? ` Reponer ${num(ctx.recommended_units)} uds para llegar a rotación de ${ctx.target_rotation_days}d.`
          : ' Considera reponer para llegar a rotación objetivo.';
      return head + tail;
    }

    case 'carryover': {
      // Hero: mature/peak + good margin + good sell-through
      const isHero =
        (ctx.sell_through_bought_pct ?? 0) >= 0.5 &&
        (ctx.returns_pct ?? 0) <= 0.18;
      const lifecycle = ctx.lifecycle_stage;

      if (isHero && (lifecycle === 'mature' || lifecycle === 'peak')) {
        return `Hero de la familia ${ctx.family_code ?? ''}. Sell-through ${pct(
          ctx.sell_through_bought_pct
        )} con devoluciones controladas (${pct(
          ctx.returns_pct,
          1
        )}). Mantener en la próxima temporada sin refuerzo.`;
      }
      if (lifecycle === 'peak') {
        return `En pico de ciclo (${num(ctx.velocity_7d)} uds/7d). No reforzar; dejar que el stock actual se vacíe a buen ritmo.`;
      }
      if (lifecycle === 'mature') {
        return `Producto maduro. Velocidad estable a ${num(
          ctx.velocity_7d
        )} uds/7d. Mantener línea sin compra adicional.`;
      }
      return `Performance saludable. Mantener línea; revisar de nuevo en el próximo run.`;
    }

    case 'kill': {
      const reason: string[] = [];
      if (ctx.lifecycle_stage === 'exit') reason.push('ciclo en salida');
      if ((ctx.sell_through_bought_pct ?? 1) < 0.2)
        reason.push(`sell-through bajo (${pct(ctx.sell_through_bought_pct)})`);
      if ((ctx.effective_margin ?? 0) < 0)
        reason.push(`margen efectivo negativo (${pct(ctx.effective_margin, 1)} tras devoluciones)`);
      const why = reason.length > 0 ? reason.join(' + ') : 'rendimiento bajo';
      return `Matar el SKU: ${why}. No reponer ni replicar próxima temporada. Liquidar stock actual si aplica.`;
    }

    case 'markdown_accelerate': {
      const stockDays = ctx.current_stock_days != null ? `${ctx.current_stock_days}d de stock` : 'stock elevado';
      const velocity = ctx.velocity_7d != null ? `${num(ctx.velocity_7d)} uds/7d` : '';
      const head = `Declive ${ctx.lifecycle_stage === 'decay' ? 'confirmado' : 'probable'}: ${stockDays}${
        velocity ? ` a ${velocity}` : ''
      }.`;
      return `${head} Markdown acelera salida y libera capital antes de fin de temporada.`;
    }

    case 'resize_down': {
      const stPart =
        ctx.sell_through_bought_pct != null
          ? `Sell-through ${pct(ctx.sell_through_bought_pct)}`
          : 'Sell-through bajo';
      return `${stPart} con sobre-compra detectada. Próxima compra: reducir cantidad ~40% y rebalancear la familia hacia variantes que sí venden.`;
    }

    case 'investigate': {
      const reasons: string[] = [];
      if ((ctx.returns_pct ?? 0) >= 0.18) {
        reasons.push(`devoluciones altas (${pct(ctx.returns_pct, 1)})`);
      }
      if ((ctx.velocity_7d ?? 0) > 0 && ctx.velocity_ratio != null && ctx.velocity_ratio >= 1) {
        reasons.push(`venta sostenida (${num(ctx.velocity_7d)} uds/7d)`);
      }
      if ((ctx.effective_margin ?? 0) < 0.1 && (ctx.effective_margin ?? 0) >= 0) {
        reasons.push(`margen efectivo muy fino (${pct(ctx.effective_margin, 1)})`);
      }
      const head =
        reasons.length > 0
          ? reasons.join(' + ')
          : 'señales contradictorias en los datos';
      const ask = (ctx.returns_pct ?? 0) >= 0.2
        ? 'Revisar fit / tech-pack / calidad antes de reponer o escalar a más colores.'
        : 'Validar con el equipo merch antes de tomar acción.';
      return `Vuela pero también vuela de vuelta: ${head}. ${ask}`;
    }

    case 'extend_colors': {
      // The lineage-level helper in sku-verdict-resolver.ts already
      // generates a contextual rationale with the winner color name.
      // This branch is a fallback only — never expected to fire during
      // normal flow.
      return 'Color winner detectado en el lineage. Considera extender la paleta.';
    }

    case 'amplify_winner': {
      // The hero-detection helper in sku-verdict-resolver.ts already
      // generates a contextual rationale with the family + demand_score.
      // This branch is a fallback only.
      return 'Hero confirmado: vende muy por encima de su familia. Diseñar secuelas para próxima temporada.';
    }

    case 'hold': {
      const newStage = ctx.lifecycle_stage === 'new';
      if (newStage) {
        return `Producto recién lanzado. No hay datos suficientes para recomendar acción — esperar 2-3 semanas a que se estabilice la señal.`;
      }
      if (ctx.lifecycle_stage === 'insufficient_evidence' || ctx.velocity_7d == null) {
        return `Datos insuficientes para un veredicto robusto. Re-evaluar tras próximo run con más cobertura.`;
      }
      return `Sin señal clara hacia ninguna acción. Mantener línea actual; revisar próxima temporada.`;
    }
  }
}

/**
 * Strip the unit-counting magic for actions where it doesn't apply.
 * Only `replenish` should carry a recommended_units value. Carryover is
 * "do nothing" by definition; surfacing a number there confuses the buyer.
 */
export function shouldCarryUnits(action: SkuVerdictAction): boolean {
  return action === 'replenish';
}
