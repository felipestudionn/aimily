import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { generateJSON } from '@/lib/ai/llm-client';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { renderPrompt } from '@/lib/prompts/prompt-context';
import { enforceHookDiversity } from '@/lib/marketing-validators';
import {
  buildPerformanceContext,
  formatPerformanceContextForPrompt,
} from '@/lib/performance-context';

type GenerateMode =
  | 'pillars_voice'
  | 'product_copy'
  | 'social_templates'
  | 'email_template'
  | 'email_sequence'
  | 'seo'
  | 'video_shotlist'
  | 'lookbook_compose';

type CopyContext =
  | 'pdp'
  | 'ad_hook'
  | 'landing_hero'
  | 'email_mention'
  | 'sms_tease'
  | 'push_notification';

interface StoryContext {
  name: string;
  narrative?: string;
  mood?: string[];
  tone?: string;
  color_palette?: string[];
}

interface BrandContext {
  brand_name?: string;
  tagline?: string;
  brand_story?: string;
  brand_voice?: { tone?: string; keywords?: string[]; personality?: string; doNot?: string[] };
  target_audience?: { demographics?: string; psychographics?: string; lifestyle?: string };
}

interface SkuContext {
  name: string;
  category: string;
  family: string;
  pvp: number;
  notes?: string;
  colorways?: string[];
  materials?: string;
  type?: string;
}

interface GenerateRequest {
  mode: GenerateMode;
  collectionPlanId: string;
  brandContext: BrandContext;
  stories?: StoryContext[];
  storyContext?: StoryContext;
  skuContext?: SkuContext;
  contentPillars?: string;
  brandVoiceSummary?: string;
  platform?: string;
  emailType?: string;
  season?: string;
  userDirection?: string;
  extraInstructions?: string;
  // B2 — product_copy context variant
  copyContext?: CopyContext;
  // B1 — email sequence
  sequenceType?: 'welcome' | 'launch' | 'post_purchase' | 're_engagement';
  heroSkuName?: string;
  heroSkuPvp?: number;
  launchDate?: string;
  dropName?: string;
  // B5 — video shotlist
  hookType?: 'curiosity' | 'story' | 'value' | 'contrarian';
  // Kling 2.1 Pro supports 5s/10s; older Reels-generic 15/30 kept for
  // backwards compat if a future provider wants longer clips.
  durationSeconds?: 5 | 10 | 15 | 30;
  // C5 — SEO buyer stage
  buyerStage?: 'awareness' | 'consideration' | 'decision' | 'implementation';
  // B6 — lookbook compose
  targetPages?: number;
  availableVisuals?: Array<{
    id: string;
    url: string;
    type?: 'render' | 'still_life' | 'editorial' | 'detail';
    sku_id?: string;
    caption?: string;
  }>;
  copySnippets?: string;
}

