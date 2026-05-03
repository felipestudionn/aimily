/**
 * GET /api/vendor-portal/[token]/sku/[skuId]
 *
 * Returns the full tech-pack snapshot for a single SKU the vendor is
 * allowed to see. Reads from the current revision (so the vendor sees
 * the same view as the designer's tech pack header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface RouteParams {
  params: Promise<{ token: string; skuId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token, skuId } = await params;
  if (!token || !skuId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const { data: inv } = await supabaseAdmin
    .from('vendor_invitations')
    .select('id, collection_plan_id, sku_ids, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (!inv || inv.revoked_at || new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
  }

  if (inv.sku_ids && inv.sku_ids.length > 0 && !inv.sku_ids.includes(skuId)) {
    return NextResponse.json({ error: 'SKU not in this invitation' }, { status: 403 });
  }

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, family, category, sketch_url, sketch_top_url, render_urls, material_zones, cost, collection_plan_id')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku || sku.collection_plan_id !== inv.collection_plan_id) {
    return NextResponse.json({ error: 'SKU not found' }, { status: 404 });
  }

  // Prefer the current approved revision so vendors don't see drafts
  // that haven't been signed off yet.
  const { data: current } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('*')
    .eq('sku_id', skuId)
    .eq('is_current', true)
    .maybeSingle();

  // Fallback: live tech_pack_data row.
  let header: Record<string, unknown> = {};
  let drawings: Record<string, unknown> = {};
  let measurements: Record<string, unknown> = {};
  let bom: Record<string, unknown> = {};
  let materials: Record<string, unknown> = sku.material_zones ?? {};
  let factory_notes: Record<string, unknown> = {};
  let construction_details: Record<string, unknown> = {};
  let cost_breakdown: Record<string, unknown> = {};
  if (current) {
    header = current.header_snapshot ?? {};
    drawings = current.drawings_snapshot ?? {};
    measurements = current.measurements_snapshot ?? {};
    bom = current.bom_snapshot ?? {};
    materials = current.materials_snapshot ?? materials;
    factory_notes = current.factory_notes_snapshot ?? {};
    construction_details = current.construction_details_snapshot ?? {};
    cost_breakdown = current.cost_breakdown_snapshot ?? {};
  } else {
    const { data: tp } = await supabaseAdmin
      .from('tech_pack_data')
      .select('*')
      .eq('sku_id', skuId)
      .maybeSingle();
    if (tp) {
      header = tp.header ?? {};
      drawings = tp.drawings ?? {};
      measurements = tp.measurements ?? {};
      bom = tp.bom ?? {};
      factory_notes = tp.factory_notes ?? {};
      construction_details = tp.construction_details ?? {};
    }
  }

  return NextResponse.json({
    sku: {
      id: sku.id,
      name: sku.name,
      family: sku.family,
      category: sku.category,
      sketch_url: sku.sketch_url,
      sketch_top_url: sku.sketch_top_url,
      render_urls: sku.render_urls,
    },
    revision: current
      ? {
          id: current.id,
          version: current.version,
          approval_status: current.approval_status,
          created_at: current.created_at,
        }
      : null,
    snapshot: { header, drawings, measurements, bom, materials, factory_notes, construction_details, cost_breakdown },
  });
}
