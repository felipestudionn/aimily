/**
 * POST /api/strategy-confirm
 *
 * Sprint B.1 (2026-05-08) · 02.1 Estrategia de Compra · CONFIRM.
 *
 * Persists the chosen archetype + edited scenario to CIS as the
 * canonical merchandising.strategy.* keys. Downstream Block 2/3 reads
 * from these — never from collection_workspace_data.
 *
 * Tags applied:
 *   · affects_assortment  → 02.2 reads families seed
 *   · affects_pricing     → 02.2 reads pricing tiers seed
 *   · affects_budget      → 02.4 reads sales target + investment
 *   · affects_drops       → drops calendar surfaces in calendar mode
 *   · affects_content     → 04 reads benchmark brands for narrative
 *
 * Body shape:
 * {
 *   collectionPlanId: string,
 *   archetypesSeen: ScenarioArchetype[],     // the 4 originals (kept for context regen)
 *   chosen: PrefilledEditor & { archetype_name: string }
 * }
 *
 * Side-effects:
 *   - Writes ~10 CIS decisions (new versions if values changed)
 *   - Returns {ok: true, written: N}
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions } from '@/lib/collection-intelligence';
import type { ScenarioArchetype, PrefilledEditor } from '@/lib/ai/scenarios-prompts';

interface StrategyConfirmBody {
  collectionPlanId?: string;
  archetypesSeen?: ScenarioArchetype[];
  chosen?: PrefilledEditor & { archetype_name?: string };
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as StrategyConfirmBody | null;
  const collectionPlanId = body?.collectionPlanId;
  const archetypesSeen = body?.archetypesSeen;
  const chosen = body?.chosen;

  if (!collectionPlanId || !chosen || !chosen.archetype_id) {
    return NextResponse.json(
      { error: 'collectionPlanId and chosen (with archetype_id) are required' },
      { status: 400 },
    );
  }
  if (!Array.isArray(archetypesSeen) || archetypesSeen.length !== 4) {
    return NextResponse.json(
      { error: 'archetypesSeen must be the 4 archetypes originally proposed' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Compute benchmark brands shorthand for downstream Block 4
  // narrative prompts (e.g. "as Khaite did Y1").
  const matchedArchetype = archetypesSeen.find(a => a.id === chosen.archetype_id);
  const benchmarkBrands = (matchedArchetype?.benchmarks || []).map(b => ({
    brand: b.brand,
    skus: b.skus,
    investment_eur: b.investment_eur,
    y1_sales_eur: b.y1_sales_eur,
    year: b.year || null,
  }));

  const baseTags = [
    'affects_assortment',
    'affects_pricing',
    'affects_budget',
    'affects_drops',
    'affects_content',
  ];

  const writes = [
    // ── chosen scenario shape ──
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'chosen_archetype_id',
      value: chosen.archetype_id, valueType: 'text',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'archetype_name',
      value: chosen.archetype_name || matchedArchetype?.name || '', valueType: 'text',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'target_sku_count',
      value: chosen.sku_count, valueType: 'number',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'investment',
      value: chosen.investment_split, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'sales_target_y1',
      value: chosen.sales_target_y1, valueType: 'number',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'target_margin_pct',
      value: chosen.target_margin_pct, valueType: 'number',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'drops',
      value: chosen.drops, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'benchmark_brands',
      value: benchmarkBrands, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: ['affects_content'],
    },
    // ── seed forwards into 02.2 (families/pricing already informed) ──
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'families', key: 'list',
      value: chosen.families, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: ['affects_assortment', 'affects_design'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'pricing', key: 'tiers',
      value: chosen.pricing_tiers, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: ['affects_pricing', 'affects_design'],
    },
    // ── kept for regen context (full 4 archetypes the user saw + chosen full) ──
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'archetypes_seen',
      value: archetypesSeen, valueType: 'list',
      source: 'ai_recommendation' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: [] as string[],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'strategy', key: 'chosen_full',
      value: chosen, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'StrategyConfirm',
      userId: user.id, tags: baseTags,
    },
  ];

  try {
    await recordDecisions(writes);
  } catch (err) {
    console.error('[StrategyConfirm] CIS write failed', err);
    return NextResponse.json(
      { error: 'Failed to persist strategy. Please retry.' },
      { status: 500 },
    );
  }

  console.log('[StrategyConfirm] wrote', { collectionPlanId, archetype: chosen.archetype_id, count: writes.length });

  return NextResponse.json({ ok: true, written: writes.length });
}
