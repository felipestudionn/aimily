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
  /** Forward Weeks of Cover from classifier trace (post-spec-v1). Optional —
   *  when present, markdown rationale uses it explicitly. */
  fwoc_weeks?: number | null;
  /** Season weeks remaining (synthetic default 13 when no tenant data). */
  season_weeks_remaining?: number | null;
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
      // 3-step ladder rationale (Donnellan "Merchandise Buying and
      // Management" ch.12 + universal LCF/FIT/LIM classroom canon):
      //   Stage 1 (Initial)   = -25% to -30% at ~60% time-elapsed
      //   Stage 2 (Second)    = -40% to -60% at ~80% time-elapsed (3 weeks after Stage 1)
      //   Stage 3 (Terminal)  = -70%+ at end-of-season (3 weeks after Stage 2)
      // Never-increase ratchet: once a cluster receives a markdown, it
      // never reverses.
      //
      // Stage selection: derived from FWOC / season_weeks_remaining ratio
      // (the new markdown_risk_score unit). Higher ratio = later stage.
      //   ratio in [0.4, 0.7]  → Stage 1 Initial
      //   ratio in (0.7, 0.9]  → Stage 2 Second
      //   ratio > 0.9          → Stage 3 Terminal
      const stockDays = ctx.current_stock_days != null ? `${ctx.current_stock_days}d de stock` : 'stock elevado';
      const velocity = ctx.velocity_7d != null ? `${num(ctx.velocity_7d)} uds/7d` : '';
      const fwoc = ctx.fwoc_weeks ?? null;
      const seasonLeft = ctx.season_weeks_remaining ?? null;
      const fwocRatio = fwoc != null && seasonLeft != null && seasonLeft > 0 ? fwoc / seasonLeft : null;

      let stage: 'initial' | 'second' | 'terminal' = 'initial';
      let depth = '−25%/−30%';
      let stageName = 'Stage 1 Initial';
      if (fwocRatio != null) {
        if (fwocRatio > 0.9) {
          stage = 'terminal';
          depth = '−70% o más';
          stageName = 'Stage 3 Terminal';
        } else if (fwocRatio > 0.7) {
          stage = 'second';
          depth = '−40%/−60%';
          stageName = 'Stage 2 Second';
        }
      } else if (ctx.lifecycle_stage === 'exit') {
        stage = 'terminal';
        depth = '−70% o más';
        stageName = 'Stage 3 Terminal';
      } else if (ctx.lifecycle_stage === 'decay') {
        stage = 'second';
        depth = '−40%/−60%';
        stageName = 'Stage 2 Second';
      }

      const head = `Declive ${ctx.lifecycle_stage === 'decay' ? 'confirmado' : 'probable'}: ${stockDays}${
        velocity ? ` a ${velocity}` : ''
      }.`;
      const fwocClause =
        fwoc != null && seasonLeft != null
          ? ` FWOC ${fwoc.toFixed(1)} sem vs ${seasonLeft.toFixed(0)} sem hasta fin de temporada.`
          : '';
      const nextStageClause =
        stage === 'initial'
          ? ' Si tras 3 semanas el stock no se libera, escalar a Stage 2 (−40%/−60%).'
          : stage === 'second'
          ? ' Si tras 3 semanas el stock sigue parado, escalar a Stage 3 Terminal (−70%+).'
          : ' Final del ladder — liquidar antes del cierre de temporada.';

      return `${head}${fwocClause} Aplicar ${stageName} (${depth}) ahora — never-increase ratchet, los próximos updates solo pueden profundizar.${nextStageClause}`;
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
      // Legacy alias for the pre-split amplify verb. The split version
      // (amplify_in_season + amplify_next_season) gets contextual
      // rationale via dedicated appenders in route.ts; this branch is a
      // fallback only.
      return 'Hero confirmado: vende muy por encima de su familia. Diseñar secuelas para próxima temporada.';
    }

    case 'amplify_in_season': {
      // The in-season amplify appender generates the contextual rationale
      // with Reorder + Distort breakdown. This is a fallback only.
      return 'Hero confirmado en temporada: reorder + distort hacia las tiendas/tallas/colores donde acelera. No esperar a próxima temporada.';
    }

    case 'amplify_next_season': {
      // Next-season sequel brief — fired only after days_in_store ≥ 28.
      // The dedicated appender generates the contextual brief with
      // proposed silhouettes + materials + colors.
      return 'Hero validado con 4+ semanas de datos: briefar al equipo de diseño 2-3 secuelas para próxima temporada.';
    }

    case 'amplify_distribution': {
      // High STR in stocked stores + low distribution breadth + warehouse
      // stock available. Push to more archetype-matched stores.
      return 'Vende bien donde está pero está en pocas tiendas. Empujar warehouse stock a más tiendas archetype-matched para captar la demanda no servida.';
    }

    case 'pull_forward_intake': {
      // Hero ramping faster than plan + pending PO arrival too late.
      // Supplier flex required.
      return 'Ramping más rápido que el plan: adelantar la entrada del PO para evitar rotura antes de que llegue el stock pendiente.';
    }

    case 'promote_push': {
      // Velocity below plan BUT cause is known (campaign / weather / drop).
      // Marketing lever instead of kill/investigate.
      return 'Velocidad por debajo del plan pero la causa es conocida (campaña / lanzamiento / estacional). Aplicar marketing lever en vez de matar el SKU.';
    }

    case 'investigate_root_cause': {
      // The new name for investigate when cause is unknown. The
      // marketing-cause variant becomes promote_push.
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
