import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * AI GTM Plan Generation
 * Modes: 'asistido' (user defines # drops + dates, AI suggests distribution)
 *        'propuesta' (AI generates full plan from launch date)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const {
      mode,
      stories,
      skus,
      totalSalesTarget,
      desiredDrops,
      specificDates,
      launchDate,
      channels,
    } = body;

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

    const userPrompt = `COLLECTION CONTEXT:
- Total sales target: €${totalSalesTarget}
- SKU count: ${skus.length}

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
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
  } catch (error) {
    console.error('GTM generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
