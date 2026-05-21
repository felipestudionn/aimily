/**
 * POST /api/in-season/briefs — create a creative brief (Bucket B)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
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
    .from('strategy_creative_briefs')
    .insert({
      tenant_id: tenantId,
      name: body.name,
      description: body.description ?? null,
      color_story: body.color_story ?? [],
      archetypes_focus: body.archetypes_focus ?? [],
      family_pivot: body.family_pivot ?? {},
      silhouette_preferences: body.silhouette_preferences ?? {},
      material_direction: body.material_direction ?? {},
      customer_segment_shift: body.customer_segment_shift ?? null,
      creative_narrative: body.creative_narrative ?? null,
      created_by: access.userId,
    })
    .select('id, name')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Failed to create brief', detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ creative_brief_id: data.id, name: data.name });
}
