import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText } from '@/lib/ai/llm-client';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';
import { scrapeBrandContent } from '@/lib/brand-scraper';
import { researchBrand, researchTrends } from '@/lib/ai/perplexity-client';

/* ═══════════════════════════════════════════════════════════
   Creative Block — AI Generation Endpoint
   10 prompt types · Claude Haiku primary, Gemini fallback
   brand-extract: Perplexity web research + website scraping + Claude
   trends: Perplexity web research + Claude analysis
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'consumer-assisted'
  | 'consumer-proposals'
  | 'vibe-assisted'
  | 'vibe-proposals'
  | 'brand-extract'
  | 'brand-generate'
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

  // ── Brand Extract: Perplexity research + website scraping in parallel ──
  if (type === 'brand-extract') {
    // Derive brand name hint from inputs
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

    // Run Perplexity research + website scraping in parallel
    const [perplexityResult, scraped] = await Promise.all([
      researchBrand(brandHint, input.website, input.instagram),
      input.website ? scrapeBrandContent(input.website) : Promise.resolve(null),
    ]);

    // Perplexity research (rich web-sourced brand info)
    if (perplexityResult) {
      input._webResearch = perplexityResult.content;
      if (perplexityResult.sources.length > 0) {
        input._sources = perplexityResult.sources.slice(0, 5).join(', ');
      }
    }

    // Website scraping (direct brand content)
    if (scraped) {
      input._brandName = scraped.brandName;
      input._tagline = scraped.tagline;
      input._headings = scraped.headings.join(' | ');
      input._bodyContent = scraped.bodyContent;
      input._aboutContent = scraped.aboutContent;
      input._productDescriptions = scraped.productDescriptions.join('\n');
    }
  }

  // ── Trends: Perplexity research for real-time trend data ──
  if (type.startsWith('trends-')) {
    const trendType = type.replace('trends-', '') as 'global' | 'deep-dive' | 'live-signals' | 'competitors';
    const perplexityResult = await researchTrends(
      input.input || '',
      input.season,
      trendType,
    );
    if (perplexityResult) {
      input._webResearch = perplexityResult.content;
      if (perplexityResult.sources.length > 0) {
        input._sources = perplexityResult.sources.slice(0, 5).join(', ');
      }
    }
  }

  const prompt = buildCreativePrompt(type, input);
  if (!prompt) {
    return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 });
  }

  try {
    // consumer-assisted returns plain text; everything else returns JSON
    if (type === 'consumer-assisted') {
      const { text, model, fallback } = await generateText({
        system: prompt.system,
        user: prompt.user,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        language,
      });
      return NextResponse.json({ result: text.trim(), model, fallback });
    }

    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      language,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Creative generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
