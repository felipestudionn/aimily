import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildMerchPrompt } from '@/lib/ai/merch-prompts';
import { researchBrandPricing } from '@/lib/ai/perplexity-client';

/* ═══════════════════════════════════════════════════════════
   Merchandising Block — AI Generation Endpoint
   8 prompt types · Claude Haiku primary, Gemini fallback
   Pricing-assisted: optional Perplexity research for reference brands
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'families-assisted'
  | 'families-proposals'
  | 'pricing-assisted'
  | 'pricing-proposals'
  | 'channels-assisted'
  | 'channels-proposals'
  | 'budget-assisted'
  | 'budget-proposals';

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

  // If pricing-assisted has reference brands, research their pricing first
  if (type === 'pricing-assisted' && input.referenceBrands) {
    const brands = input.referenceBrands.split(',').map(b => b.trim()).filter(Boolean);
    if (brands.length > 0) {
      const pricingResearch = await researchBrandPricing(brands, input.families);
      if (pricingResearch) {
        input.pricingResearch = pricingResearch;
      }
    }
  }

  const prompt = buildMerchPrompt(type, input);
  if (!prompt) {
    return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 });
  }

  try {
    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      language,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Merch generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
