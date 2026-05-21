/**
 * Replenishment allocator — Paso 3 §3.1-3.2.
 *
 * Given a scenario + a buy budget, distribute units across replenish-eligible
 * SKUs optimising:
 *
 *   ranking_score = demand_score
 *                 × seasonal_runway_score
 *                 × (1 - return_risk_score)
 *                 × creative_alignment_score
 *                 × (1 - lead_time_penalty)
 *
 * Where `lead_time_penalty` ∈ [0, 1]:
 *   - 0 when supplier_lead_time <= 0.4 × seasonal_runway_days
 *   - 1 when supplier_lead_time >= seasonal_runway_days (excluded entirely
 *     with excluded_reason = 'late_to_market')
 *   - linear ramp in between
 *
 * Allocator strategy:
 *   1. Compute ranking_score for every replenish candidate in the scenario
 *   2. Exclude SKUs where `deliverable_days < 0` (lead time > runway) and
 *      emit a `late_to_market` row with recommended_buy_units = 0
 *   3. Normalise scores across the remaining SKUs to weights summing to 1
 *   4. Compute initial unit allocation as
 *        units_i = round(budget × weight_i / unit_cost_i)
 *      capped at 4× the source SKU's historical 7d velocity (so we never
 *      buy 6 months of inventory for a runway of 2 months)
 *   5. Adjust to stay under budget while maintaining ratio
 *   6. Persist one strategy_replenishment_allocations row per candidate,
 *      including zero-unit rows for excluded SKUs (with excluded_reason)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface AllocateReplenishmentOptions {
  runId: string;
  scenarioId: string;
  budgetOverride?: number;
}

export interface AllocationRow {
  product_fact_id: string;
  recommended_buy_units: number;
  projected_cost: number | null;
  ranking_score: number;
  score_components: {
    demand_score: number;
    seasonal_runway_score: number;
    return_risk_penalty: number;
    creative_alignment_score: number;
    lead_time_penalty: number;
    deliverable_days: number;
    excluded_reason: 'late_to_market' | 'no_runway' | 'creative_tension' | null;
  };
  justification: string;
}

export interface AllocateReplenishmentResult {
  run_id: string;
  scenario_id: string;
  budget_target: number | null;
  budget_used: number;
  units_allocated_total: number;
  allocated_count: number;
  excluded_count: number;
  late_to_market_skus: string[];
  rows: AllocationRow[];
}

const VELOCITY_RUNWAY_WEEKS = 4; // never allocate more than 4 weeks of velocity at a time
const LEAD_TIME_OK_RATIO = 0.4; // lead_time below 40% of runway → no penalty
const SCENARIO_REVENUE_FALLBACK_MARGIN = 0.55; // if cost_estimate missing, assume 55% cost ratio

export async function allocateReplenishment(
  opts: AllocateReplenishmentOptions
): Promise<AllocateReplenishmentResult> {
  // Load scenario + run + constraint budget.
  const { data: scenario, error: scenErr } = await supabaseAdmin
    .from('strategy_scenarios')
    .select('id, run_id, tenant_id, candidate_ids')
    .eq('id', opts.scenarioId)
    .single();
  if (scenErr || !scenario) {
    throw new Error(`Scenario ${opts.scenarioId} not found`);
  }
  if (scenario.run_id !== opts.runId) {
    throw new Error(`Scenario ${opts.scenarioId} does not belong to run ${opts.runId}`);
  }

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('constraint_id, default_lead_time_days, run_mode, tenant_id')
    .eq('id', opts.runId)
    .single();

  let budgetTarget: number | null = opts.budgetOverride ?? null;
  if (budgetTarget == null && run?.constraint_id) {
    const { data: c } = await supabaseAdmin
      .from('strategy_constraints')
      .select('target_buy_budget')
      .eq('id', run.constraint_id)
      .eq('tenant_id', run.tenant_id)
      .maybeSingle();
    if (c?.target_buy_budget != null) {
      budgetTarget = Number(c.target_buy_budget);
    }
  }
  const defaultLeadTime = run?.default_lead_time_days ?? null;

  // Pull the scenario's candidate_ids and filter to replenish-eligible
  // action types: replenish (explicit) + carryover (carries existing units
  // forward + adds new ones). new_sku_proposal also benefits from budget
  // allocation, treated as a scaled-down extension of source winner.
  const candidateIds = (scenario.candidate_ids as string[]) || [];
  if (candidateIds.length === 0) {
    return {
      run_id: opts.runId,
      scenario_id: opts.scenarioId,
      budget_target: budgetTarget,
      budget_used: 0,
      units_allocated_total: 0,
      allocated_count: 0,
      excluded_count: 0,
      late_to_market_skus: [],
      rows: [],
    };
  }

  const { data: candidates } = await supabaseAdmin
    .from('strategy_recommendation_candidates')
    .select(
      'id, scope, scope_ref, action_type, proposed_magnitude, evidence, confidence_creative_fit, confidence_action'
    )
    .in('id', candidateIds)
    .in('action_type', ['replenish', 'carryover', 'new_sku_proposal']);

  const sourceCandidates = (candidates || []) as any[];
  if (sourceCandidates.length === 0) {
    return {
      run_id: opts.runId,
      scenario_id: opts.scenarioId,
      budget_target: budgetTarget,
      budget_used: 0,
      units_allocated_total: 0,
      allocated_count: 0,
      excluded_count: 0,
      late_to_market_skus: [],
      rows: [],
    };
  }

  // Dedupe by scope_ref (carryover + replenish on same SKU = single row).
  const winningByPid = new Map<
    string,
    {
      candidate_id: string;
      action_type: string;
      proposed_magnitude: any;
      evidence: any;
      confidence_creative_fit: number | null;
      confidence_action: number;
    }
  >();
  for (const c of sourceCandidates) {
    if (c.scope !== 'sku') continue;
    const existing = winningByPid.get(c.scope_ref);
    const cand = {
      candidate_id: c.id,
      action_type: c.action_type,
      proposed_magnitude: c.proposed_magnitude,
      evidence: c.evidence,
      confidence_creative_fit: c.confidence_creative_fit != null ? Number(c.confidence_creative_fit) : null,
      confidence_action: Number(c.confidence_action ?? 0),
    };
    if (!existing || cand.confidence_action > existing.confidence_action) {
      winningByPid.set(c.scope_ref, cand);
    }
  }

  const productFactIds = Array.from(winningByPid.keys());
  const { data: facts } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, model_ref, color_ref, product_name, family_code, pvp, cost_estimate, supplier_lead_time_days')
    .in('id', productFactIds);
  const { data: scores } = await supabaseAdmin
    .from('strategy_sku_scores')
    .select(
      'product_fact_id, demand_score, return_risk_score, seasonal_runway_days, seasonal_runway_score'
    )
    .eq('run_id', opts.runId)
    .in('product_fact_id', productFactIds);
  const { data: salesWindows } = await supabaseAdmin
    .from('strategy_sales_windows')
    .select('product_fact_id, units, window_type')
    .in('product_fact_id', productFactIds)
    .eq('window_type', '7d');

  const factByPid = new Map<string, any>((facts || []).map((f: any) => [f.id, f]));
  const scoreByPid = new Map<string, any>((scores || []).map((s: any) => [s.product_fact_id, s]));
  const velocity7dByPid = new Map<string, number>();
  for (const w of (salesWindows || []) as any[]) {
    velocity7dByPid.set(w.product_fact_id, Number(w.units) || 0);
  }

  // ── Step 1 · compute ranking per candidate ──────────────────────────────
  type Row = AllocationRow & {
    weight: number;
    unit_cost: number;
    velocity_cap_units: number;
  };
  const rows: Row[] = [];
  const lateToMarket: string[] = [];

  for (const [pid, cand] of Array.from(winningByPid.entries())) {
    const fact = factByPid.get(pid);
    const score = scoreByPid.get(pid);
    if (!fact) continue;

    const demand = score?.demand_score != null ? Number(score.demand_score) : 0;
    const returnRisk = score?.return_risk_score != null ? Number(score.return_risk_score) : 0;
    const runwayScore = score?.seasonal_runway_score != null ? Number(score.seasonal_runway_score) : 0.5;
    const runwayDays = score?.seasonal_runway_days != null ? Number(score.seasonal_runway_days) : null;
    const creativeFit =
      cand.confidence_creative_fit != null ? cand.confidence_creative_fit : 0.6;

    const leadTime = fact.supplier_lead_time_days ?? defaultLeadTime;
    const deliverableDays =
      runwayDays != null && leadTime != null ? runwayDays - leadTime : runwayDays ?? 0;

    let leadTimePenalty = 0;
    let excludedReason: AllocationRow['score_components']['excluded_reason'] = null;
    if (leadTime != null && runwayDays != null) {
      const ratio = leadTime / Math.max(runwayDays, 1);
      if (ratio >= 1) {
        leadTimePenalty = 1;
        excludedReason = 'late_to_market';
      } else if (ratio > LEAD_TIME_OK_RATIO) {
        leadTimePenalty = (ratio - LEAD_TIME_OK_RATIO) / (1 - LEAD_TIME_OK_RATIO);
      }
    }
    if (runwayDays != null && runwayDays <= 7) {
      // Effectively no time left in the season — don't replenish.
      excludedReason = excludedReason ?? 'no_runway';
    }
    // Bucket B says away + this candidate scaling up = creative tension on the buy.
    if (cand.action_type === 'replenish' && creativeFit < 0.2) {
      excludedReason = excludedReason ?? 'creative_tension';
    }

    const ranking =
      excludedReason != null
        ? 0
        : demand *
          runwayScore *
          Math.max(0, 1 - returnRisk) *
          Math.max(0, creativeFit) *
          (1 - leadTimePenalty);

    const unitCost =
      fact.cost_estimate != null
        ? Number(fact.cost_estimate)
        : (Number(fact.pvp) || 0) * SCENARIO_REVENUE_FALLBACK_MARGIN;
    const velocity7d = velocity7dByPid.get(pid) ?? 0;
    const velocityCapUnits = Math.max(50, Math.round(velocity7d * VELOCITY_RUNWAY_WEEKS));

    if (excludedReason === 'late_to_market') lateToMarket.push(pid);

    const justification = [
      `${cand.action_type} on ${fact.product_name || fact.model_ref}`,
      `demand=${pct(demand)}`,
      `runway=${runwayDays ?? '?'}d`,
      `returns=${pct(returnRisk)}`,
      `creative_fit=${pct(creativeFit)}`,
      leadTime != null ? `lead_time=${leadTime}d` : 'lead_time=unknown',
      excludedReason ? `EXCLUDED: ${excludedReason}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    rows.push({
      product_fact_id: pid,
      recommended_buy_units: 0, // assigned below
      projected_cost: null,
      ranking_score: ranking,
      score_components: {
        demand_score: round4(demand),
        seasonal_runway_score: round4(runwayScore),
        return_risk_penalty: round4(returnRisk),
        creative_alignment_score: round4(creativeFit),
        lead_time_penalty: round4(leadTimePenalty),
        deliverable_days: Math.round(deliverableDays),
        excluded_reason: excludedReason,
      },
      justification,
      weight: ranking,
      unit_cost: unitCost > 0 ? unitCost : 1,
      velocity_cap_units: velocityCapUnits,
    });
  }

  // ── Step 2 · normalise weights to sum 1 across non-excluded rows ────────
  const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
  for (const r of rows) {
    r.weight = totalWeight > 0 ? r.weight / totalWeight : 0;
  }

  // ── Step 3 · allocate units against budget ──────────────────────────────
  let budgetUsed = 0;
  let unitsAllocatedTotal = 0;
  const effectiveBudget = budgetTarget ?? Number.POSITIVE_INFINITY;

  for (const r of rows) {
    if (r.weight <= 0 || r.score_components.excluded_reason != null) {
      r.recommended_buy_units = 0;
      r.projected_cost = 0;
      continue;
    }
    const idealCost = effectiveBudget * r.weight;
    let units = Math.round(idealCost / r.unit_cost);
    if (units > r.velocity_cap_units) units = r.velocity_cap_units;
    if (units < 0) units = 0;
    const cost = units * r.unit_cost;
    r.recommended_buy_units = units;
    r.projected_cost = round2(cost);
    budgetUsed += cost;
    unitsAllocatedTotal += units;
  }

  // ── Step 4 · trim to fit budget cap, lowest-score first ─────────────────
  if (budgetTarget != null && budgetUsed > budgetTarget) {
    const sorted = [...rows]
      .filter((r) => r.recommended_buy_units > 0)
      .sort((a, b) => a.ranking_score - b.ranking_score);
    for (const r of sorted) {
      if (budgetUsed <= budgetTarget) break;
      const cutUnits = Math.min(
        r.recommended_buy_units,
        Math.ceil((budgetUsed - budgetTarget) / r.unit_cost)
      );
      r.recommended_buy_units -= cutUnits;
      const reduction = cutUnits * r.unit_cost;
      r.projected_cost = round2((r.recommended_buy_units * r.unit_cost) || 0);
      budgetUsed -= reduction;
      unitsAllocatedTotal -= cutUnits;
    }
  }

  // ── Step 5 · persist (idempotent on scenario_id) ────────────────────────
  await supabaseAdmin
    .from('strategy_replenishment_allocations')
    .delete()
    .eq('scenario_id', opts.scenarioId);

  if (rows.length > 0) {
    const inserts = rows.map((r) => ({
      tenant_id: scenario.tenant_id,
      run_id: opts.runId,
      scenario_id: opts.scenarioId,
      product_fact_id: r.product_fact_id,
      recommended_buy_units: r.recommended_buy_units,
      projected_cost: r.projected_cost,
      ranking_score: round4(r.ranking_score),
      score_components: r.score_components,
      justification: r.justification,
    }));
    const { error } = await supabaseAdmin
      .from('strategy_replenishment_allocations')
      .insert(inserts);
    if (error) throw new Error(`allocations insert failed: ${error.message}`);
  }

  // ── Step 6 · emit late_to_market tension_flag candidates ─────────────────
  if (lateToMarket.length > 0) {
    const tensionInserts = lateToMarket.map((pid) => {
      const r = rows.find((x) => x.product_fact_id === pid)!;
      const fact = factByPid.get(pid);
      return {
        tenant_id: scenario.tenant_id,
        run_id: opts.runId,
        scope: 'sku' as const,
        scope_ref: pid,
        action_type: 'tension_flag' as const,
        proposed_magnitude: null,
        evidence: {
          tension_type: 'late_to_market',
          supplier_lead_time_days: fact?.supplier_lead_time_days ?? defaultLeadTime,
          seasonal_runway_days: r.score_components.deliverable_days +
            (fact?.supplier_lead_time_days ?? defaultLeadTime ?? 0),
          deliverable_days: r.score_components.deliverable_days,
          note:
            'Supplier lead time exceeds remaining seasonal runway. Buying this SKU now lands stock in store after the season closes. Either secure a faster supplier or defer to next season.',
        },
        counter_evidence: {},
        assumptions: [
          'Emitted by allocateReplenishment(). Confirm supplier_lead_time_days is accurate before treating as blocker — a faster shipping mode may unlock this SKU.',
        ],
        confidence_data_completeness: fact?.supplier_lead_time_days != null ? 0.85 : 0.5,
        confidence_identity: 0.9,
        confidence_demand: 0.7,
        confidence_margin: 0.7,
        confidence_creative_fit: 0.05,
        confidence_action: 0.85,
        data_sufficiency_warning:
          fact?.supplier_lead_time_days == null
            ? 'Using default_lead_time_days fallback. Provide per-SKU supplier_lead_time_days for sharper tension detection.'
            : null,
        narrative: null,
      };
    });
    await supabaseAdmin.from('strategy_recommendation_candidates').insert(tensionInserts);
  }

  return {
    run_id: opts.runId,
    scenario_id: opts.scenarioId,
    budget_target: budgetTarget,
    budget_used: round2(budgetUsed),
    units_allocated_total: unitsAllocatedTotal,
    allocated_count: rows.filter((r) => r.recommended_buy_units > 0).length,
    excluded_count: rows.filter((r) => r.score_components.excluded_reason != null).length,
    late_to_market_skus: lateToMarket,
    rows: rows.map(({ weight, unit_cost, velocity_cap_units, ...rest }) => rest),
  };
}

function pct(v: unknown): string {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return '?';
  return `${(v * 100).toFixed(0)}%`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
