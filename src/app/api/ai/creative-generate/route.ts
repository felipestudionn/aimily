import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText } from '@/lib/ai/llm-client';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';

/* ═══════════════════════════════════════════════════════════
   Creative Block — AI Generation Endpoint
   10 prompt types · Claude Haiku primary, Gemini fallback
   brand-extract: uses LLM knowledge of the brand directly
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

  // ── Brand Extract: derive brand name from inputs for LLM knowledge lookup ──
  if (type === 'brand-extract') {
    // Extract brand name from website URL or Instagram handle
    // The LLM uses its own knowledge of the brand — no scraping needed
    if (!input.brandName) {
      if (input.website) {
        // Extract domain name as brand hint (e.g., "karllagerfeld.com" → "Karl Lagerfeld")
        try {
          const hostname = new URL(
            input.website.startsWith('http') ? input.website : 'https://' + input.website
          ).hostname.replace('www.', '');
          input._brandHint = hostname;
        } catch { input._brandHint = input.website; }
      }
      if (input.instagram) {
        input._igHandle = input.instagram.replace(/^@/, '').replace(/\/$/, '');
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
