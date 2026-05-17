/**
 * SKU verdict contextual modulator.
 *
 * Takes the raw verdicts produced by sku-verdict-resolver and applies the
 * buyer's strategic context: archetype posture, target buy budget, and
 * creative brief direction. Output is the SAME shape as the input — a
 * stack of actions per SKU — but with some actions removed, demoted, or
 * downgraded based on context.
 *
 * Three modulations:
 *
 * 1. ARCHETYPE — the chosen buy posture changes which actions are
 *    natural. Defend (margin-first) downgrades replenish to hold when
 *    margin is thin. Replenish & Amplify keeps everything as-is.
 *    Category Transition de-prioritises replenish on legacy families.
 *
 * 2. BUDGET — sum of cost of all replenish-units across SKUs. If the sum
 *    exceeds target_buy_budget, downgrade lowest-margin replenish actions
 *    to hold until under budget.
 *
 * 3. BRIEF — creative brief direction. Family pivot misalignment
 *    (engine wants resize_up on a family the brief is pivoting AWAY)
 *    adds a tension flag on the SKU.
 *
 * Stays pure: takes inputs, returns modulated verdicts. The orchestrator
 * (or API endpoint) decides when to call this.
 */

import type { SkuVerdict, SkuVerdictItem, SkuVerdictAction } from './sku-verdict-resolver';

export interface ArchetypeContext {
  archetype_id: 'A' | 'B' | 'C' | 'D' | null;
  action_mix: {
    replenish_pct: number;
    new_sku_proposal_pct: number;
    family_extension_pct: number;
    kill_pct: number;
  } | null;
}

export interface BudgetContext {
  /** Total budget the buyer has approved for the next-season buy. Null when
   *  not yet entered — modulator skips the budget step and emits a warning. */
  target_buy_budget_eur: number | null;
  /** Default cost per unit when a SKU's product_fact doesn't expose cost.
   *  We use unit_cost when present, otherwise pvp × (1 − margin_pct_list)
   *  as a fallback estimate. */
  fallback_cost_per_unit_eur: number;
}

export interface BriefContext {
  family_pivot: Record<string, number>;  // family_code → pivot in [-0.5, +0.5]
  color_story: string[];
  archetypes_focus: string[];
}

export interface PerSkuFinancials {
  product_fact_id: string;
  family_code: string | null;
  pvp: number | null;
  margin_pct_list: number | null;
  /** Estimated cost per unit. Used to total budget across replenish actions. */
  cost_per_unit_eur: number | null;
}

export interface ModulatedSkuVerdict extends SkuVerdict {
  /** Annotations explaining why an action was demoted / removed. Surface
   *  these in the UI under the dominant action so the buyer sees the
   *  reasoning. */
  modulator_notes: Array<{
    kind: 'archetype' | 'budget' | 'brief';
    note: string;
  }>;
}

const DEFENSIVE_ARCHETYPE = 'C';  // Defend & Curate
const TRANSITION_ARCHETYPE = 'D'; // Category Transition

/**
 * Apply archetype posture. Pure: returns new array.
 */
