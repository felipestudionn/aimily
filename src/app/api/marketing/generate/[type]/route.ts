/**
 * POST /api/marketing/generate/[type]
 *
 * Sprint D · Action Timeline Engine
 *
 * Dynamic dispatcher for the 6 marketing generators:
 *   · press-release      (DTC + MTO archetypes · brand voice + SKU lineup + drop)
 *   · creator-brief      (TikTok Shop · 8-section JSON brief)
 *   · dm-announcement    (Community DM · 5 message variants + voice note)
 *   · email-teaser       (DTC · subject lines + body + CTA)
 *   · countdown-stories  (5-day IG storyboard)
 *   · post-launch-check  (deterministic · curva real vs Gauss + recommendation)
 *
 * Body: { collectionPlanId, dropId, language? }
 *
 * Loads CIS via loadFullContext + drop + SKUs filtered by drop_id.
 * Returns generated artifact (markdown or JSON) ready to display in the
 * Sales Dashboard preview modal. User can edit + persist via separate
 * /api/sales-actions endpoint (next sprint).
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAuthOnly,
  usageDeniedResponse,
  verifyCollectionOwnership,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { generateWithAI, generateJSON } from '@/lib/ai/llm-client';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  buildMarketingPrompt,
  type MarketingGenerationType,
  type MarketingGenerationInput,
} from '@/lib/ai/marketing-prompts';
import { buildAggregateCurve } from '@/lib/sales-strategy/gauss-curve';
import type { SalesArchetypeId, SalesChannelId, ChannelActivation } from '@/types/sales-strategy';

interface Body {
  collectionPlanId?: string;
  dropId?: string;
  language?: 'es' | 'en';
}

const VALID_TYPES: MarketingGenerationType[] = [
  'press-release',
  'creator-brief',
  'dm-announcement',
  'email-teaser',
  'countdown-stories',
  'post-launch-check',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type: typeParam } = await params;
  if (!VALID_TYPES.includes(typeParam as MarketingGenerationType)) {
    return NextResponse.json(
      { error: `Unknown generator type: ${typeParam}` },
      { status: 400 },
    );
  }
  const type = typeParam as MarketingGenerationType;

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = (await req.json().catch(() => null)) as Body | null;
  const { collectionPlanId, dropId, language } = body || {};

  if (!collectionPlanId) {
    return NextResponse.json(
      { error: 'collectionPlanId required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId, 'edit_marketing');
  if (!ownership.authorized) return ownership.error;

  /* ─── 1. Load full CIS + drop + SKUs ─── */
  const fullCtx = await loadFullContext(collectionPlanId);

  // Read CIS marketing.sales_strategy.* via direct query (loadFullContext is brand/Block 1+2 focused)
  const { data: cisRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'marketing')
    .eq('subdomain', 'sales_strategy')
    .eq('is_current', true);

  const cis = new Map<string, unknown>();
  for (const r of cisRows ?? []) cis.set(r.key, r.value);

  const archetypeId = (cis.get('archetype_id') as SalesArchetypeId) || 'A';
  const archetypeName = (cis.get('archetype_name') as string) || 'Brand DTC';
  const channelsActivated = (cis.get('channels_activated') as ChannelActivation[]) || [];
  const dropMechanic = (cis.get('drop_mechanic_default') as string) || 'continuous';
  const channels = channelsActivated
    .filter((c) => c.enabled)
    .map((c) => c.channel as SalesChannelId);

  const { data: dropRow } = dropId
    ? await supabaseAdmin
        .from('drops')
        .select('id, drop_number, name, launch_date, mechanic, channels')
        .eq('id', dropId)
        .single()
    : { data: null };

  const dropName =
    dropRow?.name || (cis.get('archetype_name') as string) || 'Próximo drop';
  const dropLaunchDate =
    dropRow?.launch_date || new Date().toISOString().slice(0, 10);

  // Load SKUs · filtered by drop if dropId provided, else top SKUs by expected_sales
  const { data: skusRaw } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, category, family, pvp, expected_sales, description, drop_id, drop_number, render_url')
    .eq('collection_plan_id', collectionPlanId)
    .order('expected_sales', { ascending: false });

  let skus = (skusRaw || []) as Array<{
    id: string;
    name: string;
    category: string | null;
    family: string | null;
    pvp: number | null;
    expected_sales: number | null;
    description: string | null;
    drop_id: string | null;
    drop_number: number | null;
    render_url: string | null;
  }>;

  if (dropId) {
    skus = skus.filter((s) => s.drop_id === dropId || s.drop_number === dropRow?.drop_number);
  }

  const totalRevenueEur = skus.reduce((sum, s) => sum + (s.expected_sales || 0), 0);
  const topSkus = skus.slice(0, 8).map((s) => ({
    name: s.name,
    category: s.category || '',
    family: s.family || '',
    pvp: s.pvp || 0,
    description: s.description || undefined,
  }));

  /* ─── 2. Special-case: post-launch-check is deterministic ─── */
  if (type === 'post-launch-check') {
    return await handlePostLaunchCheck(collectionPlanId, archetypeId, dropId);
  }

  /* ─── 3. Build prompt + generate ─── */
  const promptInput: MarketingGenerationInput = {
    brandName: fullCtx.brand_name || fullCtx.collectionName || 'Brand',
    brandTagline: fullCtx.brand_tagline,
    brandVoice: fullCtx.brand_voice,
    brandPalette: fullCtx.brand_palette,
    consumerProfile: fullCtx.consumer,
    collectionVibe: fullCtx.vibe,
    archetype: archetypeId,
    archetypeName,
    channels,
    dropName,
    dropLaunchDate,
    dropMechanic,
    topSkus,
    totalSkus: skus.length,
    totalRevenueEur,
    language,
  };

  const prompt = buildMarketingPrompt(type, promptInput);
  if (!prompt) {
    return NextResponse.json(
      { error: `No prompt builder for type: ${type}` },
      { status: 400 },
    );
  }

  try {
    if (prompt.jsonMode) {
      const { data, model, fallback } = await generateJSON({
        system: prompt.system,
        user: prompt.user,
        temperature: prompt.temperature,
        language: language || 'es',
      });
      return NextResponse.json({
        result: {
          type,
          format: 'json',
          content: data,
          model,
          fallback,
          context: {
            archetype: archetypeId,
            archetypeName,
            channels,
            dropName,
            dropLaunchDate,
            skuCount: skus.length,
            totalRevenueEur: Math.round(totalRevenueEur),
          },
        },
      });
    } else {
      const { text, model, fallback } = await generateWithAI({
        system: prompt.system,
        user: prompt.user,
        temperature: prompt.temperature,
        language: language || 'es',
      });
      return NextResponse.json({
        result: {
          type,
          format: 'markdown',
          content: text,
          model,
          fallback,
          context: {
            archetype: archetypeId,
            archetypeName,
            channels,
            dropName,
            dropLaunchDate,
            skuCount: skus.length,
            totalRevenueEur: Math.round(totalRevenueEur),
          },
        },
      });
    }
  } catch (err) {
    console.error(`[marketing/generate/${type}] failed`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}

/**
 * Post-launch performance check · NO AI · pure compute.
 *
 * Compares actual revenue (from production_orders.closed_at × sku.pvp) to
 * the Gauss-expected curve at the same day offset. Returns recommendation:
 *   · on_track (variance < 10%)
 *   · below_expected → boost paid + restock
 *   · above_expected → stock-out warning + capsule extra
 */
async function handlePostLaunchCheck(
  collectionPlanId: string,
  archetypeId: SalesArchetypeId,
  dropId?: string,
): Promise<NextResponse> {
  // Load drops + SKUs
  const { data: drops } = await supabaseAdmin
    .from('drops')
    .select('id, drop_number, name, launch_date')
    .eq('collection_plan_id', collectionPlanId)
    .order('drop_number');

  const { data: skus } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, pvp, expected_sales, buy_units, drop_id, drop_number, launch_date, fulfillment_model, lead_time_days')
    .eq('collection_plan_id', collectionPlanId);

  const { data: orders } = await supabaseAdmin
    .from('production_orders')
    .select('sku_id, units, closed_at')
    .eq('collection_plan_id', collectionPlanId)
    .not('closed_at', 'is', null);

  const dropMap = new Map<string, { id: string; drop_number: number; name: string; launch_date: string }>();
  for (const d of drops || []) dropMap.set(d.id, d);

  // Aggregate actual revenue
  let actualRevenue = 0;
  for (const o of orders || []) {
    const sku = skus?.find((s) => s.id === o.sku_id);
    if (!sku?.pvp) continue;
    actualRevenue += (o.units || 0) * sku.pvp;
  }

  // Compute expected at today's offset
  const skusForCurve = (skus || []).map((s) => {
    let launch = s.launch_date;
    if (!launch && s.drop_id && dropMap.has(s.drop_id)) launch = dropMap.get(s.drop_id)!.launch_date;
    return {
      launch_date: launch,
      expected_sales: s.expected_sales,
      buy_units: s.buy_units,
      fulfillment_model: s.fulfillment_model,
      lead_time_days: s.lead_time_days,
    };
  });

  const curve = buildAggregateCurve(archetypeId, skusForCurve);

  let expectedToToday = 0;
  if (curve) {
    const today = Date.now();
    for (const p of curve.points) {
      if (p.date.getTime() <= today) expectedToToday = p.cumulative_eur;
    }
  }

  const variance = expectedToToday > 0 ? (actualRevenue - expectedToToday) / expectedToToday : 0;
  const variancePct = Math.round(variance * 100);

  let status: 'on_track' | 'below_expected' | 'above_expected' | 'no_data';
  let recommendation: string;
  let actions: string[];

  if (expectedToToday === 0) {
    status = 'no_data';
    recommendation = 'Aún no hay actuals para comparar (drop no ha lanzado o no hay production_orders cerrados todavía).';
    actions = [];
  } else if (Math.abs(variance) <= 0.1) {
    status = 'on_track';
    recommendation = 'Las ventas reales están dentro del ±10% de la curva Gauss esperada. Mantén el plan.';
    actions = ['Continuar con cadencia actual de contenido', 'No subir paid budget innecesariamente'];
  } else if (variance < -0.1) {
    status = 'below_expected';
    recommendation = `Las ventas reales están un ${Math.abs(variancePct)}% por debajo del forecast a esta fecha. Considera intervención inmediata.`;
    actions = [
      'Boost paid social (+30% budget esta semana)',
      'Refresh creative wave: re-shoot 2-3 hero SKUs',
      'Email re-engagement a list que no compró',
      archetypeId === 'B' ? 'Activar 3-5 micro-creators TikTok Shop' : 'Press push extra a media tier 2',
    ];
  } else {
    status = 'above_expected';
    recommendation = `Las ventas reales superan el forecast en un ${variancePct}%. Riesgo de stock-out — actuar para sostener momentum.`;
    actions = [
      'Verificar inventory status de top SKUs',
      'Considerar restock express o capsule extra',
      'Capitalizar momentum: PR push + scaling paid',
      'Update waitlist con ETA de restock',
    ];
  }

  return NextResponse.json({
    result: {
      type: 'post-launch-check',
      format: 'json',
      content: {
        status,
        actual_revenue_eur: Math.round(actualRevenue),
        expected_to_today_eur: Math.round(expectedToToday),
        variance_pct: variancePct,
        recommendation,
        actions,
      },
      context: {
        archetype: archetypeId,
        dropId: dropId || null,
      },
    },
  });
}
