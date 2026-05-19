/**
 * GET /api/in-season/seeds?tenant_slug=<slug>&status=<status>
 *
 * Lists In-Season SKU seeds for a tenant. Each seed is a "proposal" from a
 * past In-Season run that the user can pull into their next collection.
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md
 *
 * Query params:
 *   tenant_slug (required): the tenant whose seeds to fetch
 *   status     (optional, default 'live'): live | consumed | rejected | expired | all
 *   seed_type  (optional): filter to a single seed_type
 *   source_run_id (optional): filter to seeds from a single run
 *
 * Auth: requires analyst+ membership in the tenant.
 *
 * Note: route lives under /api/in-season/seeds for now because the rest of
 * the In-Season API still uses /api/in-season/* — when the Sprint A rename
 * happens, this whole tree moves to /api/in-season/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tenantSlug = url.searchParams.get('tenant_slug');
  const status = url.searchParams.get('status') ?? 'live';
  const seedType = url.searchParams.get('seed_type');
  const sourceRunId = url.searchParams.get('source_run_id');

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;
  const { tenant } = access;

  let q = supabaseAdmin
    .from('in_season_sku_seeds')
    .select(
      'id, source_run_id, source_product_fact_id, source_action_type, seed_type, ' +
        'proposed_changes, evidence, rationale, ' +
        'source_model_ref, source_color_ref, source_product_name, source_family_code, source_season_tag, ' +
        'status, consumed_at, consumed_in_collection_id, rejected_at, rejection_reason, expires_at, ' +
        'created_at, updated_at'
    )
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  if (status !== 'all') q = q.eq('status', status);
  if (seedType) q = q.eq('seed_type', seedType);
  if (sourceRunId) q = q.eq('source_run_id', sourceRunId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: 'query failed', detail: error.message }, { status: 500 });
  }

  // Aggregate counts by seed_type for the UI to show "4 extends · 6 sequels ·
  // 3 reorders · 4 drops" at a glance.
  const counts: Record<string, number> = {};
  for (const seed of (data ?? []) as unknown as Array<{ seed_type: string }>) {
    counts[seed.seed_type] = (counts[seed.seed_type] || 0) + 1;
  }

  return NextResponse.json({
    tenant_slug: tenantSlug,
    tenant_id: tenant.id,
    surface_mode: (tenant as { surface_mode?: string }).surface_mode ?? null,
    seeds: data ?? [],
    summary: {
      total: data?.length ?? 0,
      by_type: counts,
    },
  });
}
