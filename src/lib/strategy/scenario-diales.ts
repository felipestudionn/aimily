/**
 * Escenarios comerciales · gradualización 3-dial por decisión.
 *
 * Spec source: memory/decision-tree_aimily-in-season-2026-05-18.md §8.2
 *
 * CARDINAL: ningún escenario elimina decisiones, solo las GRADUALIZA.
 * En Conservar margen sigue habiendo REPONER MAX VENTA — solo los héroes
 * muy claros. En Maximizar venta sigue habiendo REBAJAR — solo en stock
 * muerto evidente.
 *
 * 3 diales por decisión:
 *   • threshold: umbral de disparo (más fácil o más difícil entrar)
 *   • magnitude: si dispara, escala la cantidad/intensidad propuesta
 *   • confidence: cuánta convicción muestra el sistema
 *
 * Decisiones INVARIANTES a escenario:
 *   D3 REPOSICIÓN URGENTE — supply, no postura (caso #2: la MAGNITUD sí gradúa)
 *   D4 ADELANTAR PEDIDO — supply (caso #2: la MAGNITUD sí gradúa)
 *   D9 MARCAR PARA REVISIÓN — diagnóstico
 *   D10 REPLICAR CONCEPTO — brief a diseño para futuras drops, no compromete
 *        budget/caja de la temporada en curso (Felipe 2026-05-18 caso #3)
 */

export type ScenarioId =
  | 'conservar_margen'
  | 'balanceada'
  | 'maximizar_venta'
  | 'tu_mezcla';

export const SCENARIO_LABEL_ES: Record<ScenarioId, string> = {
  conservar_margen: 'Conservar margen',
  balanceada: 'Balanceada',
  maximizar_venta: 'Maximizar venta',
  tu_mezcla: 'Tu mezcla',
};

export const SCENARIO_ORDER: ScenarioId[] = [
  'conservar_margen',
  'balanceada',
  'maximizar_venta',
  'tu_mezcla',
];

/** Diales por decisión × escenario. Los thresholds aquí SON los valores
 *  reales que los appenders consultan. Si un appender hardcodea un
 *  threshold (e.g., 0.20 para aportación en D6), ese valor pasa a leerse
 *  desde este módulo en función del escenario activo. */
export interface DecisionDiales {
  /** Multiplicadores y overrides de threshold por decisión */
  thresholds: {
    // D1 MATAR · combo path
    kill_combo_aportacion_max?: number; // baseline 0.05
    kill_combo_demand_max?: number; // baseline 0.20
    kill_combo_rotation_health_max?: number; // baseline 0.30
    kill_combo_markdown_risk_min?: number; // baseline 0.85
    kill_combo_returns_vs_baseline_min?: number; // baseline 2.0
    // D2 REBAJAR
    markdown_risk_min?: number; // baseline 0.40
    // D5 AMPLIAR DIST
    amplify_dist_fleet_coverage_max?: number; // baseline 0.70
    amplify_dist_demand_min?: number; // baseline 0.50
    amplify_dist_contribution_min?: number; // baseline 0.10
    // D6 REPONER MAX VENTA
    amplify_in_season_contribution_min?: number; // baseline 0.20
    amplify_in_season_family_ratio_min?: number; // baseline 2.0
    // D7 EXTENDER COLORES
    extend_colors_winner_strength_min?: number; // baseline 2.0
    extend_colors_contribution_min?: number; // baseline 0.15
    extend_colors_max_proposed?: number; // baseline 4 (máx colores que proponemos)
    // D8 REDUCIR COMPRA
    resize_down_bought_pct_max?: number; // baseline 0.20
    resize_down_shipped_pct_max?: number; // baseline 0.30
    // D10 REPLICAR CONCEPTO
    replicate_contribution_min?: number; // baseline 0.20
    replicate_days_in_store_min?: number; // baseline 7
  };
  /** Multiplicadores de magnitud sobre la cantidad propuesta (ej. unidades
   *  a comprar, descuento a aplicar, tiendas a añadir) */
  magnitude: {
    rebajar_step_multiplier: number; // mantiene el escalón canónico pero modula intensidad
    amplify_dist_stores_multiplier: number;
    amplify_in_season_units_multiplier: number;
    resize_down_multiplier: number; // cuánto reduce la compra
    /** Felipe 2026-05-18 caso #2: ADELANTAR PEDIDO PENDIENTE gradualiza
     *  cuántas semanas de cobertura adelantar.
     *  Maximizar venta = Infinity → adelantar TODO el pending.
     *  Balanceada = 4 semanas (fórmula actual).
     *  Conservar margen = 2 semanas (mitad). */
    pull_forward_weeks_of_cover: number;
    /** Caso #2: REPOSICIÓN URGENTE gradualiza el target de cobertura
     *  objetivo en días. Maximizar = 30d (colchón amplio). Balanceada =
     *  21d (estándar). Conservar = 14d (mínimo viable). */
    replenish_target_cover_days: number;
  };
  /** Modificador a la confianza base del verdict para reflejar la postura
   *  del escenario. Aplicado MULTIPLICATIVAMENTE al final (capped a [0.2, 0.98]). */
  confidence_modifier: {
    kill: number;
    rebajar: number;
    amplify_dist: number;
    amplify_in_season: number;
    extend_colors: number;
    resize_down: number;
    replicate: number;
  };
}