function applyArchetype(
  verdicts: ModulatedSkuVerdict[],
  archetype: ArchetypeContext
): ModulatedSkuVerdict[] {
  if (!archetype.archetype_id) return verdicts;

  return verdicts.map((v) => {
    const filteredActions: SkuVerdictItem[] = [];
    const newNotes = [...v.modulator_notes];

    for (const item of v.actions) {
      // E.1 · Defend & Curate: proportional units downgrade based on
      // margin_score. Was a binary drop-to-hold below 0.4; that made the
      // archetype useless when margin distribution was degenerate (the
      // 2026-05-17 pre-fix data had 48/48 SKUs below 0.4 → archetype did
      // nothing). New: scale units linearly with margin in [0, 0.4]:
      //   margin_score 0.0  → buy 0%  (effectively hold)
      //   margin_score 0.2  → buy 50%
      //   margin_score 0.4  → buy 100% (no downgrade)
      // Margin ≥ 0.4 passes through unchanged.
      if (
        archetype.archetype_id === DEFENSIVE_ARCHETYPE &&
        item.action === 'replenish' &&
        item.recommended_units != null &&
        item.recommended_units > 0 &&
        typeof item.evidence.margin_score === 'number'
      ) {
        const m = item.evidence.margin_score as number;
        if (m < 0.4) {
          const factor = Math.max(0, m / 0.4);
          const downgraded = Math.round(item.recommended_units * factor);
          if (downgraded < item.recommended_units) {
            filteredActions.push({ ...item, recommended_units: downgraded });
            newNotes.push({
              kind: 'archetype',
              note: `Archetype Defend & Curate → replenish reducido a ${Math.round(factor * 100)}% (margen ${Math.round(m * 100)}% — proporcional al margen).`,
            });
            continue;
          }
        }
      }

      // E.3 · Category Transition: halve replenish only on the
      // transitioning-FROM family. Boost destination family by 1.3×.
      // Neutral families pass through. When no from_family/to_family is
      // declared in archetype.action_mix, fall back to the legacy blanket
      // halve so we don't silently break existing constraints.
      if (
        archetype.archetype_id === TRANSITION_ARCHETYPE &&
        item.action === 'replenish' &&
        item.recommended_units != null &&
        item.recommended_units > 0
      ) {
        const mix = archetype.action_mix as
          | (typeof archetype.action_mix & {
              transitioning_from?: string;
              transitioning_to?: string;
            })
          | null;
        const fromFamily = mix?.transitioning_from;
        const toFamily = mix?.transitioning_to;
        const itemFamily =
          typeof item.evidence.family_code === 'string'
            ? (item.evidence.family_code as string)
            : null;
        let factor = 1;
        let why = '';
        if (fromFamily || toFamily) {
          if (itemFamily && fromFamily && itemFamily === fromFamily) {
            factor = 0.5;
            why = `transición SALIENDO de ${fromFamily} → unidades a la mitad`;
          } else if (itemFamily && toFamily && itemFamily === toFamily) {
            factor = 1.3;
            why = `transición ENTRANDO en ${toFamily} → unidades ×1.3`;
          }
        } else {
          // Backward compatibility: blanket halve when no direction declared.
          factor = 0.5;
          why = 'transición sin dirección declarada → unidades a la mitad globalmente';
        }
        if (factor !== 1) {
          filteredActions.push({
            ...item,
            recommended_units: Math.round(item.recommended_units * factor),
          });
          newNotes.push({
            kind: 'archetype',
            note: `Archetype Category Transition → ${why}`,
          });
          continue;
        }
      }

      filteredActions.push(item);
    }

    // Fallback: if no actions survived modulation, add a hold so the UI
    // always renders something.
    if (filteredActions.length === 0) {
      filteredActions.push({
        action: 'hold',
        confidence: 0.3,
        rationale:
          'Todas las acciones del motor fueron filtradas por el arquetipo de compra. Mantener línea actual y revisar si el arquetipo es el correcto.',
        recommended_units: null,
        confidence_breakdown: v.actions[0]?.confidence_breakdown ?? {
          data_completeness: null,
          identity: null,
          demand: null,
          margin: null,
          creative_fit: null,
        },
        evidence: v.actions[0]?.evidence ?? {},
        counter_evidence: v.actions[0]?.counter_evidence ?? {},
        assumptions: v.actions[0]?.assumptions ?? [],
        data_sufficiency_warning: 'All actions filtered by archetype posture',
      });
    }

    return { ...v, actions: filteredActions, modulator_notes: newNotes };
  });
}

/**
 * Apply budget cap. If the sum of replenish + carryover costs exceeds
 * the target_buy_budget, downgrade lowest-margin SKUs' replenish until
 * the total fits. Returns a new array.
 */
