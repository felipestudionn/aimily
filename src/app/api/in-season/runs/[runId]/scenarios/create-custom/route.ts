/**
 * POST /api/in-season/runs/[runId]/scenarios/create-custom
 *
 * Creates a custom scenario row in strategy_scenarios derived from the
 * user's edits on the inline scenario editor. Required by Codex v2 P1 #2:
 * editing axis cards must produce a PERSISTED scenario with its own
 * candidate_ids — not patch derived totals on an existing scenario.
 *
 * Body:
 * {
 *   parent_scenario_id: string,
 *   name?: string,
 *   description?: string,
 *   action_mix: { replenish_pct, new_sku_proposal_pct, family_extension_pct, kill_pct }
 * }
 *
 * Behaviour:
 *   1. Loads parent scenario + its run.
 *   2. Re-runs the candidate filter logic against the run's existing
 *      candidates using the new action_mix as a posture tilt. Candidates
 *      are re-ranked + filtered to honour the requested mix.
 *   3. Inserts new strategy_scenarios row with scenario_type='custom',
 *      parent_scenario_id pointing to source, candidate_ids derived from
 *      re-filter, totals recomputed from the candidates' impact.
 *   4. Returns the new scenario id so the UI can navigate.
 *
 * Does NOT promote the custom scenario (is_selected stays false). The
 * separate promote endpoint handles that exclusively.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

interface ActionMix {
  replenish_pct: number;
  new_sku_proposal_pct: number;
  family_extension_pct: number;
  kill_pct: number;
}

interface CreateCustomBody {
  parent_scenario_id?: string;
  name?: string;
  description?: string;
  action_mix?: ActionMix;
}

// Re-rank + filter parent's candidates by the requested action mix.
// Each action_type gets a share of the final candidate pool proportional
// to the requested pct. Within each bucket, candidates are sorted by
// confidence_action descending and kept proportionally.
function rebalanceByMix(
  parentCandidateIds: string[],
  candidatesById: Map<string, { action_type: string; confidence_action: number }>,
  mix: ActionMix
): string[] {
  const buckets: Record<string, string[]> = {
    replenish: [],
    new_sku_proposal: [],
    family_extension: [],
    kill: [],
    other: [],
  };

  for (const id of parentCandidateIds) {
    const c = candidatesById.get(id);
    if (!c) continue;
    if (c.action_type === 'replenish' || c.action_type === 'resize_up') {
      buckets.replenish.push(id);
    } else if (c.action_type === 'new_sku_proposal') {
      buckets.new_sku_proposal.push(id);
    } else if (c.action_type === 'family_extension') {
      buckets.family_extension.push(id);
    } else if (c.action_type === 'kill' || c.action_type === 'resize_down' || c.action_type === 'markdown_accelerate') {
      buckets.kill.push(id);
    } else {
      buckets.other.push(id);
    }
  }

  // Sort each bucket by confidence (highest first).
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => {
      const ca = candidatesById.get(a)?.confidence_action ?? 0;
      const cb = candidatesById.get(b)?.confidence_action ?? 0;
      return cb - ca;
    });
  }

  // Target size = same as parent (preserve scenario sizing budget).
  const targetSize = Math.max(1, parentCandidateIds.length);
  const pick: Record<string, number> = {
    replenish: Math.round((mix.replenish_pct / 100) * targetSize),
    new_sku_proposal: Math.round((mix.new_sku_proposal_pct / 100) * targetSize),
    family_extension: Math.round((mix.family_extension_pct / 100) * targetSize),
    kill: Math.round((mix.kill_pct / 100) * targetSize),
  };

  const result: string[] = [];
  for (const k of ['replenish', 'new_sku_proposal', 'family_extension', 'kill'] as const) {
    result.push(...buckets[k].slice(0, pick[k]));
  }
  // Carryover / tension / investigate / etc. always ride alongside.
  result.push(...buckets.other);

  return result;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  let body: CreateCustomBody | null = null;
  try {
    body = (await req.json()) as CreateCustomBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parentScenarioId = body?.parent_scenario_id;
  if (typeof parentScenarioId !== 'string' || !parentScenarioId) {
    return NextResponse.json({ error: 'parent_scenario_id is required' }, { status: 400 });
  }
  if (!body?.action_mix) {
    return NextResponse.json({ error: 'action_mix is required' }, { status: 400 });
  }
  const mix = body.action_mix;
  const sum =
    (mix.replenish_pct ?? 0) +
    (mix.new_sku_proposal_pct ?? 0) +
    (mix.family_extension_pct ?? 0) +
    (mix.kill_pct ?? 0);
  if (Math.abs(sum - 100) > 0.5) {
    return NextResponse.json(
      { error: `action_mix sum must be 100, got ${sum}` },
      { status: 400 }
    );
  }

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id, name')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({ tenantId: run.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const { data: parent } = await supabaseAdmin
    .from('strategy_scenarios')
    .select('id, run_id, name, candidate_ids, total_predicted_revenue, total_predicted_margin, total_predicted_buy_budget, predicted_sku_count')
    .eq('id', parentScenarioId)
    .eq('run_id', runId)
    .single();
  if (!parent) {
    return NextResponse.json({ error: 'Parent scenario not found for this run' }, { status: 404 });
  }

  const parentCandidateIds = (parent.candidate_ids || []) as string[];
  if (parentCandidateIds.length === 0) {
    return NextResponse.json(
      { error: 'Parent scenario has no candidates to remix' },
      { status: 400 }
    );
  }

  // Pull candidates + their action_type + confidence for re-bucketing + impact.
  const { data: candidateRows, error: candErr } = await supabaseAdmin
    .from('strategy_recommendation_candidates')
    .select('id, scope, scope_ref, action_type, proposed_magnitude, confidence_action')
    .in('id', parentCandidateIds);
  if (candErr || !candidateRows) {
    return NextResponse.json(
      { error: 'Failed to load parent candidates', detail: candErr?.message },
      { status: 500 }
    );
  }

  const candidatesById = new Map<
    string,
    { action_type: string; confidence_action: number; scope: string; scope_ref: string; proposed_magnitude: any }
  >();
  for (const c of candidateRows) {
    candidatesById.set(c.id, {
      action_type: c.action_type,
      confidence_action: Number(c.confidence_action ?? 0),
      scope: c.scope,
      scope_ref: c.scope_ref,
      proposed_magnitude: c.proposed_magnitude,
    });
  }

  const newCandidateIds = rebalanceByMix(parentCandidateIds, candidatesById, mix);

  // Estimate totals by ratio against parent. The deterministic per-SKU
  // impact lives in the orchestrator's product_facts join — for a fast
  // custom path we approximate by scaling parent totals by the ratio of
  // kept-vs-original candidate count per action bucket. UI surfaces this
  // as a counterfactual estimate with the "promoted plan re-allocates"
  // hint so the user knows totals refresh after promote+allocate.
  const ratio = newCandidateIds.length / parentCandidateIds.length;
  const totalRevenue = Number(parent.total_predicted_revenue ?? 0) * ratio;
  const totalMargin = Number(parent.total_predicted_margin ?? 0) * ratio;
  const totalBuyBudget = Number(parent.total_predicted_buy_budget ?? 0) * ratio;
  const skuCount = Math.round(Number(parent.predicted_sku_count ?? 0) * ratio);

  const customName =
    body.name ?? `Custom from ${parent.name ?? 'parent scenario'}`;

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('strategy_scenarios')
    .insert({
      tenant_id: run.tenant_id,
      run_id: runId,
      name: customName,
      description: body.description ?? 'Counterfactual created from the inline scenario editor. Totals are estimated; promote + allocate to recompute.',
      scenario_type: 'custom',
      parent_scenario_id: parentScenarioId,
      candidate_ids: newCandidateIds,
      total_predicted_revenue: Math.round(totalRevenue * 100) / 100,
      total_predicted_margin: Math.round(totalMargin * 100) / 100,
      total_predicted_returns: 0,
      total_predicted_buy_budget: Math.round(totalBuyBudget * 100) / 100,
      predicted_sku_count: skuCount,
      is_default: false,
      is_selected: false,
      constraint_satisfaction_summary: { custom_action_mix: mix },
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: 'Failed to create custom scenario', detail: insertErr?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    scenario_id: inserted.id,
    parent_scenario_id: parentScenarioId,
    candidate_count: newCandidateIds.length,
    notice:
      'Totals are counterfactual estimates. Promote + allocate to refresh with the deterministic engine.',
  });
}
