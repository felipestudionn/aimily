import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * AI GTM Plan Generation
 * Modes: 'asistido' (user defines # drops + dates, AI suggests distribution)
 *        'propuesta' (AI generates full plan from launch date)
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const {
      mode, // 'asistido' | 'propuesta'
      stories,
      skus,
      totalSalesTarget,
      // Asistido
      desiredDrops,
      specificDates,
      // Propuesta
      launchDate,
      channels,
    } = body;

    const priceValues = skus.map((s: any) => s.pvp || 0);
    const priceMin = Math.min(...priceValues);
    const priceMax = Math.max(...priceValues);
    const priceAvg = Math.round(priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length);

    const storiesBlock = (stories || []).map((s: any) =>
      `Story "${s.name}": ${s.narrative || 'No narrative'} — Mood: ${(s.mood || []).join(', ')}, Hero: ${s.hero_sku_id || 'N/A'}\n  SKUs: ${(s.sku_ids || []).join(', ')}`
    ).join('\n');

    const skusBlock = skus.map((s: any) =>
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

    const prompt = `${MARKETING_PROMPTS.gtm_plan.system}

COLLECTION CONTEXT:
- Total sales target: €${totalSalesTarget}
- SKU count: ${skus.length}

PRICING OVERVIEW:
- Price range: €${priceMin} - €${priceMax}
- Avg price: €${priceAvg}

STORIES & SKUS:
${storiesBlock}

ALL SKUS:
${skusBlock}

${userInput}

RULES:
1. Each drop should tell a story — ideally align drops with stories
2. First drop = strongest commercial story (REVENUE-heavy)
3. IMAGE pieces can launch earlier for press/editorial
4. Spread drops to maintain commercial momentum
5. Each drop needs enough SKUs to feel substantial (min 5-8)
6. Assign a drop_number to each drop (starting from 1)
7. Every SKU must be assigned to exactly one drop

OUTPUT (JSON only):
{
  "drops": [
    {
      "drop_number": 1,
      "name": "Drop name (evocative)",
      "launch_date": "YYYY-MM-DD",
      "weeks_active": 8,
      "story_alignment": "Story name this drop represents",
      "sku_ids": ["sku-id-1", "sku-id-2"],
      "channels": ["DTC", "WHOLESALE"],
      "rationale": "Why this timing and these SKUs"
    }
  ],
  "commercial_actions": [
    {
      "name": "Action name",
      "type": "SALE | COLLAB | CAMPAIGN | SEEDING | EVENT",
      "date": "YYYY-MM-DD",
      "category": "VISIBILIDAD | POSICIONAMIENTO | VENTAS | NOTORIEDAD",
      "description": "What this action involves"
    }
  ],
  "rationale": "Overall strategy explanation"
}`;

    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`);
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error', response.status, errorText);
      return NextResponse.json({ error: 'Gemini API error', details: errorText }, { status: 500 });
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let result;
    try {
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        result = JSON.parse(textResponse.slice(firstBrace, lastBrace + 1));
      } else {
        result = JSON.parse(textResponse);
      }
    } catch {
      console.error('Failed to parse GTM plan', textResponse);
      return NextResponse.json({ error: 'Failed to parse AI response', raw: textResponse }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GTM generation error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
