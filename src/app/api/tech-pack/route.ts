/* ═══════════════════════════════════════════════════════════════════
   GET  /api/tech-pack?skuId=X          → tech pack data for a SKU
   PATCH /api/tech-pack                 → upsert section payload
   Body: { skuId, section: 'header'|'drawings'|..., data: object }
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { TeamPermission } from '@/lib/team-permissions';

const VALID_SECTIONS = new Set([
  'header', 'drawings', 'measurements', 'bom', 'grading', 'factory_notes', 'materials',
]);

/* Resolve the collection that owns a SKU and gate via the team-aware
   permission helper. Owners and any seat with the requested permission
   are allowed; everyone else gets the same "Not found" response so we
   don't leak SKU existence. */
async function gateBySku(userId: string, skuId: string, permission: TeamPermission): Promise<{ collectionPlanId: string } | null> {
  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('collection_plan_id')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return null;
  const check = await verifyCollectionOwnership(userId, sku.collection_plan_id, permission);
  if (!check.authorized) return null;
  return { collectionPlanId: sku.collection_plan_id };
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const skuId = req.nextUrl.searchParams.get('skuId');
  if (!skuId) return NextResponse.json({ error: 'Missing skuId' }, { status: 400 });
  const check = await gateBySku(user!.id, skuId, 'view_all');
  if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabaseAdmin
    .from('tech_pack_data')
    .select('*')
    .eq('sku_id', skuId)
    .maybeSingle();

  return NextResponse.json({ data: data ?? null });
}

export async function PATCH(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  let body: { skuId?: string; section?: string; data?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.skuId || !body.section || !VALID_SECTIONS.has(body.section) || !body.data) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const check = await gateBySku(user!.id, body.skuId, 'edit_design');
  if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Upsert the row, merging the section payload on top of whatever exists.
  const { data: existing } = await supabaseAdmin
    .from('tech_pack_data')
    .select('id')
    .eq('sku_id', body.skuId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('tech_pack_data')
      .update({ [body.section]: body.data })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin
      .from('tech_pack_data')
      .insert({
        collection_plan_id: check.collectionPlanId,
        sku_id: body.skuId,
        [body.section]: body.data,
      });
  }

  return NextResponse.json({ ok: true });
}
