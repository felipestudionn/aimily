/**
 * POST /api/financial-confirm
 *
 * Sprint B.4 (2026-05-09) · 02.4 Plan Financiero · CONFIRM.
 *
 * Persists the confirmed financial plan to CIS as canonical
 * `merchandising.budget.*` keys. Closes Block 2 — downstream Block 3/4
 * (Sales Dashboard, GTM, Tech Pack costing) reads from these.
 *
 * Body shape:
 * {
 *   collectionPlanId: string,
 *   inputs: FinancialInputs,
 *   plan: FinancialPlan,
 *   narrative: FinancialNarrative
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions, type RecordDecisionParams } from '@/lib/collection-intelligence';
import type { FinancialInputs, FinancialPlan } from '@/lib/financial-plan/calculate';
import type { FinancialNarrative } from '@/lib/ai/financial-narrative-prompts';

interface FinancialConfirmBody {
  collectionPlanId?: string;
  inputs?: FinancialInputs;
  plan?: FinancialPlan;
  narrative?: FinancialNarrative;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as FinancialConfirmBody | null;
  const collectionPlanId = body?.collectionPlanId;
  const inputs = body?.inputs;
  const plan = body?.plan;
  const narrative = body?.narrative;

  if (!collectionPlanId || !inputs || !plan) {
    return NextResponse.json(
      { error: 'collectionPlanId, inputs and plan are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const baseTags = ['affects_budget', 'affects_content'];

  const writes: RecordDecisionParams[] = [
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'pnl',
      value: plan.pnl, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'monthly_revenue',
      value: plan.monthly_revenue, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: ['affects_budget'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'channel_revenue',
      value: plan.channel_revenue, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: ['affects_budget', 'affects_channels'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'markdown_calendar',
      value: plan.markdown_calendar, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: ['affects_budget', 'affects_pricing'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'break_even',
      value: plan.break_even, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: ['affects_budget'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'inputs',
      value: inputs, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: ['affects_budget'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'plan_full',
      value: plan, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: baseTags,
    },
  ];

  if (narrative && narrative.narrative) {
    writes.push({
      collectionPlanId, domain: 'merchandising', subdomain: 'budget', key: 'narrative',
      value: narrative, valueType: 'object',
      source: 'ai_recommendation' as const, sourcePhase: 'merchandising', sourceComponent: 'FinancialConfirm',
      userId: user.id, tags: ['affects_content'],
    });
  }

  try {
    await recordDecisions(writes);
  } catch (err) {
    console.error('[FinancialConfirm] CIS write failed', err);
    return NextResponse.json(
      { error: 'Failed to persist financial plan. Please retry.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, written: writes.length });
}
