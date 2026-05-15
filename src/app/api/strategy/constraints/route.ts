/**
 * POST /api/strategy/constraints — create a constraints set (Bucket A)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantId = body?.tenant_id;
  if (typeof tenantId !== 'string') {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  }
  const access = await requireStrategyAccess({ tenantId, minRole: 'analyst' });
  if (!access.ok) return access.response;

  if (typeof body.name !== 'string' || !body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('strategy_constraints')
    .insert({
      tenant_id: tenantId,
      name: body.name,
      description: body.description ?? null,
      target_total_skus: body.target_total_skus ?? null,
      target_buy_budget: body.target_buy_budget ?? null,
      target_avg_margin: body.target_avg_margin ?? null,
      positioning_tier: body.positioning_tier ?? null,
      family_share_targets: body.family_share_targets ?? {},
      hard_exclusions: body.hard_exclusions ?? [],
      price_ladder_overrides: body.price_ladder_overrides ?? {},
      channel_mix_targets: body.channel_mix_targets ?? {},
      geographic_priorities: body.geographic_priorities ?? [],
      sourcing_constraints: body.sourcing_constraints ?? {},
      drop_count: body.drop_count ?? null,
      drop_cadence: body.drop_cadence ?? null,
      created_by: access.userId,
    })
    .select('id, name')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Failed to create constraints', detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ constraint_id: data.id, name: data.name });
}
