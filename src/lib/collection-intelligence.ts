/**
 * Collection Intelligence System (CIS) — Core Library
 *
 * The institutional memory of every collection. Captures EVERY decision
 * across all 4 blocks (Creative, Merchandising, Design, Marketing),
 * indexes them by domain/subdomain/key, and serves them as compiled
 * context to any module that needs it.
 *
 * Three core operations:
 *   recordDecision()        — capture a decision (called from hooks)
 *   getIntelligence()       — read decisions (with filters)
 *   compilePromptContext()  — compile a preset context for AI prompts
 *
 * Decisions are versioned, not overwritten. When a user changes a
 * decision, the old version is marked is_current=false and a new
 * version is inserted. This preserves the full decision history.
 */

import { supabaseAdmin } from './supabase-admin';

// ─── Types ───

export interface Decision {
  id: string;
  collection_plan_id: string;
  domain: string;
  subdomain: string;
  key: string;
  value: unknown;
  value_type: string;
  rationale: string | null;
  confidence: 'suggested' | 'draft' | 'confirmed' | 'approved' | 'locked';
  source: 'user_input' | 'ai_recommendation' | 'import' | 'calculation' | 'inherited';
  source_phase: string;
  source_component: string | null;
  version: number;
  is_current: boolean;
  decided_by: string | null;
  decided_at: string;
  tags: string[];
}

export interface RecordDecisionParams {
  collectionPlanId: string;
  domain: string;
  subdomain: string;
  key: string;
  value: unknown;
  valueType?: string;
  rationale?: string;
  confidence?: Decision['confidence'];
  source?: Decision['source'];
  sourcePhase: string;
  sourceComponent?: string;
  tags?: string[];
  userId?: string;
}

export interface DecisionFilter {
  domain?: string;
  subdomain?: string;
  tags?: string[];
  preset?: string;
}

// ─── Record a decision ───

/**
 * Record a decision in the Collection Intelligence System.
 *
 * If a decision with the same (plan, domain, subdomain, key) already exists,
 * the old one is marked is_current=false and a new version is inserted.
 * This preserves full decision history.
 *
 * This is designed to be called fire-and-forget from hooks — it should
 * never block the UI. Errors are logged but not thrown.
 */
export async function recordDecision(params: RecordDecisionParams): Promise<void> {
  const {
    collectionPlanId,
    domain,
    subdomain,
    key,
    value,
    valueType = typeof value === 'number' ? 'number'
      : Array.isArray(value) ? 'list'
      : typeof value === 'boolean' ? 'boolean'
      : typeof value === 'object' ? 'object'
      : 'text',
    rationale,
    confidence = 'confirmed',
    source = 'user_input',
    sourcePhase,
    sourceComponent,
    tags = [],
    userId,
  } = params;

  try {
    // Find the current version of this decision (if any)
    const { data: existing } = await supabaseAdmin
      .from('collection_decisions')
      .select('id, version, value')
      .eq('collection_plan_id', collectionPlanId)
      .eq('domain', domain)
      .eq('subdomain', subdomain)
      .eq('key', key)
      .eq('is_current', true)
      .single();

    // Skip if the value hasn't changed (avoid unnecessary versions)
    if (existing && JSON.stringify(existing.value) === JSON.stringify(value)) {
      return;
    }

    const nextVersion = existing ? existing.version + 1 : 1;

    // Mark the old version as superseded
    if (existing) {
      await supabaseAdmin
        .from('collection_decisions')
        .update({ is_current: false })
        .eq('id', existing.id);
    }

    // Insert the new version
    await supabaseAdmin.from('collection_decisions').insert({
      collection_plan_id: collectionPlanId,
      domain,
      subdomain,
      key,
      value: JSON.stringify(value) === JSON.stringify(value) ? value : JSON.parse(JSON.stringify(value)),
      value_type: valueType,
      rationale: rationale || null,
      confidence,
      source,
      source_phase: sourcePhase,
      source_component: sourceComponent || null,
      version: nextVersion,
      supersedes_id: existing?.id || null,
      is_current: true,
      decided_by: userId || null,
      tags,
    });
  } catch (err) {
    // Fire-and-forget: log but don't throw. CIS capture should never
    // block the primary operation (saving a profile, creating a story, etc.)
    console.error('[CIS] recordDecision failed:', domain, subdomain, key, err);
  }
}

