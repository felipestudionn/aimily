/**
 * Marketing Story Mode — data layer.
 *
 * Single source of truth for the presentation deck (both the web page and
 * the PPTX export). Fetches every marketing table + derived helpers in
 * one pass, with the ownership check baked in. Returns `null` when the
 * plan doesn't belong to the requesting user.
 *
 * Consumers:
 * - `src/app/collection/[id]/presentation/page.tsx`
 * - `src/app/api/collection-export-pptx/route.ts`
 * - `src/app/api/cron/post-launch-analysis/route.ts` (retrospective deck)
 *
 * Principles:
 * - Zero invented data. Empty tables → empty arrays / nulls.
 * - Slides decide their own visibility; this helper just surfaces what exists.
 * - Ownership enforced at the top — never leaks across users.
 */

import { supabaseAdmin } from './supabase-admin';
import type {
  ContentPillar,
  BrandVoiceConfig,
  EmailTemplateContent,
  EmailSequenceType,
} from '@/types/digital';
import type { ContentCalendarEntry } from '@/types/marketing';
import type { LookbookPage } from '@/types/studio';

/* ═════════════════════════════════════════════════════════════════
   Source types
   ═════════════════════════════════════════════════════════════════ */

export interface PresentationStory {
  id: string;
  name: string;
  narrative: string | null;
  editorial_hook: string | null;
  mood: string[] | null;
  tone: string | null;
  color_palette: string[] | null;
  hero_sku_id: string | null;
  priority_score_total: number | null;
  sort_order: number;
}

export interface PresentationSku {
  id: string;
  name: string;
  family: string | null;
  pvp: number | null;
  render_urls: Record<string, string> | null;
  render_url: string | null;
  reference_image_url: string | null;
}

export interface PresentationDrop {
  id: string;
  drop_number: number;
  name: string;
  launch_date: string | null;
  end_date: string | null;
  weeks_active: number | null;
  story_name: string | null;
  story_description: string | null;
  channels: string[] | null;
  position: number | null;
}

export interface PresentationCommercialAction {
  id: string;
  name: string;
  action_type: string | null;
  start_date: string | null;
  end_date: string | null;
  category: string | null;
  partner_name: string | null;
  description: string | null;
  channels: string[] | null;
  position: number | null;
}

export interface PresentationPaidCampaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  budget: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  drop_name: string | null;
  ad_sets: Array<{ id?: string; name: string; audience?: string; budget_pct?: number; creatives?: string[] }> | null;
  status: string;
}

export interface PresentationLaunchTask {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
}

export interface PresentationStillLifeVisual {
  id: string;
  generation_type: string;
  asset_url: string;
  sku_name: string | null;
  story_id: string | null;
  created_at: string;
}

export interface PresentationPostLaunchAnalysis {
  generated_at: string;
  source?: string;
  result: {
    overall_assessment?: string;
    wins?: string[];
    areas_for_improvement?: string[];
    recommendations?: string[];
    [k: string]: unknown;
  };
}

/* ═════════════════════════════════════════════════════════════════
   Derived types (what consumers render from)
   ═════════════════════════════════════════════════════════════════ */

export interface StoryWithHeroImage {
  story: PresentationStory;
  heroImageUrl: string | null;
  heroSkuName: string | null;
}

export interface CalendarWeek {
  weekNumber: number;      // ISO week
  weekLabel: string;       // e.g. "Week of Mar 2"
  startDate: string;       // YYYY-MM-DD of Monday
  entries: ContentCalendarEntry[];
}

export interface EmailSequenceGroup {
  sequenceId: string;
  sequenceName: string | null;
  sequenceType: EmailSequenceType | null;
  trigger: string | null;
  emails: EmailTemplateContent[];
}

export interface LaunchReadinessCategory {
  category: string;
  total: number;
  completed: number;
  pct: number;
}

export interface LaunchReadiness {
  overallPct: number;
  categories: LaunchReadinessCategory[];
  totalTasks: number;
  completedTasks: number;
}

export interface PaidCampaignGrouped {
  campaign: PresentationPaidCampaign;
  totalBudget: number;
  adSetCount: number;
}

/* ═════════════════════════════════════════════════════════════════
   The unified shape returned to consumers
   ═════════════════════════════════════════════════════════════════ */

