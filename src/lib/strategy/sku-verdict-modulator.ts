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
      // Defend & Curate: replenish on thin-margin SKUs becomes hold.
      // Threshold: margin_score < 0.4 (low).
      if (
        archetype.archetype_id === DEFENSIVE_ARCHETYPE &&
        item.action === 'replenish' &&
        typeof item.evidence.margin_score === 'number' &&
        (item.evidence.margin_score as number) < 0.4
      ) {
        newNotes.push({
          kind: 'archetype',
          note: 'Archetype Defend & Curate → replenish downgraded (margin too thin to protect)',
        });
        // Skip this action; if no other action remains the verdict falls
        // back to hold via the final pass below.
        continue;
      }

      // Category Transition: aggressive replenish on legacy families is
      // demoted because the budget is being reallocated to adjacencies.
      if (
        archetype.archetype_id === TRANSITION_ARCHETYPE &&
        item.action === 'replenish' &&
        item.recommended_units != null &&
        item.recommended_units > 0
      ) {
        // Halve the recommended units; the buyer can re-up via override.
        filteredActions.push({
          ...item,
          recommended_units: Math.round(item.recommended_units / 2),
        });
        newNotes.push({
          kind: 'archetype',
          note: 'Archetype Category Transition → replenish units halved (budget reallocated to adjacencies)',
        });
        continue;
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
  type Buyable = {
    pid: string;
    units: number;
    cost: number;
    marginScore: number; // for downgrade priority
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
        buyables.push({
          pid: v.product_fact_id,
          units: item.recommended_units,
          cost,
          marginScore:
            typeof item.evidence.margin_score === 'number'
              ? (item.evidence.margin_score as number)
              : 0.5,
        });
      }
    }
  }

  if (totalCost <= budget.target_buy_budget_eur) {
    // Under budget — nothing to do.
    return verdicts;
  }

  // Over budget. Sort buyables by marginScore ascending (lowest first =
  // first to be downgraded) and accumulate downgrades until we're under.
  buyables.sort((a, b) => a.marginScore - b.marginScore);
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

    const hasReplenish = v.actions.some(
      (a) => a.action === 'replenish' || a.action === 'carryover'
    );
    const hasKillOrResize = v.actions.some(
      (a) => a.action === 'kill' || a.action === 'resize_down' || a.action === 'markdown_accelerate'
    );

    const newNotes = [...v.modulator_notes];
    if (pivot < -0.1 && hasReplenish) {
      newNotes.push({
        kind: 'brief',
        note: `Brief pivots AWAY from ${family} (${(pivot * 100).toFixed(0)}%). Verifies that the replenish here is intentional or downgrade in review`,
      });
    }
    if (pivot > 0.1 && hasKillOrResize) {
      newNotes.push({
        kind: 'brief',
        note: `Brief pivots INTO ${family} (${(pivot > 0 ? '+' : '')}${(pivot * 100).toFixed(0)}%). Kill / resize-down conflicts with creative direction`,
      });
    }
    if (newNotes.length === v.modulator_notes.length) return v;
    return { ...v, modulator_notes: newNotes };
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
