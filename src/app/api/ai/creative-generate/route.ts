import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText } from '@/lib/ai/llm-client';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';
import { scrapeWebsite, scrapeInstagramProfile } from '@/lib/brand-scraper';

/* ═══════════════════════════════════════════════════════════
   Creative Block — AI Generation Endpoint
   10 prompt types · Claude Haiku primary, Gemini fallback
   brand-extract: scrapes website/IG first, feeds real data to LLM
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

  // ── Brand Extract: scrape real data before calling LLM ──
  if (type === 'brand-extract') {
    const scraped: string[] = [];

    // Scrape website and Instagram in parallel
    const [websiteData, igData] = await Promise.all([
      input.website ? scrapeWebsite(input.website) : Promise.resolve(null),
      input.instagram ? scrapeInstagramProfile(input.instagram) : Promise.resolve(null),
    ]);

    if (websiteData) {
      scraped.push(`=== WEBSITE DATA (${websiteData.url}) ===`);
      if (websiteData.title) scraped.push(`Title: ${websiteData.title}`);
      if (websiteData.description) scraped.push(`Description: ${websiteData.description}`);
      if (websiteData.headings.length) scraped.push(`Key headings: ${websiteData.headings.join(' | ')}`);
      if (websiteData.cssColors.length) scraped.push(`CSS colors found: ${websiteData.cssColors.join(', ')}`);
      if (websiteData.fontFamilies.length) scraped.push(`Fonts: ${websiteData.fontFamilies.join(', ')}`);
      if (websiteData.socialLinks.length) scraped.push(`Social links: ${websiteData.socialLinks.join(', ')}`);
      if (websiteData.metaKeywords.length) scraped.push(`Keywords: ${websiteData.metaKeywords.join(', ')}`);
      if (websiteData.textContent) scraped.push(`\nPage content:\n${websiteData.textContent}`);
    }

    if (igData) {
      scraped.push(`\n=== INSTAGRAM PROFILE ===`);
      if (igData.name) scraped.push(`Name: ${igData.name}`);
      if (igData.bio) scraped.push(`Bio: ${igData.bio}`);
      if (igData.followers) scraped.push(`Followers: ${igData.followers}`);
    }

    // Pass scraped content to prompt builder via input
    input._scrapedContent = scraped.length > 0
      ? scraped.join('\n')
      : 'NO DATA COULD BE SCRAPED — use your knowledge of the brand based on the name/handle.';
    input._hadWebsite = websiteData ? 'true' : 'false';
    input._hadInstagram = igData ? 'true' : 'false';
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
      });
      return NextResponse.json({ result: text.trim(), model, fallback });
    }

    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Creative generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