export interface MarketingPresentationData {
  brandVoice: BrandVoiceConfig | null;
  stories: StoryWithHeroImage[];
  pillars: ContentPillar[];
  lookbookPages: LookbookPage[];
  drops: PresentationDrop[];
  commercialActions: PresentationCommercialAction[];
  contentCalendarWeeks: CalendarWeek[];
  paidCampaigns: PaidCampaignGrouped[];
  launchReadiness: LaunchReadiness | null;
  emailSequences: EmailSequenceGroup[];
  stillLifeVisuals: PresentationStillLifeVisual[];
  postLaunchAnalysis: PresentationPostLaunchAnalysis | null;
  isPastLaunch: boolean;
  launchDate: string | null;
}

/* ═════════════════════════════════════════════════════════════════
   Ownership helper
   ═════════════════════════════════════════════════════════════════ */

async function verifyOwnership(
  collectionPlanId: string,
  userId: string
): Promise<{ owned: boolean; setupData: Record<string, unknown> | null; launchDate: string | null }> {
  const { data } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id, setup_data, launch_date')
    .eq('id', collectionPlanId)
    .single();

  if (!data || data.user_id !== userId) {
    return { owned: false, setupData: null, launchDate: null };
  }

  return {
    owned: true,
    setupData: (data.setup_data as Record<string, unknown> | null) ?? {},
    launchDate: (data.launch_date as string | null) ?? null,
  };
}

/* ═════════════════════════════════════════════════════════════════
   Derivation helpers
   ═════════════════════════════════════════════════════════════════ */

export function getStoriesWithHeroImage(
  stories: PresentationStory[],
  skus: PresentationSku[]
): StoryWithHeroImage[] {
  const skuIndex = new Map(skus.map((s) => [s.id, s]));

  return stories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((story) => {
      let heroImageUrl: string | null = null;
      let heroSkuName: string | null = null;

      if (story.hero_sku_id) {
        const sku = skuIndex.get(story.hero_sku_id);
        if (sku) {
          heroSkuName = sku.name;
          const rendered3d = sku.render_urls?.['3d'] ?? null;
          heroImageUrl = rendered3d ?? sku.render_url ?? sku.reference_image_url ?? null;
        }
      }

      return { story, heroImageUrl, heroSkuName };
    });
}

/**
 * Launch readiness % per category. Uses the `launch_tasks` table's
 * `status` column — a task is "done" when status === 'completed' or
 * 'approved'. Categories are preserved in insertion order of first
 * appearance to keep the slide stable.
 */
export function getLaunchReadiness(tasks: PresentationLaunchTask[]): LaunchReadiness | null {
  if (tasks.length === 0) return null;

  const catMap = new Map<string, { total: number; completed: number }>();
  let totalCompleted = 0;

  for (const task of tasks) {
    const cat = task.category || 'uncategorized';
    const done = task.status === 'completed' || task.status === 'approved';
    const bucket = catMap.get(cat) ?? { total: 0, completed: 0 };
    bucket.total += 1;
    if (done) {
      bucket.completed += 1;
      totalCompleted += 1;
    }
    catMap.set(cat, bucket);
  }

  const categories: LaunchReadinessCategory[] = Array.from(catMap.entries()).map(
    ([category, { total, completed }]) => ({
      category,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    })
  );

  return {
    overallPct: Math.round((totalCompleted / tasks.length) * 100),
    categories,
    totalTasks: tasks.length,
    completedTasks: totalCompleted,
  };
}

/** Group content_calendar entries by ISO week. Returns up to `limit` weeks
 *  starting at the earliest scheduled_date. */
