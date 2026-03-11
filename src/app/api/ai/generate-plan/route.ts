import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 },
    );
  }

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
      categories, // Array of strings
      location,
      signals, // Optional: array of signals to inform the plan
      userMoodboardContext,
    } = body;

    const categoryContext = categories.join(', ');
    const signalsContext = signals
      ? JSON.stringify(signals.slice(0, 5))
      : 'No specific trend signals provided, rely on general fashion knowledge.';
    const moodboardContext =
      userMoodboardContext && typeof userMoodboardContext === 'string'
        ? userMoodboardContext
        : 'No explicit user moodboard provided; infer creative direction from consumer, season and trends.';

    const SYSTEM_PROMPT = `You are an expert Fashion Merchandiser and Planner.
Your goal is to create a strategic "SetupData" JSON object for a new fashion collection.
This data will configure a merchandising planning tool.

Input Context:
- Target Consumer: ${targetConsumer}
- Season: ${season}
- Location/Market: ${location || 'Global'}
- Product Categories: ${categoryContext}
- Approximate SKU Count: ${skuCount}
- Price Range: ${priceMin} - ${priceMax}
- Trend Signals (Context): ${signalsContext}
 - User Moodboard (Creative Context): ${moodboardContext}

Output Requirement:
Return ONLY a valid JSON object matching the following TypeScript interface EXACTLY:

interface SetupData {
  totalSalesTarget: number; // Estimate a realistic revenue target (e.g. 100000 to 1000000) based on SKU count * avg price * depth
  monthlyDistribution: number[]; // Array of 12 integers summing to 100 (Jan-Dec seasonality for ${season})
  expectedSkus: number; // Close to ${skuCount}
  families: string[]; // List of product families derived from ${categoryContext}
  dropsCount: number; // Suggest 1-6 drops
  avgPriceTarget: number; // Calculated from price range
  targetMargin: number; // Suggest realistic margin (e.g. 60-75%)
  plannedDiscounts: number; // Suggest discount buffer (e.g. 10-20%)
  hasHistoricalData: boolean; // Always false for new AI plan
  productCategory: string; // Main category (e.g. "ROPA", "CALZADO" or "MIXED")
  productFamilies: { name: string; percentage: number }[]; // Breakdown of families summing to 100%
  priceSegments: { name: string; minPrice: number; maxPrice: number; percentage: number }[]; // 3 segments (Entry, Core, Premium) summing to 100%
  productTypeSegments: { type: 'REVENUE' | 'IMAGEN' | 'ENTRY'; percentage: number }[]; // Strategic mix summing to 100%
  minPrice: number; // From input
  maxPrice: number; // From input
}

IMPORTANT Rules:
1. monthlyDistribution MUST sum to exactly 100.
2. productFamilies percentages MUST sum to exactly 100.
3. priceSegments percentages MUST sum to exactly 100.
4. productTypeSegments percentages MUST sum to exactly 100.
5. Use realistic fashion merchandising logic (e.g., Revenue drivers have highest %, Image pieces have low volume but high price).
6. Names should be in English or Spanish (consistent with input).
7. Return ONLY JSON. No markdown.
`;

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`,
    );
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error', response.status, errorText);
      return NextResponse.json(
        { error: 'Gemini API error', details: errorText },
        { status: 500 },
      );
    }

    const data = await response.json();
    const textResponse =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedPlan;
    try {
      // Robust JSON parsing
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsedPlan = JSON.parse(textResponse.slice(firstBrace, lastBrace + 1));
      } else {
        parsedPlan = JSON.parse(textResponse);
      }
    } catch (e) {
      console.error('Failed to parse Gemini plan', textResponse);
      return NextResponse.json(
        { error: 'Failed to parse generated plan', raw: textResponse },
        { status: 500 },
      );
    }

    return NextResponse.json(parsedPlan);
  } catch (error) {
    console.error('Plan generation error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
