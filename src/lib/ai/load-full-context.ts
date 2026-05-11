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
import { loadDerivedSetupData } from '@/lib/derive-setup-data';

export async function loadFullContext(collectionPlanId: string): Promise<Record<string, string>> {
  const ctx: Record<string, string> = {};

  // 1. CIS — the gold standard. Reads from collection_decisions + 11 DB tables
  const promptCtx = await buildPromptContext(collectionPlanId);
  ctx.collectionName = promptCtx.brand_name || '';
  ctx.season = promptCtx.season || '';

  // Consumer from CIS — proposals[] (per-segment cards) preferred when
  // available (set by Synthesis edits or future consumer mini-block
  // refactor). Falls back to the flat demographics/psychographics/
  // lifestyle text fields the legacy consumer block writes today.
  const proposalsArr = promptCtx.consumer_profile.proposals || [];
  const likedProposals = proposalsArr.filter(p => p.status !== 'rejected');
  if (likedProposals.length > 0) {
    ctx.consumer = likedProposals.map(p => `${p.title}\n${p.desc}`).join('\n\n');
  } else {
    // Block 1's closure pipeline writes the same multi-persona text into all
    // three target.* fields, so naive concatenation duplicates content 3x.
    // Dedupe by exact equality before joining.
    const consumerParts = Array.from(new Set([
      promptCtx.consumer_profile.demographics,
      promptCtx.consumer_profile.psychographics,
      promptCtx.consumer_profile.lifestyle,
    ].filter(Boolean)));
    if (consumerParts.length) ctx.consumer = consumerParts.join('\n');
  }

  // Vibe from CIS
  if (promptCtx.collection_vibe) ctx.vibe = promptCtx.collection_vibe;

  // Brand DNA from CIS — projected from user_brands by /api/brand-confirm
  const dnaParts = [
    promptCtx.brand_name ? `Brand: ${promptCtx.brand_name}` : '',
    promptCtx.brand_tagline ? `Tagline: ${promptCtx.brand_tagline}` : '',
    promptCtx.brand_dna.colors?.length
      ? `Palette: ${promptCtx.brand_dna.colors.map(c => `${c.name || ''} ${c.hex}${c.role ? ` (${c.role})` : ''}`.trim()).join(', ')}`
      : '',
    promptCtx.brand_dna.visual_identity ? `Visual Identity: ${promptCtx.brand_dna.visual_identity}` : '',
    promptCtx.brand_dna.voice.tone ? `Tone: ${promptCtx.brand_dna.voice.tone}` : '',
    promptCtx.brand_dna.voice.personality ? `Personality: ${promptCtx.brand_dna.voice.personality}` : '',
    promptCtx.brand_dna.voice.keywords?.length ? `Vocabulary: ${promptCtx.brand_dna.voice.keywords.join(', ')}` : '',
    promptCtx.brand_dna.voice.do?.length ? `Do: ${promptCtx.brand_dna.voice.do.join(' · ')}` : '',
    promptCtx.brand_dna.voice.doNot?.length ? `Don't: ${promptCtx.brand_dna.voice.doNot.join(' · ')}` : '',
    promptCtx.reference_brands?.length ? `Reference brands: ${promptCtx.reference_brands.join(', ')}` : '',
  ].filter(Boolean);
  if (dnaParts.length) ctx.brandDNA = dnaParts.join('\n');

  // Brand palette as structured JSON — consumed by prompt builders that
  // need per-color rationale + role (e.g. color-suggest uses brand palette
  // as the SOURCE of every proposal, with Sanzo Wada acting only as a
  // harmony helper, never as the dictating dictionary).
  if (promptCtx.brand_dna.colors?.length) {
    ctx.brandPalette = JSON.stringify(promptCtx.brand_dna.colors);
  }

  // Trends from CIS
  if (promptCtx.selected_trends?.length) ctx.trends = promptCtx.selected_trends.join('\n');

  // Moodboard from CIS
  if (promptCtx.moodboard_summary) ctx.moodboard = promptCtx.moodboard_summary;

  // Investigación de Mercado · per-lens results (S3 migration). Each
  // lens lands as a separate ctx key so downstream prompts can pull
  // exactly what they need (e.g., merch only wants macro_trends and
  // competitors; design wants deep_dive; marketing wants live_signals).
  // Format: "Title — brands · desc" per row.
  const fmtCard = (c: { title: string; brands?: string; desc: string }) =>
    `${c.title}${c.brands ? ' — ' + c.brands : ''}: ${c.desc}`;
  if (promptCtx.market_trends?.length) {
    ctx.market_trends = promptCtx.market_trends.map(fmtCard).join('\n\n');
  }
  if (promptCtx.market_deep_dive?.length) {
    ctx.market_deep_dive = promptCtx.market_deep_dive.map(fmtCard).join('\n\n');
  }
  if (promptCtx.market_live_signals?.length) {
    ctx.market_live_signals = promptCtx.market_live_signals.map(fmtCard).join('\n\n');
  }
  if (promptCtx.market_competitors?.length) {
    ctx.market_competitors = promptCtx.market_competitors.map(fmtCard).join('\n\n');
  }
  // Dim discriminator (Block 2 anti-leak): pricing prompts read
  // `market_competitors_input.competitors[]` ONLY (real benchmarks);
  // families / visual prompts may read `references[]` (aspirational
  // imagery codes — moodboard cousins). Surfaced as JSON so downstream
  // prompt builders can pick which list to interpolate.
  const ci = promptCtx.market_competitors_input;
  if (ci && (ci.competitors?.length || ci.references?.length)) {
    ctx.market_competitors_input = JSON.stringify(ci);
  }

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

  // 2. Collection plan — name + season + derived productCategory.
  // productCategory now comes from the DerivedSetupData loader (computed
  // on read from the merchandising workspace + SKU.category fallback) so
  // we always see live data, never a stale setup_data cache.
  const [{ data: plan }, derived] = await Promise.all([
    supabaseAdmin
      .from('collection_plans')
      .select('name, season')
      .eq('id', collectionPlanId)
      .single(),
    loadDerivedSetupData(collectionPlanId),
  ]);

  if (plan) {
    if (!ctx.collectionName) ctx.collectionName = plan.name || '';
    if (!ctx.season) ctx.season = plan.season || '';
  }
  ctx.productCategory = derived.productCategory || '';

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

  // (Brief workspace read removed 2026-05-06 alongside the brief endpoints —
  // no writer existed any more, so this block produced empty briefContext for
  // every collection. The canonical first input is now /new-collection +
  // walking the cube; the user's own words flow into the slot data directly.)

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