export function getContentCalendarByWeek(
  entries: ContentCalendarEntry[],
  limit = 4
): CalendarWeek[] {
  if (entries.length === 0) return [];

  const sorted = entries
    .slice()
    .filter((e) => e.scheduled_date)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const weekMap = new Map<string, CalendarWeek>();

  for (const entry of sorted) {
    const date = new Date(entry.scheduled_date);
    if (isNaN(date.getTime())) continue;

    // ISO week start — Monday
    const day = date.getUTCDay() || 7;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - (day - 1));
    const mondayStr = monday.toISOString().slice(0, 10);

    const weekNumber = getIsoWeek(monday);
    const bucket = weekMap.get(mondayStr);

    if (bucket) {
      bucket.entries.push(entry);
    } else {
      weekMap.set(mondayStr, {
        weekNumber,
        weekLabel: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        startDate: mondayStr,
        entries: [entry],
      });
    }
  }

  return Array.from(weekMap.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit);
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Group sequence emails by sequence_id and order by position. */
export function getEmailSequencesGrouped(
  templates: EmailTemplateContent[]
): EmailSequenceGroup[] {
  const map = new Map<string, EmailSequenceGroup>();

  for (const t of templates) {
    if (!t.sequence_id) continue;
    const group = map.get(t.sequence_id);
    if (group) {
      group.emails.push(t);
    } else {
      map.set(t.sequence_id, {
        sequenceId: t.sequence_id,
        sequenceName: t.sequence_name ?? null,
        sequenceType: t.sequence_type ?? null,
        trigger: t.trigger ?? null,
        emails: [t],
      });
    }
  }

  const groups = Array.from(map.values());
  for (const group of groups) {
    group.emails.sort(
      (a: EmailTemplateContent, b: EmailTemplateContent) =>
        (a.sequence_position ?? 0) - (b.sequence_position ?? 0)
    );
  }
  return groups;
}

export function groupPaidCampaigns(campaigns: PresentationPaidCampaign[]): PaidCampaignGrouped[] {
  return campaigns.map((campaign) => ({
    campaign,
    totalBudget: campaign.budget ?? 0,
    adSetCount: Array.isArray(campaign.ad_sets) ? campaign.ad_sets.length : 0,
  }));
}

/* ═════════════════════════════════════════════════════════════════
   The main helper
   ═════════════════════════════════════════════════════════════════ */

