/**
 * AI creative direction discovery.
 *
 * Per roadmap_aimily-strategy-paso-2-3-2026-05-16.md §2.1: when a Strategy
 * tenant doesn't have a creative brief in flight, we can synthesise a
 * draft by combining:
 *
 *   1. Brand DNA  → tenant_brand_profile OR auto-discovered via
 *                   researchBrand() (Perplexity Search) — reused from
 *                   Block 1's brand-from-external pipeline.
 *
 *   2. Trends     → researchTrends() (Perplexity Sonar) for the current
 *                   season + the families that dominate the latest run.
 *
 *   3. Portfolio winners → top carryover/peak/mature SKUs from the latest
 *                   completed run, fed in as "ground truth" for the
 *                   creative synthesis.
 *
 *   4. Claude     → generateJSON() composes a DraftCreativeBrief shape
 *                   matching `strategy_creative_briefs` columns so the
 *                   user can accept it with one click.
 *
 * The draft is NOT persisted by this function — the API endpoint surfaces
 * it for review. Persistence happens only when the user accepts.
 *
 * Standalone-mode safety: if `researchBrand` is unavailable (no
 * PERPLEXITY_API_KEY) or both inputs (brand profile + auto-discovery) come
 * up empty, the discovery still proceeds with what context we have. The
 * draft will be conservative; we surface that via `data_sufficiency_warning`.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  loadStrategyTenantContext,
  formatContextForPrompt,
  type StrategyTenantContext,
  type TenantBrandProfile,
} from './context-loader';
import { generateJSON } from '@/lib/ai/llm-client';
import { researchBrand, researchTrends } from '@/lib/ai/perplexity-client';

export interface DraftCreativeBrief {
  name: string;
  description: string;
  color_story: string[];
  archetypes_focus: string[];
  family_pivot: Record<string, number>;
  silhouette_preferences: {
    favored?: string[];
    deprioritized?: string[];
  };
  material_direction: {
    favored?: string[];
    deprioritized?: string[];
  };
  customer_segment_shift: string | null;
  creative_narrative: string;
  data_sufficiency_warning: string | null;
  sources: {
    brand_profile_used: boolean;
    brand_profile_auto_discovered: boolean;
    trends_count: number;
    winners_count: number;
    families_count: number;
  };
  raw_inputs: {
    perplexity_brand_summary?: string;
    perplexity_trends_titles?: string[];
  };
}

export interface MoodboardInput {
  /** Base64-encoded images (without data: prefix). Max 8 per call. */
  images?: Array<{ base64: string; mimeType: string }>;
  /** Public image URLs (Supabase Storage signed URLs, Pinterest pin images, etc.). Server fetches them. */
  imageUrls?: string[];
}

export interface MoodboardAnalysis {
  keyColors: string[];
  keyMaterials: string[];
  keySilhouettes: string[];
  keyArchetypes: string[];
  keyMoodAdjectives: string[];
  moodDescription: string;
  targetCustomerHint: string;
  detectedBrandReferences: string[];
}

/** A pill validated by the user in CreativeBlock · the user's explicit
 *  creative intent. Synthesis treats these as HARD constraints that must
 *  appear in the brief output. */
export interface SelectedTrend {
  /** Dimension the user validated under. */
  dimension: 'silhouette' | 'pattern' | 'color' | 'material' | 'reference_brand';
  /** Short title visible in the UI ("Vestido midi al bies", "Bone", "Bouclé wool", "Khaite"). */
  title: string;
  /** Optional spec / hex / description (color hex code for color dim). */
  product_spec?: string;
  color_hex?: string;
  color_name?: string;
}

export interface DiscoverCreativeBriefOptions {
  tenantId: string;
  /** When supplied, the moodboard becomes the PRIMARY input. Brand DNA + trends still feed the synthesis as supporting context. */
  moodboard?: MoodboardInput;
  /** Pills the user explicitly validated in the CreativeBlock UI. The
   *  synthesis treats these as HARD constraints: color pills MUST land in
   *  color_story, silhouette pills MUST land in silhouette_preferences.favored,
   *  etc. Without this, the LLM would freely re-synthesise from moodboard
   *  + brand DNA + trends and the user's validation work would be lost. */
  selectedTrends?: SelectedTrend[];
  season?: string;
  language?: 'en' | 'es';
}

