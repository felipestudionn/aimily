/**
 * POST /api/in-season/runs/[runId]/execute
 *
 * Synchronously executes the scoring + recommendation + scenario pipeline.
 * In v1 this blocks until done (typical < 60s). v2 background queue lands
 * with the first tier-1 customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { executeAnalysisRun } from '@/lib/strategy/orchestrator';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('tenant_id, run_status')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({ tenantId: run.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  if (run.run_status === 'complete') {
    return NextResponse.json({ error: 'Run already complete' }, { status: 409 });
  }
  if (run.run_status === 'scoring' || run.run_status === 'recommending') {
    return NextResponse.json({ error: 'Run already in progress' }, { status: 409 });
  }

  try {
    const result = await executeAnalysisRun(runId);
    return NextResponse.json(result);
  } catch (err: any) {
    await supabaseAdmin
      .from('strategy_analysis_runs')
      .update({
        run_status: 'failed',
        error_log: [{ at: new Date().toISOString(), message: err?.message || String(err) }],
      })
      .eq('id', runId);
    return NextResponse.json(
      { error: 'Execution failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