export async function getMarketingPresentationData(
  collectionPlanId: string,
  userId: string
): Promise<MarketingPresentationData | null> {
  const ownership = await verifyOwnership(collectionPlanId, userId);
  if (!ownership.owned) return null;

  const setup = ownership.setupData ?? {};
  const launchDate = ownership.launchDate;

  // Fire every query in parallel.
  const [
    brandVoiceRes,
    storiesRes,
    pillarsRes,
    lookbookRes,
    dropsRes,
    commercialActionsRes,
    calendarRes,
    paidRes,
    launchRes,
    emailSequencesRes,
    skusRes,
    visualsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('brand_voice_config')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .maybeSingle(),

    supabaseAdmin
      .from('collection_stories')
      .select('id, name, narrative, editorial_hook, mood, tone, color_palette, hero_sku_id, priority_score_total, sort_order')
      .eq('collection_plan_id', collectionPlanId)
      .order('sort_order', { ascending: true }),

    supabaseAdmin
      .from('content_pillars')
      .select('*')
      .eq('collection_plan_id', collectionPlanId),

    supabaseAdmin
      .from('lookbook_pages')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('page_number', { ascending: true }),

    supabaseAdmin
      .from('drops')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('position', { ascending: true }),

    supabaseAdmin
      .from('commercial_actions')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('start_date', { ascending: true }),

    supabaseAdmin
      .from('content_calendar')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .order('scheduled_date', { ascending: true }),

    supabaseAdmin
      .from('paid_campaigns')
      .select('*')
      .eq('collection_plan_id', collectionPlanId),

    supabaseAdmin
      .from('launch_tasks')
      .select('id, title, category, status, priority, due_date')
      .eq('collection_plan_id', collectionPlanId),

    supabaseAdmin
      .from('email_templates_content')
      .select('*')
      .eq('collection_plan_id', collectionPlanId)
      .not('sequence_id', 'is', null)
      .order('sequence_position', { ascending: true }),

    supabaseAdmin
      .from('collection_skus')
      .select('id, name, family, pvp, render_urls, render_url, reference_image_url')
      .eq('collection_plan_id', collectionPlanId),

    supabaseAdmin
      .from('ai_generations')
      .select('id, generation_type, output_data, input_data, story_id, created_at')
      .eq('collection_plan_id', collectionPlanId)
      .eq('is_favorite', true)
      .in('generation_type', ['still_life', 'editorial', 'brand_model'])
      .order('created_at', { ascending: false })
      .limit(24),
  ]);

  // Stories + hero images
  const rawStories = (storiesRes.data ?? []) as PresentationStory[];
  const skus = (skusRes.data ?? []) as PresentationSku[];
  const stories = getStoriesWithHeroImage(rawStories, skus);

  // Pillars — typed as ContentPillar
  const pillars = (pillarsRes.data ?? []) as ContentPillar[];

  // Lookbook
  const lookbookPages = (lookbookRes.data ?? []) as LookbookPage[];

  // Drops
  const drops = ((dropsRes.data ?? []) as PresentationDrop[]).sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  // Commercial actions
  const commercialActions = (commercialActionsRes.data ?? []) as PresentationCommercialAction[];

  // Calendar — grouped by week (max 4)
  const calendarEntries = (calendarRes.data ?? []) as ContentCalendarEntry[];
  const contentCalendarWeeks = getContentCalendarByWeek(calendarEntries, 4);

  // Paid campaigns — grouped with ad_set count
  const paidCampaigns = groupPaidCampaigns((paidRes.data ?? []) as PresentationPaidCampaign[]);

  // Launch readiness
  const launchTasks = (launchRes.data ?? []) as PresentationLaunchTask[];
  const launchReadiness = getLaunchReadiness(launchTasks);

  // Email sequences
  const emailSequences = getEmailSequencesGrouped(
    (emailSequencesRes.data ?? []) as EmailTemplateContent[]
  );

  // Still life visuals — flatten output_data.images to one entry per image
  const stillLifeVisuals: PresentationStillLifeVisual[] = [];
  for (const gen of (visualsRes.data ?? []) as Array<{
    id: string;
    generation_type: string;
    output_data: { images?: Array<{ url: string }> } | null;
    input_data: { sku_name?: string } | null;
    story_id: string | null;
    created_at: string;
  }>) {
    const images = gen.output_data?.images ?? [];
    for (const img of images) {
      if (!img?.url) continue;
      stillLifeVisuals.push({
        id: gen.id,
        generation_type: gen.generation_type,
        asset_url: img.url,
        sku_name: gen.input_data?.sku_name ?? null,
        story_id: gen.story_id,
        created_at: gen.created_at,
      });
    }
  }

  // Post-launch analysis (from setup_data)
  const postLaunchRaw = (setup as { post_launch_analysis?: PresentationPostLaunchAnalysis }).post_launch_analysis ?? null;
  const postLaunchAnalysis = postLaunchRaw && postLaunchRaw.result ? postLaunchRaw : null;

  // isPastLaunch
  const isPastLaunch = launchDate ? new Date(launchDate).getTime() < Date.now() : false;

  return {
    brandVoice: (brandVoiceRes.data as BrandVoiceConfig | null) ?? null,
    stories,
    pillars,
    lookbookPages,
    drops,
    commercialActions,
    contentCalendarWeeks,
    paidCampaigns,
    launchReadiness,
    emailSequences,
    stillLifeVisuals,
    postLaunchAnalysis,
    isPastLaunch,
    launchDate,
  };
}

/* ═════════════════════════════════════════════════════════════════
   Slide visibility helper
   Consumers call this to decide which headings to render in the nav.
   ═════════════════════════════════════════════════════════════════ */

export interface MarketingSlideVisibility {
  brandVoice: boolean;
  stories: boolean;
  pillars: boolean;
  lookbook: boolean;
  drops: boolean;
  contentCalendar: boolean;
  paidGrowth: boolean;
  launchReadiness: boolean;
  emailSequences: boolean;
  retrospective: boolean;
}

export function getMarketingSlideVisibility(
  data: MarketingPresentationData
): MarketingSlideVisibility {
  const bv = data.brandVoice;
  const hasBrandVoice = !!(bv && (bv.personality || bv.tone || (bv.do_rules && bv.do_rules.length > 0)));

  return {
    brandVoice: hasBrandVoice,
    stories: data.stories.length > 0,
    pillars: data.pillars.length > 0,
    lookbook: data.lookbookPages.length > 0,
    drops: data.drops.length > 0,
    contentCalendar: data.contentCalendarWeeks.length > 0,
    paidGrowth: data.paidCampaigns.length > 0,
    launchReadiness: data.launchReadiness !== null,
    emailSequences: data.emailSequences.length > 0,
    retrospective: data.isPastLaunch && data.postLaunchAnalysis !== null,
  };
}
