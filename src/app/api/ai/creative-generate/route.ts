import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON, generateText } from '@/lib/ai/llm-client';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';
import { researchTrends } from '@/lib/ai/perplexity-client';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';

/* ═══════════════════════════════════════════════════════════
   Creative Block — AI Generation Endpoint

   trends (4 types): Perplexity Sonar DIRECT (1 call, no Claude needed)
   consumer/vibe: Claude Haiku (creative tasks)
   Brand DNA moved to /api/ai/brand-propose + /api/ai/brand-from-external
   in the Sprint A.3 multi-axis refactor (2026-05-08).
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'consumer-assisted'
  | 'consumer-proposals'
  | 'vibe-assisted'
  | 'vibe-proposals'
  | 'trends-global'
  | 'trends-deep-dive'
  | 'trends-live-signals'
  | 'trends-competitors';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  if (!body?.type) {
    return NextResponse.json({ error: 'Missing "type" in request body' }, { status: 400 });
  }

  const type = body.type as GenerationType;
  const input = (body.input || {}) as Record<string, string>;
  const language = body.language as 'en' | 'es' | undefined;
  const collectionPlanId = body.collectionPlanId as string | undefined;

  // SERVER-SIDE: Load FULL context from CIS + Creative + Brief
  if (collectionPlanId) {
    const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
    if (!ownership.authorized) return ownership.error;
    const serverCtx = await loadFullContext(collectionPlanId);
    mergeContextWithInput(serverCtx, input);
  }

  // ══════════════════════════════════════════════════════════
  // TRENDS: Perplexity Sonar DIRECT — 1 call, returns JSON
  // No Claude needed. Sonar searches web + structures response.
  // ══════════════════════════════════════════════════════════
  if (type.startsWith('trends-')) {
    const trendType = type.replace('trends-', '') as 'global' | 'deep-dive' | 'live-signals' | 'competitors';
    try {
      const excludeTitles = input.excludeTitles ? input.excludeTitles.split('|||') : undefined;
      const validDims = [
        'theme', 'category', 'color', 'material',
        'street_style', 'social_media', 'retail_signals', 'cultural_moments',
        'competitor', 'reference',
      ] as const;
      type DimKey = typeof validDims[number];
      const targetDimension = (input.targetDimension && (validDims as readonly string[]).includes(input.targetDimension))
        ? (input.targetDimension as DimKey)
        : undefined;
      // Existing cards in the same axis come through serialized as
      // a `||` separated list of "Title :: short desc" entries. We
      // unpack them so the Sonar prompt can show "you already had X"
      // and ask for complement.
      let existingInDimension: Array<{ title: string; desc?: string }> | undefined;
      if (input.existingInDimension) {
        existingInDimension = input.existingInDimension
          .split('|||')
          .map((s: string) => {
            const [title, desc] = s.split(' :: ');
            return { title: (title || '').trim(), desc: (desc || '').trim() };
          })
          .filter((e: { title: string; desc?: string }) => e.title.length > 0);
      }
      const sonarResult = await researchTrends(
        input.input || '',
        input.season,
        trendType,
        {
          collectionName: input.collectionName,
          consumer: input.consumer,
          // Live Signals inherits Tendencias' framing chips so its
          // location-grounded scan stays inside the same product
          // universe (e.g. women / Sastrería / Knitwear / Calzado
          // plano) rather than drifting to global running-sneaker
          // street-style hits.
          siblingTrendsFocus: input.siblingTrendsFocus,
        },
        excludeTitles,
        language,
        targetDimension,
        existingInDimension,
      );

      if (sonarResult && sonarResult.results.length > 0) {
        return NextResponse.json({
          result: { results: sonarResult.results },
          model: 'sonar',
          fallback: false,
        });
      }

      // Sonar failed or returned empty — fall through to Claude
      console.warn('Sonar returned no results, falling through to Claude');
    } catch (e) {
      console.error('Sonar trend research failed, falling through to Claude:', e);
    }
  }

  // ══════════════════════════════════════════════════════════
  // ALL OTHER TYPES: Claude Haiku (creative/analysis tasks)
  // ══════════════════════════════════════════════════════════
  const prompt = buildCreativePrompt(type, input);
  if (!prompt) {
    return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 });
  }

  try {
    if (type === 'consumer-assisted') {
      const { text, model, fallback } = await generateText({
        system: prompt.system,
        user: prompt.user,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        language,
      });

      // CIS: capture creative text generation (fire-and-forget)
      if (collectionPlanId) {
        const { recordDecision } = await import('@/lib/collection-intelligence');
        recordDecision({
          collectionPlanId,
          domain: 'creative', subdomain: 'identity', key: `creative_${type}`,
          value: text.trim(),
          source: 'ai_recommendation',
          sourcePhase: 'creative', sourceComponent: 'CreativeBlock',
          tags: ['affects_content', 'affects_photography'],
          userId: user.id,
        }).catch((err: unknown) => console.error('[CIS] creative text capture failed:', err));
      }

      return NextResponse.json({ result: text.trim(), model, fallback });
    }

    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      language,
    });

    // CIS: capture creative JSON generation (fire-and-forget)
    if (collectionPlanId && data) {
      const { recordDecision } = await import('@/lib/collection-intelligence');
      recordDecision({
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: `creative_${type}`,
        value: data,
        source: 'ai_recommendation',
        sourcePhase: 'creative', sourceComponent: 'CreativeBlock',
        tags: ['affects_content', 'affects_photography'],
        userId: user.id,
      }).catch((err: unknown) => console.error('[CIS] creative JSON capture failed:', err));
    }

    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Creative generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