export interface DiscoverCreativeBriefResult {
  draft: DraftCreativeBrief;
  moodboard_analysis: MoodboardAnalysis | null;
  context_used: {
    has_brand_profile: boolean;
    has_active_brief: boolean;
    latest_run_id: string | null;
    top_family_codes: string[];
    top_winner_count: number;
    moodboard_image_count: number;
  };
}

/**
 * Vision analysis of an uploaded moodboard. Mirrors Block 1's
 * `/api/ai/analyze-moodboard` flow: Claude Sonnet 4 vision over batched
 * images (max 8). Produces a tight structured shape that the Strategy
 * brief synthesizer can fold into a DraftCreativeBrief.
 *
 * Accepts either base64 images directly OR public image URLs that we
 * fetch server-side. Returns null if all images fail to load.
 */
async function analyzeMoodboard(
  moodboard: MoodboardInput,
  language?: 'en' | 'es'
): Promise<MoodboardAnalysis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Resolve URLs → base64 server-side (same pattern as analyze-moodboard).
  const fromBase64 = moodboard.images ?? [];
  let fromUrls: Array<{ base64: string; mimeType: string }> = [];
  if (moodboard.imageUrls && moodboard.imageUrls.length > 0) {
    const fetched = await Promise.all(
      moodboard.imageUrls.slice(0, 12).map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const buf = Buffer.from(await res.arrayBuffer());
          const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
          if (!/^image\//i.test(mimeType)) return null;
          return { base64: buf.toString('base64'), mimeType };
        } catch {
          return null;
        }
      })
    );
    fromUrls = fetched.filter((x): x is { base64: string; mimeType: string } => x !== null);
  }
  const images = [...fromBase64, ...fromUrls].slice(0, 8);
  if (images.length === 0) return null;

  const lang = language === 'es' ? 'Spanish (Castilian)' : 'English';
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `You are a senior creative director decoding a fashion moodboard. Extract structured design codes only. No prose, no markdown fences. Output language: ${lang}.`;

  const userText = `These are ${images.length} reference images from a fashion moodboard. Decode the visual signals into structured creative codes. Be SPECIFIC — name real construction techniques, real brands when relevant, Pantone-style color names with hex when possible.

# SCHEMA (emit one JSON object)
{
  "keyColors": ["3-7 color names with hex, e.g. 'Dusty Rose (#DCAE96)'"],
  "keyMaterials": ["3-6 specific material descriptions, e.g. 'Bouclé wool 320gsm', 'Silk crêpe de chine'"],
  "keySilhouettes": ["3-6 silhouette descriptions, e.g. 'Cropped boxy blazer, raglan sleeve', 'Bias-cut midi slip dress'"],
  "keyArchetypes": ["2-4 from this list: editorial-heritage, minimal-architect, streetwear-drop, romantic-feminine, resort-luxe, sustainable-craft, workwear-heritage, performance-tech, y2k-digital-native, avant-garde-concept"],
  "keyMoodAdjectives": ["4-8 adjectives that describe the emotional tone"],
  "moodDescription": "2-3 sentences capturing the overall mood and direction",
  "targetCustomerHint": "1 sentence describing the consumer this moodboard speaks to",
  "detectedBrandReferences": ["real brand names that the styling/aesthetic visually references, max 5; empty array if none clear"]
}

Begin output now with the JSON object.`;

  const content: any[] = images.map((img) => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
  }));
  content.push({ type: 'text', text: userText });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content }],
    });
    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;
    const text = textBlock.text;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) return null;
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
    return {
      keyColors: Array.isArray(parsed.keyColors) ? parsed.keyColors.filter(Boolean) : [],
      keyMaterials: Array.isArray(parsed.keyMaterials) ? parsed.keyMaterials.filter(Boolean) : [],
      keySilhouettes: Array.isArray(parsed.keySilhouettes) ? parsed.keySilhouettes.filter(Boolean) : [],
      keyArchetypes: Array.isArray(parsed.keyArchetypes) ? parsed.keyArchetypes.filter(Boolean) : [],
      keyMoodAdjectives: Array.isArray(parsed.keyMoodAdjectives) ? parsed.keyMoodAdjectives.filter(Boolean) : [],
      moodDescription: typeof parsed.moodDescription === 'string' ? parsed.moodDescription : '',
      targetCustomerHint: typeof parsed.targetCustomerHint === 'string' ? parsed.targetCustomerHint : '',
      detectedBrandReferences: Array.isArray(parsed.detectedBrandReferences) ? parsed.detectedBrandReferences.filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

/**
 * Auto-discover the tenant brand profile when none exists yet. Uses
 * `researchBrand()` (Perplexity Search + Claude synthesis pattern from
 * Block 1) and persists the result on `strategy_tenants.tenant_brand_profile`.
 */
async function autoDiscoverBrandProfile(
  ctx: StrategyTenantContext
): Promise<{ profile: TenantBrandProfile; raw_summary: string } | null> {
  const brandRef = ctx.tenant.legal_name || ctx.tenant.display_name;
  if (!brandRef) return null;
  if (!process.env.PERPLEXITY_API_KEY) return null;

  const research = await researchBrand(brandRef);
  if (!research || !research.content) return null;

  // Synthesise the BrandIdentityProposal shape via Claude. We use a tight
  // prompt focused on the BRAND_PROFILE schema only (no creative brief
  // logic, that happens later). Reuses the same LLM client as Block 1.
  const system = `You are a brand strategist analysing a fashion brand from external web research. Output ONLY structured JSON matching the schema. No prose, no markdown fences.`;
  const user = `Below is web research from Perplexity about the brand "${brandRef}". Extract the brand DNA into the schema. Use null for any field that is not evidenced in the research.

WEB RESEARCH:
${research.content.slice(0, 6000)}

SOURCES (for grounding only, do not list in output):
${research.sources.slice(0, 8).join('\n')}

SCHEMA (emit one JSON object matching this shape, no prose):
{
  "brand_archetype": "one-of: minimal-architect | editorial-heritage | streetwear-drop | romantic-feminine | resort-luxe | sustainable-craft | workwear-heritage | performance-tech | y2k-digital-native | avant-garde-concept | unknown",
  "brand_values": ["3-5 brand values"],
  "tone_of_voice": "one sentence",
  "visual_anchors": {
    "colors": [{ "name": "...", "hex": "#RRGGBB" }],
    "typography": ["..."],
    "photography_style": "one sentence"
  },
  "target_consumer_hint": "one sentence describing the consumer",
  "positioning": "one sentence on positioning"
}`;

  try {
    const { data } = await generateJSON<TenantBrandProfile>({
      system,
      user,
      temperature: 0.3,
    });
    // Persist on the tenant for future runs.
    await supabaseAdmin
      .from('strategy_tenants')
      .update({ tenant_brand_profile: data })
      .eq('id', ctx.tenant.id);
    return { profile: data, raw_summary: research.content.slice(0, 800) };
  } catch {
    return null;
  }
}

export async function discoverCreativeBrief(
  opts: DiscoverCreativeBriefOptions
): Promise<DiscoverCreativeBriefResult> {
  let ctx = await loadStrategyTenantContext(opts.tenantId);
  if (!ctx) throw new Error(`Tenant ${opts.tenantId} not found`);

  const warnings: string[] = [];

  // ── Step 0 · Moodboard analysis (vision-driven, PRIMARY when supplied) ─
  // When the user uploads a moodboard / pastes Pinterest URLs, the moodboard
  // becomes the primary creative input. Trend research still runs as
  // supporting context but the synthesis prefers what the user can SEE.
  let moodboardAnalysis: MoodboardAnalysis | null = null;
  const moodboardImageCount =
    (opts.moodboard?.images?.length ?? 0) + (opts.moodboard?.imageUrls?.length ?? 0);
  if (moodboardImageCount > 0) {
    moodboardAnalysis = await analyzeMoodboard(opts.moodboard!, opts.language);
    if (!moodboardAnalysis) {
      warnings.push(
        'Moodboard provided but vision analysis failed (could not load images or model returned malformed output). Falling back to brand-DNA-driven discovery.'
      );
    }
  }

  // ── Step 1 · Brand DNA ────────────────────────────────────────────────
  let autoDiscovered = false;
  let perplexityBrandSummary: string | undefined;
  if (!ctx.has_brand_profile) {
    const discovered = await autoDiscoverBrandProfile(ctx);
    if (discovered) {
      autoDiscovered = true;
      perplexityBrandSummary = discovered.raw_summary;
      // Reload context so the brand profile is now present.
      ctx = (await loadStrategyTenantContext(opts.tenantId)) ?? ctx;
    } else {
      warnings.push(
        'Brand DNA could not be auto-discovered. Add a tenant_brand_profile manually for sharper creative direction.'
      );
    }
  }

  // ── Step 2 · Trend research ──────────────────────────────────────────
  let trendsTitles: string[] = [];
  let trendsBlock = '';
  if (process.env.PERPLEXITY_API_KEY && ctx.top_families.length > 0) {
    const familyHint = ctx.top_families
      .slice(0, 3)
      .map((f) => f.family_code)
      .join(', ');
    try {
      const trendQuery = `${familyHint} fashion trends`;
      const trends = await researchTrends(
        trendQuery,
        opts.season,
        'global',
        {
          collectionName: ctx.tenant.display_name,
          consumer: ctx.brand_profile.target_consumer_hint || undefined,
        }
      );
      if (trends && trends.results) {
        trendsTitles = trends.results.slice(0, 12).map((t) => t.title);
        trendsBlock = trends.results
          .slice(0, 12)
          .map((t) => `- [${t.dimension ?? 'theme'}] ${t.title}: ${t.desc}${t.hex ? ` · ${t.hex}` : ''}`)
          .join('\n');
      }
    } catch {
      warnings.push('Trend research call to Perplexity failed; draft will rely on portfolio winners only.');
    }
  } else if (!process.env.PERPLEXITY_API_KEY) {
    warnings.push('PERPLEXITY_API_KEY not configured — trend signals unavailable.');
  }

  // ── Step 3 · Claude synthesis ────────────────────────────────────────
  const contextBlock = formatContextForPrompt(ctx);
  const archetypes = ctx.taxonomies.archetypes.length > 0
    ? ctx.taxonomies.archetypes
    : [
        'editorial-heritage',
        'minimal-architect',
        'streetwear-drop',
        'romantic-feminine',
        'resort-luxe',
        'sustainable-craft',
        'workwear-heritage',
        'performance-tech',
        'y2k-digital-native',
        'avant-garde-concept',
      ];

  const colorVocabulary = Object.values(ctx.taxonomies.color_code_to_name || {});

  const lang = opts.language === 'es' ? 'Spanish (Castilian)' : 'English';

  const system = `You are a senior fashion merchandiser + brand strategist synthesising a creative direction brief from real portfolio performance + brand DNA + market trends. You emit ONLY structured JSON matching the schema. No prose, no markdown fences. Output language: ${lang}.`;

  const moodboardBlock = moodboardAnalysis
    ? `# Moodboard analysis (PRIMARY INPUT — visual signals from ${moodboardImageCount} reference image${moodboardImageCount === 1 ? '' : 's'})
- Mood: ${moodboardAnalysis.moodDescription}
- Target customer signal: ${moodboardAnalysis.targetCustomerHint}
- Colors visible: ${moodboardAnalysis.keyColors.join(', ')}
- Materials visible: ${moodboardAnalysis.keyMaterials.join(', ')}
- Silhouettes visible: ${moodboardAnalysis.keySilhouettes.join(', ')}
- Archetypes detected: ${moodboardAnalysis.keyArchetypes.join(', ')}
- Mood adjectives: ${moodboardAnalysis.keyMoodAdjectives.join(', ')}
${moodboardAnalysis.detectedBrandReferences.length > 0 ? `- Brand references in the styling: ${moodboardAnalysis.detectedBrandReferences.join(', ')}` : ''}
`
    : '';

  const synthesisGuidance = moodboardAnalysis
    ? `MOODBOARD-DRIVEN MODE:
- The moodboard above is the PRIMARY direction. color_story and silhouette_preferences must REFLECT what was extracted from the images.
- Use brand DNA + portfolio winners + trend signals to GROUND the moodboard codes against business reality. If the moodboard pushes hard away from a top family, surface that as a family_pivot tension.
- creative_narrative must explicitly reference what's visible in the moodboard (e.g. "the bias-cut midi silhouettes + bouclé references signal a romantic-feminine pivot into tailored knit").`
    : `DATA-DRIVEN MODE (no moodboard supplied):
- Build the direction on portfolio winners + brand DNA + trend signals.
- Conservative: prefer small pivots over bold ones when data is thin.`;

  // Group the user-validated pills by dimension so the prompt can demand
  // each set lands in the right brief field. These are HARD constraints —
  // the user's explicit creative intent overrides what moodboard analysis
  // or trend signals might otherwise want to propose.
  const selectedByDim = {
    silhouette: [] as SelectedTrend[],
    pattern: [] as SelectedTrend[],
    color: [] as SelectedTrend[],
    material: [] as SelectedTrend[],
    reference_brand: [] as SelectedTrend[],
  };
  for (const s of opts.selectedTrends || []) {
    if (s.dimension in selectedByDim) selectedByDim[s.dimension].push(s);
  }
  const totalSelected = (opts.selectedTrends || []).length;
  const userSelectionsBlock =
    totalSelected > 0
      ? `# USER-VALIDATED SIGNALS (HARD CONSTRAINTS · ${totalSelected} pills)
The user explicitly clicked these pills in the CreativeBlock UI. They override moodboard / trends / brand-DNA inferences for the corresponding brief fields. Your output MUST honor every selection in the exact field listed below.

${selectedByDim.color.length > 0 ? `## Colors validated (→ color_story; preserve order)
${selectedByDim.color.map((c) => `- ${c.color_name ?? c.title}${c.color_hex ? ` (${c.color_hex})` : ''}`).join('\n')}
` : ''}
${selectedByDim.silhouette.length > 0 ? `## Silhouettes validated (→ silhouette_preferences.favored verbatim, in order)
${selectedByDim.silhouette.map((s) => `- ${s.title}${s.product_spec ? ` · ${s.product_spec}` : ''}`).join('\n')}
` : ''}
${selectedByDim.material.length > 0 ? `## Materials validated (→ material_direction.favored verbatim, in order)
${selectedByDim.material.map((m) => `- ${m.title}${m.product_spec ? ` · ${m.product_spec}` : ''}`).join('\n')}
` : ''}
${selectedByDim.pattern.length > 0 ? `## Patterns validated (→ surface in creative_narrative as pattern direction)
${selectedByDim.pattern.map((p) => `- ${p.title}${p.product_spec ? ` · ${p.product_spec}` : ''}`).join('\n')}
` : ''}
${selectedByDim.reference_brand.length > 0 ? `## Reference brands validated (→ name explicitly in creative_narrative)
${selectedByDim.reference_brand.map((b) => `- ${b.title}`).join('\n')}
` : ''}`
      : '';

  const user = `Synthesise a DRAFT creative direction brief that:
- ${totalSelected > 0 ? 'RESPECTS the USER-VALIDATED SIGNALS section below as hard constraints.' : moodboardAnalysis ? 'Reflects the MOODBOARD codes as the primary direction.' : 'Builds on the top winners as the primary direction.'}
- Stays grounded in the TOP WINNING SKUs and FAMILIES (do not contradict the data without explaining).
- Aligns with the BRAND DNA (if available).
- Reflects the CURRENT TREND SIGNALS (if available) without slavishly chasing them.
- Surfaces 1-3 family pivots (positive or negative) the merchandiser should consider.
- Proposes a tight color story (3-5 colors).
- Proposes 2-4 archetype focuses from the available vocabulary.
- Writes a 3-4 sentence creative narrative explaining the strategic intent.

${synthesisGuidance}

${userSelectionsBlock}

${moodboardBlock}

${contextBlock}

${trendsBlock ? `# Current trend signals (Perplexity Sonar, ${trendsTitles.length})\n${trendsBlock}\n` : ''}

# Archetype vocabulary (use these names verbatim where applicable)
${archetypes.join(', ')}

${colorVocabulary.length > 0 ? `# Color vocabulary (tenant taxonomy, prefer these names)\n${colorVocabulary.slice(0, 30).join(', ')}\n` : ''}

# SCHEMA (emit one JSON object matching this shape)
{
  "name": "concise brief name, ≤8 words",
  "description": "one-sentence summary of the direction",
  "color_story": ["3-5 color names, prefer the tenant vocabulary when applicable"],
  "archetypes_focus": ["2-4 archetypes from the vocabulary"],
  "family_pivot": { "FAMILY_CODE": 0.15 },   // 1-3 entries; positive = pivot INTO, negative = pivot AWAY
  "silhouette_preferences": { "favored": ["..."], "deprioritized": ["..."] },
  "material_direction": { "favored": ["..."], "deprioritized": ["..."] },
  "customer_segment_shift": "one sentence OR null",
  "creative_narrative": "3-4 sentences explaining the strategic intent and how it builds on the data"
}

CRITICAL RULES:
- family_pivot keys MUST be exact family_code strings from the "Top families" section above.
- family_pivot values are decimals in [-0.5, +0.5].
- Never propose a family_pivot that contradicts the data without explaining why in creative_narrative.
- color_story must include at least one anchor color drawn from current top-winner colors.
- Stay grounded. If data is thin, prefer SMALL pivots over bold ones.
${totalSelected > 0 ? `- HARD CONSTRAINT: every entry in USER-VALIDATED SIGNALS lands in the corresponding brief field. Do NOT silently drop a user selection. You MAY add 1-2 complementary items to color_story / silhouette_preferences / material_direction beyond what the user validated, but the user's selections come first and you must reference at least one validated reference_brand in creative_narrative when any are listed.` : ''}

Begin output now with the JSON object.`;

  let synthesis: any;
  try {
    const result = await generateJSON<any>({
      system,
      user,
      temperature: 0.6,
      language: opts.language,
    });
    synthesis = result.data;
  } catch (err: any) {
    throw new Error(`Creative discovery LLM call failed: ${err?.message || String(err)}`);
  }

  const draft: DraftCreativeBrief = {
    name: synthesis.name ?? 'AI-discovered direction',
    description: synthesis.description ?? '',
    color_story: Array.isArray(synthesis.color_story) ? synthesis.color_story.filter(Boolean) : [],
    archetypes_focus: Array.isArray(synthesis.archetypes_focus)
      ? synthesis.archetypes_focus.filter(Boolean)
      : [],
    family_pivot:
      typeof synthesis.family_pivot === 'object' && synthesis.family_pivot
        ? (Object.fromEntries(
            (Object.entries(synthesis.family_pivot as Record<string, unknown>)
              .filter(
                ([k, v]) => typeof k === 'string' && typeof v === 'number'
              ) as Array<[string, number]>).slice(0, 5)
          ) as Record<string, number>)
        : {},
    silhouette_preferences:
      typeof synthesis.silhouette_preferences === 'object' && synthesis.silhouette_preferences
        ? synthesis.silhouette_preferences
        : {},
    material_direction:
      typeof synthesis.material_direction === 'object' && synthesis.material_direction
        ? synthesis.material_direction
        : {},
    customer_segment_shift:
      synthesis.customer_segment_shift ??
      moodboardAnalysis?.targetCustomerHint ??
      null,
    creative_narrative: synthesis.creative_narrative ?? '',
    data_sufficiency_warning: warnings.length > 0 ? warnings.join(' / ') : null,
    sources: {
      brand_profile_used: ctx.has_brand_profile,
      brand_profile_auto_discovered: autoDiscovered,
      trends_count: trendsTitles.length,
      winners_count: ctx.top_winners.length,
      families_count: ctx.top_families.length,
    },
    raw_inputs: {
      perplexity_brand_summary: perplexityBrandSummary,
      perplexity_trends_titles: trendsTitles.length > 0 ? trendsTitles : undefined,
    },
  };

  return {
    draft,
    moodboard_analysis: moodboardAnalysis,
    context_used: {
      has_brand_profile: ctx.has_brand_profile,
      has_active_brief: ctx.active_brief != null,
      latest_run_id: ctx.latest_run?.id ?? null,
      top_family_codes: ctx.top_families.map((f) => f.family_code),
      top_winner_count: ctx.top_winners.length,
      moodboard_image_count: moodboardImageCount,
    },
  };
}
