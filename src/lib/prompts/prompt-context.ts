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

  // Block 4: Marketing (cumulative)
  stories: StoryContext[];
  content_pillars: PillarContext[];
  brand_voice_config: BrandVoiceContext;

  // Config (from setup_data.workspace_config.marketing_block)
  has_website: boolean;
  website_url?: string;
  website_platform?: string;
  social_channels: string[];
  has_email_list: boolean;
  email_platform?: string;
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
  ]);

  const plan = planRes.data;
  const setupData = plan?.setup_data ?? {};
  const brandDna = setupData.brand_dna ?? {};
  const consumer = setupData.consumer ?? {};
  const creative = setupData.creative ?? {};
  const merchandising = setupData.merchandising ?? {};
  const marketingConfig = setupData.workspace_config?.marketing_block ?? {};

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
      sku_ids: skus
        .filter((sk: SkuContext) => sk.id && (s as Record<string, unknown>).id === sk.id)
        .map((sk: SkuContext) => sk.id),
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
    has_website: marketingConfig.has_website ?? false,
    website_url: marketingConfig.website_url,
    website_platform: marketingConfig.website_platform,
    social_channels: marketingConfig.social_channels ?? [],
    has_email_list: marketingConfig.has_email_list ?? false,
    email_platform: marketingConfig.email_platform,
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
