/**
 * POST /api/distribution-confirm
 *
 * Sprint B.3 (2026-05-09) · 02.3 Distribución · CONFIRM.
 *
 * Persists the distribution plan to CIS as canonical
 * `merchandising.channels.*` keys. Downstream Block 4 (Sales Dashboard,
 * Wholesale Orders, GTM plan) reads from these — never from
 * collection_workspace_data.
 *
 * Tags applied:
 *   · affects_channels   → 04 Sales Dashboard reads channel mix + markets
 *   · affects_wholesale  → 04 Wholesale Orders reads target shortlist
 *   · affects_pricing    → per-channel pricing table (wholesale 50% off)
 *   · affects_content    → GTM plan picks markets + retail moments
 *
 * Body shape:
 * {
 *   collectionPlanId: string,
 *   plan: DistributionPlan
 * }
 *
 * Side-effects:
 *   - Writes ~9 CIS decisions
 *   - Returns {ok: true, written: N}
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions } from '@/lib/collection-intelligence';
import type { DistributionPlan } from '@/lib/ai/distribution-prompts';

interface DistributionConfirmBody {
  collectionPlanId?: string;
  plan?: DistributionPlan;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as DistributionConfirmBody | null;
  const collectionPlanId = body?.collectionPlanId;
  const plan = body?.plan;

  if (!collectionPlanId || !plan) {
    return NextResponse.json(
      { error: 'collectionPlanId and plan are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const baseTags = ['affects_channels', 'affects_content'];

  const writes = [
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'mix',
      value: plan.channel_mix, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'markets',
      value: plan.markets, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'wholesale_targets',
      value: plan.wholesale_targets, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: ['affects_channels', 'affects_wholesale', 'affects_content'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'marketplaces',
      value: plan.marketplaces, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'sell_through_targets',
      value: plan.sell_through_targets, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: ['affects_channels', 'affects_budget'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'physical_retail',
      value: plan.physical_retail, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'pricing_per_channel',
      value: plan.pricing_per_channel, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: ['affects_channels', 'affects_pricing'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'rationale',
      value: plan.rationale, valueType: 'text',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: ['affects_content'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'channels', key: 'plan_full',
      value: plan, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'DistributionConfirm',
      userId: user.id, tags: baseTags,
    },
  ];

  try {
    await recordDecisions(writes);
  } catch (err) {
    console.error('[DistributionConfirm] CIS write failed', err);
    return NextResponse.json(
      { error: 'Failed to persist distribution plan. Please retry.' },
      { status: 500 },
    );
  }

  console.log('[DistributionConfirm] wrote', { collectionPlanId, count: writes.length });

  return NextResponse.json({ ok: true, written: writes.length });
}
