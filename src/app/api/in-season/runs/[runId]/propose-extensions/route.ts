/**
 * POST /api/in-season/runs/[runId]/propose-extensions
 *
 * Generates family_extension candidates for eligible families (high ROI or
 * positive brief pivot). Persists to strategy_recommendation_candidates.
 *
 * Body: { familyCode?: string, count?: number, language?: 'en' | 'es' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { proposeFamilyExtensions } from '@/lib/strategy/proposers';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

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
      { error: 'Run must be complete before proposing family extensions', status: run.run_status },
      { status: 409 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // empty body is allowed
  }

  let result;
  try {
    result = await proposeFamilyExtensions({
      runId,
      familyCode: typeof body.familyCode === 'string' ? body.familyCode : undefined,
      count: typeof body.count === 'number' ? body.count : undefined,
      language: body.language === 'es' || body.language === 'en' ? body.language : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'proposeFamilyExtensions failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  if (result.candidates.length === 0) {
    return NextResponse.json({
      created: 0,
      considered_families: result.considered_families,
      warnings: result.warnings,
    });
  }

  const inserts = result.candidates.map((c) => ({
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

  const { data, error } = await supabaseAdmin
    .from('strategy_recommendation_candidates')
    .insert(inserts)
    .select('id');

  if (error) {
    return NextResponse.json(
      { error: 'candidate persist failed', detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    created: data?.length ?? inserts.length,
    candidate_ids: (data || []).map((r) => r.id),
    considered_families: result.considered_families,
    warnings: result.warnings,
  });
}
