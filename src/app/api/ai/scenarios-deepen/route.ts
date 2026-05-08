/**
 * POST /api/ai/scenarios-deepen
 *
 * Sprint B.1 (2026-05-08) · 02.1 Estrategia de Compra · DEEPEN axis.
 *
 * Refines ONE axis of the chosen scenario in-place (volume / pricing /
 * families / drops / narrative). Returns only the refined axis, not the
 * full editor — frontend merges it into the working state. Faster than
 * regenerating the whole prefill (~4-8s vs 20-30s).
 *
 * Body:    { collectionPlanId, archetype, currentEditor, axis, language? }
 * Returns: { result: <axis-only object>, model, fallback }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getAuthenticatedUser,
  checkAuthOnly,
  usageDeniedResponse,
  verifyCollectionOwnership,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { buildPromptContext } from '@/lib/prompts/prompt-context';
import { extractJSON, generateJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';
import {
  buildScenariosDeepenPrompt,
  type ScenarioArchetype,
  type PrefilledEditor,
  type DeepenAxis,
} from '@/lib/ai/scenarios-prompts';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

export const maxDuration = 60;

const VALID_AXES: DeepenAxis[] = ['volume', 'pricing', 'families', 'drops', 'narrative'];

interface MarketCard { title: string; brands?: string; desc: string }

function brandTokens(brands: string | undefined): Set<string> {
  if (!brands) return new Set();
  return new Set(brands.split(/[,;\/·]/).map(s => s.trim().toLowerCase()).filter(Boolean));
}
function filterCardsByBrands(cards: MarketCard[], dimBrands: string[]): MarketCard[] {
  if (!dimBrands.length || !cards.length) return [];
  const dim = new Set(dimBrands.map(b => b.toLowerCase()));
  return cards.filter(c => {
    const t = Array.from(brandTokens(c.brands));
    return t.some(x => dim.has(x));
  });
}
function formatCards(cards: MarketCard[]): string {
  return cards.map(c => `${c.title}${c.brands ? ` — ${c.brands}` : ''}: ${c.desc}`).join('\n\n');
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'heavy-text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  const collectionPlanId = body?.collectionPlanId as string | undefined;
  const archetype = body?.archetype as ScenarioArchetype | undefined;
  const currentEditor = body?.currentEditor as PrefilledEditor | undefined;
  const axis = body?.axis as DeepenAxis | undefined;
  const language = (body?.language as string | undefined) || 'es';

  if (!collectionPlanId || !archetype?.id || !currentEditor || !axis) {
    return NextResponse.json(
      { error: 'collectionPlanId, archetype, currentEditor and axis are required' },
      { status: 400 },
    );
  }
  if (!VALID_AXES.includes(axis)) {
    return NextResponse.json({ error: `Unknown axis: ${axis}` }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const [ctx, promptCtx] = await Promise.all([
    loadFullContext(collectionPlanId),
    buildPromptContext(collectionPlanId),
  ]);

  const competitorBrands = promptCtx.market_competitors_input?.competitors || [];
  const referenceBrands = promptCtx.market_competitors_input?.references || [];
  const allCompetitorCards = promptCtx.market_competitors || [];

  const pricingCards = filterCardsByBrands(allCompetitorCards, competitorBrands);
  const visualRefCards = filterCardsByBrands(allCompetitorCards, referenceBrands);
  const trendsCards = promptCtx.market_trends || [];

  const prompt = buildScenariosDeepenPrompt({
    axis,
    archetype,
    currentEditor,
    brandName: promptCtx.brand_name || ctx.collectionName || '',
    pricingCompetitorCards: pricingCards.length ? formatCards(pricingCards) : '',
    visualReferenceCards: visualRefCards.length ? formatCards(visualRefCards) : '',
    marketTrendsCards: trendsCards.length ? formatCards(trendsCards as MarketCard[]) : '',
    consumerSummary: ctx.consumer || '',
    language,
  });

  if (ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 2048,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        temperature: prompt.temperature,
      });
      const block = response.content[0];
      if (block?.type === 'text' && block.text) {
        const data = extractJSON(block.text);
        return NextResponse.json({ result: data, model: 'sonnet', fallback: false });
      }
    } catch (err) {
      console.warn('[scenarios-deepen] Sonnet failed, falling through:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      maxTokens: 2048,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (err) {
    const friendly = normalizeAiError(err);
    return NextResponse.json({ error: friendly.userMessage }, { status: friendly.httpStatus ?? 500 });
  }
}