/** Baseline = lo que un comprador balanceado pediría. ESTE es el set de
 *  thresholds que el motor genera "raw" (sin escenario aplicado).
 *  Los demás escenarios se computan como ajustes sobre este. */
export const BASELINE_DIALES: DecisionDiales = {
  thresholds: {
    kill_combo_aportacion_max: 0.05,
    kill_combo_demand_max: 0.20,
    kill_combo_rotation_health_max: 0.30,
    kill_combo_markdown_risk_min: 0.85,
    kill_combo_returns_vs_baseline_min: 2.0,
    markdown_risk_min: 0.40,
    amplify_dist_fleet_coverage_max: 0.70,
    amplify_dist_demand_min: 0.50,
    amplify_dist_contribution_min: 0.10,
    amplify_in_season_contribution_min: 0.20,
    amplify_in_season_family_ratio_min: 2.0,
    extend_colors_winner_strength_min: 2.0,
    extend_colors_contribution_min: 0.15,
    extend_colors_max_proposed: 4,
    resize_down_bought_pct_max: 0.20,
    resize_down_shipped_pct_max: 0.30,
    replicate_contribution_min: 0.20,
    replicate_days_in_store_min: 7,
  },
  magnitude: {
    rebajar_step_multiplier: 1.0,
    amplify_dist_stores_multiplier: 1.0,
    amplify_in_season_units_multiplier: 1.0,
    resize_down_multiplier: 0.6, // pedido próx = 60% del actual
    pull_forward_weeks_of_cover: 4, // 4 semanas de cobertura del pending
    replenish_target_cover_days: 21, // 21 días cobertura objetivo
  },
  confidence_modifier: {
    kill: 1.0,
    rebajar: 1.0,
    amplify_dist: 1.0,
    amplify_in_season: 1.0,
    extend_colors: 1.0,
    resize_down: 1.0,
    replicate: 1.0,
  },
};

/** Conservar margen · ▲ defensivo · más fácil matar/rebajar/reducir,
 *  más difícil amplificar. Magnitudes ofensivas reducidas 30%. */
export const CONSERVAR_MARGEN_DIALES: DecisionDiales = {
  thresholds: {
    kill_combo_aportacion_max: 0.08, // ▲ permite matar SKUs con hasta 8% aportación (vs 5%)
    kill_combo_demand_max: 0.25,
    kill_combo_rotation_health_max: 0.40,
    kill_combo_markdown_risk_min: 0.75,
    kill_combo_returns_vs_baseline_min: 1.5,
    markdown_risk_min: 0.30, // ▲ rebaja antes
    amplify_dist_fleet_coverage_max: 0.55, // ▼ solo amplía si cobertura <55%
    amplify_dist_demand_min: 0.70,
    amplify_dist_contribution_min: 0.20,
    amplify_in_season_contribution_min: 0.30, // ▼ solo héroes muy claros
    amplify_in_season_family_ratio_min: 2.5,
    extend_colors_winner_strength_min: 2.5,
    extend_colors_contribution_min: 0.20,
    extend_colors_max_proposed: 2, // propone máx 2 colores
    resize_down_bought_pct_max: 0.30, // ▲ reduce más SKUs
    resize_down_shipped_pct_max: 0.40,
    replicate_contribution_min: 0.30, // ▼ solo héroes muy claros
    replicate_days_in_store_min: 14, // más prudente
  },
  magnitude: {
    rebajar_step_multiplier: 1.0, // siguiente escalón normal
    amplify_dist_stores_multiplier: 0.7,
    amplify_in_season_units_multiplier: 0.7,
    resize_down_multiplier: 0.5, // pedido próx = 50% del actual
    pull_forward_weeks_of_cover: 2, // solo 2 semanas (más prudente con caja)
    replenish_target_cover_days: 14, // 14 días cobertura (mínimo viable)
  },
  confidence_modifier: {
    kill: 1.10, // más convicción al matar
    rebajar: 1.05,
    amplify_dist: 0.90, // menos convicción al amplificar
    amplify_in_season: 0.90,
    extend_colors: 0.90,
    resize_down: 1.05,
    replicate: 1.0, // caso #3 — invariante de escenario
  },
};

