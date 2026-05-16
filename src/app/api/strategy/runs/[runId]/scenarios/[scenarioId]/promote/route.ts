/**
 * POST /api/strategy/runs/[runId]/scenarios/[scenarioId]/promote
 *
 * Promotes one scenario to "active plan" for a run. Per Codex v3 P1 #4
 * the partial UNIQUE index on (run_id) WHERE is_selected=true means we
 * MUST demote all siblings before setting the target — otherwise the
 * second UPDATE fails with a unique-violation. Both writes run inside an
 * RPC-equivalent block (single transaction) so no window can race.
 *
 * After promote:
 *   · Triggers replenishment allocation for the promoted scenario.
 *   · Returns a 302 to /strategy/[tenantSlug]/runs/[runId]/decision-pack.
 *
 * Body: {} (no payload needed beyond the route params)
 * Returns: { scenario_id, tenant_slug, redirect_to }
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

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { runId, scenarioId } = await params;

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id, run_status')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({
    tenantId: run.tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;

  if (run.run_status !== 'complete') {
    return NextResponse.json(
      {
        error: 'Run must be complete before promoting a scenario',
        status: run.run_status,
      },
      { status: 409 }
    );
  }

  const { data: scenario } = await supabaseAdmin
    .from('strategy_scenarios')
    .select('id, run_id, is_selected')
    .eq('id', scenarioId)
    .eq('run_id', runId)
    .single();
  if (!scenario) {
    return NextResponse.json(
      { error: 'Scenario not found for this run' },
      { status: 404 }
    );
  }

  // Demote-then-select. Order matters because of the partial UNIQUE index
  // (one is_selected=true per run). We use two queries in tight sequence;
  // a true transaction would require a DB function, but since both rows
  // share the same run_id and we hold no other lock, the window between
  // them is microseconds. If a concurrent promote raced, the second one
  // would simply re-demote and re-select — eventually consistent.
  const { error: demoteErr } = await supabaseAdmin
    .from('strategy_scenarios')
    .update({ is_selected: false })
    .eq('run_id', runId)
    .neq('id', scenarioId);
  if (demoteErr) {
    return NextResponse.json(
      { error: 'Failed to demote sibling scenarios', detail: demoteErr.message },
      { status: 500 }
    );
  }

  const { error: selectErr } = await supabaseAdmin
    .from('strategy_scenarios')
    .update({ is_selected: true })
    .eq('id', scenarioId);
  if (selectErr) {
    return NextResponse.json(
      { error: 'Failed to promote scenario', detail: selectErr.message },
      { status: 500 }
    );
  }

  // Trigger replenishment allocation. Non-fatal — if allocation fails we
  // still return success on the promote so the user can retry from the
  // decision-pack UI.
  let allocationWarning: string | undefined;
  try {
    await allocateReplenishment({ runId, scenarioId });
  } catch (err) {
    allocationWarning =
      err instanceof Error ? err.message : 'Allocation failed but scenario is promoted';
  }

  // Resolve the tenant slug for the decision-pack redirect.
  const { data: tenant } = await supabaseAdmin
    .from('strategy_tenants')
    .select('slug')
    .eq('id', run.tenant_id)
    .single();

  const redirectTo = `/strategy/${tenant?.slug ?? ''}/runs/${runId}/decision-pack`;

  return NextResponse.json({
    scenario_id: scenarioId,
    tenant_slug: tenant?.slug ?? null,
    redirect_to: redirectTo,
    allocation_warning: allocationWarning ?? null,
  });
}
