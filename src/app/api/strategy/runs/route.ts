/**
 * POST /api/strategy/runs
 *
 * Create a new analysis run for a tenant. Optionally links to existing
 * constraint + creative_brief rows. Does NOT execute — caller follows up
 * with POST /api/strategy/runs/[id]/execute.
 *
 * Body:
 *   tenant_slug: string
 *   name?: string
 *   constraint_id?: string
 *   creative_brief_id?: string
 *   source_set_ids?: string[]  (defaults to all sources for tenant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantSlug = body?.tenant_slug;
  if (typeof tenantSlug !== 'string') {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;
  const { tenant, userId } = access;

  // Find the default algorithm version.
  const { data: algoVer } = await supabaseAdmin
    .from('strategy_algorithm_versions')
    .select('id')
    .eq('is_default', true)
    .single();
  if (!algoVer) {
    return NextResponse.json({ error: 'No default algorithm version' }, { status: 500 });
  }

  // Default source_set_ids = all sources for tenant if not specified.
  let sourceSetIds: string[] = Array.isArray(body.source_set_ids)
    ? body.source_set_ids.filter((x: unknown) => typeof x === 'string')
    : [];
  if (sourceSetIds.length === 0) {
    const { data } = await supabaseAdmin
      .from('strategy_sources')
      .select('id')
      .eq('tenant_id', tenant.id)
      .not('processed_at', 'is', null);
    sourceSetIds = (data || []).map((s) => s.id);
  }

  if (sourceSetIds.length === 0) {
    return NextResponse.json(
      { error: 'No processed sources available for this tenant. Upload + parse a source first.' },
      { status: 400 }
    );
  }

  const { data: run, error } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .insert({
      tenant_id: tenant.id,
      name: body.name || null,
      created_by: userId,
      source_set_ids: sourceSetIds,
      algorithm_version_id: algoVer.id,
      constraint_id: body.constraint_id || null,
      creative_brief_id: body.creative_brief_id || null,
      run_status: 'pending',
    })
    .select('id, run_status, created_at')
    .single();

  if (error || !run) {
    return NextResponse.json(
      { error: 'Failed to create run', detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    run_id: run.id,
    status: run.run_status,
    next_step: `POST /api/strategy/runs/${run.id}/execute to begin scoring`,
  });
}
