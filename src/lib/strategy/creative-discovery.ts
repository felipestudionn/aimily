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

export interface DiscoverCreativeBriefOptions {
  tenantId: string;
  season?: string;
  language?: 'en' | 'es';
}

export interface DiscoverCreativeBriefResult {
  draft: DraftCreativeBrief;
  context_used: {
    has_brand_profile: boolean;
    has_active_brief: boolean;
    latest_run_id: string | null;
    top_family_codes: string[];
    top_winner_count: number;
  };
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

  const user = `Synthesise a DRAFT creative direction brief that:
- Builds on the TOP WINNING SKUs and FAMILIES in this tenant's current portfolio (do not contradict the data).
- Aligns with the BRAND DNA (if available).
- Reflects the CURRENT TREND SIGNALS (if available) without slavishly chasing them.
- Surfaces 1-3 family pivots (positive or negative) the merchandiser should consider.
- Proposes a tight color story (3-5 colors).
- Proposes 2-4 archetype focuses from the available vocabulary.
- Writes a 3-4 sentence creative narrative explaining the strategic intent.

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
    customer_segment_shift: synthesis.customer_segment_shift ?? null,
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
    context_used: {
      has_brand_profile: ctx.has_brand_profile,
      has_active_brief: ctx.active_brief != null,
      latest_run_id: ctx.latest_run?.id ?? null,
      top_family_codes: ctx.top_families.map((f) => f.family_code),
      top_winner_count: ctx.top_winners.length,
    },
  };
}