/**
 * Record multiple decisions in one batch. Used when a single user action
 * produces multiple decisions (e.g., saving a brand profile updates
 * brand_name + tagline + brand_story + voice + target in one save).
 */
export async function recordDecisions(
  decisions: RecordDecisionParams[]
): Promise<void> {
  await Promise.all(decisions.map(recordDecision));
}

// ─── Read decisions ───

/**
 * Read current decisions for a collection, with optional filters.
 */
export async function getIntelligence(
  collectionPlanId: string,
  filter?: DecisionFilter
): Promise<Decision[]> {
  let query = supabaseAdmin
    .from('collection_decisions')
    .select('*')
    .eq('collection_plan_id', collectionPlanId)
    .eq('is_current', true)
    .order('domain')
    .order('subdomain')
    .order('key');

  if (filter?.domain) {
    query = query.eq('domain', filter.domain);
  }
  if (filter?.subdomain) {
    query = query.eq('subdomain', filter.subdomain);
  }
  if (filter?.tags?.length) {
    query = query.overlaps('tags', filter.tags);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[CIS] getIntelligence failed:', error);
    return [];
  }
  return (data || []) as Decision[];
}

// ─── Compile prompt context from presets ───

/**
 * Preset definitions: which domains/tags to include for each use case.
 */
const PRESETS: Record<string, { domains?: string[]; tags?: string[] }> = {
  editorial_prompt: {
    tags: ['affects_photography'],
  },
  still_life_prompt: {
    tags: ['affects_photography'],
  },
  copy_prompt: {
    tags: ['affects_content'],
  },
  seo_prompt: {
    tags: ['affects_seo'],
  },
  story_generation: {
    domains: ['creative', 'merchandising', 'design'],
  },
  sales_forecast: {
    domains: ['merchandising', 'sales', 'finance'],
  },
  web_design: {
    tags: ['affects_web'],
  },
  wholesale_pitch: {
    domains: ['creative', 'merchandising', 'design', 'sales'],
  },
  content_calendar: {
    tags: ['affects_content'],
  },
  launch_strategy: {
    domains: ['creative', 'merchandising', 'marketing', 'sales'],
  },
  paid_campaign: {
    tags: ['affects_content'],
    domains: ['marketing', 'merchandising'],
  },
  full: {},  // no filter = everything
};

/**
 * Compile a flat key→value context object from CIS decisions,
 * suitable for injecting into prompts via renderPrompt().
 *
 * The returned object maps decision keys to their values, with
 * domain prefixed for disambiguation:
 *   creative.identity.brand_name → "BRISA"
 *   marketing.voice.personality → "Quietly confident"
 *
 * It also provides commonly-used flattened aliases matching the
 * existing {{placeholder}} names in marketing-prompts.ts:
 *   brand_name, brand_voice_personality, consumer_demographics, etc.
 */
