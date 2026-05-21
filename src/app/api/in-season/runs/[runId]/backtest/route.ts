/**
 * POST /api/in-season/runs/[runId]/backtest
 *
 * Runs the backtest engine: trains on N-1 seasons, tests on the newest
 * season's actuals. Stores the result in strategy_backtests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { runBacktest } from '@/lib/in-season/backtest';
import type { ClassifierThresholds } from '@/lib/in-season/classifiers';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select(
      'tenant_id, algorithm_version_id, strategy_algorithm_versions!inner(thresholds)'
    )
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({
    tenantId: run.tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;

  const { data: tenant } = await supabaseAdmin
    .from('strategy_tenants')
    .select('reverse_logistics_cost_per_unit')
    .eq('id', run.tenant_id)
    .single();
  const rlCost = Number(tenant?.reverse_logistics_cost_per_unit ?? 6);

  const thresholds = (run as any).strategy_algorithm_versions.thresholds as ClassifierThresholds;

  let result;
  try {
    result = await runBacktest(runId, run.tenant_id, thresholds, rlCost);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Backtest failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  // Persist
  const { error: insertError } = await supabaseAdmin.from('strategy_backtests').insert({
    tenant_id: run.tenant_id,
    run_id: runId,
    train_season_tags: result.train_season_tags,
    test_season_tag: result.test_season_tag,
    precision_heroes: result.precision_heroes,
    precision_dogs: result.precision_dogs,
    precision_carryover: result.precision_carryover,
    recall_heroes: result.recall_heroes,
    recall_dogs: result.recall_dogs,
    return_trap_catch_rate: result.return_trap_catch_rate,
    color_winner_accuracy: result.color_winner_accuracy,
    late_climber_catch_rate: result.late_climber_catch_rate,
    identity_graph_accuracy: result.identity_graph_accuracy,
    scorecard_summary: result.scorecard_summary,
    evidence_pairs: result.evidence_pairs,
  });

  if (insertError) {
    return NextResponse.json(
      { error: 'Backtest persist failed', detail: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(result);
}
