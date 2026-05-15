/**
 * Run orchestrator — drives scoring + recommendation + scenarios end-to-end.
 *
 * Called by POST /api/strategy/runs/[runId]/execute. Synchronous in v1
 * (target < 60s for typical tenant); v2 will background-queue per phase.
 *
 * Status state machine: pending → ingesting → scoring → recommending → complete.
 * Errors mark run_status='failed' with detail in error_log[].
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  loadScoringInputs,
  scoreSku,
  aggregateFamilyScores,
  buildFamilyBaselines,
  buildLineageSiblings,
  type ClassifierContext,
  type ClassifierThresholds,
} from './classifiers';
import {
  generateSkuCandidates,
  generateFamilyCandidates,
  generateColorWinnerCandidates,
  applyCreativeBriefModulation,
  assembleScenarios,
  type Constraints,
  type CreativeBrief,
} from './recommend';

export interface ExecuteRunResult {
  run_id: string;
  sku_score_count: number;
  family_score_count: number;
  candidate_count: number;
  scenario_count: number;
  duration_ms: number;
  warnings: string[];
}

export async function executeAnalysisRun(runId: string): Promise<ExecuteRunResult> {
  const t0 = Date.now();
  const warnings: string[] = [];

  // 1. Atomic claim — only one execution can transition a run from pending/failed
  //    into 'scoring'. Solves Codex P0 race condition: two concurrent POSTs
  //    cannot both insert scores. The UPDATE..RETURNING returns 0 rows if a
  //    concurrent execution already claimed the run.
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .update({ run_status: 'scoring', scoring_started_at: new Date().toISOString() })
    .eq('id', runId)
    .in('run_status', ['pending', 'failed'])
    .select(
      'id, tenant_id, algorithm_version_id, constraint_id, creative_brief_id, source_set_ids'
    );
  if (claimErr) {
    throw new Error(`Run claim failed: ${claimErr.message}`);
  }
  if (!claim || claim.length === 0) {
    throw new Error(`Run already in flight or completed: ${runId}`);
  }
  // Idempotent cleanup of any partial state from a previous failed attempt.
  await Promise.all([
    supabaseAdmin.from('strategy_sku_scores').delete().eq('run_id', runId),
    supabaseAdmin.from('strategy_family_scores').delete().eq('run_id', runId),
    supabaseAdmin.from('strategy_recommendation_candidates').delete().eq('run_id', runId),
    supabaseAdmin.from('strategy_scenarios').delete().eq('run_id', runId),
    supabaseAdmin.from('strategy_backtests').delete().eq('run_id', runId),
  ]);

  // Re-fetch with the algorithm_version join.
  const { data: run, error: runErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select(
      `
      id, tenant_id, algorithm_version_id, constraint_id, creative_brief_id, run_status,
      source_set_ids,
      strategy_algorithm_versions!inner(id, thresholds)
    `
    )
    .eq('id', runId)
    .single();
  if (runErr || !run) throw new Error(`Run not found: ${runId}`);

  const algorithm = (run as any).strategy_algorithm_versions;
  const thresholds = algorithm.thresholds as ClassifierThresholds;

  // 2. Get tenant config
  const { data: tenant } = await supabaseAdmin
    .from('strategy_tenants')
    .select('reverse_logistics_cost_per_unit')
    .eq('id', run.tenant_id)
    .single();
  const reverseLogisticsCost = Number(tenant?.reverse_logistics_cost_per_unit ?? 6);

  // 3. Get constraints + creative brief (if any)
  let constraints: Constraints = {
    target_total_skus: null,
    target_buy_budget: null,
    target_avg_margin: null,
    family_share_targets: {},
    positioning_tier: null,
    hard_exclusions: [],
  };
  if (run.constraint_id) {
    // Tenant filter on lookup — defense in depth against cross-tenant injection.
    const { data: c } = await supabaseAdmin
      .from('strategy_constraints')
      .select('*')
      .eq('id', run.constraint_id)
      .eq('tenant_id', run.tenant_id)
      .single();
    if (c) {
      constraints = {
        target_total_skus: c.target_total_skus,
        target_buy_budget: c.target_buy_budget,
        target_avg_margin: c.target_avg_margin,
        family_share_targets: (c.family_share_targets || {}) as Record<string, number>,
        positioning_tier: c.positioning_tier,
        hard_exclusions: (c.hard_exclusions || []) as string[],
      };
    }
  }

  let brief: CreativeBrief | null = null;
  if (run.creative_brief_id) {
    const { data: b } = await supabaseAdmin
      .from('strategy_creative_briefs')
      .select('*')
      .eq('id', run.creative_brief_id)
      .eq('tenant_id', run.tenant_id)
      .single();
    if (b) {
      brief = {
        color_story: b.color_story || [],
        archetypes_focus: b.archetypes_focus || [],
        family_pivot: (b.family_pivot || {}) as Record<string, number>,
        silhouette_preferences: (b.silhouette_preferences || {}) as Record<string, unknown>,
        customer_segment_shift: b.customer_segment_shift,
        creative_narrative: b.creative_narrative,
      };
    }
  }

  // 4. (Run is already in 'scoring' status from the atomic claim above.)

  // 5. Load inputs — restricted to the run's declared source_set_ids so
  //    selecting sources in the UI actually narrows the scoring scope.
  const inputs = await loadScoringInputs(
    run.tenant_id,
    (run.source_set_ids as string[]) || undefined
  );
  if (inputs.length === 0) {
    warnings.push('No product_facts available for tenant — cannot score');
    await supabaseAdmin
      .from('strategy_analysis_runs')
      .update({
        run_status: 'failed',
        error_log: [{ at: new Date().toISOString(), message: 'No data to score' }],
      })
      .eq('id', runId);
    return {
      run_id: runId,
      sku_score_count: 0,
      family_score_count: 0,
      candidate_count: 0,
      scenario_count: 0,
      duration_ms: Date.now() - t0,
      warnings,
    };
  }

  const ctx: ClassifierContext = {
    tenant_id: run.tenant_id,
    run_id: runId,
    algorithm_version_id: run.algorithm_version_id,
    thresholds,
    reverse_logistics_cost_per_unit: reverseLogisticsCost,
    observation_date: new Date().toISOString().slice(0, 10),
  };

  const familyBaselines = buildFamilyBaselines(inputs);
  const lineageSiblings = buildLineageSiblings(inputs);

  // 6. Score SKUs
  const skuScores = inputs.map((i) => scoreSku(i, ctx, familyBaselines, lineageSiblings));

  // 7. Persist sku_scores
  const skuScoreInserts = skuScores.map((s) => ({
    tenant_id: run.tenant_id,
    run_id: runId,
    product_fact_id: s.product_fact_id,
    identity_node_id: s.identity_node_id,
    demand_score: s.demand_score,
    margin_score: s.margin_score,
    effective_margin: s.effective_margin,
    return_risk_score: s.return_risk_score,
    stockout_risk_score: s.stockout_risk_score,
    markdown_risk_score: s.markdown_risk_score,
    cannibalization_risk_score: s.cannibalization_risk_score,
    distribution_breadth_score: s.distribution_breadth_score,
    lifecycle_stage: s.lifecycle_stage,
    confidence_data_completeness: s.confidence_data_completeness,
    confidence_identity: s.confidence_identity,
    confidence_demand: s.confidence_demand,
    confidence_margin: s.confidence_margin,
    confidence_creative_fit: s.confidence_creative_fit,
    confidence_action: s.confidence_action,
    classifier_traces: s.classifier_traces,
  }));

  for (const chunk of Array.from(chunked(skuScoreInserts, 500))) {
    const { error } = await supabaseAdmin.from('strategy_sku_scores').insert(chunk);
    if (error) throw new Error(`sku_scores insert failed: ${error.message}`);
  }

  // 8. Family scores
  const familyScores = aggregateFamilyScores(inputs, skuScores, thresholds);
  const familyScoreInserts = familyScores.map((f) => ({
    tenant_id: run.tenant_id,
    run_id: runId,
    family_code: f.family_code,
    family_display_name: f.family_display_name,
    family_roi: f.family_roi,
    saturation_score: f.saturation_score,
    cannibalization_score: f.cannibalization_score,
    return_drag_score: f.return_drag_score,
    stock_productivity: f.stock_productivity,
    share_of_wallet_pct: f.share_of_wallet_pct,
    share_of_wallet_trend: f.share_of_wallet_trend,
    sku_count: f.sku_count,
    hero_count: f.hero_count,
    dog_count: f.dog_count,
    classifier_traces: f.classifier_traces,
  }));
  if (familyScoreInserts.length > 0) {
    const { error } = await supabaseAdmin
      .from('strategy_family_scores')
      .insert(familyScoreInserts);
    if (error) throw new Error(`family_scores insert failed: ${error.message}`);
  }

  // 9. Mark recommending
  await supabaseAdmin
    .from('strategy_analysis_runs')
    .update({ run_status: 'recommending', scoring_completed_at: new Date().toISOString() })
    .eq('id', runId);

  // 10. Generate candidates
  const skuCandidates = generateSkuCandidates(inputs, skuScores, thresholds);
  const familyCandidates = generateFamilyCandidates(familyScores, thresholds);
  const colorCandidates = generateColorWinnerCandidates(
    inputs,
    skuScores,
    lineageSiblings,
    thresholds
  );

  // Build family→archetype + color taxonomy lookups
  const { data: taxonomies } = await supabaseAdmin
    .from('strategy_taxonomies')
    .select('taxonomy_kind, mapping')
    .eq('tenant_id', run.tenant_id)
    .eq('is_active', true);

  const familyToArchetype = new Map<string, string>();
  const colorTaxonomy = new Map<string, string>();
  for (const t of taxonomies || []) {
    if (t.taxonomy_kind === 'family') {
      const rules = ((t.mapping as any)?.mapping_rules || []) as Array<{
        match: string;
        canonical: string;
      }>;
      const canonical = ((t.mapping as any)?.canonical_families || {}) as Record<
        string,
        { archetype?: string }
      >;
      for (const rule of rules) {
        const arch = canonical[rule.canonical]?.archetype;
        if (arch) familyToArchetype.set(rule.match, arch);
      }
    } else if (t.taxonomy_kind === 'color') {
      const codeToName = ((t.mapping as any)?.code_to_name || {}) as Record<string, string>;
      for (const [code, name] of Object.entries(codeToName)) {
        colorTaxonomy.set(code, name);
      }
    }
  }

  // Apply Bucket B modulation
  const allCandidates = applyCreativeBriefModulation(
    [...skuCandidates, ...familyCandidates, ...colorCandidates],
    brief,
    familyToArchetype,
    colorTaxonomy
  );

  // 11. Persist candidates — including ALL 6 confidence dimensions per Codex P1.
  const candidateInserts = allCandidates.map((c) => ({
    tenant_id: run.tenant_id,
    run_id: runId,
    scope: c.scope,
    scope_ref: c.scope_ref,
    action_type: c.action_type,
    proposed_magnitude: c.proposed_magnitude,
    evidence: c.evidence,
    counter_evidence: c.counter_evidence,
    assumptions: c.assumptions,
    confidence_data_completeness: c.confidence_data_completeness,
    confidence_identity: c.confidence_identity,
    confidence_demand: c.confidence_demand,
    confidence_margin: c.confidence_margin,
    confidence_creative_fit: c.confidence_creative_fit,
    confidence_action: c.confidence_action,
    data_sufficiency_warning: c.data_sufficiency_warning,
    narrative: c.narrative,
  }));

  const candidateIds: string[] = [];
  for (const chunk of Array.from(chunked(candidateInserts, 500))) {
    const { data, error } = await supabaseAdmin
      .from('strategy_recommendation_candidates')
      .insert(chunk)
      .select('id');
    if (error) throw new Error(`candidates insert failed: ${error.message}`);
    for (const r of data || []) candidateIds.push(r.id);
  }

  // 12. Assemble scenarios
  const scenarios = assembleScenarios(allCandidates, inputs, constraints, brief != null);
  const scenarioInserts = scenarios.map((s, idx) => ({
    tenant_id: run.tenant_id,
    run_id: runId,
    name: s.name,
    description: s.description,
    scenario_type: s.scenario_type,
    candidate_ids: s.candidate_indices.map((i) => candidateIds[i]).filter(Boolean),
    constraint_satisfaction_summary: s.constraint_satisfaction_summary,
    creative_application_summary: s.creative_application_summary,
    total_predicted_revenue: s.total_predicted_revenue,
    total_predicted_margin: s.total_predicted_margin,
    total_predicted_returns: s.total_predicted_returns,
    total_predicted_buy_budget: s.total_predicted_buy_budget,
    predicted_sku_count: s.predicted_sku_count,
    is_default: idx === 0,
    is_selected: idx === 0,
  }));
  if (scenarioInserts.length > 0) {
    const { error } = await supabaseAdmin.from('strategy_scenarios').insert(scenarioInserts);
    if (error) throw new Error(`scenarios insert failed: ${error.message}`);
  }

  // 13. Complete
  const duration = Date.now() - t0;
  await supabaseAdmin
    .from('strategy_analysis_runs')
    .update({
      run_status: 'complete',
      recommending_completed_at: new Date().toISOString(),
      data_coverage_summary: {
        sku_count: inputs.length,
        family_count: familyScores.length,
        lineages_count: lineageSiblings.size,
        sources_used: Array.from(new Set(inputs.map((i) => i.product_fact_id))).length,
      },
    })
    .eq('id', runId);

  return {
    run_id: runId,
    sku_score_count: skuScores.length,
    family_score_count: familyScores.length,
    candidate_count: allCandidates.length,
    scenario_count: scenarios.length,
    duration_ms: duration,
    warnings,
  };
}

function* chunked<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}
