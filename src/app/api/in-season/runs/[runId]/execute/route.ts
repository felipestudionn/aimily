/**
 * POST /api/in-season/runs/[runId]/execute
 *
 * Synchronously executes the scoring + recommendation + scenario pipeline.
 * In v1 this blocks until done (typical < 60s). v2 background queue lands
 * with the first tier-1 customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { executeAnalysisRun } from '@/lib/in-season/orchestrator';
import { consumeCredits, refundCredits } from '@/lib/api-auth';
import { CREDIT_COSTS } from '@/lib/stripe';

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

  // Credits gate · Felipe 2026-05-20 night.
  // A user-initiated In-Season run subtracts CREDIT_COSTS.in_season_run from
  // the caller's monthly bucket. The cron-driven daily sync runs as system
  // and does NOT pass through this endpoint, so it bypasses credit accounting
  // by design (the customer paid for daily cadence as part of their plan).
  const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(access.userId);
  const userEmail = userInfo?.user?.email ?? '';
  const credits = await consumeCredits(access.userId, userEmail, 'in_season_run');
  if (!credits.allowed) {
    return NextResponse.json(
      {
        error: 'credits_exhausted',
        reason: credits.reason,
        current: credits.current,
        limit: credits.limit,
        pack_balance: credits.packBalance,
        cost: CREDIT_COSTS.in_season_run,
      },
      { status: 402 }
    );
  }

  try {
    const result = await executeAnalysisRun(runId);
    return NextResponse.json(result);
  } catch (err) {
    // Refund the credits — the user never received the analysis output.
    await refundCredits(access.userId, credits.planConsumed ?? 0, credits.packConsumed ?? 0);
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('strategy_analysis_runs')
      .update({
        run_status: 'failed',
        error_log: [{ at: new Date().toISOString(), message }],
      })
      .eq('id', runId);
    return NextResponse.json(
      { error: 'Execution failed', detail: message },
      { status: 500 }
    );
  }
}