function applyBudget(
  verdicts: ModulatedSkuVerdict[],
  budget: BudgetContext,
  financialsByPid: Map<string, PerSkuFinancials>
): ModulatedSkuVerdict[] {
  if (budget.target_buy_budget_eur == null || budget.target_buy_budget_eur <= 0) {
    return verdicts;
  }

  // Compute estimated cost per verdict (sum of replenish + carryover units
  // × cost). Track only SKUs that have units to buy.
  // E.2 · Track velocity too so we can drop by €-productivity (margin ×
  // velocity), not just by margin. A low-margin volume mover returns more
  // € per buy-€ than a high-margin slow-mover — dropping the volume
  // mover is the wrong call.
  type Buyable = {
    pid: string;
    units: number;
    cost: number;
    marginScore: number;
    velocity7d: number;
    /** Per-buy-€ expected gross contribution. Higher = more productive. */
    contribPerCost: number;
  };
  const buyables: Buyable[] = [];
  let totalCost = 0;
  for (const v of verdicts) {
    const fin = financialsByPid.get(v.product_fact_id);
    const costPerUnit =
      fin?.cost_per_unit_eur ??
      (fin?.pvp != null && fin?.margin_pct_list != null
        ? fin.pvp * (1 - fin.margin_pct_list)
        : budget.fallback_cost_per_unit_eur);

    for (const item of v.actions) {
      if ((item.action === 'replenish' || item.action === 'carryover') && item.recommended_units != null && item.recommended_units > 0) {
        const cost = item.recommended_units * costPerUnit;
        totalCost += cost;
        const marginScore =
          typeof item.evidence.margin_score === 'number'
            ? (item.evidence.margin_score as number)
            : 0.5;
        const velocity7d =
          typeof item.evidence.velocity_7d === 'number'
            ? (item.evidence.velocity_7d as number)
            : 0;
        // Contribution per buy-€ ≈ (margin × pvp × velocity_7d) / (cost × units)
        // Simplified: margin × velocity / cost_per_unit. Bigger = drop later.
        const contribPerCost = (marginScore * velocity7d) / Math.max(1, costPerUnit);
        buyables.push({
          pid: v.product_fact_id,
          units: item.recommended_units,
          cost,
          marginScore,
          velocity7d,
          contribPerCost,
        });
      }
    }
  }

  if (totalCost <= budget.target_buy_budget_eur) {
    // Under budget — nothing to do.
    return verdicts;
  }

  // E.2 · Sort by per-buy-€ productivity ASCENDING — drop the least
  // productive € first. The previous logic sorted by marginScore only,
  // which dropped low-margin high-volume movers before high-margin
  // slow-movers — the opposite of what a senior buyer would do.
  buyables.sort((a, b) => a.contribPerCost - b.contribPerCost);
  const downgradedPids = new Set<string>();
  let remainingOverflow = totalCost - budget.target_buy_budget_eur;
  for (const b of buyables) {
    if (remainingOverflow <= 0) break;
    downgradedPids.add(b.pid);
    remainingOverflow -= b.cost;
  }

  return verdicts.map((v) => {
    if (!downgradedPids.has(v.product_fact_id)) return v;
    const newActions: SkuVerdictItem[] = v.actions.map((item) => {
      if (
        (item.action === 'replenish' || item.action === 'carryover') &&
        item.recommended_units != null &&
        item.recommended_units > 0
      ) {
        return { ...item, recommended_units: 0 };
      }
      return item;
    });
    return {
      ...v,
      actions: newActions,
      modulator_notes: [
        ...v.modulator_notes,
        {
          kind: 'budget',
          note: 'Replenish zeroed: budget cap reached. Other SKUs with higher margin took priority',
        },
      ],
    };
  });
}

/**
 * Apply creative brief misalignment annotations. Doesn't change the
 * actions — surfaces a note on the verdict so the buyer sees the conflict.
 */
