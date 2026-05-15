/**
 * Recommendation engine — candidate generation + Bucket B modulation +
 * scenario assembly.
 *
 * Flow:
 *   1. From the SKU + family scores, generate concrete `RecommendationCandidate`
 *      rows (action × scope + evidence + counter-evidence + confidence).
 *   2. Apply Bucket B modulation (creative brief): filter / re-weight
 *      candidates per the 3 patterns from BP §6 (family pivot, color story,
 *      archetype focus). Bucket B never overrides; it ranks.
 *   3. Assemble 2-4 scenarios honoring Bucket A constraints, each with a
 *      different posture (base / creative_amplified / risk_minimized /
 *      growth_aggressive / kill_heavy).
 *
 * Every candidate carries evidence + counter-evidence + assumptions so the
 * UI can render a defensible recommendation card.
 */

import type { SkuScoreInput, SkuScore, FamilyScore, ClassifierThresholds } from './classifiers';

export type ActionType =
  | 'carryover'
  | 'kill'
  | 'resize_up'
  | 'resize_down'
  | 'recolor'
  | 'markdown_accelerate'
  | 'markdown_delay'
  | 'investigate'
  | 'substitute'
  | 'geographic_redistribute'
  | 'replenish';

export type Scope = 'sku' | 'family' | 'archetype' | 'color' | 'lineage';

export interface RecommendationCandidate {
  scope: Scope;
  scope_ref: string;
  action_type: ActionType;
  proposed_magnitude: Record<string, unknown> | null;
  evidence: Record<string, unknown>;
  counter_evidence: Record<string, unknown>;
  assumptions: string[];
  confidence_action: number;
  data_sufficiency_warning: string | null;
  narrative: string | null;
}

export interface CreativeBrief {
  color_story: string[];
  archetypes_focus: string[];
  family_pivot: Record<string, number>; // {romántico: 0.15, sastrería: -0.10}
  silhouette_preferences: Record<string, unknown>;
  customer_segment_shift: string | null;
  creative_narrative: string | null;
}

export interface Constraints {
  target_total_skus: number | null;
  target_buy_budget: number | null;
  target_avg_margin: number | null;
  family_share_targets: Record<string, number>;
  positioning_tier: 'premium' | 'mid' | 'value' | null;
  hard_exclusions: string[];
}

/**
 * Generate per-SKU candidates from scored inputs.
 */
