export const maxDuration = 90;

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText, extractJSON } from '@/lib/ai/llm-client';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { formatCisPrefix } from '@/lib/ai/cis-prefix';
import { PERSONAS, QUALITY_GATES, OUTPUT_RULES } from '@/lib/ai/prompt-foundations';

/**
 * Merchandising Scenarios — post-creation flow
 *
 * Input: { collectionPlanId, targetSkus?, targetBudget?, direction?, language }
 * Output: { result: { marketInsights, scenarios: [{id, name, description, skuCount, families, priceArchitecture, financials, timeline, bestFor}], recommendation } }
 *
 * Loads full CIS context via loadFullContext (brand DNA, consumer, vibe,
 * moodboard, trends, competitors, productCategory). This is the coordinating
 * first step of Merchandising & Planning — its output pre-fills families,
 * channels, budget downstream.
 *
 * 3 modes handled by the frontend, all route here:
 *   - free:     no AI call (form-only)
 *   - assisted: targetSkus + targetBudget provided, AI generates 3 scenarios in range
 *   - ai:       neither provided, AI infers everything from CIS
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

async function searchPerplexity(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) return '';
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a fashion market research assistant. Return concise, data-rich answers with specific prices, brands, and numbers. Focus on European markets.' },
          { role: 'user', content: query },
        ],
        max_tokens: 800,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

function buildScenarioResearchQuery(productCategory: string, season: string): string {
  const cat = productCategory || 'fashion';
  const seasonHint = season || 'upcoming season';
  return `Current market benchmarks for a contemporary ${cat} capsule collection launching for ${seasonHint}. What is the typical SKU count range for a small launch vs full collection, and typical launch budget, production cost, and retail price range in euros for European market in 2026?`;
}

interface ScenariosBody {
  collectionPlanId: string;
  targetSkus?: number | null;
  targetBudget?: number | null;
  direction?: string;
  language?: string;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = (await req.json()) as ScenariosBody;
    const { collectionPlanId, targetSkus, targetBudget, direction, language = 'en' } = body;

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    // 1. Load full CIS
    const ctx = await loadFullContext(collectionPlanId);
    const cisPrefix = formatCisPrefix(ctx);

    // 2. Light market research (1 query to keep fast)
    const researchQuery = buildScenarioResearchQuery(ctx.productCategory || '', ctx.season || '');
    const marketResearch = await searchPerplexity(researchQuery);

    // 3. Build prompt — CIS-first, targetSkus/budget as optional anchors
    const system = `${PERSONAS.merchPlanner}

You are the merchandising planner for this collection. Based on the existing Collection Intelligence System (CIS) — brand DNA, target consumer, collection vibe, moodboard, market research, and product category that the team has already defined — propose 3 strategic scenarios for the collection size, price architecture, and financial ambition.

Each scenario is a complete, coherent proposal — not just numbers, but a strategic narrative that respects what's already decided creatively.

SCENARIO GUIDELINES:
- "Focused Start" / Conservative: Minimum viable collection, tight editorial, lower risk, faster to market, smaller investment. Test the concept with a tight capsule.
- "Balanced" / Statement: Solid first collection with enough variety to tell the brand story. Moderate investment. The "safe bold" choice.
- "Full Capsule" / Ambitious: Maximum impact, higher investment, biggest bet. For teams that can absorb the risk and want a statement launch.

For each scenario, provide:
- Exact SKU count with family breakdown (match the brand's product category; use real family names that fit the CIS vibe and consumer)
- Price architecture with specific price points per family — respect the brand tier implied by the CIS (luxury / premium / accessible / mass)
- Production budget estimate (based on typical MOQs and production costs for the category and implied origin)
- Marketing budget (industry standard 15-25% of first-year revenue for launch year)
- First-year sales target (based on comparable brand launches in the same tier)
- Rationale / bestFor: WHY this scenario makes sense for THIS brand's CIS — reference the vibe, consumer, and any active trends

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Respond in ${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'it' ? 'Italian' : language === 'de' ? 'German' : language === 'pt' ? 'Portuguese' : language === 'nl' ? 'Dutch' : language === 'sv' ? 'Swedish' : language === 'no' ? 'Norwegian' : 'English'}.`;

    const anchorLines: string[] = [];
    if (typeof targetSkus === 'number' && targetSkus > 0) {
      anchorLines.push(`TARGET SKU COUNT ANCHOR: The user wants ~${targetSkus} SKUs. Build scenarios around this anchor: Focused Start = ${Math.round(targetSkus * 0.6)} SKUs, Balanced = ${targetSkus} SKUs, Full Capsule = ${Math.round(targetSkus * 1.5)} SKUs.`);
    }
    if (typeof targetBudget === 'number' && targetBudget > 0) {
      anchorLines.push(`TARGET BUDGET ANCHOR: The user has ~€${targetBudget.toLocaleString()} for total investment. Build scenarios around this: Focused = ~${Math.round(targetBudget * 0.6).toLocaleString()}, Balanced = ~${targetBudget.toLocaleString()}, Full Capsule = ~${Math.round(targetBudget * 1.6).toLocaleString()}.`);
    }
    if (direction) {
      anchorLines.push(`USER DIRECTION: ${direction}`);
    }
    if (!anchorLines.length) {
      anchorLines.push(`NO EXPLICIT ANCHORS: Infer the appropriate SKU count and investment range from the CIS — the consumer demographics suggest purchase capacity, the vibe suggests narrative breadth, the product category suggests typical collection density, and the reference brands imply scale. Use industry-standard ratios (marketing budget 15-25% of year-one revenue, production cost 25-35% of retail per unit).`);
    }

    const userPrompt = `${cisPrefix}
SCENARIO REQUEST:
${anchorLines.join('\n\n')}

MARKET RESEARCH (current benchmarks):
${marketResearch || 'None available.'}

Return ONLY valid JSON (no markdown, no explanation, no code fences):
{"marketInsights":{"competitorLandscape":"string","priceBenchmarks":"string","trendContext":"string","marketOpportunity":"string"},"scenarios":[{"id":"conservative","name":"string","description":"string","skuCount":10,"families":[{"name":"string","count":5,"description":"string"}],"priceArchitecture":{"min":25,"max":45,"avg":35,"tier":"string"},"financials":{"productionBudget":20000,"marketingBudget":10000,"totalInvestment":30000,"firstYearSalesTarget":100000,"targetMargin":62},"timeline":"string","bestFor":"string"},{"id":"balanced","name":"string","description":"string","skuCount":18,"families":[{"name":"string","count":9,"description":"string"}],"priceArchitecture":{"min":25,"max":45,"avg":35,"tier":"string"},"financials":{"productionBudget":40000,"marketingBudget":20000,"totalInvestment":60000,"firstYearSalesTarget":200000,"targetMargin":60},"timeline":"string","bestFor":"string"},{"id":"ambitious","name":"string","description":"string","skuCount":30,"families":[{"name":"string","count":15,"description":"string"}],"priceArchitecture":{"min":25,"max":45,"avg":35,"tier":"string"},"financials":{"productionBudget":80000,"marketingBudget":40000,"totalInvestment":120000,"firstYearSalesTarget":400000,"targetMargin":58},"timeline":"string","bestFor":"string"}],"recommendation":"string"}

Replace ALL placeholder strings with real content grounded in the CIS. Replace ALL placeholder numbers with real calculated values. Keep the exact JSON structure.`;

    // 4. Generate
    let data;
    try {
      const result = await generateJSON({ system, user: userPrompt, temperature: 0.7, maxTokens: 8192, language });
      data = result.data;
    } catch (jsonErr) {
      console.error('[Merch/Scenarios] generateJSON failed, trying text fallback:', jsonErr instanceof Error ? jsonErr.message : jsonErr);
      const textResult = await generateText({ system, user: userPrompt, temperature: 0.7, maxTokens: 8192, language });
      try {
        data = extractJSON(textResult.text);
      } catch {
        return NextResponse.json(
          { error: `AI returned non-JSON response. First 200 chars: ${textResult.text.slice(0, 200)}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ result: data, marketResearch });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Merch/Scenarios]', msg);
    return NextResponse.json({ error: `Failed to generate scenarios: ${msg}` }, { status: 500 });
  }
}