function applyBrief(
  verdicts: ModulatedSkuVerdict[],
  brief: BriefContext,
  financialsByPid: Map<string, PerSkuFinancials>
): ModulatedSkuVerdict[] {
  if (!brief.family_pivot || Object.keys(brief.family_pivot).length === 0) return verdicts;

  return verdicts.map((v) => {
    const fin = financialsByPid.get(v.product_fact_id);
    const family = fin?.family_code;
    if (!family) return v;
    const pivot = brief.family_pivot[family];
    if (pivot == null) return v;

    // E.4 · The brief should ACT, not just annotate. When pivot is
    // negative (pivot AWAY), proportionally cut replenish/carryover units.
    // When pivot is positive (pivot INTO), reduce confidence on conflicting
    // kill/resize/markdown actions so the buyer sees the tension as a
    // de-rated verdict rather than full-confidence advice.
    //
    // pivot ∈ [-0.5, +0.5] per schema.
    //   pivot −0.5 → replenish units × 0.5 (cut in half)
    //   pivot −0.1 → replenish units × 0.9 (light trim)
    //   pivot +0.1 → kill confidence × 0.97 (light hedge)
    //   pivot +0.5 → kill confidence × 0.85 (heavy hedge)
    const replenishFactor = pivot < 0 ? Math.max(0.3, 1 + pivot) : 1;
    const conflictConfFactor = pivot > 0 ? Math.max(0.7, 1 - pivot * 0.3) : 1;

    const newNotes = [...v.modulator_notes];
    let mutated = false;
    const newActions = v.actions.map((a) => {
      // Cut replenish/carryover units when brief pivots away.
      if (
        pivot < -0.1 &&
        (a.action === 'replenish' || a.action === 'carryover') &&
        a.recommended_units != null &&
        a.recommended_units > 0
      ) {
        const downgraded = Math.round(a.recommended_units * replenishFactor);
        if (downgraded < a.recommended_units) {
          mutated = true;
          return { ...a, recommended_units: downgraded };
        }
      }
      // Hedge confidence on conflicting destructive actions when brief
      // pivots INTO the family.
      if (
        pivot > 0.1 &&
        (a.action === 'kill' || a.action === 'resize_down' || a.action === 'markdown_accelerate')
      ) {
        const newConf = Math.max(0, a.confidence * conflictConfFactor);
        if (newConf < a.confidence) {
          mutated = true;
          return { ...a, confidence: newConf };
        }
      }
      return a;
    });

    if (pivot < -0.1 && mutated) {
      newNotes.push({
        kind: 'brief',
        note: `Brief pivots AWAY de ${family} (${(pivot * 100).toFixed(0)}%) → replenish reducido proporcionalmente (×${replenishFactor.toFixed(2)}). Verificar manualmente si quieres romper el pivot por un hero específico.`,
      });
    }
    if (pivot > 0.1 && mutated) {
      newNotes.push({
        kind: 'brief',
        note: `Brief pivots INTO ${family} (+${(pivot * 100).toFixed(0)}%) → confianza en kill/resize/markdown reducida (×${conflictConfFactor.toFixed(2)}). El brief contradice la señal cuantitativa; revísalo antes de aplicar.`,
      });
    }
    if (newNotes.length === v.modulator_notes.length && !mutated) return v;
    return { ...v, actions: newActions, modulator_notes: newNotes };
  });
}

/**
 * Run all three modulations in order: archetype → budget → brief.
 * Returns a new array — never mutates inputs.
 */
export function modulateSkuVerdicts(
  verdicts: SkuVerdict[],
  archetype: ArchetypeContext,
  budget: BudgetContext,
  brief: BriefContext,
  financialsByPid: Map<string, PerSkuFinancials>
): ModulatedSkuVerdict[] {
  let modulated: ModulatedSkuVerdict[] = verdicts.map((v) => ({
    ...v,
    modulator_notes: [],
  }));
  modulated = applyArchetype(modulated, archetype);
  modulated = applyBudget(modulated, budget, financialsByPid);
  modulated = applyBrief(modulated, brief, financialsByPid);
  return modulated;
}
