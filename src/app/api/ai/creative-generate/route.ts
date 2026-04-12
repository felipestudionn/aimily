import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText } from '@/lib/ai/llm-client';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';
import { scrapeBrandContent } from '@/lib/brand-scraper';
import { researchBrand, researchTrends } from '@/lib/ai/perplexity-client';

/* ═══════════════════════════════════════════════════════════
   Creative Block — AI Generation Endpoint

   brand-extract: Perplexity Search + website scraping → Claude analysis
   trends (4 types): Perplexity Sonar DIRECT (1 call, no Claude needed)
   consumer/vibe/brand-generate: Claude Haiku (creative tasks)
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'consumer-assisted'
  | 'consumer-proposals'
  | 'vibe-assisted'
  | 'vibe-proposals'
  | 'brand-extract'
  | 'brand-generate'
  | 'brand-assisted'
  | 'brand-proposals'
  | 'trends-global'
  | 'trends-deep-dive'
  | 'trends-live-signals'
  | 'trends-competitors';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  if (!body?.type) {
    return NextResponse.json({ error: 'Missing "type" in request body' }, { status: 400 });
  }

  const type = body.type as GenerationType;
  const input = (body.input || {}) as Record<string, string>;
  const language = body.language as 'en' | 'es' | undefined;
  const collectionPlanId = body.collectionPlanId as string | undefined;

  // ══════════════════════════════════════════════════════════
  // TRENDS: Perplexity Sonar DIRECT — 1 call, returns JSON
  // No Claude needed. Sonar searches web + structures response.
  // ══════════════════════════════════════════════════════════
  if (type.startsWith('trends-')) {
    const trendType = type.replace('trends-', '') as 'global' | 'deep-dive' | 'live-signals' | 'competitors';
    try {
      const excludeTitles = input.excludeTitles ? input.excludeTitles.split('|||') : undefined;
      const sonarResult = await researchTrends(
        input.input || '',
        input.season,
        trendType,
        { collectionName: input.collectionName, consumer: input.consumer },
        excludeTitles,
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
  // BRAND EXTRACT: Perplexity Search + scraping → Claude analysis
  // ══════════════════════════════════════════════════════════
  if (type === 'brand-extract' || type === 'brand-assisted') {
    let brandHint = '';
    if (input.website) {
      try {
        brandHint = new URL(
          input.website.startsWith('http') ? input.website : 'https://' + input.website
        ).hostname.replace('www.', '').split('.')[0];
      } catch { brandHint = input.website; }
    }
    if (input.instagram) {
      input._igHandle = input.instagram.replace(/^@/, '').replace(/\/$/, '');
      if (!brandHint) brandHint = input._igHandle;
    }

    const [perplexityResult, scraped] = await Promise.all([
      researchBrand(brandHint, input.website, input.instagram),
      input.website ? scrapeBrandContent(input.website) : Promise.resolve(null),
    ]);

    if (perplexityResult) {
      input._webResearch = perplexityResult.content;
      if (perplexityResult.sources.length > 0) {
        input._sources = perplexityResult.sources.slice(0, 5).join(', ');
      }
    }

    if (scraped) {
      input._brandName = scraped.brandName;
      input._tagline = scraped.tagline;
      input._headings = scraped.headings.join(' | ');
      input._bodyContent = scraped.bodyContent;
      input._aboutContent = scraped.aboutContent;
      input._productDescriptions = scraped.productDescriptions.join('\n');
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
