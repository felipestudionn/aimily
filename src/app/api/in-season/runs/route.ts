/**
 * POST /api/in-season/runs
 *
 * Create a new analysis run for a tenant. Optionally links to existing
 * constraint + creative_brief rows. Does NOT execute — caller follows up
 * with POST /api/in-season/runs/[id]/execute.
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

  // Source scoping — validate every requested source belongs to THIS tenant.
  // Defaults to every processed source for the tenant when none supplied.
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
  } else {
    const { data: validSources } = await supabaseAdmin
      .from('strategy_sources')
      .select('id')
      .eq('tenant_id', tenant.id)
      .in('id', sourceSetIds)
      .not('processed_at', 'is', null);
    const validIds = new Set((validSources || []).map((s) => s.id));
    const rejected = sourceSetIds.filter((id) => !validIds.has(id));
    if (rejected.length > 0) {
      return NextResponse.json(
        {
          error: 'source_set_ids contains sources that do not belong to this tenant or are not processed',
          rejected,
        },
        { status: 403 }
      );
    }
  }

  if (sourceSetIds.length === 0) {
    return NextResponse.json(
      { error: 'No processed sources available for this tenant. Upload + parse a source first.' },
      { status: 400 }
    );
  }

  // Cross-tenant injection guard — constraint_id and creative_brief_id MUST
  // belong to the active tenant. Without this an analyst on tenant A who
  // learns a UUID from tenant B could splice that brief/constraint into
  // a run. Codex P0 fix.
  if (body.constraint_id) {
    const { data: c } = await supabaseAdmin
      .from('strategy_constraints')
      .select('id')
      .eq('id', body.constraint_id)
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    if (!c) {
      return NextResponse.json(
        { error: 'constraint_id does not belong to this tenant' },
        { status: 403 }
      );
    }
  }
  if (body.creative_brief_id) {
    const { data: b } = await supabaseAdmin
      .from('strategy_creative_briefs')
      .select('id')
      .eq('id', body.creative_brief_id)
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    if (!b) {
      return NextResponse.json(
        { error: 'creative_brief_id does not belong to this tenant' },
        { status: 403 }
      );
    }
  }

  // run_mode + default_lead_time per Paso 3. Validate enum.
  const allowedModes = new Set(['unscoped', 'pre_season', 'mid_season']);
  const runMode =
    typeof body.run_mode === 'string' && allowedModes.has(body.run_mode)
      ? (body.run_mode as 'unscoped' | 'pre_season' | 'mid_season')
      : 'unscoped';
  const defaultLeadTimeDays =
    typeof body.default_lead_time_days === 'number' && body.default_lead_time_days >= 0
      ? Math.round(body.default_lead_time_days)
      : null;

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
      run_mode: runMode,
      default_lead_time_days: defaultLeadTimeDays,
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
    next_step: `POST /api/in-season/runs/${run.id}/execute to begin scoring`,
  });
}