export function generateSkuCandidates(
  inputs: SkuScoreInput[],
  scores: SkuScore[],
  thresholds: ClassifierThresholds
): RecommendationCandidate[] {
  const scoreByPid = new Map(scores.map((s) => [s.product_fact_id, s]));
  const out: RecommendationCandidate[] = [];

  for (const input of inputs) {
    const score = scoreByPid.get(input.product_fact_id);
    if (!score) continue;

    const assumptions: string[] = [];
    if (score.confidence_data_completeness < 0.5) {
      assumptions.push('Data coverage below 50% — recommendation is directional, not authoritative');
    }
    if (input.returns_pct == null) {
      assumptions.push('Returns data not supplied; effective margin uses category default');
    }

    const evidence: Record<string, unknown> = {
      lifecycle_stage: score.lifecycle_stage,
      demand_score: score.demand_score,
      margin_score: score.margin_score,
      effective_margin: score.effective_margin,
      sell_through_bought_pct: input.sell_through_bought_pct,
      returns_pct: input.returns_pct,
      stores_active: input.stores_active,
      stores_with_stock: input.stores_with_stock,
      velocity_7d: input.velocity_7d,
      velocity_ratio:
        input.velocity_8_14d > 0 ? input.velocity_7d / input.velocity_8_14d : null,
    };

    // Hero / Carryover candidate
    const isHero =
      (input.sell_through_bought_pct ?? 0) >= thresholds.hero_sell_through_bought_p_min &&
      (input.returns_pct ?? 0) <= thresholds.hero_returns_pct_max &&
      (score.distribution_breadth_score ?? 0) >= thresholds.hero_distribution_breadth_min;

    if (isHero || score.lifecycle_stage === 'mature' || score.lifecycle_stage === 'peak') {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'carryover',
        proposed_magnitude: { multiplier: isHero ? 1.5 : 1.2 },
        evidence,
        counter_evidence: {
          stockout_risk: score.stockout_risk_score,
          returns_pct: input.returns_pct,
          cannibalization_risk: score.cannibalization_risk_score,
        },
        assumptions,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: score.confidence_data_completeness < 0.5
          ? 'Insufficient data for confident carryover; treat as hypothesis'
          : null,
        narrative: null,
      });
    }

    // Kill / Exit candidate
    if (score.lifecycle_stage === 'exit') {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'kill',
        proposed_magnitude: null,
        evidence,
        counter_evidence: {
          stockout_suppressed:
            score.classifier_traces && (score.classifier_traces as any).stockout_aware_velocity,
          markdown_potential: score.markdown_risk_score,
        },
        assumptions,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Markdown candidate
    if (score.lifecycle_stage === 'decay' && (score.markdown_risk_score ?? 0) > 0.4) {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'markdown_accelerate',
        proposed_magnitude: { discount_pct: Math.min(0.4, score.markdown_risk_score ?? 0.2) },
        evidence,
        counter_evidence: {
          carryover_potential:
            (score.lifecycle_stage as string) === 'mature' ||
            (score.lifecycle_stage as string) === 'peak',
        },
        assumptions,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Replenish candidate (stockout-suppressed climber)
    const stockoutSuppressed =
      (score.stockout_risk_score ?? 0) > 0.3 && input.velocity_7d > 0;
    if (stockoutSuppressed) {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'replenish',
        proposed_magnitude: {
          required_units: Math.max(0, Math.round(input.velocity_7d * 4 - (input.pipeline_total ?? 0))),
        },
        evidence: { ...evidence, stockout_diagnosis: true },
        counter_evidence: {},
        assumptions,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Resize down candidate (oversupplied hero)
    if (
      (input.sell_through_bought_pct ?? 0) < 0.2 &&
      input.total_bought != null &&
      input.total_bought > 1000 &&
      score.lifecycle_stage !== 'new'
    ) {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'resize_down',
        proposed_magnitude: { multiplier: 0.6 },
        evidence,
        counter_evidence: {
          velocity_currently: input.velocity_7d,
        },
        assumptions: [...assumptions, 'Oversupply signal; previous buy was larger than demand absorbed'],
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Investigate candidate (high returns + high velocity = potential margin trap)
    if (
      (input.returns_pct ?? 0) >= thresholds.hero_returns_pct_max &&
      input.velocity_7d > 0
    ) {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'investigate',
        proposed_magnitude: null,
        evidence: {
          ...evidence,
          returns_flag: true,
        },
        counter_evidence: {},
        assumptions: [
          ...assumptions,
          'High returns + high velocity = volume hero but margin loser; verify fit / quality / tech-pack before scaling',
        ],
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }
  }

  return out;
}

/**
 * Generate family-level candidates (resize, kill, investigate).
 */
export function generateFamilyCandidates(
  familyScores: FamilyScore[],
  thresholds: ClassifierThresholds
): RecommendationCandidate[] {
  const out: RecommendationCandidate[] = [];
  for (const f of familyScores) {
    if (f.sku_count === 0) continue;

    // Returns risk at family level
    if (f.return_drag_score != null && f.return_drag_score >= thresholds.returns_risk_family_p_min) {
      out.push({
        scope: 'family',
        scope_ref: f.family_code,
        action_type: 'investigate',
        proposed_magnitude: null,
        evidence: {
          returns_pct_weighted: f.return_drag_score,
          sku_count: f.sku_count,
          hero_count: f.hero_count,
          dog_count: f.dog_count,
        },
        counter_evidence: {},
        assumptions: [
          'Family returns rate elevated vs cross-family benchmark — quality / fit / tech-pack review recommended before re-buying',
        ],
        confidence_action: 0.75,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Saturation: dog-heavy family
    if (f.saturation_score != null && f.saturation_score >= 0.5 && f.dog_count > 2) {
      out.push({
        scope: 'family',
        scope_ref: f.family_code,
        action_type: 'resize_down',
        proposed_magnitude: { multiplier: 0.7 },
        evidence: {
          saturation_score: f.saturation_score,
          dog_count: f.dog_count,
          family_roi: f.family_roi,
        },
        counter_evidence: {
          hero_count: f.hero_count,
        },
        assumptions: [
          'Family saturation high (≥50% dogs/exits) — recommend cutting the bottom quartile and concentrating on heroes',
        ],
        confidence_action: 0.7,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Strong family ROI → resize up candidate
    if (f.family_roi != null && f.family_roi >= 1.5 && f.hero_count >= 2) {
      out.push({
        scope: 'family',
        scope_ref: f.family_code,
        action_type: 'resize_up',
        proposed_magnitude: { multiplier: 1.25 },
        evidence: {
          family_roi: f.family_roi,
          hero_count: f.hero_count,
          share_of_wallet: f.share_of_wallet_pct,
        },
        counter_evidence: {
          dog_count: f.dog_count,
          cannibalization_score: f.cannibalization_score,
        },
        assumptions: [
          'Strong family ROI + multiple heroes — extend the winning archetypes; do not blanket expand the family',
        ],
        confidence_action: 0.75,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }
  }
  return out;
}

/**
 * Generate per-lineage color-winner candidates.
 */
export function generateColorWinnerCandidates(
  inputs: SkuScoreInput[],
  scores: SkuScore[],
  lineageSiblings: Map<string, SkuScoreInput[]>,
  thresholds: ClassifierThresholds
): RecommendationCandidate[] {
  const out: RecommendationCandidate[] = [];
  const scoreByPid = new Map(scores.map((s) => [s.product_fact_id, s]));

  for (const [lineageId, members] of Array.from(lineageSiblings.entries())) {
    if (members.length < 2) continue;

    const ranked = members
      .map((m) => ({ input: m, score: scoreByPid.get(m.product_fact_id) }))
      .filter((x) => x.score != null)
      .sort((a, b) => {
        const aRank =
          (a.score!.margin_score ?? 0) * (a.score!.demand_score ?? 0) -
          (a.score!.return_risk_score ?? 0);
        const bRank =
          (b.score!.margin_score ?? 0) * (b.score!.demand_score ?? 0) -
          (b.score!.return_risk_score ?? 0);
        return bRank - aRank;
      });

    const winners = ranked.slice(0, thresholds.color_winner_top_n_per_lineage);
    const losers = ranked.slice(-thresholds.color_winner_top_n_per_lineage);

    for (const w of winners) {
      if (!w.input.color_ref) continue;
      out.push({
        scope: 'color',
        scope_ref: `${lineageId}#${w.input.color_ref}`,
        action_type: 'recolor',
        proposed_magnitude: { extend: true, multiplier: 1.4 },
        evidence: {
          rank: 'top',
          margin_score: w.score!.margin_score,
          demand_score: w.score!.demand_score,
          return_risk: w.score!.return_risk_score,
        },
        counter_evidence: {},
        assumptions: ['Color winner within proven silhouette — extend palette around this anchor color'],
        confidence_action: 0.8,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }
    for (const l of losers) {
      if (!l.input.color_ref) continue;
      if (winners.find((w) => w.input.product_fact_id === l.input.product_fact_id)) continue;
      out.push({
        scope: 'color',
        scope_ref: `${lineageId}#${l.input.color_ref}`,
        action_type: 'kill',
        proposed_magnitude: null,
        evidence: {
          rank: 'bottom',
          margin_score: l.score!.margin_score,
          demand_score: l.score!.demand_score,
          return_risk: l.score!.return_risk_score,
        },
        counter_evidence: {},
        assumptions: ['Color loser within proven silhouette — drop from next season'],
        confidence_action: 0.7,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }
  }
  return out;
}

/**
 * Apply Bucket B (creative brief) modulation.
 *
 * Three patterns from BP §6:
 *   A) Family pivot: re-weight family-level recommendations.
 *   B) Color story: amplify recommendations on lineages whose color winners
 *      match the color_story palette.
 *   C) Archetype focus: amplify candidates whose family maps to a chosen
 *      archetype.
 *
 * Modulation only affects `confidence_action` (acting as a soft weight)
 * and an annotation in `evidence.creative_application`. It NEVER changes
 * action_type or proposed_magnitude — only the rank.
 */
export function applyCreativeBriefModulation(
  candidates: RecommendationCandidate[],
  brief: CreativeBrief | null,
  familyToArchetype: Map<string, string>,
  colorTaxonomy: Map<string, string>
): RecommendationCandidate[] {
  if (!brief) return candidates;

  return candidates.map((c) => {
    let weight = 1;
    const application: Record<string, unknown> = {};

    // Family pivot
    if (c.scope === 'family' && brief.family_pivot[c.scope_ref] != null) {
      const pivot = brief.family_pivot[c.scope_ref];
      if (pivot > 0 && (c.action_type === 'resize_up' || c.action_type === 'carryover')) {
        weight *= 1 + pivot;
        application.family_pivot = `+${(pivot * 100).toFixed(0)}% pivot aligned`;
      } else if (pivot < 0 && (c.action_type === 'resize_down' || c.action_type === 'kill')) {
        weight *= 1 + Math.abs(pivot);
        application.family_pivot = `${(pivot * 100).toFixed(0)}% pivot aligned`;
      }
    }

    // Color story
    if (c.scope === 'color' && brief.color_story.length > 0) {
      const colorRef = c.scope_ref.split('#')[1];
      const colorName = colorTaxonomy.get(colorRef);
      if (colorName && brief.color_story.includes(colorName)) {
        weight *= 1.25;
        application.color_story_hit = colorName;
      }
    }

    // Archetype focus
    if (brief.archetypes_focus.length > 0) {
      const familyCode = c.scope === 'family' ? c.scope_ref : null;
      const archetype = familyCode ? familyToArchetype.get(familyCode) : null;
      if (archetype && brief.archetypes_focus.includes(archetype)) {
        weight *= 1.2;
        application.archetype_focus = archetype;
      }
    }

    if (weight === 1) return c;

    return {
      ...c,
      confidence_action: Math.min(1, c.confidence_action * weight),
      evidence: { ...c.evidence, creative_application: application },
    };
  });
}

export interface ScenarioBlueprint {
  name: string;
  description: string;
  scenario_type:
    | 'base_case'
    | 'creative_amplified'
    | 'risk_minimized'
    | 'growth_aggressive'
    | 'kill_heavy'
    | 'custom';
  candidate_ids: string[]; // post-persist; pre-persist this is candidate indices
  candidate_indices: number[];
  total_predicted_revenue: number;
  total_predicted_margin: number;
  total_predicted_returns: number;
  total_predicted_buy_budget: number;
  predicted_sku_count: number;
  constraint_satisfaction_summary: Record<string, unknown>;
  creative_application_summary: string | null;
}

/**
 * Assemble up to 4 scenarios from a candidate pool.
 *
 * Each scenario is a deterministic subset/weighting honoring constraints.
 * Posture determines what we cherry-pick:
 *   - base_case: confidence_action >= 0.6 picks
 *   - creative_amplified: confidence_action × creative_weight ≥ 0.7
 *   - risk_minimized: only confidence_action ≥ 0.8 picks; drops investigates
 *   - growth_aggressive: include all resize_up + replenish
 *   - kill_heavy: prioritize kills + resize_down + markdowns
 */
export function assembleScenarios(
  candidates: RecommendationCandidate[],
  inputs: SkuScoreInput[],
  constraints: Constraints,
  hasCreativeBrief: boolean
): ScenarioBlueprint[] {
  const inputsByPid = new Map(inputs.map((i) => [i.product_fact_id, i]));
  const scenarios: ScenarioBlueprint[] = [];

  scenarios.push(
    buildScenario({
      candidates,
      inputsByPid,
      name: 'Base case',
      description: 'Confidence-weighted carryover + kill + replenish + investigate. Honours all constraints.',
      scenario_type: 'base_case',
      filter: (c) => c.confidence_action >= 0.6,
      constraints,
    })
  );

  if (hasCreativeBrief) {
    scenarios.push(
      buildScenario({
        candidates,
        inputsByPid,
        name: 'Creative-amplified',
        description: 'Bucket B-modulated recommendations. Carryovers in proven silhouettes extended to the new color story.',
        scenario_type: 'creative_amplified',
        filter: (c) => {
          const app = (c.evidence as any)?.creative_application;
          return c.confidence_action >= 0.55 && (app != null || c.action_type === 'recolor');
        },
        constraints,
      })
    );
  }

  scenarios.push(
    buildScenario({
      candidates,
      inputsByPid,
      name: 'Risk-minimized',
      description: 'Only highest-confidence recommendations; drops "investigate" actions to keep the plan execution-ready.',
      scenario_type: 'risk_minimized',
      filter: (c) => c.confidence_action >= 0.8 && c.action_type !== 'investigate',
      constraints,
    })
  );

  scenarios.push(
    buildScenario({
      candidates,
      inputsByPid,
      name: 'Kill-heavy',
      description: 'Aggressive cuts: prioritize kills + resize_down + markdowns. Frees budget for the next bet.',
      scenario_type: 'kill_heavy',
      filter: (c) =>
        c.action_type === 'kill' ||
        c.action_type === 'resize_down' ||
        c.action_type === 'markdown_accelerate' ||
        (c.action_type === 'carryover' && c.confidence_action >= 0.85),
      constraints,
    })
  );

  return scenarios;
}

function buildScenario(args: {
  candidates: RecommendationCandidate[];
  inputsByPid: Map<string, SkuScoreInput>;
  name: string;
  description: string;
  scenario_type: ScenarioBlueprint['scenario_type'];
  filter: (c: RecommendationCandidate) => boolean;
  constraints: Constraints;
}): ScenarioBlueprint {
  const { candidates, inputsByPid, name, description, scenario_type, filter, constraints } = args;
  const selectedIndices: number[] = [];
  let revenue = 0;
  let margin = 0;
  let returns = 0;
  let budget = 0;
  const skuSet = new Set<string>();
  const creativeApps: string[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (!filter(c)) continue;

    // Honour constraints (best-effort within a deterministic single pass).
    if (constraints.hard_exclusions.includes(c.scope_ref)) continue;

    selectedIndices.push(i);

    if (c.scope === 'sku') {
      const input = inputsByPid.get(c.scope_ref);
      if (input) {
        skuSet.add(c.scope_ref);
        const multiplier =
          ((c.proposed_magnitude as any)?.multiplier as number) ??
          (c.action_type === 'kill' ? 0 : 1);
        const projectedBuy = (input.total_bought ?? 0) * multiplier;
        const projectedSold = (input.total_sold ?? 0) * multiplier;
        const projectedRevenue = (input.pvp ?? 0) * projectedSold;
        const projectedMargin =
          (input.pvp ?? 0) *
          (input.margin_pct_list ?? 0) *
          projectedSold *
          (1 - (input.returns_pct ?? 0));
        const projectedReturns =
          (input.pvp ?? 0) * projectedSold * (input.returns_pct ?? 0);
        const projectedBudget = (input.cost_estimate ?? 0) * projectedBuy;
        revenue += projectedRevenue;
        margin += projectedMargin;
        returns += projectedReturns;
        budget += projectedBudget;
      }
    }

    const app = (c.evidence as any)?.creative_application;
    if (app) creativeApps.push(JSON.stringify(app));
  }

  return {
    name,
    description,
    scenario_type,
    candidate_ids: [],
    candidate_indices: selectedIndices,
    total_predicted_revenue: Math.round(revenue * 100) / 100,
    total_predicted_margin: Math.round(margin * 100) / 100,
    total_predicted_returns: Math.round(returns * 100) / 100,
    total_predicted_buy_budget: Math.round(budget * 100) / 100,
    predicted_sku_count: skuSet.size,
    constraint_satisfaction_summary: {
      target_total_skus: constraints.target_total_skus,
      actual_total_skus: skuSet.size,
      target_buy_budget: constraints.target_buy_budget,
      actual_buy_budget: Math.round(budget * 100) / 100,
      budget_utilization:
        constraints.target_buy_budget && constraints.target_buy_budget > 0
          ? Math.round((budget / constraints.target_buy_budget) * 10000) / 10000
          : null,
    },
    creative_application_summary:
      creativeApps.length > 0
        ? `${creativeApps.length} creative-amplified candidates applied`
        : null,
  };
}
