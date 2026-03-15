import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const {
      targetConsumer,
      season,
      skuCount,
      priceMin,
      priceMax,
      categories,
      location,
      signals,
      userMoodboardContext,
      language,
    } = body;

    const categoryContext = categories.join(', ');
    const signalsContext = signals
      ? JSON.stringify(signals.slice(0, 5))
      : 'No specific trend signals provided — use current fashion industry knowledge.';
    const moodboardContext =
      userMoodboardContext && typeof userMoodboardContext === 'string'
        ? userMoodboardContext
        : 'No moodboard provided — infer creative direction from consumer, season, and trends.';

    const system = `You are a senior fashion merchandiser and collection planner with 15+ years experience at brands like Inditex, LVMH, and PVH.

You build strategic collection frameworks that balance commercial viability with creative direction. Your plans are grounded in industry benchmarks: you know that premium fashion DTC typically operates at 60-70% gross margin, that a healthy collection needs 55-65% core/carry-over and 35-45% newness, and that price architecture follows the Good-Better-Best ladder.

QUALITY RULES:
- Monthly distribution must reflect real retail seasonality for ${season} — not flat percentages
- Product families must be specific to the category, not generic (e.g., for footwear: "Sneakers," "Boots," "Sandals" — not "Category A")
- Price segments must create a coherent ladder with no gaps
- Product type mix must balance commercial drivers (REVENUE 55-65%) with brand-building pieces (IMAGEN 10-20%) and acquisition hooks (ENTRY 20-30%)
- Return ONLY raw JSON, no markdown`;

    const userPrompt = `Build a strategic collection plan (SetupData) for:

TARGET CONSUMER: ${targetConsumer}
SEASON: ${season}
MARKET: ${location || 'Global'}
PRODUCT CATEGORIES: ${categoryContext}
SKU COUNT TARGET: ~${skuCount}
PRICE RANGE: €${priceMin} - €${priceMax}
TREND SIGNALS: ${signalsContext}
CREATIVE DIRECTION: ${moodboardContext}

Return JSON matching this exact TypeScript interface:
{
  "totalSalesTarget": number,        // realistic revenue based on SKU count × avg price × depth
  "monthlyDistribution": number[],   // 12 integers summing to exactly 100 (Jan-Dec seasonality)
  "expectedSkus": number,            // close to ${skuCount}
  "families": string[],              // product families derived from "${categoryContext}"
  "dropsCount": number,              // 1-6 drops
  "avgPriceTarget": number,          // from price range
  "targetMargin": number,            // realistic % (60-75)
  "plannedDiscounts": number,        // discount buffer % (10-20)
  "hasHistoricalData": false,
  "productCategory": string,         // "ROPA", "CALZADO", or "MIXED"
  "productFamilies": [{ "name": string, "percentage": number }],    // sum to 100
  "priceSegments": [{ "name": string, "minPrice": number, "maxPrice": number, "percentage": number }], // 3 segments sum to 100
  "productTypeSegments": [{ "type": "REVENUE"|"IMAGEN"|"ENTRY", "percentage": number }], // sum to 100
  "minPrice": ${priceMin},
  "maxPrice": ${priceMax}
}

CRITICAL: All percentage arrays must sum to exactly 100.`;

    const { data } = await generateJSON({
      system,
      user: userPrompt,
      temperature: 0.6,
      language,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Plan generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
