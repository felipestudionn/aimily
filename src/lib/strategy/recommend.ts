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
  | 'replenish'
  | 'tension_flag'
  | 'new_sku_proposal'
  | 'family_extension';

export type Scope = 'sku' | 'family' | 'archetype' | 'color' | 'lineage';

export interface RecommendationCandidate {
  scope: Scope;
  scope_ref: string;
  action_type: ActionType;
  proposed_magnitude: Record<string, unknown> | null;
  evidence: Record<string, unknown>;
  counter_evidence: Record<string, unknown>;
  assumptions: string[];
  // 6 confidence dimensions snapshot at the time the candidate is generated.
  confidence_data_completeness: number;
  confidence_identity: number;
  confidence_demand: number;
  confidence_margin: number;
  confidence_creative_fit: number | null;
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
  // v3 · buy-strategy archetype + action mix (migration 064)
  chosen_archetype_id: 'A' | 'B' | 'C' | 'D' | null;
  action_mix: {
    replenish_pct?: number;
    new_sku_proposal_pct?: number;
    family_extension_pct?: number;
    kill_pct?: number;
  };
  buy_waves: Array<{
    name?: string;
    share_pct?: number;
    target_lead_time_days?: number;
    scheduled_at?: string;
  }>;
  target_adjacent_families: string[];
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
      // C.6 · Cap velocity_ratio displayed in evidence at 5.0. The raw
      // ratio explodes to 100-500× on SKUs whose 8-14d window contains
      // their initial activation (v_8_14d≈0). The classifier still uses
      // the raw value internally for thresholding; the UI / rationale
      // should never see "453.7×" — that destroys buyer trust.
      velocity_ratio:
        input.velocity_8_14d > 0
          ? Math.min(5, input.velocity_7d / input.velocity_8_14d)
          : null,
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
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: score.confidence_margin,
        confidence_creative_fit: score.confidence_creative_fit,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: score.confidence_data_completeness < 0.5
          ? 'Insufficient data for confident carryover; treat as hypothesis'
          : null,
        narrative: null,
      });
    }

    // Kill / Exit candidate (lifecycle-based)
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
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: score.confidence_margin,
        confidence_creative_fit: score.confidence_creative_fit,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // C.4 · Margin-based kill gate — orthogonal to lifecycle.
    // A SKU with negative effective_margin AND high returns is unit-loss
    // economics: every shipped unit loses money even net of returns
    // logistics. Senior buyer would call kill regardless of velocity or
    // lifecycle (a high-velocity money-loser bleeds MORE, not less).
    // This stacks with markdown_accelerate when the SKU also has stock
    // to clear.
    const isUnitLoss =
      score.effective_margin != null &&
      score.effective_margin < 0 &&
      (input.returns_pct ?? 0) >= 0.30 &&
      score.lifecycle_stage !== 'exit';  // don't double-fire on lifecycle-exit
    if (isUnitLoss) {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'kill',
        proposed_magnitude: { reason: 'unit_economics_negative' },
        evidence: { ...evidence, kill_trigger: 'margin_negative' },
        counter_evidence: { velocity_currently: input.velocity_7d },
        assumptions: [
          ...assumptions,
          'Unit economics turned negative after returns + reverse logistics. Killing the next-season buy AND clearing current stock via markdown is the right move; preserving for amplification would compound the loss.',
        ],
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: 0.95,  // we have effective_margin computed
        confidence_creative_fit: score.confidence_creative_fit,
        confidence_action: 0.85,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Markdown candidate — C.4 also fires for ANY oversupplied SKU now
    // (markdown_risk_score is computed regardless of lifecycle).
    // Baseline permisivo (Conservar margen — más fácil rebajar). Modulator
    // filtra para Balanceada/Maximizar.
    //
    // Felipe 2026-05-18 caso Bomber 5247/600 · BLOQUEO CARDINAL:
    // NUNCA rebajar un SKU con éxito del enviado ≥ 50%. El éxito del
    // enviado al 63% significa que de cada unidad que llega a tienda
    // se vende el 63% — eso es hero, no candidato a rebaja. El
    // éxito del comprado puede ser bajo (compra inflada mid-season)
    // pero NO refleja la realidad del piso. NUNCA rebajar un hero.
    const shippedPct = score.classifier_traces && typeof (score.classifier_traces as any).margen_v2?.shipped_margin_eur === 'number'
      ? input.sell_through_shipped_pct ?? 0
      : input.sell_through_shipped_pct ?? 0;
    const isHeroByShipped = shippedPct >= 0.50;
    if ((score.markdown_risk_score ?? 0) > 0.3 && !isHeroByShipped) {
      // C.3 · Price-tier-aware discount cap. Fast-fashion (pvp <€40) can
      // absorb 60% to move stuck stock; mid-market (€40-80) caps at 50%;
      // premium (≥€80) caps at 40% to preserve brand price perception.
      const pvp = Number(input.pvp ?? 30);
      const tierCap = pvp < 40 ? 0.60 : pvp < 80 ? 0.50 : 0.40;
      const discountPct = Math.min(tierCap, score.markdown_risk_score ?? 0.2);
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'markdown_accelerate',
        proposed_magnitude: { discount_pct: discountPct, price_tier_cap: tierCap, pvp_at_decision: pvp },
        evidence,
        counter_evidence: {
          carryover_potential:
            (score.lifecycle_stage as string) === 'mature' ||
            (score.lifecycle_stage as string) === 'peak',
        },
        assumptions,
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: score.confidence_margin,
        confidence_creative_fit: score.confidence_creative_fit,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Replenish candidate (stockout-suppressed climber).
    // B.7 · We do NOT compute the quantity here. The resolver's
    // `computeReplenishUnits` is the single source of truth for buy units
    // (uses the rotation + lead-time + stockout-adjusted velocity formula).
    // The candidate's `proposed_magnitude.required_units` was a stale
    // formula (velocity_7d × 4 weeks vs resolver's daily × rotation) and
    // produced numbers ~7× larger than the resolver. Surface a flag only;
    // let the resolver attach the actual units when building the verdict.
    const stockoutSuppressed =
      (score.stockout_risk_score ?? 0) > 0.3 && input.velocity_7d > 0;
    if (stockoutSuppressed) {
      out.push({
        scope: 'sku',
        scope_ref: input.product_fact_id,
        action_type: 'replenish',
        proposed_magnitude: { stockout_diagnosis: true, units_computed_at_resolver: true },
        evidence: { ...evidence, stockout_diagnosis: true },
        counter_evidence: {},
        assumptions,
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: score.confidence_margin,
        confidence_creative_fit: score.confidence_creative_fit,
        confidence_action: score.confidence_action,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }

    // Resize down candidate (oversupplied hero).
    // Baseline permisivo (Conservar margen — más fácil reducir).
    //
    // Felipe 2026-05-18 caso Bomber 5247/600 · BLOQUEO CARDINAL:
    // NUNCA reducir compra si el éxito del enviado ≥ 50%. Si el suelo
    // está vendiendo bien (63% en el caso Bomber), la compra ya hecha
    // es buena — no se toca. El éxito del comprado puede estar bajo
    // porque la compra final se infló mid-season, pero eso NO
    // significa que el SKU sea un dog.
    const isHeroByShippedRD = (input.sell_through_shipped_pct ?? 0) >= 0.50;
    if (
      (input.sell_through_bought_pct ?? 0) < 0.3 &&
      input.total_bought != null &&
      input.total_bought > 1000 &&
      score.lifecycle_stage !== 'new' &&
      !isHeroByShippedRD
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
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: score.confidence_margin,
        confidence_creative_fit: score.confidence_creative_fit,
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
        confidence_data_completeness: score.confidence_data_completeness,
        confidence_identity: score.confidence_identity,
        confidence_demand: score.confidence_demand,
        confidence_margin: score.confidence_margin,
        confidence_creative_fit: score.confidence_creative_fit,
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
        confidence_data_completeness: 0.75,
        confidence_identity: 1,
        confidence_demand: 0.75,
        confidence_margin: 0.75,
        confidence_creative_fit: null,
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
        confidence_data_completeness: 0.7,
        confidence_identity: 1,
        confidence_demand: 0.7,
        confidence_margin: 0.7,
        confidence_creative_fit: null,
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
        confidence_data_completeness: 0.75,
        confidence_identity: 1,
        confidence_demand: 0.75,
        confidence_margin: 0.75,
        confidence_creative_fit: null,
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

    // D.2 · Additive, weighted, sell-through-aware ranking. The previous
    // multiplicative `margin × demand − return_risk` gave noise when
    // margin_score was near 0 across the corpus (degenerate to −return_risk).
    // Additive form keeps all signals on the same 0-1 axis and explicitly
    // rewards sell-through (the buyer's #1 indicator that demand exceeds
    // supply at the chosen price/quantity).
    //
    // Weights: margin 0.40 · demand 0.30 · sell_through 0.20 · returns −0.10
    // Tunable per archetype in v2 by reading archetype_id from constraint
    // and rebalancing.
    const ranked = members
      .map((m) => ({ input: m, score: scoreByPid.get(m.product_fact_id) }))
      .filter((x) => x.score != null)
      .sort((a, b) => {
        const aRank =
          0.40 * (a.score!.margin_score ?? 0) +
          0.30 * (a.score!.demand_score ?? 0) +
          0.20 * (a.input.sell_through_bought_pct ?? 0) -
          0.10 * (a.score!.return_risk_score ?? 0);
        const bRank =
          0.40 * (b.score!.margin_score ?? 0) +
          0.30 * (b.score!.demand_score ?? 0) +
          0.20 * (b.input.sell_through_bought_pct ?? 0) -
          0.10 * (b.score!.return_risk_score ?? 0);
        return bRank - aRank;
      });

    // D.3 · Scale top_n by lineage size. A 9-member lineage gets 3 winners
    // + 3 losers (signal density); a 2-member gets 1+1. Bounded by the
    // threshold and never exceeds half the lineage so winners/losers don't
    // overlap on small lineages.
    const baseTopN = thresholds.color_winner_top_n_per_lineage;
    const dynamicTopN = Math.max(
      baseTopN,
      Math.min(Math.floor(members.length / 3), Math.floor(members.length / 2))
    );
    const winners = ranked.slice(0, dynamicTopN);
    const losers = ranked.slice(-dynamicTopN);

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
        confidence_data_completeness: 0.8,
        confidence_identity: 1,
        confidence_demand: 0.8,
        confidence_margin: 0.8,
        confidence_creative_fit: null,
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
        confidence_data_completeness: 0.7,
        confidence_identity: 1,
        confidence_demand: 0.7,
        confidence_margin: 0.7,
        confidence_creative_fit: null,
        confidence_action: 0.7,
        data_sufficiency_warning: null,
        narrative: null,
      });
    }
  }
  return out;
}

