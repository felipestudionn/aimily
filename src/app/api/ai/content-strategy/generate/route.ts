import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { renderPrompt } from '@/lib/prompts/prompt-context';

type GenerateMode = 'pillars_voice' | 'product_copy' | 'social_templates' | 'email_template' | 'seo';

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
        extra_instructions: req.extraInstructions || '',
      };
      return {
        system: MARKETING_PROMPTS.seo_generate.system,
        user: renderPrompt(MARKETING_PROMPTS.seo_generate.user, flatCtx),
      };
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body: GenerateRequest & { language?: 'en' | 'es' } = await req.json();
    const { mode, brandContext, language } = body;

    if (!mode || !brandContext) {
      return NextResponse.json({ error: 'mode and brandContext are required' }, { status: 400 });
    }

    const prompt = buildPromptForMode(body);

    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.7,
      language,
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
