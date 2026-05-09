/**
 * POST /api/distribution-load
 *
 * Sprint B.3 (2026-05-09) · 02.3 Distribución · MOUNT.
 *
 * Reads the canonical CIS keys for distribution. Returns:
 *   - has_strategy:   strategy.chosen_archetype_id present (gate)
 *   - has_distribution: channels.plan_full present (already confirmed)
 *   - plan: the most recent confirmed plan (or null if not confirmed)
 *   - strategy_summary: brief context for the editor header
 *
 * Frontend renders:
 *   · empty state pointing to 02.1 if !has_strategy
 *   · auto-fires /api/ai/distribution-propose if has_strategy && !has_distribution
 *   · loads `plan` directly into editor if has_distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { DistributionPlan } from '@/lib/ai/distribution-prompts';

interface DecisionRow {
  subdomain: string;
  key: string;
  value: unknown;
}

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
    .in('subdomain', ['strategy', 'channels']);

  const get = (subdomain: string, key: string): unknown =>
    (rows as DecisionRow[] | null)?.find(r => r.subdomain === subdomain && r.key === key)?.value;

  const has_strategy = !!get('strategy', 'chosen_archetype_id');
  const plan = (get('channels', 'plan_full') as DistributionPlan | undefined) || null;
  const has_distribution = !!plan;

  const strategy_summary = has_strategy ? {
    archetype_name: (get('strategy', 'archetype_name') as string | undefined) || '',
    target_sku_count: (get('strategy', 'target_sku_count') as number | undefined) || 0,
    sales_target_y1: (get('strategy', 'sales_target_y1') as number | undefined) || 0,
    drops: (get('strategy', 'drops') as { count?: number } | undefined)?.count || 1,
  } : null;

  return NextResponse.json({
    has_strategy,
    has_distribution,
    plan,
    strategy_summary,
  });
}