function buildPromptForMode(req: GenerateRequest): { system: string; user: string } {
  const bc = req.brandContext;

  switch (req.mode) {
    case 'pillars_voice': {
      const flatCtx: Record<string, unknown> = {
        brand_name: bc.brand_name || 'Unknown',
        brand_voice_tone: bc.brand_voice?.tone || '',
        brand_voice_personality: bc.brand_voice?.personality || '',
        brand_values: '',
        consumer_demographics: bc.target_audience?.demographics || '',
        consumer_psychographics: bc.target_audience?.psychographics || '',
        consumer_lifestyle: bc.target_audience?.lifestyle || '',
        collection_vibe: '',
        season: req.season || '',
        reference_brands: '',
        selected_trends: '',
        stories: req.stories || [],
        user_direction: req.userDirection || '',
      };
      return {
        system: MARKETING_PROMPTS.pillars_generate.system,
        user: renderPrompt(MARKETING_PROMPTS.pillars_generate.user, flatCtx),
      };
    }

    case 'product_copy': {
      const sc = req.storyContext;
      const sku = req.skuContext;
      const flatCtx: Record<string, unknown> = {
        brand_name: bc.brand_name || 'Unknown',
        brand_voice_tone: bc.brand_voice?.tone || '',
        brand_voice_personality: bc.brand_voice?.personality || '',
        brand_voice_keywords: bc.brand_voice?.keywords?.join(', ') || '',
        brand_voice_donot: bc.brand_voice?.doNot?.join(', ') || '',
        consumer_demographics: bc.target_audience?.demographics || '',
        consumer_psychographics: bc.target_audience?.psychographics || '',
        consumer_lifestyle: bc.target_audience?.lifestyle || '',
        story_name: sc?.name || '',
        story_narrative: sc?.narrative || 'N/A',
        story_mood: sc?.mood?.join(', ') || 'N/A',
        story_tone: sc?.tone || 'N/A',
        sku_name: sku?.name || 'Fashion product',
        sku_category: sku?.category || '',
        sku_family: sku?.family || '',
        sku_pvp: sku?.pvp || 0,
        sku_colorways: sku?.colorways?.join(', ') || '',
        sku_materials: sku?.materials || '',
        sku_type: sku?.type || 'REVENUE',
        sku_notes: sku?.notes || '',
        copy_context: req.copyContext || 'pdp',
        extra_instructions: req.extraInstructions || '',
      };
      return {
        system: MARKETING_PROMPTS.product_copy.system,
        user: renderPrompt(MARKETING_PROMPTS.product_copy.user, flatCtx),
      };
    }

    case 'social_templates': {
      const sc = req.storyContext;
      const platform = req.platform || 'instagram';
      const platformInstructions: Record<string, string> = {
        instagram: 'Instagram-optimized. Max 2200 chars. Include up to 15 relevant hashtags. Use line breaks for readability.',
        tiktok: 'TikTok-optimized. Short, trendy, hook in first line. Max 5 hashtags.',
        pinterest: 'Pinterest-optimized. Keyword-rich, descriptive, 2-3 sentences. SEO-friendly. 5 hashtags.',
        facebook: 'Facebook-optimized. Conversational tone. Encourage engagement. 3-5 hashtags.',
      };
      const flatCtx: Record<string, unknown> = {
        brand_voice_summary: req.brandVoiceSummary || bc.brand_voice?.personality || 'Fashion-forward, aspirational',
        content_pillars_summary: req.contentPillars || 'Not defined yet',
        story_name: sc?.name || 'Collection',
        story_mood: sc?.mood?.join(', ') || 'N/A',
        story_tone: sc?.tone || 'N/A',
        story_skus_summary: '',
        platform,
        platform_specific_instructions: platformInstructions[platform] || '',
        extra_instructions: req.extraInstructions || '',
      };
      return {
        system: MARKETING_PROMPTS.social_templates.system,
        user: renderPrompt(MARKETING_PROMPTS.social_templates.user, flatCtx),
      };
    }

    case 'email_template': {
      const sc = req.storyContext;
      const flatCtx: Record<string, unknown> = {
        brand_name: bc.brand_name || 'Fashion Brand',
        brand_voice_summary: req.brandVoiceSummary || bc.brand_voice?.personality || 'Aspirational, refined',
        email_type: (req.emailType || 'launch').replace('_', ' '),
        story_name: sc?.name || '',
        story_narrative: sc?.narrative || 'N/A',
        hero_sku_name: '',
        hero_sku_pvp: '',
        story_skus_summary: '',
        extra_instructions: req.extraInstructions || '',
      };
      return {
        system: MARKETING_PROMPTS.email_templates.system,
        user: renderPrompt(MARKETING_PROMPTS.email_templates.user, flatCtx),
      };
    }

    case 'seo': {
      const sku = req.skuContext;
      const sc = req.storyContext;
      const flatCtx: Record<string, unknown> = {
        sku_name: sku?.name || 'Fashion product',
        sku_category: sku?.category || '',
        sku_family: sku?.family || '',
        sku_pvp: sku?.pvp || 0,
        brand_name: bc.brand_name || 'Fashion Brand',
        story_name: sc?.name || '',
        story_narrative: sc?.narrative || 'N/A',
        season: req.season || '',
        consumer_demographics: bc.target_audience?.demographics || '',
        buyer_stage: req.buyerStage || 'decision',
        extra_instructions: req.extraInstructions || '',
      };
      return {
        system: MARKETING_PROMPTS.seo_generate.system,
        user: renderPrompt(MARKETING_PROMPTS.seo_generate.user, flatCtx),
      };
    }

    case 'email_sequence': {
      const sc = req.storyContext;
      const flatCtx: Record<string, unknown> = {
        brand_name: bc.brand_name || 'Fashion Brand',
        brand_voice_summary:
          req.brandVoiceSummary || bc.brand_voice?.personality || 'Aspirational, refined',
        consumer_demographics: bc.target_audience?.demographics || '',
        consumer_psychographics: bc.target_audience?.psychographics || '',
        consumer_lifestyle: bc.target_audience?.lifestyle || '',
        sequence_type: req.sequenceType || 'welcome',
        story_name: sc?.name || '',
        story_narrative: sc?.narrative || '',
        hero_sku_name: req.heroSkuName || '',
        hero_sku_pvp: req.heroSkuPvp ?? '',
        launch_date: req.launchDate || '',
        drop_name: req.dropName || '',
      };
      return {
        system: MARKETING_PROMPTS.email_sequence_generate.system,
        user: renderPrompt(MARKETING_PROMPTS.email_sequence_generate.user, flatCtx),
      };
    }

    case 'video_shotlist': {
      const sku = req.skuContext;
      const sc = req.storyContext;
      const flatCtx: Record<string, unknown> = {
        brand_name: bc.brand_name || 'Fashion Brand',
        brand_voice_personality: bc.brand_voice?.personality || '',
        story_name: sc?.name || '',
        story_narrative: sc?.narrative || '',
        sku_name: sku?.name || 'Fashion product',
        sku_category: sku?.category || '',
        sku_pvp: sku?.pvp || 0,
        hook_type: req.hookType || 'value',
        platform: req.platform || 'reels',
        // Default to 10 — matches Kling 2.1 Pro max and is the most common
        // ask from CampaignVideoCard. Caller normally passes explicitly.
        duration_seconds: req.durationSeconds || 10,
      };
      return {
        system: MARKETING_PROMPTS.video_ad_structured.system,
        user: renderPrompt(MARKETING_PROMPTS.video_ad_structured.user, flatCtx),
      };
    }

    case 'lookbook_compose': {
      const sc = req.storyContext;
      const visuals = req.availableVisuals || [];
      const flatCtx: Record<string, unknown> = {
        story_name: sc?.name || 'Main Lookbook',
        story_narrative: sc?.narrative || '',
        story_mood: sc?.mood?.join(', ') || '',
        story_tone: sc?.tone || '',
        brand_voice_summary:
          req.brandVoiceSummary || bc.brand_voice?.personality || 'Aspirational, refined',
        target_pages: req.targetPages ?? 8,
        visual_count: visuals.length,
        visuals_json: JSON.stringify(visuals, null, 2),
        copy_snippets: req.copySnippets || '(none)',
      };
      return {
        system: MARKETING_PROMPTS.lookbook_compose.system,
        user: renderPrompt(MARKETING_PROMPTS.lookbook_compose.user, flatCtx),
      };
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body: GenerateRequest & { language?: 'en' | 'es' } = await req.json();
    const { collectionPlanId, mode, brandContext, language } = body;

    if (!collectionPlanId || !mode || !brandContext) {
      return NextResponse.json(
        { error: 'collectionPlanId, mode and brandContext are required' },
        { status: 400 },
      );
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId,
      permission: 'generate_ai_marketing',
    });
    if (!perm.allowed) return perm.error!;

    const usage = await checkAIUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const prompt = buildPromptForMode(body);

    // C7 — append performance signals to modes that benefit from them
    // (social_templates, email_sequence). Keeps the foundation prompts
    // unchanged; the feedback is injected as a trailing instruction block.
    let userWithPerf = prompt.user;
    if (mode === 'social_templates' || mode === 'email_sequence') {
      const perfSummary = await buildPerformanceContext(collectionPlanId);
      const perfBlock = formatPerformanceContextForPrompt(perfSummary);
      if (perfBlock) {
        userWithPerf = `${userWithPerf}\n\n${perfBlock}`;
      }
    }

    let { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: userWithPerf,
      temperature: 0.7,
      language,
    });

    // B4 — hook diversity enforcement for social_templates + email_sequence.
    // If the first pass doesn't diversify hook_type enough across the set,
    // make a single corrective second pass. Never loop — one retry max to
    // avoid runaway costs.
    let hookDiversityRetried = false;
    if (mode === 'social_templates' || mode === 'email_sequence') {
      const items =
        mode === 'social_templates'
          ? (data as { templates?: Array<{ hook_type?: string }> })?.templates
          : (data as { sequence?: { emails?: Array<{ hook_type?: string }> } })?.sequence
              ?.emails;

      if (Array.isArray(items) && items.length > 0) {
        const check = enforceHookDiversity(items);
        if (!check.passed && !hookDiversityRetried) {
          hookDiversityRetried = true;
          const correction =
            `Your previous output used only ${check.distinctTypes} distinct hook types across ${items.length} items (reason: ${check.reason}). ` +
            `Regenerate with at least ${check.required} distinct hook types (curiosity, story, value, contrarian). ` +
            `Make sure NO single hook type appears more than ${Math.ceil(items.length / 2)} times.`;
          const retry = await generateJSON({
            system: prompt.system,
            user: userWithPerf + '\n\nCORRECTIVE INSTRUCTION: ' + correction,
            temperature: 0.8,
            language,
          });
          data = retry.data;
          model = retry.model;
          fallback = retry.fallback;
        }
      }
    }

    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_CONTENT_STRATEGY,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: { mode, model, fallback, language, hookDiversityRetried },
    });

    return NextResponse.json({
      result: data,
      model: model === 'haiku' ? 'claude-haiku' : 'gemini-flash',
      fallback,
    });
  } catch (error) {
    console.error('Error generating content strategy:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