export async function compilePromptContext(
  collectionPlanId: string,
  preset: string
): Promise<Record<string, unknown>> {
  const presetDef = PRESETS[preset] || PRESETS.full;

  // If the preset specifies both domains and tags, fetch by tags
  // (tags cross domains, which is the whole point)
  let decisions: Decision[];
  if (presetDef.tags?.length) {
    decisions = await getIntelligence(collectionPlanId, { tags: presetDef.tags });
    // If domains are also specified, also fetch those and merge
    if (presetDef.domains?.length) {
      for (const domain of presetDef.domains) {
        const domainDecisions = await getIntelligence(collectionPlanId, { domain });
        // Deduplicate by id
        const existingIds = new Set(decisions.map(d => d.id));
        for (const d of domainDecisions) {
          if (!existingIds.has(d.id)) {
            decisions.push(d);
            existingIds.add(d.id);
          }
        }
      }
    }
  } else if (presetDef.domains?.length) {
    decisions = [];
    for (const domain of presetDef.domains) {
      const domainDecisions = await getIntelligence(collectionPlanId, { domain });
      decisions.push(...domainDecisions);
    }
  } else {
    // Full — get everything
    decisions = await getIntelligence(collectionPlanId);
  }

  // Build the context object
  const ctx: Record<string, unknown> = {};

  for (const d of decisions) {
    // Full path: creative.identity.brand_name
    const fullKey = `${d.domain}.${d.subdomain}.${d.key}`;
    ctx[fullKey] = d.value;

    // Short key: just the key itself (for common {{placeholders}})
    ctx[d.key] = d.value;
  }

  // Build commonly-used composite aliases that match existing
  // {{placeholders}} in marketing-prompts.ts
  const get = (d: string, s: string, k: string) => {
    const found = decisions.find(
      dec => dec.domain === d && dec.subdomain === s && dec.key === k
    );
    return found?.value ?? '';
  };

  // Brand identity
  ctx.brand_name = get('creative', 'identity', 'brand_name') || get('creative', 'identity', 'collection_name') || '';
  ctx.collection_vibe = get('creative', 'identity', 'collection_vibe') || '';
  ctx.reference_brands = get('creative', 'inspiration', 'reference_brands') || [];
  ctx.anti_references = get('creative', 'inspiration', 'anti_references') || [];
  ctx.selected_trends = get('creative', 'inspiration', 'trends_selected') || [];
  ctx.moodboard_summary = get('creative', 'inspiration', 'moodboard_analysis') || '';
  ctx.visual_direction = get('creative', 'identity', 'visual_direction') || '';
  ctx.photography_style = get('creative', 'identity', 'photography_style') || '';

  // Consumer
  ctx.consumer_demographics = get('creative', 'target', 'demographics') || '';
  ctx.consumer_psychographics = get('creative', 'target', 'psychographics') || '';
  ctx.consumer_lifestyle = get('creative', 'target', 'lifestyle') || '';

  // Voice
  ctx.brand_voice_personality = get('marketing', 'voice', 'personality') || '';
  ctx.brand_voice_tone = get('marketing', 'voice', 'tone') || '';
  const doRules = get('marketing', 'voice', 'do_rules');
  const dontRules = get('marketing', 'voice', 'dont_rules');
  const vocabulary = get('marketing', 'voice', 'vocabulary');
  ctx.brand_voice_keywords = Array.isArray(vocabulary) ? (vocabulary as string[]).join(', ') : '';
  ctx.brand_voice_donot = Array.isArray(dontRules) ? (dontRules as string[]).join(', ') : '';
  ctx.brand_voice_summary = [
    ctx.brand_voice_personality,
    ctx.brand_voice_tone ? `Tone: ${ctx.brand_voice_tone}` : '',
  ].filter(Boolean).join('. ');

  // Design
  ctx.material_signatures = get('design', 'materials', 'signature_materials') || [];
  ctx.color_palette = get('creative', 'color', 'primary_palette') || [];
  ctx.silhouette_language = get('design', 'silhouette', 'language') || '';
  ctx.construction_techniques = get('design', 'construction', 'techniques') || [];

  // Merchandising
  ctx.price_positioning = get('merchandising', 'pricing', 'positioning') || '';
  ctx.channel_strategy = get('merchandising', 'channels', 'primary_channel') || '';
  ctx.dominant_categories = get('merchandising', 'structure', 'families_selected') || [];

  // Marketing visual
  ctx.model_casting_brief = get('marketing', 'visual', 'model_casting_brief') || '';
  ctx.still_life_direction = get('marketing', 'visual', 'still_life_direction') || '';

  // Stories
  ctx.story_arcs = get('marketing', 'stories', 'story_arcs') || [];
  ctx.editorial_hooks = get('marketing', 'stories', 'editorial_hooks') || [];

  // Sales
  ctx.total_sales_target = get('merchandising', 'budget', 'total_sales_target') || 0;

  return ctx;
}
