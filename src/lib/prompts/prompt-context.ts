/**
 * Prompt Context Builder — assembles context from all blocks for dynamic prompt rendering.
 *
 * Each marketing prompt template receives ONLY the fields it needs via renderPrompt().
 * This module provides:
 *   1. PromptContext interface (full cross-block context)
 *   2. buildPromptContext() — fetches from Supabase tables
 *   3. renderPrompt() — Handlebars-style template renderer
 */

import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();

  // Fetch all data in parallel
  const [
    planRes,
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
      .select('*, setup_data')
      .eq('id', collectionPlanId)
      .single(),
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
      .from('email_templates')
      .select('id')
      .eq('collection_plan_id', collectionPlanId),
    supabase
      .from('content_calendar')
      .select('id')
      .eq('collection_plan_id', collectionPlanId),
  ]);

  const plan = planRes.data;
  const setupData = plan?.setup_data ?? {};
  const brandDna = setupData.brand_dna ?? {};
  const consumer = setupData.consumer ?? {};
  const creative = setupData.creative ?? {};
  const merchandising = setupData.merchandising ?? {};

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
    brand_name: brandDna.name ?? '',
    brand_dna: {
      voice: {
        tone: brandDna.voice?.tone ?? '',
        personality: brandDna.voice?.personality ?? '',
        keywords: brandDna.voice?.keywords ?? [],
        doNot: brandDna.voice?.doNot ?? [],
      },
      values: brandDna.values ?? [],
      visual_identity: brandDna.visual_identity ?? '',
    },
    consumer_profile: {
      demographics: consumer.demographics ?? '',
      psychographics: consumer.psychographics ?? '',
      lifestyle: consumer.lifestyle ?? '',
    },
    collection_vibe: creative.vibe ?? '',
    selected_trends: creative.selected_trends ?? [],
    moodboard_summary: creative.moodboard_summary ?? '',
    reference_brands: creative.reference_brands ?? [],
    total_sales_target: merchandising.total_sales_target ?? 0,
    channels: merchandising.channels ?? [],
    markets: merchandising.markets ?? [],
    price_range: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      avg: prices.length
        ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
        : 0,
    },
    target_margin: merchandising.target_margin ?? 0,
    sales_months: merchandising.sales_months ?? 0,
    families: merchandising.families ?? [],
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
    launch_date: plan?.launch_date ?? '',
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