/** Maximizar venta · ▲ ofensivo · más difícil matar/rebajar, más fácil
 *  amplificar. Magnitudes ofensivas ampliadas 40%. */
export const MAXIMIZAR_VENTA_DIALES: DecisionDiales = {
  thresholds: {
    kill_combo_aportacion_max: 0.02, // ▼ solo mata SKUs con <2% aportación
    kill_combo_demand_max: 0.15,
    kill_combo_rotation_health_max: 0.20,
    kill_combo_markdown_risk_min: 0.92,
    kill_combo_returns_vs_baseline_min: 2.5,
    markdown_risk_min: 0.55, // ▼ rebaja más tarde
    amplify_dist_fleet_coverage_max: 0.85, // ▲ amplía aunque tenga 85% cobertura
    amplify_dist_demand_min: 0.40,
    amplify_dist_contribution_min: 0.05,
    amplify_in_season_contribution_min: 0.10, // ▲ más SKUs entran
    amplify_in_season_family_ratio_min: 1.5,
    extend_colors_winner_strength_min: 1.5,
    extend_colors_contribution_min: 0.10,
    extend_colors_max_proposed: 5, // propone hasta 5 colores
    resize_down_bought_pct_max: 0.10, // ▼ reduce muy pocos SKUs
    resize_down_shipped_pct_max: 0.20,
    replicate_contribution_min: 0.10, // ▲ más sequels
    replicate_days_in_store_min: 1, // filosofía Zara día 1
  },
  magnitude: {
    rebajar_step_multiplier: 0.7, // rebaja más suave
    amplify_dist_stores_multiplier: 1.4,
    amplify_in_season_units_multiplier: 1.4,
    resize_down_multiplier: 0.8, // pedido próx = 80% del actual
    pull_forward_weeks_of_cover: Infinity, // adelantar TODO el pending
    replenish_target_cover_days: 30, // 30 días cobertura (colchón amplio)
  },
  confidence_modifier: {
    kill: 0.85, // menos convicción al matar
    rebajar: 0.90,
    amplify_dist: 1.10, // más convicción al amplificar
    amplify_in_season: 1.10,
    extend_colors: 1.10,
    resize_down: 0.90,
    replicate: 1.0, // caso #3 — invariante de escenario
  },
};

/** Tu mezcla · custom por action_mix del comprador. Por defecto identica
 *  a baseline. Se ajusta dinámicamente en `applyCustomMixToDiales`. */
export const TU_MEZCLA_DIALES_DEFAULT: DecisionDiales = BASELINE_DIALES;

export const SCENARIO_DIALES: Record<ScenarioId, DecisionDiales> = {
  conservar_margen: CONSERVAR_MARGEN_DIALES,
  balanceada: BASELINE_DIALES,
  maximizar_venta: MAXIMIZAR_VENTA_DIALES,
  tu_mezcla: TU_MEZCLA_DIALES_DEFAULT, // overrided dinámicamente si hay action_mix custom
};

/** Aplica el action_mix custom del comprador para construir los diales
 *  de 'tu_mezcla'. action_mix es una distribución {kill: 0.30, ...}
 *  que indica qué proporción del stack quiere el usuario. Esto se
 *  traduce en ajustes de threshold (cuanto más alto el % deseado, más
 *  permisivo el umbral) y magnitud (cuanto más alto el %, más intenso). */
