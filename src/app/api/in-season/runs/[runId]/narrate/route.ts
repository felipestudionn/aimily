/**
 * POST /api/in-season/runs/[runId]/narrate
 *
 * Generates LLM narratives for the run summary + each scenario.
 * Output is persisted on the scenarios and on data_coverage_summary.learnings_narrative.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateRunSummary, generateScenarioNarrative } from '@/lib/in-season/narrative';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('tenant_id, run_status, data_coverage_summary')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({ tenantId: run.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  if (run.run_status !== 'complete') {
    return NextResponse.json(
      { error: 'Run must be complete before narrating', status: run.run_status },
      { status: 409 }
    );
  }

  // 1. Run-level narratives
  const { learnings_narrative, creative_application } = await generateRunSummary(runId);

  await supabaseAdmin
    .from('strategy_analysis_runs')
    .update({
      data_coverage_summary: {
        ...(run.data_coverage_summary || {}),
        learnings_narrative,
        creative_application,
      },
    })
    .eq('id', runId);

  // 2. Per-scenario narratives
  const { data: scenarios } = await supabaseAdmin
    .from('strategy_scenarios')
    .select('id')
    .eq('run_id', runId);

  const narratives: Record<string, string> = {};
  for (const s of scenarios || []) {
    try {
      const text = await generateScenarioNarrative(runId, s.id);
      narratives[s.id] = text;
      await supabaseAdmin
        .from('strategy_scenarios')
        .update({ description: text })
        .eq('id', s.id);
    } catch (err) {
      narratives[s.id] = `error: ${(err as Error).message}`;
    }
  }

  return NextResponse.json({
    run_id: runId,
    learnings_narrative,
    creative_application,
    scenario_narratives: narratives,
  });
}
