/**
 * Prompt Context Builder — assembles context from all blocks for dynamic prompt rendering.
 *
 * Each marketing prompt template receives ONLY the fields it needs via renderPrompt().
 * This module provides:
 *   1. PromptContext interface (full cross-block context)
 *   2. buildPromptContext() — fetches from Supabase tables
 *   3. renderPrompt() — Handlebars-style template renderer
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { compilePromptContext as compileCIS } from '@/lib/collection-intelligence';
import { loadDerivedSetupData } from '@/lib/derive-setup-data';

// ─── Sub-context types ───

export interface SkuContext {
  id: string;
  name: string;
  family: string;
  subcategory: string;
  pvp: number;
  colorways: string[];
  materials: string;
  type: 'REVENUE' | 'IMAGE' | 'ENTRY';
  novelty: 'NEWNESS' | 'CARRY_OVER';
  proto_image_url?: string;
  catalog_image_url?: string;
  notes?: string;
}

export interface StoryContext {
  id: string;
  name: string;
  narrative: string;
  mood: string[];
  tone: string;
  color_palette: string[];
  sku_ids: string[];
  hero_sku_id: string;
  content_direction: string;
}

export interface PillarContext {
  name: string;
  description: string;
  examples: string[];
  stories_alignment: string[];
}

export interface BrandVoiceContext {
  personality: string;
  tone: string;
  do_rules: string[];
  dont_rules: string[];
  vocabulary: string[];
  example_caption: string;
}

export interface DropContext {
  id: string;
  name: string;
  launch_date: string;
  weeks_active: number;
  story_alignment: string;
  channels: string[];
  expected_sales_weight: number;
}

export interface CommercialActionContext {
  name: string;
  action_type: string;
  start_date: string;
  category: string;
}

// ─── Full PromptContext ───

export interface PromptContext {
  // Block 1: Creative
  season: string;
  brand_name: string;
  brand_dna: {
    voice: { tone: string; personality: string; keywords: string[]; doNot: string[] };
    values: string[];
    visual_identity: string;
  };
  consumer_profile: {
    demographics: string;
    psychographics: string;
    lifestyle: string;
  };
  collection_vibe: string;
  selected_trends: string[];
  moodboard_summary: string;
  reference_brands: string[];

  // Investigación de Mercado · per-lens results (S3 migration). Each
  // entry is a card kept by the user when confirming the lens.
  market_trends: Array<{ title: string; brands?: string; desc: string }>;
  market_deep_dive: Array<{ title: string; brands?: string; desc: string }>;
  market_live_signals: Array<{ title: string; brands?: string; desc: string }>;
  market_competitors: Array<{ title: string; brands?: string; desc: string }>;

  // Block 2: Merchandising
  total_sales_target: number;
  channels: string[];
  markets: string[];
  price_range: { min: number; max: number; avg: number };
  target_margin: number;
  sales_months: number;
  families: string[];

  // Block 3: Design & Dev
  sku_count: number;
  skus: SkuContext[];

  // Block 4: Marketing (cumulative — all from real DB tables)
  stories: StoryContext[];
  content_pillars: PillarContext[];
  brand_voice_config: BrandVoiceContext;
  drops: DropContext[];
  commercial_actions: CommercialActionContext[];

  // Content readiness counts (from real tables)
  render_count: number;
  video_count: number;
  copy_count: number;
  email_template_count: number;
  calendar_entries_count: number;

  // Timeline
  launch_date: string;
}

// ─── Builder ───

export async function buildPromptContext(
  collectionPlanId: string
): Promise<PromptContext> {
  // Use the service-role admin client. buildPromptContext runs exclusively
  // inside server-side route handlers (stories/launch/post-launch) and
  // must read collection data regardless of RLS. The previous implementation
  // used the browser client, which silently returned null/empty data when
  // no cookie context was present — masking bugs and breaking the AI flow
  // the first time a user triggered it from a fresh session.
  const supabase = supabaseAdmin;

  // Fetch all data in parallel
  // launch_date lives on collection_timelines (one row per plan), not on
  // collection_plans — the previous SELECT included a non-existent column
  // and threw "column collection_plans.launch_date does not exist",
  // crashing every AI prompt build (including consumer-suggest-input).
  const [
    planRes,
    timelineRes,
    skusRes,
    storiesRes,
    pillarsRes,
    voiceRes,
    dropsRes,
    actionsRes,
    generationsRes,
    copyRes,
    emailTemplatesRes,
    calendarRes,
  ] = await Promise.all([
    supabase
      .from('collection_plans')
      .select('id, name, season, location, status, user_id, created_at, updated_at')
      .eq('id', collectionPlanId)
      .single(),
    supabase
      .from('collection_timelines')
      .select('launch_date')
      .eq('collection_plan_id', collectionPlanId)
      .maybeSingle(),
    supabase
      .from('collection_skus')
      .select('*')
      .eq('collection_plan_id', collectionPlanId),
    supabase
      .from('collection_stories')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('sort_order'),
    supabase
      .from('content_pillars')
      .select('*')
      .eq('collection_plan_id', collectionPlanId),
    supabase
      .from('brand_voice_config')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .single(),
    supabase
      .from('drops')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('drop_number'),
    supabase
      .from('commercial_actions')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('start_date'),
    supabase
      .from('ai_generations')
      .select('id, generation_type')
      .eq('collection_plan_id', collectionPlanId),
    supabase
      .from('product_copy')
      .select('id')
      .eq('collection_plan_id', collectionPlanId),
    supabase
      // The actual table is `email_templates_content`. The shorter
      // name was a stale alias that returned 0 silently and made the
      // launch / post-launch readiness checks underestimate content.
      .from('email_templates_content')
      .select('id')
      .eq('collection_plan_id', collectionPlanId),
    supabase
      .from('content_calendar')
      .select('id')
      .eq('collection_plan_id', collectionPlanId),
  ]);

  /* Surface query failures. The 11 reads run in parallel and used to
     silently fall back to empty values when a table got renamed,
     RLS got tightened, or the planner shape changed — every prompt
     placeholder downstream rendered as `undefined` with no signal.
     Now critical tables (the plan and its SKUs) throw, and everything
     else logs + continues so an empty stories table doesn't kill the
     marketing prompt for a freshly-created collection. */
  if (planRes.error) {
    throw new Error(`buildPromptContext: collection_plans query failed: ${planRes.error.message}`);
  }
  if (skusRes.error) {
    throw new Error(`buildPromptContext: collection_skus query failed: ${skusRes.error.message}`);
  }
  for (const [label, res] of [
    ['collection_stories', storiesRes],
    ['content_pillars', pillarsRes],
    ['brand_voice_config', voiceRes],
    ['drops', dropsRes],
    ['commercial_actions', actionsRes],
    ['ai_generations', generationsRes],
    ['product_copy', copyRes],
    ['email_templates_content', emailTemplatesRes],
    ['content_calendar', calendarRes],
  ] as const) {
    if (res.error && res.error.code !== 'PGRST116') {
      console.error(`[buildPromptContext] ${label} query failed (continuing with empty data):`, res.error);
    }
  }

  const plan = planRes.data;

  // CIS: read decisions for brand identity, consumer, creative direction,
  // and merchandising context. These were previously read from setup_data
  // paths (brand_dna, consumer, creative, merchandising) that were NEVER
  // written — every placeholder received an empty string. CIS fixes this
  // by reading from the collection_decisions table where real user
  // decisions are captured as they happen across all blocks.
  const cis = await compileCIS(collectionPlanId, 'full');

  // Pricing/budget fields now come from the DerivedSetupData loader
  // (computed on read from the merchandising workspace) rather than the
  // stale `collection_plans.setup_data` jsonb cache.
  const derived = await loadDerivedSetupData(collectionPlanId);

  const skus = (skusRes.data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: (s.name as string) ?? '',
    family: (s.family as string) ?? '',
    subcategory: (s.subcategory as string) ?? '',
    pvp: (s.pvp as number) ?? 0,
    colorways: (s.colorways as string[]) ?? [],
    materials: (s.materials as string) ?? '',
    type: (s.type as 'REVENUE' | 'IMAGE' | 'ENTRY') ?? 'REVENUE',
    novelty: (s.novelty as 'NEWNESS' | 'CARRY_OVER') ?? 'NEWNESS',
    proto_image_url: s.proto_image_url as string | undefined,
    catalog_image_url: s.catalog_image_url as string | undefined,
    notes: s.notes as string | undefined,
  }));

  const stories: StoryContext[] = (storiesRes.data ?? []).map(
    (s: Record<string, unknown>) => ({
      id: s.id as string,
      name: (s.name as string) ?? '',
      narrative: (s.narrative as string) ?? '',
      mood: (s.mood as string[]) ?? [],
      tone: (s.tone as string) ?? '',
      color_palette: (s.color_palette as string[]) ?? [],
      sku_ids: [],
      hero_sku_id: (s.hero_sku_id as string) ?? '',
      content_direction: (s.content_direction as string) ?? '',
    })
  );

  // Build story → sku mapping from collection_skus.story_id
  for (const story of stories) {
    story.sku_ids = skus
      .filter(
        (sk: Record<string, unknown>) =>
          (sk as unknown as { story_id?: string }).story_id === story.id
      )
      .map((sk: SkuContext) => sk.id);
  }

  const pillars: PillarContext[] = (pillarsRes.data ?? []).map(
    (p: Record<string, unknown>) => ({
      name: (p.name as string) ?? '',
      description: (p.description as string) ?? '',
      examples: (p.examples as string[]) ?? [],
      stories_alignment: (p.stories_alignment as string[]) ?? [],
    })
  );

  const voice = voiceRes.data;
  const brandVoice: BrandVoiceContext = {
    personality: voice?.personality ?? '',
    tone: voice?.tone ?? '',
    do_rules: voice?.do_rules ?? [],
    dont_rules: voice?.dont_rules ?? [],
    vocabulary: voice?.vocabulary ?? [],
    example_caption: voice?.example_caption ?? '',
  };

  const drops: DropContext[] = (dropsRes.data ?? []).map(
    (d: Record<string, unknown>) => ({
      id: d.id as string,
      name: (d.name as string) ?? '',
      launch_date: (d.launch_date as string) ?? '',
      weeks_active: (d.weeks_active as number) ?? 0,
      story_alignment: (d.story as string) ?? '',
      channels: (d.channels as string[]) ?? [],
      expected_sales_weight: (d.expected_sales_weight as number) ?? 0,
    })
  );

  const commercialActions: CommercialActionContext[] = (actionsRes.data ?? []).map(
    (a: Record<string, unknown>) => ({
      name: (a.name as string) ?? '',
      action_type: (a.action_type as string) ?? '',
      start_date: (a.start_date as string) ?? '',
      category: (a.category as string) ?? '',
    })
  );

  // Content readiness counts
  const generations = generationsRes.data ?? [];
  const renderCount = generations.filter(
    (g: Record<string, unknown>) =>
      g.generation_type === 'product_render' || g.generation_type === 'still_life' || g.generation_type === 'tryon'
  ).length;
  const videoCount = generations.filter(
    (g: Record<string, unknown>) => g.generation_type === 'video'
  ).length;

  const prices = skus.map((s: SkuContext) => s.pvp).filter((p: number) => p > 0);

  return {
    season: plan?.season ?? '',
    // CIS-powered fields (previously empty from setup_data)
    brand_name: (cis.brand_name as string) || '',
    brand_dna: {
      voice: {
        tone: (cis.brand_voice_tone as string) || '',
        personality: (cis.brand_voice_personality as string) || '',
        keywords: Array.isArray(cis.vocabulary) ? cis.vocabulary as string[] : [],
        doNot: Array.isArray(cis.dont_rules) ? cis.dont_rules as string[] : [],
      },
      values: [],
      visual_identity: (cis.visual_direction as string) || '',
    },
    consumer_profile: {
      demographics: (cis.consumer_demographics as string) || '',
      psychographics: (cis.consumer_psychographics as string) || '',
      lifestyle: (cis.consumer_lifestyle as string) || '',
    },
    collection_vibe: (cis.collection_vibe as string) || '',
    selected_trends: Array.isArray(cis.selected_trends) ? cis.selected_trends as string[] : [],
    moodboard_summary: (cis.moodboard_summary as string) || '',
    reference_brands: Array.isArray(cis.reference_brands) ? cis.reference_brands as string[] : [],
    market_trends: Array.isArray(cis.market_trends) ? cis.market_trends as Array<{ title: string; brands?: string; desc: string }> : [],
    market_deep_dive: Array.isArray(cis.market_deep_dive) ? cis.market_deep_dive as Array<{ title: string; brands?: string; desc: string }> : [],
    market_live_signals: Array.isArray(cis.market_live_signals) ? cis.market_live_signals as Array<{ title: string; brands?: string; desc: string }> : [],
    market_competitors: Array.isArray(cis.market_competitors) ? cis.market_competitors as Array<{ title: string; brands?: string; desc: string }> : [],
    // Pricing/budget fields — sourced from DerivedSetupData (computed on
    // read from the merchandising workspace) with CIS still as the
    // primary signal where it has its own writers.
    total_sales_target: (cis.total_sales_target as number) || derived.totalSalesTarget || 0,
    channels: [] as string[], // TODO: surface from CIS once channels writer ships
    markets: [] as string[],
    price_range: {
      min: prices.length ? Math.min(...prices) : (derived.minPrice ?? 0),
      max: prices.length ? Math.max(...prices) : (derived.maxPrice ?? 0),
      avg: prices.length
        ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
        : (derived.avgPriceTarget ?? 0),
    },
    target_margin: derived.targetMargin ?? 0,
    sales_months: 0,
    families: derived.families ?? [],
    sku_count: skus.length,
    skus,
    stories,
    content_pillars: pillars,
    brand_voice_config: brandVoice,
    drops,
    commercial_actions: commercialActions,
    render_count: renderCount,
    video_count: videoCount,
    copy_count: copyRes.data?.length ?? 0,
    email_template_count: emailTemplatesRes.data?.length ?? 0,
    calendar_entries_count: calendarRes.data?.length ?? 0,
    launch_date: (timelineRes?.data?.launch_date as string | undefined) ?? '',
  };
}

