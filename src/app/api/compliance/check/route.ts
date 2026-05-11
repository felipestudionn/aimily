/**
 * GET /api/compliance/check?skuId=X
 *
 * Returns a ComplianceReport for a SKU based on its current BOM lines
 * and material zones. Used by the Tech Pack header pill and the
 * collection-level compliance dashboard.
 *
 * Pure read endpoint — no writes. Recomputes on every call so that
 * BOM edits show the new compliance state immediately without waiting
 * on a write trigger.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkCompliance } from '@/lib/compliance/rsl-check';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const skuId = req.nextUrl.searchParams.get('skuId');
  if (!skuId) return NextResponse.json({ error: 'skuId required' }, { status: 400 });

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('id, collection_plan_id, material_zones')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ownership = await verifyCollectionOwnership(user.id, sku.collection_plan_id);
  if (!ownership.authorized) return ownership.error;

  // Pull BOM materials from tech_pack_data + zone-level materials from
  // collection_skus.material_zones. The compliance engine de-dupes.
  const { data: tp } = await supabaseAdmin
    .from('tech_pack_data')
    .select('bom')
    .eq('sku_id', skuId)
    .maybeSingle();

  const bomLines = (tp?.bom as { lines?: Array<{ material?: string }> } | null)?.lines ?? [];
  // sku.material_zones is a jsonb ARRAY of MaterialZone, not nested under
  // a `zones` key. The previous shape assumption silently dropped every
  // zone-level material from the compliance roll-up.
  const materialZones: Array<{ material?: string }> = Array.isArray(sku.material_zones)
    ? (sku.material_zones as Array<{ material?: string }>)
    : [];

  const materials: string[] = [
    ...bomLines.map((l) => l.material ?? '').filter(Boolean),
    ...materialZones.map((z) => z.material ?? '').filter(Boolean),
  ];

  const report = checkCompliance({ materials });
  return NextResponse.json(report);
}
