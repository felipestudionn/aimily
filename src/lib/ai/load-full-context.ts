/**
 * Full Server-Side Context Loader
 *
 * Loads MAXIMUM context from all available sources for AI prompts.
 * This is the single source of truth — never depend on the frontend
 * to send context. The frontend can add user-specific input (direction,
 * preferences) but core collection intelligence comes from the DB.
 *
 * Sources (in priority order):
 *   1. CIS (buildPromptContext) — 11 DB tables + collection_decisions
 *   2. Creative workspace — full detail (proposals, narratives, keywords)
 *   3. Collection plan — name, season, productCategory
 *   4. Brief answers — the user's original input
 *
 * Used by: merch-generate, creative-generate, design-generate,
 *          content-strategy, copy, gtm, generate-skus, content-calendar, paid
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildPromptContext } from '@/lib/prompts/prompt-context';

export async function loadFullContext(collectionPlanId: string): Promise<Record<string, string>> {
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

  // Existing SKUs context
  if (promptCtx.skus?.length) {
    const skuSummary = promptCtx.skus.slice(0, 30).map(s =>
      `${s.name} (${s.family}${s.subcategory ? ` / ${s.subcategory}` : ''}) — €${s.pvp}`
    ).join('\n');
    ctx.existingSkus = skuSummary;
  }

  // Stories context
  if (promptCtx.stories?.length) {
    ctx.stories = promptCtx.stories.map(s =>
      `${s.name}: ${s.narrative} (mood: ${s.mood.join(', ')}, tone: ${s.tone})`
    ).join('\n\n');
  }

  // Brand voice
  if (promptCtx.brand_voice_config.personality) {
    ctx.brandVoice = [
      `Personality: ${promptCtx.brand_voice_config.personality}`,
      `Tone: ${promptCtx.brand_voice_config.tone}`,
      promptCtx.brand_voice_config.do_rules.length ? `Do: ${promptCtx.brand_voice_config.do_rules.join(', ')}` : '',
      promptCtx.brand_voice_config.dont_rules.length ? `Don't: ${promptCtx.brand_voice_config.dont_rules.join(', ')}` : '',
      promptCtx.brand_voice_config.vocabulary.length ? `Vocabulary: ${promptCtx.brand_voice_config.vocabulary.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  }

  // Drops
  if (promptCtx.drops?.length) {
    ctx.drops = promptCtx.drops.map(d =>
      `${d.name} (${d.launch_date}) — ${d.channels.join(', ')} — ${d.expected_sales_weight}% sales`
    ).join('\n');
  }

  // Sales & pricing
  if (promptCtx.total_sales_target) ctx.salesTarget = `€${promptCtx.total_sales_target.toLocaleString()}`;
  if (promptCtx.price_range.avg) {
    ctx.priceRange = `€${promptCtx.price_range.min}–€${promptCtx.price_range.max} (avg €${promptCtx.price_range.avg})`;
  }
  if (promptCtx.target_margin) ctx.targetMargin = `${promptCtx.target_margin}%`;

  // Content pillars
  if (promptCtx.content_pillars?.length) {
    ctx.contentPillars = promptCtx.content_pillars.map(p =>
      `${p.name}: ${p.description}`
    ).join('\n');
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
    if (!ctx.productCategory) {
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

    // Vibe — full narrative
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

/**
 * Merges server-loaded context with frontend input.
 * Server wins for core context fields. Frontend can add extra fields
 * (direction, referenceBrands, etc.) that don't exist server-side.
 */
export function mergeContextWithInput(serverCtx: Record<string, string>, input: Record<string, string>): void {
  for (const [key, val] of Object.entries(serverCtx)) {
    if (val && (!input[key] || input[key].trim() === '')) {
      input[key] = val;
    }
  }
}
