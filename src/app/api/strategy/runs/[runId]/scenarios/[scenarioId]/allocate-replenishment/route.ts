/**
 * POST /api/strategy/runs/[runId]/scenarios/[scenarioId]/allocate-replenishment
 *
 * Runs the replenishment allocator on a specific scenario. Persists rows
 * to strategy_replenishment_allocations (idempotent — replaces prior
 * allocation for the same scenario) and emits late_to_market tension_flag
 * candidates when supplier_lead_time exceeds seasonal runway.
 *
 * Body (optional): { budgetOverride?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { allocateReplenishment } from '@/lib/strategy/replenishment';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface RouteParams {
  params: Promise<{ runId: string; scenarioId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { runId, scenarioId } = await params;

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('tenant_id, run_status')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({ tenantId: run.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  if (run.run_status !== 'complete') {
    return NextResponse.json(
      { error: 'Run must be complete before allocating replenishment', status: run.run_status },
      { status: 409 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // empty body allowed
  }

  try {
    const result = await allocateReplenishment({
      runId,
      scenarioId,
      budgetOverride: typeof body.budgetOverride === 'number' ? body.budgetOverride : undefined,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'allocateReplenishment failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
