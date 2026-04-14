import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildMerchPrompt } from '@/lib/ai/merch-prompts';
import { researchBrandPricing } from '@/lib/ai/perplexity-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildPromptContext } from '@/lib/prompts/prompt-context';

/* ═══════════════════════════════════════════════════════════
   Merchandising Block — AI Generation Endpoint
   8 prompt types · Claude Haiku primary, Gemini fallback
   Pricing-assisted: optional Perplexity research for reference brands

   CRITICAL: Context loaded SERVER-SIDE via buildPromptContext (CIS)
   + creative workspace + brief answers. The DB is the single source
   of truth. Frontend input only adds user direction/preferences.
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

/* ─── Full server-side context: CIS + Creative workspace + Brief ─── */
async function loadFullContext(collectionPlanId: string): Promise<Record<string, string>> {
  const ctx: Record<string, string> = {};

  // 1. CIS — the gold standard. Reads from collection_decisions + 11 DB tables
  const promptCtx = await buildPromptContext(collectionPlanId);
  ctx.collectionName = promptCtx.brand_name || '';
  ctx.season = promptCtx.season || '';

  // Consumer from CIS
  const consumerParts = [
    promptCtx.consumer_profile.demographics,
    promptCtx.consumer_profile.psychographics,
    promptCtx.consumer_profile.lifestyle,
  ].filter(Boolean);
  if (consumerParts.length) ctx.consumer = consumerParts.join('\n');

  // Vibe from CIS
  if (promptCtx.collection_vibe) ctx.vibe = promptCtx.collection_vibe;

  // Brand DNA from CIS
  const dnaParts = [
    promptCtx.brand_name ? `Brand: ${promptCtx.brand_name}` : '',
    promptCtx.brand_dna.visual_identity ? `Visual Identity: ${promptCtx.brand_dna.visual_identity}` : '',
    promptCtx.brand_dna.voice.tone ? `Tone: ${promptCtx.brand_dna.voice.tone}` : '',
    promptCtx.brand_dna.voice.personality ? `Personality: ${promptCtx.brand_dna.voice.personality}` : '',
    promptCtx.brand_dna.voice.keywords?.length ? `Keywords: ${promptCtx.brand_dna.voice.keywords.join(', ')}` : '',
    promptCtx.reference_brands?.length ? `Reference brands: ${promptCtx.reference_brands.join(', ')}` : '',
  ].filter(Boolean);
  if (dnaParts.length) ctx.brandDNA = dnaParts.join('\n');

  // Trends from CIS
  if (promptCtx.selected_trends?.length) ctx.trends = promptCtx.selected_trends.join('\n');

  // Moodboard from CIS
  if (promptCtx.moodboard_summary) ctx.moodboard = promptCtx.moodboard_summary;

  // Existing SKUs context (for pricing/budget that builds on families)
  if (promptCtx.skus?.length) {
    const skuSummary = promptCtx.skus.slice(0, 30).map(s =>
      `${s.name} (${s.family}${s.subcategory ? ` / ${s.subcategory}` : ''}) — €${s.pvp}`
    ).join('\n');
    ctx.existingSkus = skuSummary;
  }

  // 2. Collection plan — productCategory + setup_data extras
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season, setup_data')
    .eq('id', collectionPlanId)
    .single();

  if (plan) {
    if (!ctx.collectionName) ctx.collectionName = plan.name || '';
    if (!ctx.season) ctx.season = plan.season || '';
    const setupData = (plan.setup_data || {}) as Record<string, unknown>;
    ctx.productCategory = (setupData.productCategory as string) || '';

    // Fallback: infer category from existing SKUs
    if (!ctx.productCategory && promptCtx.skus?.length) {
      const firstSku = promptCtx.skus[0];
      // SKU category is stored on the sku object but not in SkuContext type,
      // so we query directly
      const { data: skuRow } = await supabaseAdmin
        .from('collection_skus')
        .select('category')
        .eq('collection_plan_id', collectionPlanId)
        .limit(1);
      if (skuRow?.[0]?.category) ctx.productCategory = skuRow[0].category;
    }
  }

  // 3. Creative workspace — FULL detail (CIS may only have summaries)
  const { data: creativeRow } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('data')
    .eq('collection_plan_id', collectionPlanId)
    .eq('workspace', 'creative')
    .single();

  if (creativeRow?.data) {
    const creative = creativeRow.data as { blockData?: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> };
    const bd = creative.blockData || {};

    // Consumer — full proposals (CIS may only have demographics summary)
    const proposals = (bd.consumer?.data?.proposals as Array<{ title: string; desc: string; status: string }>) || [];
    const liked = proposals.filter(p => p.status === 'liked');
    if (liked.length && !ctx.consumer) {
      ctx.consumer = liked.map(p => `${p.title}: ${p.desc}`).join('\n\n');
    }

    // Vibe — full narrative (CIS may only have title)
    const vibeTitle = (bd.vibe?.data?.vibeTitle as string) || '';
    const vibeNarrative = (bd.vibe?.data?.vibe as string) || '';
    const vibeKeywords = (bd.vibe?.data?.keywords as string) || '';
    const fullVibe = [vibeTitle, vibeNarrative, vibeKeywords ? `Keywords: ${vibeKeywords}` : ''].filter(Boolean).join('\n');
    if (fullVibe && (!ctx.vibe || fullVibe.length > ctx.vibe.length)) ctx.vibe = fullVibe;

    // Brand DNA — full detail
    const brand = bd['brand-dna']?.data || {};
    const fullDNA = [
      brand.brandName ? `Brand: ${brand.brandName}` : '',
      (brand.colors as string[])?.length ? `Colors: ${(brand.colors as string[]).join(', ')}` : '',
      brand.tone ? `Tone: ${brand.tone}` : '',
      brand.typography ? `Typography: ${brand.typography}` : '',
      brand.style ? `Visual Identity: ${brand.style}` : '',
    ].filter(Boolean).join('\n');
    if (fullDNA && (!ctx.brandDNA || fullDNA.length > ctx.brandDNA.length)) ctx.brandDNA = fullDNA;

    // Trends — full selected results with descriptions
    const trendParts: string[] = [];
    for (const blockId of ['global-trends', 'deep-dive', 'live-signals']) {
      const results = (bd[blockId]?.data?.results as Array<{ title: string; brands?: string; desc: string; selected?: boolean }>) || [];
      results.filter(r => r.selected).forEach(r => {
        trendParts.push(`${r.title}${r.brands ? ` (${r.brands})` : ''}: ${r.desc}`);
      });
    }
    if (trendParts.length) ctx.trends = trendParts.join('\n\n');

    // Moodboard — image analysis and keywords
    const moodboardAnalysis = (bd.moodboard?.data?.analysis as string) || '';
    const moodboardKeywords = (bd.moodboard?.data?.keywords as string[]) || [];
    if (moodboardAnalysis || moodboardKeywords.length) {
      ctx.moodboard = [moodboardAnalysis, moodboardKeywords.length ? `Keywords: ${moodboardKeywords.join(', ')}` : ''].filter(Boolean).join('\n');
    }

    // Creative Synthesis — the final validated output of Block 1
    const synthesis = bd._synthesis?.data || {};
    const synthParts = [
      synthesis.summary ? `Creative Synthesis: ${synthesis.summary}` : '',
      synthesis.keyDecisions ? `Key Decisions: ${synthesis.keyDecisions}` : '',
    ].filter(Boolean);
    if (synthParts.length) ctx.creativeSynthesis = synthParts.join('\n');
  }

  // 4. Brief answers — the original user input that started everything
  const { data: briefRow } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('data')
    .eq('collection_plan_id', collectionPlanId)
    .eq('workspace', 'brief')
    .single();

  if (briefRow?.data) {
    const briefData = briefRow.data as Record<string, unknown>;
    const answers = (briefData.answers || briefData.understood || {}) as Record<string, string>;
    const answerParts = Object.entries(answers)
      .filter(([, v]) => v && typeof v === 'string' && v.trim())
      .map(([k, v]) => `${k}: ${v}`);
    if (answerParts.length) ctx.briefContext = answerParts.join('\n');
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

  // SERVER-SIDE: Load FULL context from CIS + Creative + Brief (source of truth)
  if (collectionPlanId) {
    const serverCtx = await loadFullContext(collectionPlanId);
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
