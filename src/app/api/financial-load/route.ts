/**
 * POST /api/financial-load
 *
 * Sprint B.4 (2026-05-09) · 02.4 Plan Financiero · MOUNT.
 *
 * Reads the canonical CIS keys for budget. Returns:
 *   - has_strategy: 02.1 confirmed (gate)
 *   - has_distribution: 02.3 confirmed (gate)
 *   - has_budget: budget already confirmed
 *   - inputs/plan/narrative: when has_budget=true
 *
 * Frontend renders:
 *   · empty state pointing to 02.1 if !has_strategy
 *   · empty state pointing to 02.3 if has_strategy but !has_distribution
 *   · auto-fires /api/financial-propose if both upstream OK and !has_budget
 *   · loads saved plan if has_budget
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { FinancialInputs, FinancialPlan } from '@/lib/financial-plan/calculate';
import type { FinancialNarrative } from '@/lib/ai/financial-narrative-prompts';

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
    .in('subdomain', ['strategy', 'channels', 'budget']);

  const get = (subdomain: string, key: string): unknown =>
    (rows as DecisionRow[] | null)?.find(r => r.subdomain === subdomain && r.key === key)?.value;

  const has_strategy = !!get('strategy', 'chosen_archetype_id');
  const has_distribution = !!get('channels', 'plan_full');
  const plan = (get('budget', 'plan_full') as FinancialPlan | undefined) || null;
  const inputs = (get('budget', 'inputs') as FinancialInputs | undefined) || null;
  const narrative = (get('budget', 'narrative') as FinancialNarrative | undefined) || null;
  const has_budget = !!plan;

  return NextResponse.json({
    has_strategy,
    has_distribution,
    has_budget,
    plan,
    inputs,
    narrative,
  });
}