export function buildCustomMixDiales(
  actionMix: Record<string, number> | null | undefined
): DecisionDiales {
  if (!actionMix) return TU_MEZCLA_DIALES_DEFAULT;
  // For v1 simplicity: weighted average between Conservar and Maximizar
  // basado en si el action_mix sesga hacia kills/resize_down (defensivo)
  // o amplify (ofensivo). Si el sesgo total es positivo (más amplifies),
  // tira hacia Maximizar venta; si es negativo, hacia Conservar margen.
  const defensiveWeight =
    (actionMix.kill ?? 0) +
    (actionMix.markdown_accelerate ?? 0) +
    (actionMix.resize_down ?? 0);
  const offensiveWeight =
    (actionMix.amplify_distribution ?? 0) +
    (actionMix.amplify_in_season ?? 0) +
    (actionMix.extend_colors ?? 0) +
    (actionMix.amplify_next_season ?? 0);
  const total = defensiveWeight + offensiveWeight;
  if (total === 0) return BASELINE_DIALES;
  const bias = (offensiveWeight - defensiveWeight) / total; // [-1, +1]
  // bias = -1 → 100% Conservar margen
  // bias = +1 → 100% Maximizar venta
  // bias = 0 → Balanceada
  return interpolateDiales(BASELINE_DIALES, bias < 0 ? CONSERVAR_MARGEN_DIALES : MAXIMIZAR_VENTA_DIALES, Math.abs(bias));
}

function interpolateDiales(
  a: DecisionDiales,
  b: DecisionDiales,
  t: number
): DecisionDiales {
  const lerp = (x: number, y: number) => x * (1 - t) + y * t;
  const out: DecisionDiales = {
    thresholds: { ...a.thresholds },
    magnitude: {
      rebajar_step_multiplier: lerp(a.magnitude.rebajar_step_multiplier, b.magnitude.rebajar_step_multiplier),
      amplify_dist_stores_multiplier: lerp(a.magnitude.amplify_dist_stores_multiplier, b.magnitude.amplify_dist_stores_multiplier),
      amplify_in_season_units_multiplier: lerp(a.magnitude.amplify_in_season_units_multiplier, b.magnitude.amplify_in_season_units_multiplier),
      resize_down_multiplier: lerp(a.magnitude.resize_down_multiplier, b.magnitude.resize_down_multiplier),
      // pull_forward_weeks_of_cover puede ser Infinity en Maximizar.
      // Si A o B es Infinity, NO interpolamos linealmente; preferimos
      // el lado al que nos acercamos más (t > 0.5 → B, sino A).
      pull_forward_weeks_of_cover:
        a.magnitude.pull_forward_weeks_of_cover === Infinity ||
        b.magnitude.pull_forward_weeks_of_cover === Infinity
          ? (t > 0.5 ? b.magnitude.pull_forward_weeks_of_cover : a.magnitude.pull_forward_weeks_of_cover)
          : lerp(a.magnitude.pull_forward_weeks_of_cover, b.magnitude.pull_forward_weeks_of_cover),
      replenish_target_cover_days: lerp(
        a.magnitude.replenish_target_cover_days,
        b.magnitude.replenish_target_cover_days
      ),
    },
    confidence_modifier: {
      kill: lerp(a.confidence_modifier.kill, b.confidence_modifier.kill),
      rebajar: lerp(a.confidence_modifier.rebajar, b.confidence_modifier.rebajar),
      amplify_dist: lerp(a.confidence_modifier.amplify_dist, b.confidence_modifier.amplify_dist),
      amplify_in_season: lerp(a.confidence_modifier.amplify_in_season, b.confidence_modifier.amplify_in_season),
      extend_colors: lerp(a.confidence_modifier.extend_colors, b.confidence_modifier.extend_colors),
      resize_down: lerp(a.confidence_modifier.resize_down, b.confidence_modifier.resize_down),
      replicate: lerp(a.confidence_modifier.replicate, b.confidence_modifier.replicate),
    },
  };
  // Interpolate numeric thresholds
  for (const k of Object.keys(a.thresholds) as Array<keyof DecisionDiales['thresholds']>) {
    const av = a.thresholds[k];
    const bv = b.thresholds[k];
    if (typeof av === 'number' && typeof bv === 'number') {
      out.thresholds[k] = lerp(av, bv);
    }
  }
  return out;
}

/** Helper: obtiene los diales activos según escenario + action_mix. */
export function getDialesForScenario(
  scenario: ScenarioId,
  customActionMix?: Record<string, number> | null
): DecisionDiales {
  if (scenario === 'tu_mezcla' && customActionMix) {
    return buildCustomMixDiales(customActionMix);
  }
  return SCENARIO_DIALES[scenario];
}
