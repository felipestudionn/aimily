/**
 * POST /api/ai/distribution-propose
 *
 * Sprint B.3 (2026-05-09) · 02.3 Distribución · AUTO-PROPOSE.
 *
 * Auto-fires on first mount of `?block=channels` (after 02.1 confirmed).
 * Reads CIS (strategy + consumer + retail signals + brand identity) and
 * returns the full multi-axis editor state. No archetype kickoff —
 * the strategy archetype already locked the volumetric envelope, here
 * we materialize how those SKUs reach the consumer.
 *
 * Sonnet primary; Haiku/Gemini fallback via generateJSON().
 *
 * Body:    { collectionPlanId, language? }
 * Returns: { result: DistributionPlan, model, fallback }
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
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildDistributionProposePrompt } from '@/lib/ai/distribution-prompts';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

export const maxDuration = 90;

interface MarketCard {
  title: string;
  brands?: string;
  desc: string;
}

function formatCards(cards: MarketCard[]): string {
  return cards.map(c => `${c.title}${c.brands ? ` — ${c.brands}` : ''}: ${c.desc}`).join('\n\n');
}

interface StrategyRow {
  key: string;
  value: unknown;
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
  const language = (body?.language as string | undefined) || 'es';

  if (!collectionPlanId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Pull strategy keys from CIS (already confirmed in 02.1)
  const { data: strategyRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'merchandising')
    .eq('subdomain', 'strategy')
    .eq('is_current', true);

  const get = (key: string): unknown =>
    (strategyRows as StrategyRow[] | null)?.find(r => r.key === key)?.value;

  const archetypeName = (get('archetype_name') as string | undefined) || '';
  const targetSkuCount = (get('target_sku_count') as number | undefined) || 0;
  const salesTargetY1 = (get('sales_target_y1') as number | undefined) || 0;
  const investmentObj = get('investment') as { total?: number } | undefined;
  const totalInvestment = investmentObj?.total || 0;
  const dropsObj = get('drops') as { count?: number } | undefined;
  const dropCount = dropsObj?.count || 1;

  if (!archetypeName || !targetSkuCount) {
    return NextResponse.json(
      { error: 'Strategy not confirmed. Define 02.1 Estrategia de Compra first.' },
      { status: 400 },
    );
  }

  const [ctx, promptCtx] = await Promise.all([
    loadFullContext(collectionPlanId),
    buildPromptContext(collectionPlanId),
  ]);

  const liveSignalCards = (promptCtx.market_live_signals || []) as MarketCard[];

  const prompt = buildDistributionProposePrompt({
    brandName: promptCtx.brand_name || ctx.collectionName || '',
    brandTagline: promptCtx.brand_tagline || '',
    archetypeName,
    targetSkuCount,
    salesTargetY1,
    totalInvestment,
    dropCount,
    consumerSummary: ctx.consumer || '',
    consumerLifestyle: promptCtx.consumer_profile?.lifestyle || '',
    retailSignalCards: liveSignalCards.length ? formatCards(liveSignalCards) : '',
    productCategory: ctx.productCategory || '',
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
      console.warn('[distribution-propose] Sonnet failed, falling through:', err instanceof Error ? err.message : err);
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
