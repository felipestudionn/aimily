/**
 * POST /api/sales-strategy-confirm
 *
 * Sprint B-pre · 04.0 Estrategia de Venta · CONFIRM.
 *
 * Persists the chosen sales archetype + activated channels + operational
 * axis edits to CIS as the canonical marketing.sales_strategy.* keys.
 *
 * Tags applied:
 *   · affects_sales_dashboard  → 04.4 reads kpi focus + cadence
 *   · affects_ecom             → 04.5 reads payment_provider + storefront layout
 *   · affects_content          → 04.2 reads content_formats per archetype
 *   · affects_comms            → 04.3 reads voice + script preferences
 *   · affects_gtm              → 04.1 reads drop_mechanic
 *   · affects_skus             → 04.5 + Block 3 read fulfillment_model_default
 *
 * Body shape:
 * {
 *   collectionPlanId: string,
 *   archetypeId: 'A' | 'B' | 'C',
 *   channelsActivated: ChannelActivation[],
 *   editor: SalesStrategyEditorPrefill (after user edits)
 * }
 *
 * Side effects:
 *   - Writes ~12 CIS decisions (new versions if values changed)
 *   - Returns { ok: true, written: N }
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions } from '@/lib/collection-intelligence';
import { getArchetype } from '@/lib/sales-strategy/archetypes';
import type {
  SalesArchetypeId,
  ChannelActivation,
  SalesStrategyEditorPrefill,
} from '@/types/sales-strategy';

interface ConfirmBody {
  collectionPlanId?: string;
  archetypeId?: SalesArchetypeId;
  channelsActivated?: ChannelActivation[];
  editor?: SalesStrategyEditorPrefill;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as ConfirmBody | null;
  const collectionPlanId = body?.collectionPlanId;
  const archetypeId = body?.archetypeId;
  const channelsActivated = body?.channelsActivated;
  const editor = body?.editor;

  if (!collectionPlanId || !archetypeId || !channelsActivated || !editor) {
    return NextResponse.json(
      {
        error:
          'collectionPlanId, archetypeId, channelsActivated and editor are required',
      },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const archetype = getArchetype(archetypeId);
  if (!archetype) {
    return NextResponse.json(
      { error: `Unknown archetypeId: ${archetypeId}` },
      { status: 400 },
    );
  }

  const channelsEnabled = channelsActivated.filter((c) => c.enabled);
  const baseTags = [
    'affects_sales_dashboard',
    'affects_content',
    'affects_comms',
    'affects_gtm',
  ];

  const writes = [
    // ── archetype identity ──
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'archetype_id',
      value: archetypeId,
      valueType: 'text' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'archetype_name',
      value: archetype.name,
      valueType: 'text' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    // ── channel activation ──
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'channels_activated',
      value: channelsActivated,
      valueType: 'list' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: [...baseTags, 'affects_ecom'],
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'channels_enabled_ids',
      value: channelsEnabled.map((c) => c.channel),
      valueType: 'list' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: [...baseTags, 'affects_ecom'],
    },
    // ── cascade defaults ──
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'fulfillment_model_default',
      value: archetype.cascade_defaults.fulfillment_model_default,
      valueType: 'text' as const,
      source: 'ai_recommendation' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: [...baseTags, 'affects_skus'],
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'drop_mechanic_default',
      value: archetype.cascade_defaults.drop_mechanic_default,
      valueType: 'text' as const,
      source: 'ai_recommendation' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'payment_provider_primary',
      value: archetype.cascade_defaults.payment_provider_primary,
      valueType: 'text' as const,
      source: 'ai_recommendation' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: [...baseTags, 'affects_ecom'],
    },
    // ── operational axes (editor output) ──
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'volume',
      value: editor.volume,
      valueType: 'object' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'cadence',
      value: editor.cadence,
      valueType: 'object' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'kpi_focus',
      value: editor.kpi_focus,
      valueType: 'list' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    // ── archetype context kept for regen ──
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'capital_intensity',
      value: archetype.levers.capital_initial,
      valueType: 'text' as const,
      source: 'ai_recommendation' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'marketing_budget_mix_pct',
      value: archetype.marketing_budget_mix,
      valueType: 'object' as const,
      source: 'ai_recommendation' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
    {
      collectionPlanId,
      domain: 'marketing',
      subdomain: 'sales_strategy',
      key: 'confirmed_at',
      value: new Date().toISOString(),
      valueType: 'text' as const,
      source: 'user_input' as const,
      sourcePhase: 'marketing',
      sourceComponent: 'SalesStrategyConfirm',
      userId: user.id,
      tags: baseTags,
    },
  ];

  try {
    await recordDecisions(writes);
  } catch (err) {
    console.error('[SalesStrategyConfirm] CIS write failed', err);
    return NextResponse.json(
      { error: 'Failed to persist sales strategy. Please retry.' },
      { status: 500 },
    );
  }

  console.log('[SalesStrategyConfirm] wrote', {
    collectionPlanId,
    archetypeId,
    channels: channelsEnabled.map((c) => c.channel),
    count: writes.length,
  });

  return NextResponse.json({ ok: true, written: writes.length });
}