// ─── Template Renderer ───

/**
 * Renders a Handlebars-style template with the given context.
 * Supports:
 *   - {{variable}} and {{nested.path}}
 *   - {{#each items}}...{{/each}}
 *   - {{#if condition}}...{{/if}}
 *   - Truncates arrays > 50 items to prevent token overflow
 */
export function renderPrompt(
  template: string,
  context: Record<string, unknown>
): string {
  let result = template;

  // Process {{#each key}}...{{/each}}
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key: string, body: string) => {
      const arr = resolveValue(key, context);
      if (!Array.isArray(arr)) return '';
      const items = arr.length > 50 ? arr.slice(0, 50) : arr;
      return items
        .map((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            return renderPrompt(body, item as Record<string, unknown>);
          }
          return body.replace(/\{\{this\}\}/g, String(item));
        })
        .join('');
    }
  );

  // Process {{#if key}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, condition: string, body: string) => {
      const val = resolveValue(condition.trim(), context);
      if (val && (!Array.isArray(val) || val.length > 0)) {
        return renderPrompt(body, context);
      }
      return '';
    }
  );

  // Process {{variable}} and {{nested.path}}
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const val = resolveValue(path, context);
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });

  return result;
}

function resolveValue(path: string, obj: Record<string, unknown>): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
