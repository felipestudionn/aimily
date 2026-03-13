import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * Generate AI market demand prediction based on commercial plan
 * Returns a predicted sales curve based on market trends and seasonality
 */
export async function POST(req: NextRequest) {
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
      location,
    } = body;

    // Calculate date range from drops
    const allDates = drops.map((d: { launch_date: string }) => new Date(d.launch_date));
    const startDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);

    // Generate week labels
    const weeks: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const weekNum = getWeekNumber(currentDate);
      weeks.push(`${year}-W${weekNum.toString().padStart(2, '0')}`);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    const dropsBlock = drops
      .map((d: { name: string; launch_date: string; weeks_active?: number }) =>
        `- ${d.name}: ${d.launch_date} (${d.weeks_active || 8} weeks active)`
      )
      .join('\n');

    const actionsBlock = commercialActions
      .map((a: { name: string; action_type: string; start_date: string; end_date?: string; category?: string }) =>
        `- ${a.name} (${a.action_type}): ${a.start_date}${a.end_date ? ' to ' + a.end_date : ''} — ${a.category || 'General'}`
      )
      .join('\n');

    const skusByDrop = drops
      .map((d: { id?: string; drop_number?: number; name: string }) => {
        const dropSkus = skus.filter(
          (s: { drop_id?: string; drop_number?: number }) => s.drop_id === d.id || s.drop_number === d.drop_number
        );
        const dropSales = dropSkus.reduce((sum: number, s: { expected_sales?: number }) => sum + (s.expected_sales || 0), 0);
        return `- ${d.name}: ${dropSkus.length} SKUs, €${Math.round(dropSales)} expected`;
      })
      .join('\n');

    const system = `You are a retail demand analyst specializing in fashion seasonality and commercial planning. You work with data similar to EDITED's retail intelligence platform — you understand how retail demand flows through weeks, how commercial actions create demand spikes, and how fashion seasons create predictable patterns.

Your demand weights must reflect real retail patterns:
- Black Friday (W47-48): 1.5-2x normal demand
- Pre-Christmas (W49-51): sustained high demand
- Christmas week (W52): drop in online, spike in gifting categories
- January sales (W1-4): clearance-driven volume spike
- Summer lull (W26-32): lower demand in most European markets
- Fashion week buzz (W8-10, W37-39): awareness spike, delayed conversion

Return ONLY raw JSON, no markdown.`;

    const userPrompt = `Analyze this commercial plan and generate demand weights for each week.

PLAN:
- Season: ${season || 'AW'}
- Category: ${productCategory || 'Fashion'}
- Market: ${location || 'Europe'}
- Sales Budget: €${totalSalesTarget} (fixed — weights will distribute this)

DROPS:
${dropsBlock}

COMMERCIAL ACTIONS:
${actionsBlock}

SKUs BY DROP:
${skusByDrop}

WEEKS TO ANALYZE: ${weeks.join(', ')}

Return JSON:
{
  "weeklyPredictions": [
    { "week": "YYYY-Www", "demandWeight": 0.1-1.0, "notes": "brief rationale" }
  ],
  "insights": "analysis comparing user's plan vs optimal market timing",
  "gaps": ["specific timing misalignments"],
  "recommendations": ["actionable adjustments"]
}

RULES:
- demandWeight: relative scale 0.1-1.0 (higher = more demand)
- DO NOT calculate sales amounts — only weights
- One entry per week in the analysis period
- Be specific about which weeks are misaligned`;

    const { data: prediction } = await generateJSON<{
      weeklyPredictions?: { week: string; demandWeight: number; notes: string }[];
      insights?: string;
      gaps?: string[];
      recommendations?: string[];
    }>({
      system,
      user: userPrompt,
      temperature: 0.5,
    });

    // Calculate predictedSales from demandWeights
    if (prediction.weeklyPredictions && prediction.weeklyPredictions.length > 0) {
      const totalWeight = prediction.weeklyPredictions.reduce(
        (sum, wp) => sum + (wp.demandWeight || 0),
        0
      );

      if (totalWeight > 0) {
        (prediction as Record<string, unknown>).weeklyPredictions = prediction.weeklyPredictions.map((wp) => ({
          ...wp,
          predictedSales: Math.round((wp.demandWeight / totalWeight) * totalSalesTarget),
          demandIndex: wp.demandWeight,
        }));
      }
    }

    // Save prediction to database
    if (collectionPlanId) {
      await supabaseAdmin.from('market_predictions').insert({
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
