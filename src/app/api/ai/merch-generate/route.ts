import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildMerchPrompt } from '@/lib/ai/merch-prompts';
import { researchBrandPricing } from '@/lib/ai/perplexity-client';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';

/* ═══════════════════════════════════════════════════════════
   Merchandising Block — AI Generation Endpoint
   8 prompt types · Claude Haiku primary, Gemini fallback

   Context loaded SERVER-SIDE via loadFullContext (CIS + Creative
   workspace + Brief). DB is the single source of truth.
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'families-assisted'
  | 'families-proposals'
  | 'pricing-assisted'
  | 'pricing-proposals'
  | 'channels-assisted'
  | 'channels-proposals'
  | 'budget-assisted'
  | 'budget-proposals'
  | 'financial-plan-narrative';

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

  // SERVER-SIDE: Load FULL context from CIS + Creative + Brief (source of truth)
  if (collectionPlanId) {
    const serverCtx = await loadFullContext(collectionPlanId);
    mergeContextWithInput(serverCtx, input);
  }

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

    // CIS: capture merchandising AI decisions (fire-and-forget)
    if (collectionPlanId && data) {
      const { recordDecision } = await import('@/lib/collection-intelligence');
      recordDecision({
        collectionPlanId,
        domain: 'merchandising', subdomain: type.split('-')[0], key: `merch_${type}`,
        value: data,
        source: 'ai_recommendation',
        sourcePhase: 'merchandising', sourceComponent: 'MerchBlock',
        tags: ['affects_pricing', 'affects_production'],
        userId: user.id,
      }).catch((err: unknown) => console.error('[CIS] merch generation capture failed:', err));
    }

    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Merch generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
