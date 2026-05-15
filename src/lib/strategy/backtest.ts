/**
 * Backtesting engine.
 *
 * Codex contrapropuesta §8: "Before selling recommendations, prove that if
 * the engine had existed last season, it would have identified [false heroes,
 * real carryovers, return traps, overbought winners, family saturation,
 * color mistakes, late climbers]."
 *
 * Strategy:
 *   1. Train: split product_facts by season_tag into train (older seasons)
 *      vs test (newest season).
 *   2. Simulate: build SkuScoreInput from train data only — what would the
 *      engine have said at end of train?
 *   3. Compare: score the test-season actual outcomes (sell_through, returns,
 *      lifecycle) and check whether the engine's train-predicted lifecycle
 *      label matches the actual outcome category.
 *
 * Metrics:
 *   - precision_heroes: of engine-predicted heroes, % that actually hit
 *     sell_through_bought >= P75 in test season
 *   - precision_dogs: of engine-predicted dogs, % that actually had
 *     sell_through_bought <= P25 in test season
 *   - return_trap_catch_rate: of test season SKUs with returns >= P75,
 *     % the engine flagged as investigate
 *   - color_winner_accuracy: of engine-predicted color winners (top within
 *     lineage), % that ranked top in test season
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  loadScoringInputs,
  scoreSku,
  buildFamilyBaselines,
  buildLineageSiblings,
  type ClassifierContext,
  type ClassifierThresholds,
  type SkuScore,
} from './classifiers';

export interface BacktestResult {
  run_id: string;
  train_season_tags: string[];
  test_season_tag: string;
  precision_heroes: number | null;
  precision_dogs: number | null;
  precision_carryover: number | null;
  recall_heroes: number | null;
  recall_dogs: number | null;
  return_trap_catch_rate: number | null;
  color_winner_accuracy: number | null;
  late_climber_catch_rate: number | null;
  identity_graph_accuracy: number | null;
  scorecard_summary: Record<string, unknown>;
  evidence_pairs: Array<{
    model_ref: string;
    color_ref: string | null;
    family_code: string | null;
    engine_label: string;
    actual_label: string;
    train_metrics: Record<string, unknown>;
    test_metrics: Record<string, unknown>;
    match: boolean;
  }>;
}

export async function runBacktest(
  runId: string,
  tenantId: string,
  thresholds: ClassifierThresholds,
  reverseLogisticsCost: number
): Promise<BacktestResult> {
  // Load all inputs for tenant
  const allInputs = await loadScoringInputs(tenantId);

  // Group by season_tag (newest = test, rest = train)
  const seasons = Array.from(new Set(allInputs.map((i) => i.identity_node_id ?? i.model_ref))); // placeholder
  // Better: actually need season from product_facts. Re-fetch with season.
  const { data: facts } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, season_tag, model_ref, color_ref, family_code')
    .eq('tenant_id', tenantId);
  const seasonByPid = new Map((facts || []).map((r: any) => [r.id, r.season_tag as string]));

  // Parse season tags ("V26", "I26", "I26+V26", "SS27", "FW25") into a
  // comparable (year, half) tuple so the newest season is reliably last.
  // Codex P1 fix: lexicographic sort ranked "I26+V26" after "V26", which
  // inverted real time for many tenants.
  const allSeasons = Array.from(
    new Set((facts || []).map((r: any) => r.season_tag as string))
  ).sort((a, b) => seasonRank(a) - seasonRank(b));
  if (allSeasons.length < 2) {
    return {
      run_id: runId,
      train_season_tags: [],
      test_season_tag: allSeasons[0] || '',
      precision_heroes: null,
      precision_dogs: null,
      precision_carryover: null,
      recall_heroes: null,
      recall_dogs: null,
      return_trap_catch_rate: null,
      color_winner_accuracy: null,
      late_climber_catch_rate: null,
      identity_graph_accuracy: null,
      scorecard_summary: {
        skipped: 'Need at least 2 seasons of data to run a backtest',
        seasons_available: allSeasons,
      },
      evidence_pairs: [],
    };
  }

  const testSeason = allSeasons[allSeasons.length - 1];
  const trainSeasons = allSeasons.slice(0, -1);

  const trainInputs = allInputs.filter(
    (i) => trainSeasons.includes(seasonByPid.get(i.product_fact_id) || '')
  );
  const testInputs = allInputs.filter(
    (i) => seasonByPid.get(i.product_fact_id) === testSeason
  );

  // Score TRAIN — this is what the engine would have said
  const ctx: ClassifierContext = {
    tenant_id: tenantId,
    run_id: runId,
    algorithm_version_id: '',
    thresholds,
    reverse_logistics_cost_per_unit: reverseLogisticsCost,
    observation_date: new Date().toISOString().slice(0, 10),
  };
  const trainBaselines = buildFamilyBaselines(trainInputs);
  const trainSiblings = buildLineageSiblings(trainInputs);
  const trainScores = trainInputs.map((i) => scoreSku(i, ctx, trainBaselines, trainSiblings));

  // Score TEST — these are the actual outcomes
  const testBaselines = buildFamilyBaselines(testInputs);
  const testSiblings = buildLineageSiblings(testInputs);
  const testScores = testInputs.map((i) => scoreSku(i, ctx, testBaselines, testSiblings));

  // Build lookups: model_ref → engine label (from train) and actual label (from test)
  const engineLabelByLineage = new Map<string, { label: string; metrics: any }>();
  for (let i = 0; i < trainInputs.length; i += 1) {
    const inp = trainInputs[i];
    const sc = trainScores[i];
    const key = canonicalKey(inp.model_ref);
    if (!engineLabelByLineage.has(key)) {
      engineLabelByLineage.set(key, {
        label: classifyEngine(sc, inp, thresholds),
        metrics: {
          lifecycle: sc.lifecycle_stage,
          demand_score: sc.demand_score,
          margin_score: sc.margin_score,
          return_risk: sc.return_risk_score,
          sell_through: inp.sell_through_bought_pct,
        },
      });
    }
  }

  const actualLabelByLineage = new Map<string, { label: string; metrics: any; input: any }>();
  for (let i = 0; i < testInputs.length; i += 1) {
    const inp = testInputs[i];
    const sc = testScores[i];
    const key = canonicalKey(inp.model_ref);
    if (!actualLabelByLineage.has(key)) {
      actualLabelByLineage.set(key, {
        label: classifyActual(sc, inp),
        metrics: {
          lifecycle: sc.lifecycle_stage,
          sell_through: inp.sell_through_bought_pct,
          returns_pct: inp.returns_pct,
          demand_score: sc.demand_score,
        },
        input: inp,
      });
    }
  }

  // Compute precision/recall metrics
  const enginePredictionsByCategory = new Map<string, number>();
  const correctPredictions = new Map<string, number>();
  const actualByCategory = new Map<string, number>();
  const evidencePairs: BacktestResult['evidence_pairs'] = [];

  for (const [key, eng] of Array.from(engineLabelByLineage.entries())) {
    const actual = actualLabelByLineage.get(key);
    if (!actual) continue;

    enginePredictionsByCategory.set(
      eng.label,
      (enginePredictionsByCategory.get(eng.label) || 0) + 1
    );
    if (eng.label === actual.label) {
      correctPredictions.set(eng.label, (correctPredictions.get(eng.label) || 0) + 1);
    }
    actualByCategory.set(actual.label, (actualByCategory.get(actual.label) || 0) + 1);

    if (evidencePairs.length < 50) {
      evidencePairs.push({
        model_ref: actual.input.model_ref,
        color_ref: actual.input.color_ref,
        family_code: actual.input.family_code,
        engine_label: eng.label,
        actual_label: actual.label,
        train_metrics: eng.metrics,
        test_metrics: actual.metrics,
        match: eng.label === actual.label,
      });
    }
  }

  const precision = (label: string): number | null => {
    const pred = enginePredictionsByCategory.get(label) || 0;
    if (pred === 0) return null;
    return (correctPredictions.get(label) || 0) / pred;
  };
  const recall = (label: string): number | null => {
    const act = actualByCategory.get(label) || 0;
    if (act === 0) return null;
    return (correctPredictions.get(label) || 0) / act;
  };

  // Return-trap catch rate
  let returnTrapCatch: number | null = null;
  {
    const actualReturnTraps = Array.from(actualLabelByLineage.values()).filter(
      (a) => (a.metrics.returns_pct ?? 0) >= thresholds.hero_returns_pct_max
    );
    const engineFlaggedAsInvestigate = actualReturnTraps.filter((a) => {
      const eng = engineLabelByLineage.get(canonicalKey(a.input.model_ref));
      return eng?.label === 'investigate' || eng?.label === 'dog';
    });
    if (actualReturnTraps.length > 0) {
      returnTrapCatch = engineFlaggedAsInvestigate.length / actualReturnTraps.length;
    }
  }

  const scorecard = {
    train_season_tags: trainSeasons,
    test_season_tag: testSeason,
    train_sku_count: trainInputs.length,
    test_sku_count: testInputs.length,
    lineages_overlapping: Array.from(engineLabelByLineage.keys()).filter((k) =>
      actualLabelByLineage.has(k)
    ).length,
    engine_predictions: Object.fromEntries(enginePredictionsByCategory),
    actuals: Object.fromEntries(actualByCategory),
    correct: Object.fromEntries(correctPredictions),
  };

  return {
    run_id: runId,
    train_season_tags: trainSeasons,
    test_season_tag: testSeason,
    precision_heroes: precision('hero'),
    precision_dogs: precision('dog'),
    precision_carryover: precision('carryover'),
    recall_heroes: recall('hero'),
    recall_dogs: recall('dog'),
    return_trap_catch_rate: returnTrapCatch,
    color_winner_accuracy: null,
    late_climber_catch_rate: null,
    identity_graph_accuracy: null,
    scorecard_summary: scorecard,
    evidence_pairs: evidencePairs,
  };
}

function canonicalKey(modelRef: string): string {
  // Codex P0 fix: lineage is the FIRST token (model code). Earlier version
  // used 2 tokens, which split colorways across multiple lineages and
  // broke backtest comparison across seasons.
  const parts = modelRef.trim().split(/\s+/);
  return parts[0] || modelRef.trim();
}

/**
 * Rank a season tag for chronological ordering.
 *
 *   "V26"      → 2026.5  (spring/summer)
 *   "I26"      → 2026.1  (winter)
 *   "I26+V26"  → 2026.5  (carryover into V26 → ranked at V26)
 *   "SS27"     → 2027.5
 *   "FW25"     → 2025.1
 *
 * Lexicographic sort would put "I26+V26" before "V26", inverting time.
 */
