/**
 * Seed lifecycle endpoints · Felipe 2026-05-19 Sprint D.
 *
 * PATCH /api/in-season/seeds/[id]
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

/** POST single seed (user-initiated from verdict pill) OR bulk consume/reject. */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });

  // Branch 1: bulk endpoint for new-collection gate
  if (id === 'bulk') {
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

  // Branch 2: single seed creation from a verdict pill (POST /seeds/create)
  // Felipe 2026-05-19 noche · user-initiated model: cuando el merch da click
  // en "+ Añadir a semillas" en un verdict del run, llamamos aquí con el
  // contexto del verdict para crear una seed.
  if (id !== 'create') {
    return NextResponse.json({ error: 'POST only allowed on /seeds/bulk or /seeds/create' }, { status: 400 });
  }

  const tenantSlug = body.tenant_slug as string | undefined;
  const runId = body.run_id as string | undefined;
  const productFactId = body.product_fact_id as string | undefined;
  const actionType = body.action_type as string | undefined;
  const rationale = (body.rationale as string | undefined) ?? '';
  const evidence = (body.evidence as Record<string, unknown> | undefined) ?? {};
  const proposedChanges = (body.proposed_changes as Record<string, unknown> | undefined) ?? {};

  if (!tenantSlug || !runId || !productFactId || !actionType) {
    return NextResponse.json(
      { error: 'tenant_slug, run_id, product_fact_id, action_type required' },
      { status: 400 }
    );
  }

  // Map action_type → seed_type (only seed-producing verbs valid)
  const ACTION_TO_SEED: Record<string, string> = {
    amplify_next_season: 'amplify_next_season',
    extend_colors: 'extend_colors',
    drop_color: 'drop_color',
    kill: 'retire',
    replenish: 'reorder',
    amplify_in_season: 'reorder',
  };
  const seedType = ACTION_TO_SEED[actionType];
  if (!seedType) {
    return NextResponse.json(
      { error: `action_type '${actionType}' is not seed-producing` },
      { status: 400 }
    );
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // Fetch product_fact identity for denormalized columns
  const { data: pf } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('model_ref, color_ref, product_name, family_code, season')
    .eq('id', productFactId)
    .eq('tenant_id', access.tenant.id)
    .single();

  // Check for existing seed with same (run, pfid, action_type) — idempotent
  const { data: existing } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .select('id, status')
    .eq('source_run_id', runId)
    .eq('source_product_fact_id', productFactId)
    .eq('source_action_type', actionType)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      id: (existing as { id: string }).id,
      status: (existing as { id: string; status: string }).status,
      already_existed: true,
    });
  }

  const { data: created, error } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .insert({
      tenant_id: access.tenant.id,
      source_run_id: runId,
      source_product_fact_id: productFactId,
      source_action_type: actionType,
      seed_type: seedType,
      proposed_changes: proposedChanges,
      evidence,
      rationale,
      source_model_ref: pf ? (pf as { model_ref?: string | null }).model_ref ?? null : null,
      source_color_ref: pf ? (pf as { color_ref?: string | null }).color_ref ?? null : null,
      source_product_name: pf ? (pf as { product_name?: string | null }).product_name ?? null : null,
      source_family_code: pf ? (pf as { family_code?: string | null }).family_code ?? null : null,
      source_season_tag: pf ? (pf as { season?: string | null }).season ?? null : null,
    })
    .select('id, status')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }
  return NextResponse.json({ id: (created as { id: string }).id, status: 'live', already_existed: false });
}
