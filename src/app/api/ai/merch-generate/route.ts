import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildMerchPrompt } from '@/lib/ai/merch-prompts';
import { researchBrandPricing } from '@/lib/ai/perplexity-client';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ═══════════════════════════════════════════════════════════
   Merchandising Block — AI Generation Endpoint
   8 prompt types · Claude Haiku primary, Gemini fallback
   Pricing-assisted: optional Perplexity research for reference brands

   CRITICAL: Context is loaded SERVER-SIDE from the database,
   not from the frontend. The frontend input is merged but the
   DB is the source of truth for creative block data, product
   category, season, etc. This ensures AI always has full context.
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

/* ─── Server-side context loader ─── */
async function loadCollectionContext(collectionPlanId: string): Promise<Record<string, string>> {
  const ctx: Record<string, string> = {};

  // 1. Collection plan — name, season, productCategory
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season, setup_data')
    .eq('id', collectionPlanId)
    .single();

  if (plan) {
    ctx.collectionName = plan.name || '';
    ctx.season = plan.season || '';
    const setupData = (plan.setup_data || {}) as Record<string, unknown>;
    ctx.productCategory = (setupData.productCategory as string) || '';

    // Fallback: infer category from existing SKUs
    if (!ctx.productCategory) {
      const { data: skus } = await supabaseAdmin
        .from('collection_skus')
        .select('category')
        .eq('collection_plan_id', collectionPlanId)
        .limit(1);
      if (skus?.[0]?.category) ctx.productCategory = skus[0].category;
    }
  }

  // 2. Creative block — consumer, vibe, brand DNA, trends
  const { data: creativeRow } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('data')
    .eq('collection_plan_id', collectionPlanId)
    .eq('workspace', 'creative')
    .single();

  if (creativeRow?.data) {
    const creative = creativeRow.data as { blockData?: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> };
    const bd = creative.blockData || {};

    // Consumer — extract liked profiles
    const proposals = (bd.consumer?.data?.proposals as Array<{ title: string; desc: string; status: string }>) || [];
    const liked = proposals.filter(p => p.status === 'liked');
    ctx.consumer = liked.map(p => `${p.title}: ${p.desc}`).join('\n\n');

    // Vibe
    const vibeTitle = (bd.vibe?.data?.vibeTitle as string) || '';
    const vibeNarrative = (bd.vibe?.data?.vibe as string) || '';
    const vibeKeywords = (bd.vibe?.data?.keywords as string) || '';
    ctx.vibe = [vibeTitle, vibeNarrative, vibeKeywords ? `Keywords: ${vibeKeywords}` : ''].filter(Boolean).join('\n');

    // Brand DNA
    const brand = bd['brand-dna']?.data || {};
    ctx.brandDNA = [
      brand.brandName ? `Brand: ${brand.brandName}` : '',
      (brand.colors as string[])?.length ? `Colors: ${(brand.colors as string[]).join(', ')}` : '',
      brand.tone ? `Tone: ${brand.tone}` : '',
      brand.typography ? `Typography: ${brand.typography}` : '',
      brand.style ? `Visual Identity: ${brand.style}` : '',
    ].filter(Boolean).join('\n');

    // Trends — selected results from research blocks
    const trendParts: string[] = [];
    for (const blockId of ['global-trends', 'deep-dive', 'live-signals']) {
      const results = (bd[blockId]?.data?.results as Array<{ title: string; brands?: string; desc: string; selected?: boolean }>) || [];
      results.filter(r => r.selected).forEach(r => {
        trendParts.push(`${r.title}${r.brands ? ` (${r.brands})` : ''}: ${r.desc}`);
      });
    }
    ctx.trends = trendParts.join('\n\n');
  }

  return ctx;
}

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

  // SERVER-SIDE: Load context from DB (source of truth), merge with frontend input
  if (collectionPlanId) {
    const serverCtx = await loadCollectionContext(collectionPlanId);
    // Server wins for core context fields — frontend can add extra fields (direction, referenceBrands, etc.)
    for (const [key, val] of Object.entries(serverCtx)) {
      if (val && (!input[key] || input[key].trim() === '')) {
        input[key] = val;
      }
    }
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
