/**
 * POST /api/ai/scenarios-prefill-editor
 *
 * Sprint B.1 (2026-05-08) · 02.1 Estrategia de Compra · CONVERGENCE.
 *
 * Once the user picks one of the 4 archetypes (kick-off endpoint), this
 * route is what BRIDGES the archetype's pure-business envelope to the
 * brand's confirmed Block 1 creative direction. The user lands in the
 * multi-axis editor with families/subcategorías/pricing-tiers already
 * informed — never empty, never blind.
 *
 * Anti-leak split (per Sprint A handoff):
 *   · Pricing tiers ← `competitors_input.competitors[]` ONLY
 *   · Families / subcategorías ← references[] + market_trends + moodboard
 *
 * Body:    { collectionPlanId, archetype: ScenarioArchetype, language? }
 * Returns: { result: PrefilledEditor, model, fallback }
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
  buildScenariosPrefillEditorPrompt,
  type ScenarioArchetype,
} from '@/lib/ai/scenarios-prompts';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

export const maxDuration = 90;

interface MarketCard {
  title: string;
  brands?: string;
  desc: string;
}

/** Tokenize a brand list (comma-separated string) into a normalized lower-case set. */
function brandTokens(brands: string | undefined): Set<string> {
  if (!brands) return new Set();
  return new Set(
    brands
      .split(/[,;\/·]/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Filter cards whose `brands` mentions ANY of the dim brand names. */
function filterCardsByBrands(cards: MarketCard[], dimBrands: string[]): MarketCard[] {
  if (!dimBrands.length || !cards.length) return [];
  const dim = new Set(dimBrands.map(b => b.toLowerCase()));
  return cards.filter(c => {
    const tokens = Array.from(brandTokens(c.brands));
    return tokens.some(t => dim.has(t));
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
  const language = (body?.language as string | undefined) || 'es';

  if (!collectionPlanId || !archetype || !archetype.id) {
    return NextResponse.json(
      { error: 'collectionPlanId and archetype (with id) are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Load full context for brand+consumer+moodboard, plus structured
  // promptCtx for the dim-aware competitors/references split.
  const [ctx, promptCtx] = await Promise.all([
    loadFullContext(collectionPlanId),
    buildPromptContext(collectionPlanId),
  ]);

  // Anti-leak split: filter the same `market_competitors` cards into
  // two disjoint buckets using the user's confirmed dim ficha.
  const competitorBrands = promptCtx.market_competitors_input?.competitors || [];
  const referenceBrands = promptCtx.market_competitors_input?.references || [];
  const allCompetitorCards = promptCtx.market_competitors || [];

  const pricingCards = filterCardsByBrands(allCompetitorCards, competitorBrands);
  const visualRefCards = filterCardsByBrands(allCompetitorCards, referenceBrands);
  const trendsCards = promptCtx.market_trends || [];

  const prompt = buildScenariosPrefillEditorPrompt({
    archetype,
    brandName: promptCtx.brand_name || ctx.collectionName || '',
    brandTagline: promptCtx.brand_tagline || '',
    consumerSummary: ctx.consumer || '',
    moodboardSummary: ctx.moodboard || '',
    productCategory: ctx.productCategory || '',
    pricingCompetitorCards: pricingCards.length ? formatCards(pricingCards) : '',
    visualReferenceCards: visualRefCards.length ? formatCards(visualRefCards) : '',
    marketTrendsCards: trendsCards.length ? formatCards(trendsCards as MarketCard[]) : '',
    language,
  });

  if (ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 4096,
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
      console.warn('[scenarios-prefill-editor] Sonnet failed, falling through:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      maxTokens: 4096,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (err) {
    const friendly = normalizeAiError(err);
    return NextResponse.json({ error: friendly.userMessage }, { status: friendly.httpStatus ?? 500 });
  }
}
