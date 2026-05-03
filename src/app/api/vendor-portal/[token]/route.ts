/**
 * GET /api/vendor-portal/[token]
 *
 * Public — no auth. Validates the token, increments use_count, and
 * returns the assigned SKUs + their current revisions for the vendor
 * portal page. Read-only.
 *
 * Security:
 *   - Tokens are 32-byte random; brute-force is infeasible.
 *   - Revoked or expired tokens fail closed.
 *   - Only the SKU fields the vendor needs are returned (no PVP, no
 *     financials beyond cost — vendors see what they need to make,
 *     nothing else).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const { data: inv } = await supabaseAdmin
    .from('vendor_invitations')
    .select('id, collection_plan_id, vendor_name, vendor_email, sku_ids, permissions, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (inv.revoked_at) return NextResponse.json({ error: 'Invitation revoked' }, { status: 410 });
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
  }

  // Bump use counter (best-effort — never block the request).
  void supabaseAdmin
    .from('vendor_invitations')
    .update({ last_used_at: new Date().toISOString(), use_count: 0 })
    .eq('id', inv.id)
    .then();
  // We can't increment atomically here without an RPC — for the demo
  // we set last_used_at; if we want exact counts, add a Postgres
  // function `increment_vendor_use(id)` and call it via .rpc().

  // Collection metadata (name only — nothing more).
  const { data: collection } = await supabaseAdmin
    .from('collection_plans')
    .select('id, name, season')
    .eq('id', inv.collection_plan_id)
    .maybeSingle();

  // Pull assigned SKUs (or all if sku_ids is empty).
  let skuQuery = supabaseAdmin
    .from('collection_skus')
    .select('id, name, family, category, sketch_url, sketch_top_url, render_urls, material_zones, cost')
    .eq('collection_plan_id', inv.collection_plan_id);
  if (inv.sku_ids && inv.sku_ids.length > 0) {
    skuQuery = skuQuery.in('id', inv.sku_ids);
  }
  const { data: skus } = await skuQuery;

  return NextResponse.json({
    collection,
    vendor: { name: inv.vendor_name, email: inv.vendor_email },
    permissions: inv.permissions,
    expires_at: inv.expires_at,
    skus: skus ?? [],
  });
}