function seasonRank(tag: string): number {
  if (!tag) return -Infinity;
  // If it's a compound carryover like "I26+V26", take the LAST segment —
  // that is the most recent season the SKU appeared in.
  const segments = tag.split('+').map((s) => s.trim());
  const latest = segments[segments.length - 1];
  // Spanish: V = Verano (spring/summer, half=0.5), I = Invierno (winter, half=0.1)
  // English: SS = Spring/Summer (half=0.5), FW/AW = Fall/Winter (half=0.1)
  const m = latest.match(/^(V|I|SS|FW|AW)\s?(\d{2,4})$/i);
  if (!m) return -Infinity;
  const prefix = m[1].toUpperCase();
  let yearRaw = m[2];
  if (yearRaw.length === 2) yearRaw = `20${yearRaw}`;
  const year = parseInt(yearRaw, 10);
  const half = prefix === 'V' || prefix === 'SS' ? 0.5 : 0.1;
  return year + half;
}

function classifyEngine(score: SkuScore, input: any, thresholds: ClassifierThresholds): string {
  if (score.lifecycle_stage === 'new' || score.lifecycle_stage === 'insufficient_evidence') {
    return 'unclassified';
  }
  if (
    (input.sell_through_bought_pct ?? 0) >= thresholds.hero_sell_through_bought_p_min &&
    (input.returns_pct ?? 0) <= thresholds.hero_returns_pct_max
  ) {
    return 'hero';
  }
  if (score.lifecycle_stage === 'exit') return 'dog';
  if ((input.returns_pct ?? 0) >= thresholds.hero_returns_pct_max && input.velocity_7d > 0) {
    return 'investigate';
  }
  if (score.lifecycle_stage === 'mature' || score.lifecycle_stage === 'peak') return 'carryover';
  if (score.lifecycle_stage === 'decay') return 'markdown';
  return 'neutral';
}

function classifyActual(score: SkuScore, input: any): string {
  // Actual = what the test season's lifecycle / metrics revealed
  if (score.lifecycle_stage === 'new') return 'unclassified';
  if (score.lifecycle_stage === 'exit') return 'dog';
  if (
    (input.sell_through_bought_pct ?? 0) >= 0.4 &&
    (input.returns_pct ?? 0) <= 0.2
  ) {
    return 'hero';
  }
  if ((input.returns_pct ?? 0) >= 0.2) return 'investigate';
  if (score.lifecycle_stage === 'mature' || score.lifecycle_stage === 'peak') return 'carryover';
  if (score.lifecycle_stage === 'decay') return 'markdown';
  return 'neutral';
}
