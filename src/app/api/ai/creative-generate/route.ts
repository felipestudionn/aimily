import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText } from '@/lib/ai/llm-client';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';
import { scrapeBrandContent } from '@/lib/brand-scraper';

/* ═══════════════════════════════════════════════════════════
   Creative Block — AI Generation Endpoint
   10 prompt types · Claude Haiku primary, Gemini fallback
   brand-extract: scrapes real content + LLM brand knowledge
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

  // ── Brand Extract: scrape website content + feed to LLM ──
  if (type === 'brand-extract') {
    if (input.website) {
      const scraped = await scrapeBrandContent(input.website);
      if (scraped) {
        input._brandName = scraped.brandName;
        input._tagline = scraped.tagline;
        input._headings = scraped.headings.join(' | ');
        input._bodyContent = scraped.bodyContent;
        input._aboutContent = scraped.aboutContent;
        input._productDescriptions = scraped.productDescriptions.join('\n');
      } else {
        input._scrapeFailed = 'true';
      }
    }
    if (input.instagram) {
      input._igHandle = input.instagram.replace(/^@/, '').replace(/\/$/, '');
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
