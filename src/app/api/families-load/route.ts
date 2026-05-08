/**
 * GET /api/families-load
 *
 * Sprint B.2 (2026-05-08) · 02.2 Surtido & Precios — landing data.
 *
 * Reads the canonical CIS keys seeded by the 02.1 confirm:
 *   · merchandising.families.list   (PrefilledFamily[])
 *   · merchandising.pricing.tiers   (entry/core/hero ranges)
 *   · merchandising.strategy.target_sku_count
 *
 * If families.list is missing the user hasn't confirmed 02.1 yet —
 * frontend renders the empty state pointing them back to Estrategia.
 *
 * Body / Query: { collectionPlanId }
 * Returns: {
 *   families: PrefilledFamily[],
 *   pricing_tiers: { entry, core, hero } | null,
 *   target_sku_count: number | null,
 *   has_strategy: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const collectionPlanId = body?.collectionPlanId as string | undefined;

  if (!collectionPlanId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const { data: rows } = await supabaseAdmin
    .from('collection_decisions')
    .select('subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'merchandising')
    .eq('is_current', true)
    .in('subdomain', ['families', 'pricing', 'strategy']);

  const get = (subdomain: string, key: string): unknown =>
    rows?.find(r => r.subdomain === subdomain && r.key === key)?.value;

  const families = (get('families', 'list') as unknown[] | undefined) || [];
  const pricing_tiers = (get('pricing', 'tiers') as Record<string, unknown> | undefined) || null;
  const target_sku_count = (get('strategy', 'target_sku_count') as number | undefined) ?? null;
  const has_strategy = !!get('strategy', 'chosen_archetype_id');

  return NextResponse.json({
    families,
    pricing_tiers,
    target_sku_count,
    has_strategy,
  });
}
