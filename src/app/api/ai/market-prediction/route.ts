import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * Generate AI market demand prediction based on commercial plan
 * Returns a predicted sales curve based on market trends and seasonality
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { 
      collectionPlanId,
      drops, 
      commercialActions, 
      skus,
      totalSalesTarget,
      season,
      productCategory,
      location
    } = body;

    // Calculate the date range from drops
    const allDates = drops.map((d: any) => new Date(d.launch_date));
    const startDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6); // 6 month projection

    // Generate week labels
    const weeks: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const weekNum = getWeekNumber(currentDate);
      weeks.push(`${year}-W${weekNum.toString().padStart(2, '0')}`);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    const SYSTEM_PROMPT = `You are a retail market analyst expert. Analyze this commercial plan and generate DEMAND WEIGHTS for each week based on market patterns.

COMMERCIAL PLAN:
- Season: ${season || 'AW'}
- Category: ${productCategory || 'Fashion'}
- Location: ${location || 'Europe'}
- Total Sales Budget: €${totalSalesTarget} (this is the FIXED budget to distribute)

DROPS SCHEDULE:
${drops.map((d: any) => `- ${d.name}: ${d.launch_date} (${d.weeks_active || 8} weeks active)`).join('\n')}

COMMERCIAL ACTIONS:
${commercialActions.map((a: any) => `- ${a.name} (${a.action_type}): ${a.start_date}${a.end_date ? ' to ' + a.end_date : ''} - Category: ${a.category || 'General'}`).join('\n')}

SKUs BY DROP (User's current plan):
${drops.map((d: any) => {
  const dropSkus = skus.filter((s: any) => s.drop_id === d.id || s.drop_number === d.drop_number);
  const dropSales = dropSkus.reduce((sum: number, s: any) => sum + (s.expected_sales || 0), 0);
  return `- ${d.name}: ${dropSkus.length} SKUs, €${Math.round(dropSales)} expected sales`;
}).join('\n')}

WEEKS TO ANALYZE: ${weeks.join(', ')}

YOUR TASK:
Generate a demandWeight for each week that represents the RELATIVE market demand based on:
1. Retail seasonality (Black Friday ~W47-48, Christmas ~W51-52, January Sales ~W1-4)
2. Fashion industry cycles for ${productCategory || 'Fashion'} in ${location || 'Europe'}
3. Impact of the planned commercial actions
4. Natural demand patterns for ${season || 'AW'} season

The demandWeight values will be used to DISTRIBUTE the fixed €${totalSalesTarget} budget.
Higher weight = more sales should happen that week according to market demand.

Return ONLY a valid JSON object:
{
  "weeklyPredictions": [
    { "week": "2024-W35", "demandWeight": 0.5, "notes": "Season start, building momentum" },
    { "week": "2024-W47", "demandWeight": 1.0, "notes": "Black Friday peak" }
  ],
  "insights": "Overall analysis comparing user's plan vs optimal market timing",
  "gaps": ["Specific gaps where user's drop timing doesn't match market demand peaks"],
  "recommendations": ["Actionable recommendations to better align with market demand"]
}

CRITICAL RULES:
- demandWeight is a relative scale where higher = more demand (use 0.1 to 1.0 range)
- DO NOT calculate sales amounts - only provide weights. We will calculate sales from weights.
- Focus on WHEN demand peaks occur, not how much total sales
- Compare user's drop timing against optimal market windows
- Be specific about which weeks have misaligned expectations`;

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
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
        { status: 500 }
      );
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let prediction;
    try {
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        prediction = JSON.parse(textResponse.slice(firstBrace, lastBrace + 1));
      } else {
        prediction = JSON.parse(textResponse);
      }
    } catch (e) {
      console.error('Failed to parse prediction', textResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI prediction', raw: textResponse },
        { status: 500 }
      );
    }

    // Calculate predictedSales from demandWeights
    // This ensures the total ALWAYS equals the user's budget
    if (prediction.weeklyPredictions && prediction.weeklyPredictions.length > 0) {
      const totalWeight = prediction.weeklyPredictions.reduce(
        (sum: number, wp: any) => sum + (wp.demandWeight || 0), 
        0
      );
      
      if (totalWeight > 0) {
        prediction.weeklyPredictions = prediction.weeklyPredictions.map((wp: any) => ({
          ...wp,
          predictedSales: Math.round((wp.demandWeight / totalWeight) * totalSalesTarget),
          demandIndex: wp.demandWeight // Keep for reference
        }));
      }
    }

    // Save prediction to database
    if (collectionPlanId) {
      await supabaseAdmin
        .from('market_predictions')
        .insert({
          collection_plan_id: collectionPlanId,
          weekly_predictions: prediction.weeklyPredictions || [],
          insights: prediction.insights,
          gaps_detected: prediction.gaps || [],
          recommendations: prediction.recommendations || [],
        });
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Market prediction error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
