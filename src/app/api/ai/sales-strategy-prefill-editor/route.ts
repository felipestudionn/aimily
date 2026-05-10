/**
 * POST /api/ai/sales-strategy-prefill-editor
 *
 * Sprint B-pre · 04.0 Estrategia de Venta · EDITOR PREFILL.
 *
 * After the founder picks an archetype, derive sensible defaults for the
 * 3 operational axes (volume · cadence · KPIs) using:
 *   1. The chosen archetype's defaults (cadence + kpis)
 *   2. The collection's Block 1+2 context (consumer profile + families
 *      count + pricing tier + channels.markets)
 *   3. The currently-activated channels (KPIs gain per-channel additions)
 *
 * NO AI call — deterministic derivation. The AI prompt-driven version
 * lives in scenarios-prefill-editor (Block 2). For Block 4, archetype +
 * Block 1+2 already produce strong defaults; AI augmentation can be
 * added in a future sprint if the founder asks for "explain why".
 *
 * Body shape:
 * {
 *   collectionPlanId: string,
 *   archetypeId: 'A' | 'B' | 'C',
 *   channelsActivated: ChannelActivation[]
 * }
 *
 * Returns: { result: { editor: SalesStrategyEditorPrefill } }
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getArchetype } from '@/lib/sales-strategy/archetypes';
import { getChannel } from '@/lib/sales-strategy/channels';
import type {
  SalesArchetypeId,
  ChannelActivation,
  SalesStrategyEditorPrefill,
} from '@/types/sales-strategy';

interface PrefillBody {
  collectionPlanId?: string;
  archetypeId?: SalesArchetypeId;
  channelsActivated?: ChannelActivation[];
}

const KPIS_PER_CHANNEL: Record<string, string[]> = {
  tiktok_shop: [
    'gmv',
    'creator_attribution_share',
    'live_session_gmv',
    'return_rate',
    'video_to_order_cvr',
  ],
  community_dm: [
    'dm_to_order_cvr',
    'broadcast_list_size',
    'median_response_time_min',
    'abandoned_cart_recovery_rate',
  ],
  wholesale_b2b: [
    'wholesale_orders_pending',
    'net30_collection_rate',
    'reorder_rate',
  ],
  pop_ups_physical: [
    'in_person_revenue',
    'footfall',
    'ig_capture_at_event',
  ],
  marketplaces: [
    'cross_listing_cvr',
    'resale_velocity',
  ],
};

const DROPS_FREQUENCY_WEEKS_BY_CADENCE: Record<string, number> = {
  continuous_plus_monthly_restock: 4,
  capsule_every_6_to_12_weeks: 9,  // mid-point
  on_demand: 0,                     // no fixed cadence
};

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as PrefillBody | null;
  const collectionPlanId = body?.collectionPlanId;
  const archetypeId = body?.archetypeId;
  const channelsActivated = body?.channelsActivated || [];

  if (!collectionPlanId || !archetypeId) {
    return NextResponse.json(
      { error: 'collectionPlanId and archetypeId are required' },
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

  // ── Derive volume from merchandising.families.list (already confirmed in Block 2) ──
  const { data: familiesRow } = await supabaseAdmin
    .from('collection_decisions')
    .select('value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'merchandising')
    .eq('subdomain', 'families')
    .eq('key', 'list')
    .eq('is_current', true)
    .single();

  let totalSkus = 0;
  if (familiesRow?.value && Array.isArray(familiesRow.value)) {
    totalSkus = (familiesRow.value as Array<{ count?: number }>).reduce(
      (sum, f) => sum + (f.count || 0),
      0,
    );
  }
  // Fall back to live SKU count if families decision missing
  if (totalSkus === 0) {
    const { count } = await supabaseAdmin
      .from('collection_skus')
      .select('id', { count: 'exact', head: true })
      .eq('collection_plan_id', collectionPlanId);
    totalSkus = count ?? 0;
  }

  // Volume sub-fields ─ archetype B prefers smaller capsules per drop
  const skusPerDrop =
    archetype.id === 'B'
      ? Math.min(12, Math.max(3, Math.round(totalSkus / 4))) // 4 capsule drops/year
      : archetype.id === 'C'
      ? Math.min(20, totalSkus) // MTO can absorb the whole catalog at once
      : totalSkus;               // A · permanent catalog
  const catalogMode: 'permanent' | 'capsule' =
    archetype.id === 'B' ? 'capsule' : 'permanent';

  // ── KPIs ─ archetype primary + per-channel adds ──
  const kpiSet = new Set<string>(archetype.kpis);
  for (const activation of channelsActivated) {
    if (!activation.enabled) continue;
    const channel = getChannel(activation.channel);
    if (!channel) continue;
    const extras = KPIS_PER_CHANNEL[activation.channel] || [];
    for (const k of extras) kpiSet.add(k);
  }
  const kpiFocus = Array.from(kpiSet).slice(0, 8); // cap to 8 to keep dashboard readable

  // ── Cadence ──
  const dropsFrequencyWeeks =
    DROPS_FREQUENCY_WEEKS_BY_CADENCE[archetype.cadence.drops] ?? 4;

  const editor: SalesStrategyEditorPrefill = {
    archetype_id: archetype.id,
    archetype_name: archetype.name,
    volume: {
      skus_per_drop: skusPerDrop,
      catalog_mode: catalogMode,
    },
    cadence: {
      drops_frequency_weeks: dropsFrequencyWeeks,
      posts_per_day: archetype.cadence.posts_per_day,
      emails_per_week: archetype.cadence.emails_per_week,
    },
    kpi_focus: kpiFocus,
    reasoning: {
      volume:
        archetype.id === 'B'
          ? `Capsule de ${skusPerDrop} SKUs por drop, asumiendo 4 drops/año.`
          : archetype.id === 'C'
          ? `Catalogo MTO de ${skusPerDrop} SKUs disponibles bajo orden.`
          : `Catálogo permanente de ${skusPerDrop} SKUs con restocks mensuales.`,
      cadence:
        archetype.id === 'B'
          ? 'Drops capsule cada ~9 semanas con alta frecuencia de contenido del founder.'
          : archetype.id === 'C'
          ? 'On-demand · cadencia de press y craft documentary cada drop.'
          : 'Catálogo continuo con restocks mensuales y emails 2/semana.',
      kpi_focus: `${archetype.kpis.length} KPIs primarios del archetype + extras por cada canal activado.`,
    },
  };

  return NextResponse.json({ result: { editor } });
}
