import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { generateJSON } from '@/lib/ai/llm-client';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';

/**
 * AI GTM Plan Generation
 * Modes: 'asistido' (user defines # drops + dates, AI suggests distribution)
 *        'propuesta' (AI generates full plan from launch date)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      collectionPlanId,
      mode,
      stories,
      skus,
      totalSalesTarget,
      desiredDrops,
      specificDates,
      launchDate,
      channels,
      language,
    } = body;

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId,
      permission: 'generate_ai_marketing',
    });
    if (!perm.allowed) return perm.error!;

    const usage = await checkAuthOnly(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    // SERVER-SIDE: Load FULL context from CIS + Creative + Brief
    if (collectionPlanId) {
      const serverCtx = await loadFullContext(collectionPlanId);
      const flat: Record<string, string> = {
        collectionName: '',
        season: '',
        consumer: '',
        vibe: '',
        brandDNA: '',
        stories: '',
        salesTarget: String(totalSalesTarget || ''),
      };
      mergeContextWithInput(serverCtx, flat);
      // Enriched context is available in flat — inject into the prompt below
      if (flat.collectionName) body._collectionName = flat.collectionName;
      if (flat.season) body._season = flat.season;
      if (flat.consumer) body._consumer = flat.consumer;
      if (flat.vibe) body._vibe = flat.vibe;
      if (flat.brandDNA) body._brandDNA = flat.brandDNA;
    }

    const priceValues = skus.map((s: { pvp?: number }) => s.pvp || 0);
    const priceMin = Math.min(...priceValues);
    const priceMax = Math.max(...priceValues);
    const priceAvg = Math.round(priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length);

    const storiesBlock = (stories || []).map((s: { name: string; narrative?: string; mood?: string[]; hero_sku_id?: string; sku_ids?: string[] }) =>
      `Story "${s.name}": ${s.narrative || 'No narrative'} — Mood: ${(s.mood || []).join(', ')}, Hero: ${s.hero_sku_id || 'N/A'}\n  SKUs: ${(s.sku_ids || []).join(', ')}`
    ).join('\n');

    const skusBlock = skus.map((s: { name: string; family?: string; pvp?: number; type?: string; drop_number?: number; expected_sales?: number }) =>
      `- ${s.name} (${s.family || 'N/A'}): €${s.pvp}, type=${s.type || 'REVENUE'}, drop=${s.drop_number || '?'}, sales=€${s.expected_sales || 0}`
    ).join('\n');

    let userInput = '';
    if (mode === 'asistido') {
      userInput = `MODE: ASSISTED — User wants ${desiredDrops} drops.
${specificDates ? `Specific dates the user wants: ${specificDates}` : 'No specific dates — suggest optimal timing.'}
Distribute ALL ${skus.length} SKUs across ${desiredDrops} drops, aligning with stories where possible.`;
    } else {
      userInput = `MODE: FULL PROPOSAL — Generate the complete GTM plan.
Launch date: ${launchDate}
Number of drops: ${desiredDrops || 3}
Channels: ${channels || 'DTC, WHOLESALE'}
Create drops, assign ALL ${skus.length} SKUs, and suggest commercial actions.`;
    }

    // Inject server-side enriched context
    const enrichedBlock = [
      body._collectionName ? `- Collection: ${body._collectionName}` : '',
      body._season ? `- Season: ${body._season}` : '',
      body._consumer ? `- Target Consumer: ${body._consumer}` : '',
      body._vibe ? `- Collection Vibe: ${body._vibe}` : '',
      body._brandDNA ? `- Brand DNA: ${body._brandDNA}` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = `COLLECTION CONTEXT:
- Total sales target: €${totalSalesTarget}
- SKU count: ${skus.length}
${enrichedBlock ? `\n${enrichedBlock}` : ''}

PRICING OVERVIEW:
- Price range: €${priceMin} - €${priceMax}
- Avg price: €${priceAvg}

STORIES & SKUS:
${storiesBlock}

ALL SKUS:
${skusBlock}

${userInput}`;

    const { data, model, fallback } = await generateJSON({
      system: MARKETING_PROMPTS.gtm_plan.system,
      user: userPrompt,
      temperature: 0.7,
      language,
    });

    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_GTM,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: { mode, model, fallback, sku_count: skus?.length ?? 0, language },
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
  } catch (error) {
    console.error('GTM generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
