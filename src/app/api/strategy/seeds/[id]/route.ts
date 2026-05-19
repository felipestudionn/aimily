/**
 * Seed lifecycle endpoints · Felipe 2026-05-19 Sprint D.
 *
 * PATCH /api/strategy/seeds/[id]
 *   { action: 'consume', collection_id?: string }
 *   { action: 'reject', reason?: string }
 *   { action: 'reactivate' }
 *
 * Implements the seed lifecycle transitions: live → consumed | rejected.
 * Auth: tenant member with analyst+ role for the seed's tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });

  const { data: seed } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .select('id, tenant_id, status')
    .eq('id', id)
    .single();
  if (!seed) return NextResponse.json({ error: 'seed not found' }, { status: 404 });

  const access = await requireStrategyAccess({
    tenantId: (seed as { tenant_id: string }).tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;

  const action = body.action as string | undefined;

  if (action === 'consume') {
    const collectionId = (body.collection_id as string | undefined) ?? null;
    const { error } = await supabaseAdmin
      .from('in_season_sku_seeds')
      .update({
        status: 'consumed',
        consumed_at: new Date().toISOString(),
        consumed_in_collection_id: collectionId,
      })
      .eq('id', id)
      .eq('status', 'live'); // optimistic lock
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'consumed', collection_id: collectionId });
  }

  if (action === 'reject') {
    const reason = (body.reason as string | undefined) ?? null;
    const { error } = await supabaseAdmin
      .from('in_season_sku_seeds')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id)
      .eq('status', 'live');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  if (action === 'reactivate') {
    const { error } = await supabaseAdmin
      .from('in_season_sku_seeds')
      .update({
        status: 'live',
        consumed_at: null,
        consumed_in_collection_id: null,
        rejected_at: null,
        rejection_reason: null,
      })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'live' });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}

/** Bulk endpoint for consuming multiple seeds at once (new-collection gate). */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (id !== 'bulk') {
    return NextResponse.json({ error: 'POST only allowed on /seeds/bulk' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  const tenantSlug = body.tenant_slug as string | undefined;
  const seedIds = body.seed_ids as string[] | undefined;
  const action = body.action as string | undefined;
  const collectionId = body.collection_id as string | undefined;
  const reason = body.reason as string | undefined;

  if (!tenantSlug || !Array.isArray(seedIds) || seedIds.length === 0 || !action) {
    return NextResponse.json({ error: 'tenant_slug, seed_ids[], action required' }, { status: 400 });
  }
  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const updates: Record<string, unknown> = {};
  if (action === 'consume') {
    updates.status = 'consumed';
    updates.consumed_at = new Date().toISOString();
    if (collectionId) updates.consumed_in_collection_id = collectionId;
  } else if (action === 'reject') {
    updates.status = 'rejected';
    updates.rejected_at = new Date().toISOString();
    if (reason) updates.rejection_reason = reason;
  } else {
    return NextResponse.json({ error: 'action must be consume or reject' }, { status: 400 });
  }

  const { error, count } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .update(updates, { count: 'exact' })
    .eq('tenant_id', access.tenant.id)
    .in('id', seedIds)
    .eq('status', 'live');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: count ?? 0, action });
}