/**
 * Surface strategic tension as its own first-class recommendation.
 *
 * Felipe direction (2026-05-16): when sales-driven recommendations point
 * one way and the creative brief points another, flag it explicitly.
 * Example: family X is winning + engine recommends scaling, but Bucket B
 * pivots away from X. The merchant must decide whether to ride the winner
 * or follow the creative bet — but they must SEE the tension.
 *
 * Tensions detected:
 *   - resize_up / carryover on a SKU in a family the brief pivots NEGATIVELY
 *   - kill / resize_down on a SKU in a family the brief pivots POSITIVELY
 *   - color winner verdict on a color OUTSIDE the brief's color_story
 *
 * Each tension emits a `tension_flag` candidate alongside (NOT instead of)
 * the underlying recommendation, with evidence + counter-evidence already
 * resolved. The scenario assembler can choose to keep or drop tensions.
 */
export function generateTensionFlags(
  baseCandidates: RecommendationCandidate[],
  brief: CreativeBrief | null,
  productFamilyByPid: Map<string, string | null>,
  colorTaxonomy: Map<string, string>
): RecommendationCandidate[] {
  if (!brief) return [];
  const out: RecommendationCandidate[] = [];
  const familyPivot = brief.family_pivot || {};

  for (const c of baseCandidates) {
    let tensionType: string | null = null;
    let detail: Record<string, unknown> = {};

    if (c.scope === 'sku') {
      const fam = productFamilyByPid.get(c.scope_ref) ?? null;
      const pivot = fam ? familyPivot[fam] : undefined;
      if (pivot != null && Math.abs(pivot) >= 0.05) {
        if (
          pivot > 0 &&
          (c.action_type === 'kill' || c.action_type === 'resize_down' || c.action_type === 'markdown_accelerate')
        ) {
          tensionType = 'cut_in_growing_family';
          detail = {
            family_code: fam,
            family_pivot: pivot,
            underlying_action: c.action_type,
            note:
              'Sales data wants to cut this SKU, but the creative brief is pivoting INTO this family. Consider replacing rather than removing.',
          };
        } else if (
          pivot < 0 &&
          (c.action_type === 'resize_up' || c.action_type === 'carryover' || c.action_type === 'replenish')
        ) {
          tensionType = 'scale_in_shrinking_family';
          detail = {
            family_code: fam,
            family_pivot: pivot,
            underlying_action: c.action_type,
            note:
              'Sales data wants to scale this SKU, but the creative brief is pivoting AWAY from this family. Ride the current winner until it runs into the new direction, OR complement with a SKU that bridges both.',
          };
        }
      }
    }

    if (c.scope === 'color' && brief.color_story.length > 0) {
      const colorRef = c.scope_ref.split('#')[1];
      const colorName = colorRef ? colorTaxonomy.get(colorRef) : null;
      if (
        colorName &&
        !brief.color_story.includes(colorName) &&
        c.action_type === 'recolor'
      ) {
        tensionType = 'winner_off_palette';
        detail = {
          color: colorName,
          target_palette: brief.color_story,
          note:
            'Sales data identifies this color as a winner within the lineage, but it is OUTSIDE the brief\'s color story. Consider keeping the winner for one more season as a bridge, then transitioning.',
        };
      }
    }

    if (!tensionType) continue;

    out.push({
      scope: c.scope,
      scope_ref: c.scope_ref,
      action_type: 'tension_flag',
      proposed_magnitude: null,
      evidence: {
        tension_type: tensionType,
        underlying_action: c.action_type,
        underlying_confidence: c.confidence_action,
        ...detail,
      },
      counter_evidence: c.counter_evidence,
      assumptions: [
        'A tension flag is a SIGNAL for the merchandiser, not a decision. The underlying recommendation is preserved as a separate candidate.',
      ],
      confidence_data_completeness: c.confidence_data_completeness,
      confidence_identity: c.confidence_identity,
      confidence_demand: c.confidence_demand,
      confidence_margin: c.confidence_margin,
      // The tension itself is high-confidence — we can detect it
      // deterministically. The resolution requires human judgement.
      confidence_creative_fit: 0.05,
      confidence_action: Math.min(0.95, c.confidence_action * 0.95),
      data_sufficiency_warning: null,
      narrative: null,
    });
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
    let creativeFit = 0;
    const application: Record<string, unknown> = {};

    // Family pivot — Bucket B aligns or opposes a candidate's action.
    if (c.scope === 'family' && brief.family_pivot[c.scope_ref] != null) {
      const pivot = brief.family_pivot[c.scope_ref];
      if (pivot > 0 && (c.action_type === 'resize_up' || c.action_type === 'carryover')) {
        weight *= 1 + pivot;
        creativeFit = Math.max(creativeFit, Math.min(1, 0.5 + pivot));
        application.family_pivot = `+${(pivot * 100).toFixed(0)}% pivot aligned`;
      } else if (pivot < 0 && (c.action_type === 'resize_down' || c.action_type === 'kill')) {
        weight *= 1 + Math.abs(pivot);
        creativeFit = Math.max(creativeFit, Math.min(1, 0.5 + Math.abs(pivot)));
        application.family_pivot = `${(pivot * 100).toFixed(0)}% pivot aligned`;
      } else {
        // Candidate works against the brief — penalize fit.
        creativeFit = Math.max(creativeFit, 0.1);
        application.family_pivot_misaligned = pivot;
      }
    }

    // Color story
    if (c.scope === 'color' && brief.color_story.length > 0) {
      const colorRef = c.scope_ref.split('#')[1];
      const colorName = colorTaxonomy.get(colorRef);
      if (colorName && brief.color_story.includes(colorName)) {
        weight *= 1.25;
        creativeFit = Math.max(creativeFit, 0.85);
        application.color_story_hit = colorName;
      } else {
        creativeFit = Math.max(creativeFit, 0.25);
        application.color_off_palette = colorName ?? colorRef ?? null;
      }
    }

    // Archetype focus
    if (brief.archetypes_focus.length > 0) {
      const familyCode = c.scope === 'family' ? c.scope_ref : null;
      const archetype = familyCode ? familyToArchetype.get(familyCode) : null;
      if (archetype && brief.archetypes_focus.includes(archetype)) {
        weight *= 1.2;
        creativeFit = Math.max(creativeFit, 0.8);
        application.archetype_focus = archetype;
      }
    }

    // No brief signal touched this candidate → leave creative_fit unset.
    const nextCreativeFit = creativeFit > 0 ? Math.min(1, creativeFit) : c.confidence_creative_fit;

    if (weight === 1 && nextCreativeFit === c.confidence_creative_fit) return c;

    return {
      ...c,
      confidence_action: Math.min(1, c.confidence_action * weight),
      confidence_creative_fit: nextCreativeFit,
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
    | 'category_transition'
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

  // Archetype D · Category Transition / Adjacency Push.
  //
  // Only emitted when the user explicitly chose archetype D in the setup
  // workspace AND the orchestrator dispatched generative proposers ahead of
  // scenario assembly (otherwise the candidates pool has no
  // new_sku_proposal / family_extension rows for this filter to pick from).
  //
  // Posture: overweight new_sku_proposal + family_extension into the target
  // adjacent families, keep top-N core heroes alive via carryover, exclude
  // markdown/kill (D reinvests in adjacent, doesn't burn cash on cuts).
  if (constraints.chosen_archetype_id === 'D') {
    const adjacentFamilies = new Set(constraints.target_adjacent_families ?? []);
    const productFamilyByPid = new Map<string, string | null>(
      inputs.map((i) => [i.product_fact_id, i.family_code])
    );

    const isInAdjacentFamily = (c: RecommendationCandidate): boolean => {
      // family_extension candidates carry family_code as scope_ref directly.
      if (c.scope === 'family') return adjacentFamilies.has(c.scope_ref);
      // new_sku_proposal + sku-scope rely on the source product's family.
      if (c.scope === 'sku') {
        const fam = productFamilyByPid.get(c.scope_ref);
        return fam != null && adjacentFamilies.has(fam);
      }
      // family_code can also live inside evidence (proposer hint).
      const ev = c.evidence as { family_code?: string; target_family?: string } | undefined;
      const evFam = ev?.target_family ?? ev?.family_code;
      return typeof evFam === 'string' && adjacentFamilies.has(evFam);
    };

    scenarios.push(
      buildScenario({
        candidates,
        inputsByPid,
        name: 'Category transition',
        description:
          'Overweight new SKU + family extensions into the chosen adjacent categories. Keep top heroes alive via carryover; skip kills and markdowns to fund the push.',
        scenario_type: 'category_transition',
        filter: (c) => {
          // Generative proposals into adjacent families — primary lever.
          if (
            (c.action_type === 'new_sku_proposal' || c.action_type === 'family_extension') &&
            (adjacentFamilies.size === 0 || isInAdjacentFamily(c))
          ) {
            return c.confidence_action >= 0.5;
          }
          // Keep highest-confidence carryovers (top heroes funding the push).
          if (c.action_type === 'carryover' && c.confidence_action >= 0.85) return true;
          // Replenish on a small slice of confident heroes only.
          if (c.action_type === 'replenish' && c.confidence_action >= 0.8) return true;
          return false;
        },
        constraints,
      })
    );
  }

  return scenarios;
}

/**
 * Build one scenario with:
 *   - candidate filtering by posture
 *   - dedupe by (scope, scope_ref): pick the HIGHEST-CONFIDENCE candidate
 *     per SKU/family. Avoids Codex P0 double-count where a single SKU
 *     emitted carryover + replenish + investigate and the financials
 *     summed three times.
 *   - Bucket A constraint enforcement: target_total_skus cap (drop
 *     lowest-confidence picks), target_buy_budget cap (same), hard_exclusions.
 *   - Each SKU contributes to revenue/margin/budget ONCE based on the
 *     winning action's multiplier.
 */
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

  // 1. Filter + drop hard exclusions
  const passing: Array<{ idx: number; cand: RecommendationCandidate }> = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (!filter(c)) continue;
    if (constraints.hard_exclusions.includes(c.scope_ref)) continue;
    passing.push({ idx: i, cand: c });
  }

  // 2. Dedupe by (scope, scope_ref): keep highest-confidence candidate.
  //    Lower-confidence variants are dropped — their action is implicitly
  //    superseded. Other-scope candidates (family/color/etc.) are kept
  //    alongside the winning SKU pick.
  const winnerByKey = new Map<string, { idx: number; cand: RecommendationCandidate }>();
  for (const p of passing) {
    const key = `${p.cand.scope}::${p.cand.scope_ref}`;
    const incumbent = winnerByKey.get(key);
    if (!incumbent || p.cand.confidence_action > incumbent.cand.confidence_action) {
      winnerByKey.set(key, p);
    }
  }
  let winners = Array.from(winnerByKey.values());

  // 3. Bucket A enforcement — pre-compute projected impact per SKU pick.
  type Impact = {
    pid: string;
    revenue: number;
    margin: number;
    returns: number;
    budget: number;
    multiplier: number;
  };
  const impactByPid = new Map<string, Impact>();
  const projectImpact = (cand: RecommendationCandidate): Impact | null => {
    if (cand.scope !== 'sku') return null;
    const input = inputsByPid.get(cand.scope_ref);
    if (!input) return null;
    const multiplier =
      ((cand.proposed_magnitude as { multiplier?: number } | null)?.multiplier as
        | number
        | undefined) ?? (cand.action_type === 'kill' ? 0 : 1);
    const projectedBuy = (input.total_bought ?? 0) * multiplier;
    const projectedSold = (input.total_sold ?? 0) * multiplier;
    const revenue = (input.pvp ?? 0) * projectedSold;
    const margin =
      (input.pvp ?? 0) *
      (input.margin_pct_list ?? 0) *
      projectedSold *
      (1 - (input.returns_pct ?? 0));
    const returnsEur = (input.pvp ?? 0) * projectedSold * (input.returns_pct ?? 0);
    const budget = (input.cost_estimate ?? 0) * projectedBuy;
    return { pid: cand.scope_ref, revenue, margin, returns: returnsEur, budget, multiplier };
  };

  for (const w of winners) {
    const impact = projectImpact(w.cand);
    if (impact) impactByPid.set(impact.pid, impact);
  }

  // SKU cap — keep highest-confidence picks until target_total_skus is met.
  let skuConstraintApplied = false;
  if (constraints.target_total_skus != null && constraints.target_total_skus > 0) {
    const skuWinners = winners
      .filter((w) => w.cand.scope === 'sku')
      .sort((a, b) => b.cand.confidence_action - a.cand.confidence_action);
    if (skuWinners.length > constraints.target_total_skus) {
      const allowed = new Set(skuWinners.slice(0, constraints.target_total_skus).map((w) => w.cand.scope_ref));
      winners = winners.filter((w) => w.cand.scope !== 'sku' || allowed.has(w.cand.scope_ref));
      skuConstraintApplied = true;
    }
  }

  // Budget cap — drop the lowest-confidence SKU picks until projected buy
  // budget fits inside target_buy_budget.
  let budgetConstraintApplied = false;
  if (constraints.target_buy_budget != null && constraints.target_buy_budget > 0) {
    let totalBudget = winners.reduce((acc, w) => {
      const imp = impactByPid.get(w.cand.scope_ref);
      return acc + (imp?.budget ?? 0);
    }, 0);
    if (totalBudget > constraints.target_buy_budget) {
      const droppable = winners
        .filter((w) => w.cand.scope === 'sku')
        .sort((a, b) => a.cand.confidence_action - b.cand.confidence_action);
      const toDrop = new Set<string>();
      for (const w of droppable) {
        if (totalBudget <= constraints.target_buy_budget) break;
        const imp = impactByPid.get(w.cand.scope_ref);
        if (!imp || imp.budget <= 0) continue;
        toDrop.add(`${w.cand.scope}::${w.cand.scope_ref}`);
        totalBudget -= imp.budget;
      }
      if (toDrop.size > 0) {
        winners = winners.filter((w) => !toDrop.has(`${w.cand.scope}::${w.cand.scope_ref}`));
        budgetConstraintApplied = true;
      }
    }
  }

  // 4. Accumulate totals — each SKU contributes ONCE (via its winning action).
  let revenue = 0;
  let margin = 0;
  let returnsEur = 0;
  let budget = 0;
  const skuSet = new Set<string>();
  const creativeApps: unknown[] = [];

  for (const w of winners) {
    if (w.cand.scope === 'sku') {
      const imp = impactByPid.get(w.cand.scope_ref);
      if (imp && !skuSet.has(imp.pid)) {
        skuSet.add(imp.pid);
        revenue += imp.revenue;
        margin += imp.margin;
        returnsEur += imp.returns;
        budget += imp.budget;
      }
    }
    const app = (w.cand.evidence as { creative_application?: unknown } | undefined)
      ?.creative_application;
    if (app) creativeApps.push(app);
  }

  const selectedIndices = winners.map((w) => w.idx);

  return {
    name,
    description,
    scenario_type,
    candidate_ids: [],
    candidate_indices: selectedIndices,
    total_predicted_revenue: Math.round(revenue * 100) / 100,
    total_predicted_margin: Math.round(margin * 100) / 100,
    total_predicted_returns: Math.round(returnsEur * 100) / 100,
    total_predicted_buy_budget: Math.round(budget * 100) / 100,
    predicted_sku_count: skuSet.size,
    constraint_satisfaction_summary: {
      target_total_skus: constraints.target_total_skus,
      actual_total_skus: skuSet.size,
      sku_constraint_applied: skuConstraintApplied,
      target_buy_budget: constraints.target_buy_budget,
      actual_buy_budget: Math.round(budget * 100) / 100,
      budget_constraint_applied: budgetConstraintApplied,
      budget_utilization:
        constraints.target_buy_budget && constraints.target_buy_budget > 0
          ? Math.round((budget / constraints.target_buy_budget) * 10000) / 10000
          : null,
      target_avg_margin: constraints.target_avg_margin,
      actual_avg_margin:
        revenue > 0 ? Math.round((margin / revenue) * 10000) / 10000 : null,
      positioning_tier: constraints.positioning_tier,
      hard_exclusions_count: constraints.hard_exclusions.length,
    },
    creative_application_summary:
      creativeApps.length > 0
        ? `${creativeApps.length} creative-amplified candidates applied`
        : null,
  };
}
