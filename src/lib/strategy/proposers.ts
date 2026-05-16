/**
 * Generative recommendation proposers — Paso 2 §6.4.
 *
 * Three functions, each producing `RecommendationCandidate[]` that the
 * caller persists into `strategy_recommendation_candidates`:
 *
 *   1. proposeNewSKUs        → action_type='new_sku_proposal', scope='sku'
 *   2. proposeFamilyExtensions → action_type='family_extension', scope='family'
 *   3. recommendPalette      → returns palette + persists to
 *                              strategy_recommended_palettes (separate table)
 *
 * All three reuse:
 *   - loadStrategyTenantContext() for context
 *   - generateJSON() from the shared LLM client
 *   - researchTrends() for trend grounding when warranted
 *
 * The proposers DO NOT bypass the deterministic classifiers. They generate
 * candidates that ride alongside the existing classifier output; the
 * scenario assembler picks the mix.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateJSON } from '@/lib/ai/llm-client';
import { researchTrends } from '@/lib/ai/perplexity-client';
import {
  loadStrategyTenantContext,
  formatContextForPrompt,
  type StrategyTenantContext,
  type StrategyTenantContextWinner,
} from './context-loader';
import type { RecommendationCandidate } from './recommend';

const DEFAULT_NEW_SKU_COUNT = 8;
const DEFAULT_EXTENSION_COUNT = 4;

// ─── 1. New SKU proposer ──────────────────────────────────────────────

export interface ProposeNewSKUsOptions {
  runId: string;
  count?: number;
  language?: 'en' | 'es';
}

export interface ProposeNewSKUsResult {
  candidates: RecommendationCandidate[];
  context_used: {
    winners_used: number;
    has_brief: boolean;
  };
  warnings: string[];
}

export async function proposeNewSKUs(opts: ProposeNewSKUsOptions): Promise<ProposeNewSKUsResult> {
  const count = Math.max(3, Math.min(20, opts.count ?? DEFAULT_NEW_SKU_COUNT));

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id')
    .eq('id', opts.runId)
    .single();
  if (!run) throw new Error(`Run ${opts.runId} not found`);

  const ctx = await loadStrategyTenantContext(run.tenant_id);
  if (!ctx) throw new Error(`Tenant ${run.tenant_id} not found`);
  const warnings: string[] = [];

  if (ctx.top_winners.length === 0) {
    return {
      candidates: [],
      context_used: { winners_used: 0, has_brief: ctx.active_brief != null },
      warnings: ['No winning SKUs (lifecycle mature/peak/ramp) found in the latest run. Cannot propose extensions without ground-truth winners.'],
    };
  }

  const lang = opts.language === 'es' ? 'Spanish (Castilian)' : 'English';

  const system = `You are a senior fashion merchandiser. You propose NEW SKUs that EXTEND proven winners in alignment with the active creative direction. You emit ONLY structured JSON matching the schema. Output language: ${lang}.`;

  const winnersBlock = ctx.top_winners
    .map(
      (w) =>
        `- ID:${w.product_fact_id} · LINEAGE:${w.identity_node_id ?? 'unknown'} · ${w.product_name || w.model_ref} (${w.model_ref}) · ${w.family_code ?? '?'} · €${w.pvp ?? '?'} · margin ${w.margin_pct_list != null ? `${(w.margin_pct_list * 100).toFixed(0)}%` : '?'} · stage ${w.lifecycle_stage ?? '?'} · runway ${w.seasonal_runway_days ?? '?'}d`
    )
    .join('\n');

  const briefBlock = ctx.active_brief
    ? `# Active creative brief
- Name: ${ctx.active_brief.name}
- Color story: ${ctx.active_brief.color_story.join(', ') || '(none)'}
- Archetype focus: ${ctx.active_brief.archetypes_focus.join(', ') || '(none)'}
- Family pivot: ${Object.entries(ctx.active_brief.family_pivot).map(([f, v]) => `${f} ${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`).join(' / ') || '(none)'}
- Narrative: ${ctx.active_brief.creative_narrative?.slice(0, 400) ?? '(none)'}`
    : `# Active creative brief
(none — propose extensions purely from portfolio winners, conservative on novelty)`;

  const user = `${formatContextForPrompt(ctx)}

${briefBlock}

# Portfolio winners (current run, ordered by confidence)
${winnersBlock}

# Task
Propose EXACTLY ${count} new SKU concepts. Each SKU must:
- BUILD ON one of the listed winners (cite its product_fact_id as source_product_fact_id).
- Apply the creative brief direction (color story, archetype focus, family pivot) WHEN aligned with the winner's family.
- Stay within the family's existing price ladder unless the brief proposes a positioning shift.
- Project a realistic demand vs the source winner (decimal ratio: 0.4 means "expect 40% of source's velocity").
- Include a 1-line rationale that explicitly references the winner being extended.

# SCHEMA (emit one JSON object)
{
  "proposals": [
    {
      "source_product_fact_id": "uuid of the winner being extended",
      "source_lineage_id": "uuid of source identity_node_id OR null",
      "proposed_name": "concise product name (4-8 words)",
      "family_code": "exact family_code from winners (or a sibling family per the brief)",
      "target_archetype": "one of: editorial-heritage | minimal-architect | streetwear-drop | romantic-feminine | resort-luxe | sustainable-craft | workwear-heritage | performance-tech | y2k-digital-native | avant-garde-concept",
      "target_color_name": "color name (prefer tenant vocabulary)",
      "projected_pvp": 0.0,
      "projected_demand_ratio": 0.6,
      "creative_alignment": "tight | aligned | bridge | tension",
      "rationale": "1 sentence: why this extension works. MUST reference the source winner by name + the brief axis used."
    }
  ]
}

CRITICAL:
- EXACTLY ${count} proposals.
- "creative_alignment": "tight" = directly matches both brief + winner; "aligned" = matches brief; "bridge" = bridges current portfolio to brief direction; "tension" = creative wants this but data suggests caution (still propose, flag it).
- If the brief proposes a family pivot AWAY from a winner's family, only propose a "bridge" or "tension" SKU there — not "tight".
- Never invent winners. Every source_product_fact_id MUST appear in the winners list above.

Begin output now.`;

  let synthesis: { proposals?: any[] };
  try {
    const result = await generateJSON<{ proposals?: any[] }>({
      system,
      user,
      temperature: 0.7,
      language: opts.language,
    });
    synthesis = result.data;
  } catch (err: any) {
    throw new Error(`proposeNewSKUs LLM call failed: ${err?.message || String(err)}`);
  }

  const proposals = Array.isArray(synthesis.proposals) ? synthesis.proposals : [];
  if (proposals.length === 0) {
    warnings.push('LLM returned zero proposals. Try lowering count or adding more context.');
  }

  // Pre-index winners by product_fact_id for evidence enrichment.
  const winnersById = new Map<string, StrategyTenantContextWinner>(
    ctx.top_winners.map((w) => [w.product_fact_id, w])
  );

  const validProposals = proposals.filter((p) => p && typeof p.source_product_fact_id === 'string');

  const alignmentToScore: Record<string, number> = {
    tight: 0.95,
    aligned: 0.85,
    bridge: 0.7,
    tension: 0.55,
  };

  const candidates: RecommendationCandidate[] = validProposals.map((p) => {
    const winner = winnersById.get(p.source_product_fact_id);
    const alignment = alignmentToScore[p.creative_alignment as string] ?? 0.7;

    return {
      scope: 'sku',
      // For new SKU proposals, scope_ref points at the SOURCE winner so
      // the card UI can join through productById and show identity.
      scope_ref: p.source_product_fact_id,
      action_type: 'new_sku_proposal',
      proposed_magnitude: {
        proposed_name: p.proposed_name,
        family_code: p.family_code,
        target_archetype: p.target_archetype,
        target_color_name: p.target_color_name,
        projected_pvp: typeof p.projected_pvp === 'number' ? p.projected_pvp : null,
        projected_demand_ratio:
          typeof p.projected_demand_ratio === 'number' ? p.projected_demand_ratio : 0.5,
        creative_alignment: p.creative_alignment,
      },
      evidence: {
        source_winner_model_ref: winner?.model_ref ?? null,
        source_winner_name: winner?.product_name ?? null,
        source_winner_family: winner?.family_code ?? null,
        source_winner_pvp: winner?.pvp ?? null,
        source_winner_margin: winner?.margin_pct_list ?? null,
        source_winner_lifecycle: winner?.lifecycle_stage ?? null,
        source_winner_runway_days: winner?.seasonal_runway_days ?? null,
        projected_demand_ratio:
          typeof p.projected_demand_ratio === 'number' ? p.projected_demand_ratio : null,
        creative_alignment: p.creative_alignment,
        rationale: p.rationale,
      },
      counter_evidence: ctx.active_brief
        ? {
            brief_family_pivot:
              ctx.active_brief.family_pivot[p.family_code ?? winner?.family_code ?? ''] ?? null,
          }
        : {},
      assumptions: [
        `Generated by proposeNewSKUs(). Projected demand is ${typeof p.projected_demand_ratio === 'number' ? `${(p.projected_demand_ratio * 100).toFixed(0)}%` : 'unknown'} of source winner velocity.`,
        'Customer must validate fit / production feasibility / supplier lead time before commit.',
      ],
      confidence_data_completeness: winner ? 0.85 : 0.4,
      confidence_identity: winner?.identity_node_id ? 0.9 : 0.5,
      confidence_demand: typeof p.projected_demand_ratio === 'number' ? Math.min(1, p.projected_demand_ratio + 0.2) : 0.5,
      confidence_margin: winner?.margin_pct_list ? 0.75 : 0.4,
      confidence_creative_fit: alignment,
      confidence_action: Math.min(0.95, alignment * (winner ? 0.95 : 0.6)),
      data_sufficiency_warning: !winner
        ? 'Source winner not found in current run; treat as exploratory.'
        : null,
      narrative: p.rationale ?? null,
    };
  });

  return {
    candidates,
    context_used: {
      winners_used: validProposals.length,
      has_brief: ctx.active_brief != null,
    },
    warnings,
  };
}

// ─── 2. Family extension proposer ─────────────────────────────────────

export interface ProposeFamilyExtensionsOptions {
  runId: string;
  familyCode?: string;
  count?: number;
  language?: 'en' | 'es';
}

export interface ProposeFamilyExtensionsResult {
  candidates: RecommendationCandidate[];
  considered_families: string[];
  warnings: string[];
}

export async function proposeFamilyExtensions(
  opts: ProposeFamilyExtensionsOptions
): Promise<ProposeFamilyExtensionsResult> {
  const count = Math.max(2, Math.min(8, opts.count ?? DEFAULT_EXTENSION_COUNT));

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id')
    .eq('id', opts.runId)
    .single();
  if (!run) throw new Error(`Run ${opts.runId} not found`);

  const ctx = await loadStrategyTenantContext(run.tenant_id);
  if (!ctx) throw new Error(`Tenant ${run.tenant_id} not found`);
  const warnings: string[] = [];

  // Pick eligible families: high ROI OR ≥2 heroes OR positive family_pivot in brief.
  const briefPivot = ctx.active_brief?.family_pivot ?? {};
  const allFamilies = ctx.top_families;
  let eligible = allFamilies.filter((f) => {
    if (opts.familyCode && f.family_code !== opts.familyCode) return false;
    const positivePivot = (briefPivot[f.family_code] ?? 0) > 0;
    return (
      positivePivot ||
      (f.family_roi != null && f.family_roi > 1.5) ||
      f.hero_count >= 2
    );
  });

  if (eligible.length === 0 && opts.familyCode) {
    warnings.push(`No eligible expansion signal on family ${opts.familyCode}. Proceeding anyway since explicitly requested.`);
    eligible = allFamilies.filter((f) => f.family_code === opts.familyCode);
  }
  if (eligible.length === 0) {
    return {
      candidates: [],
      considered_families: [],
      warnings: ['No families meet expansion criteria (positive brief pivot OR ROI > 1.5 OR ≥2 heroes).'],
    };
  }

  const lang = opts.language === 'es' ? 'Spanish (Castilian)' : 'English';

  const system = `You are a senior fashion merchandiser. You propose family-extension CONCEPTS (not individual SKUs) for fashion families that are winning + aligned with the brief. Output JSON only. Language: ${lang}.`;

  const familiesBlock = eligible
    .map((f) => {
      const pivot = briefPivot[f.family_code];
      const pivotStr = pivot != null ? ` · brief pivot ${pivot > 0 ? '+' : ''}${(pivot * 100).toFixed(0)}%` : '';
      return `- ${f.family_code} · ${f.sku_count} SKUs · ${f.hero_count}H/${f.dog_count}D · ROI ${f.family_roi?.toFixed(2) ?? '?'} · share ${f.share_of_wallet_pct != null ? (f.share_of_wallet_pct * 100).toFixed(1) + '%' : '?'}${pivotStr}`;
    })
    .join('\n');

  const archetypes = ctx.taxonomies.archetypes.length > 0
    ? ctx.taxonomies.archetypes
    : ['editorial-heritage', 'minimal-architect', 'streetwear-drop', 'romantic-feminine', 'resort-luxe'];

  const user = `${formatContextForPrompt(ctx)}

# Eligible families for extension
${familiesBlock}

# Task
For EACH eligible family above, propose ${count} NEW CONCEPTS that extend the family in alignment with brand DNA + creative brief + current winners. A "concept" is an archetype + silhouette idea, NOT a finished SKU — the SKU proposer fills that in later.

# Archetype vocabulary
${archetypes.join(', ')}

# SCHEMA
{
  "extensions": [
    {
      "family_code": "exact code from eligible list",
      "concept_name": "evocative 2-4 word name",
      "target_archetype": "from vocabulary",
      "silhouette_description": "20-40 words on shape, proportions, key construction features",
      "rationale": "1-2 sentences: why this concept extends the family + aligns with brief"
    }
  ]
}

CRITICAL: total extensions across all eligible families = ${count * eligible.length}. Distribute proportionally to family share-of-wallet.`;

  let synthesis: { extensions?: any[] };
  try {
    const result = await generateJSON<{ extensions?: any[] }>({
      system,
      user,
      temperature: 0.75,
      language: opts.language,
    });
    synthesis = result.data;
  } catch (err: any) {
    throw new Error(`proposeFamilyExtensions LLM call failed: ${err?.message || String(err)}`);
  }

  const extensions = Array.isArray(synthesis.extensions) ? synthesis.extensions : [];
  const validExtensions = extensions.filter(
    (e) => e && typeof e.family_code === 'string' && typeof e.concept_name === 'string'
  );

  const eligibleCodes = new Set(eligible.map((f) => f.family_code));
  const candidates: RecommendationCandidate[] = validExtensions
    .filter((e) => eligibleCodes.has(e.family_code))
    .map((e) => {
      const family = eligible.find((f) => f.family_code === e.family_code)!;
      const pivot = briefPivot[e.family_code] ?? 0;
      const alignment = pivot > 0 ? Math.min(0.95, 0.75 + pivot) : 0.7;

      return {
        scope: 'family',
        scope_ref: e.family_code,
        action_type: 'family_extension',
        proposed_magnitude: {
          concept_name: e.concept_name,
          target_archetype: e.target_archetype,
          silhouette_description: e.silhouette_description,
        },
        evidence: {
          family_roi: family.family_roi,
          family_hero_count: family.hero_count,
          family_share_of_wallet_pct: family.share_of_wallet_pct,
          brief_family_pivot: pivot,
          target_archetype: e.target_archetype,
          rationale: e.rationale,
        },
        counter_evidence: {
          family_dog_count: family.dog_count,
          family_return_drag: family.return_drag_score,
        },
        assumptions: [
          'Generated by proposeFamilyExtensions(). Concept is archetype-level, not SKU-level.',
          'Customer should run proposeNewSKUs() on accepted concepts to materialise as individual SKUs.',
        ],
        confidence_data_completeness: 0.8,
        confidence_identity: 0.9,
        confidence_demand: family.family_roi != null && family.family_roi > 1.5 ? 0.8 : 0.55,
        confidence_margin: 0.7,
        confidence_creative_fit: alignment,
        confidence_action: Math.min(0.92, alignment),
        data_sufficiency_warning: null,
        narrative: e.rationale ?? null,
      };
    });

  return {
    candidates,
    considered_families: eligible.map((f) => f.family_code),
    warnings,
  };
}

// ─── 3. Palette recommender ───────────────────────────────────────────

export interface RecommendPaletteOptions {
  runId: string;
  familyCode: string;
  language?: 'en' | 'es';
}

export interface PaletteColor {
  name: string;
  hex: string;
  confidence: number;
  source_winner_product_name?: string;
  source_winner_model_ref?: string;
  rationale: string;
  dna_alignment: 'tight' | 'aligned' | 'bridge' | 'tension';
  tension?: string;
}

export interface RecommendPaletteResult {
  palette: PaletteColor[];
  brief_alignment: number;
  trend_signals_used: string[];
  warnings: string[];
}

export async function recommendPalette(
  opts: RecommendPaletteOptions
): Promise<RecommendPaletteResult> {
  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id')
    .eq('id', opts.runId)
    .single();
  if (!run) throw new Error(`Run ${opts.runId} not found`);

  const ctx = await loadStrategyTenantContext(run.tenant_id);
  if (!ctx) throw new Error(`Tenant ${run.tenant_id} not found`);
  const warnings: string[] = [];

  // Pull SKUs in the family from the latest run, sorted by effective_margin × demand.
  const { data: familySkus } = await supabaseAdmin
    .from('strategy_sku_scores')
    .select(
      `
      effective_margin, demand_score,
      strategy_product_facts!inner (
        model_ref, color_ref, product_name, family_code
      )
      `
    )
    .eq('run_id', run.id);

  const inFamily = ((familySkus || []) as any[])
    .filter((r) => r.strategy_product_facts?.family_code === opts.familyCode)
    .map((r) => ({
      model_ref: r.strategy_product_facts.model_ref as string,
      color_ref: r.strategy_product_facts.color_ref as string | null,
      product_name: r.strategy_product_facts.product_name as string | null,
      score:
        (Number(r.effective_margin) || 0) *
        (Number(r.demand_score) || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (inFamily.length === 0) {
    warnings.push(`No SKUs found in family ${opts.familyCode} for the latest run. Palette will rely on brand DNA + trends only.`);
  }

  // Color taxonomy mapping (code → name).
  const codeToName = ctx.taxonomies.color_code_to_name || {};
  const winningColorNames = inFamily
    .map((s) => (s.color_ref ? codeToName[s.color_ref] ?? s.color_ref : null))
    .filter((c): c is string => !!c);

  // Fetch color trend signals (Perplexity Sonar deep-dive color).
  let trendBlock = '';
  let trendTitles: string[] = [];
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      const query = `${opts.familyCode} color palette trends`;
      const trends = await researchTrends(
        query,
        undefined,
        'deep-dive',
        { collectionName: ctx.tenant.display_name },
        undefined,
        opts.language,
        'color'
      );
      if (trends && trends.results) {
        trendTitles = trends.results.slice(0, 10).map((t) => t.title);
        trendBlock = trends.results
          .slice(0, 10)
          .map((t) => `- ${t.title}${t.hex ? ` (${t.hex})` : ''}: ${t.desc}`)
          .join('\n');
      }
    } catch {
      warnings.push('Color trend research via Perplexity failed; palette will rely on brand DNA + winners only.');
    }
  } else {
    warnings.push('PERPLEXITY_API_KEY not configured — color trend signals unavailable.');
  }

  const briefColorStory =
    ctx.active_brief?.color_story && ctx.active_brief.color_story.length > 0
      ? ctx.active_brief.color_story
      : null;

  const lang = opts.language === 'es' ? 'Spanish (Castilian)' : 'English';
  const system = `You are a fashion colour director synthesising a palette for a specific product family. Output JSON only. Language: ${lang}.`;

  const user = `${formatContextForPrompt(ctx)}

# Family scope
${opts.familyCode}

# Current winning colors in this family (top by margin × demand)
${winningColorNames.length > 0 ? winningColorNames.join(', ') : '(none — palette will be derived from brand DNA + trends)'}

# Brief color story (if set)
${briefColorStory ? briefColorStory.join(', ') : '(not set — propose freely within brand DNA)'}

# Current color trend signals from Perplexity
${trendBlock || '(unavailable)'}

# Task
Synthesise a 5-7 color palette for ${opts.familyCode} next season. Each color must include:
- name (prefer tenant vocabulary)
- hex (RRGGBB)
- confidence (0-1)
- rationale (1 sentence)
- dna_alignment: tight | aligned | bridge | tension
- optional source_winner_product_name + source_winner_model_ref if extending an existing winner
- optional tension note if dna_alignment === 'tension'

# SCHEMA
{
  "palette": [
    { "name": "...", "hex": "#......", "confidence": 0.0, "rationale": "...", "dna_alignment": "tight|aligned|bridge|tension", "source_winner_product_name": "... or omit", "source_winner_model_ref": "... or omit", "tension": "... or omit" }
  ],
  "brief_alignment": 0.0
}

CRITICAL:
- Include 1-2 "tight" anchor colors drawn from current winners or the brief color story.
- Include 1-2 "bridge" colors that connect current portfolio to the new direction.
- Optional 1 "tension" color the data suggests caution about.
- Total 5-7 entries.`;

  let synthesis: { palette?: any[]; brief_alignment?: number };
  try {
    const result = await generateJSON<{ palette?: any[]; brief_alignment?: number }>({
      system,
      user,
      temperature: 0.5,
      language: opts.language,
    });
    synthesis = result.data;
  } catch (err: any) {
    throw new Error(`recommendPalette LLM call failed: ${err?.message || String(err)}`);
  }

  const palette: PaletteColor[] = Array.isArray(synthesis.palette)
    ? synthesis.palette
        .filter((c) => c && typeof c.name === 'string' && typeof c.hex === 'string')
        .slice(0, 7)
        .map((c) => ({
          name: c.name,
          hex: c.hex.startsWith('#') ? c.hex : `#${c.hex}`,
          confidence: typeof c.confidence === 'number' ? c.confidence : 0.7,
          source_winner_product_name: c.source_winner_product_name || undefined,
          source_winner_model_ref: c.source_winner_model_ref || undefined,
          rationale: c.rationale ?? '',
          dna_alignment:
            ['tight', 'aligned', 'bridge', 'tension'].includes(c.dna_alignment)
              ? c.dna_alignment
              : 'aligned',
          tension: c.tension || undefined,
        }))
    : [];

  if (palette.length === 0) {
    warnings.push('LLM returned zero palette colors. Check tenant_brand_profile + brief.');
  }

  return {
    palette,
    brief_alignment:
      typeof synthesis.brief_alignment === 'number' ? synthesis.brief_alignment : 0.7,
    trend_signals_used: trendTitles,
    warnings,
  };
}
