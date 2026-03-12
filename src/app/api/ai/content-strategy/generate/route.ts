import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

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

function buildPillarsVoicePrompt(req: GenerateRequest): { system: string; user: string } {
  const bc = req.brandContext;
  const system = `You are a brand strategist defining the editorial voice and content pillars for a fashion brand's marketing.

BRAND CONTEXT:
- Name: ${bc.brand_name || 'Unknown'}
${bc.tagline ? `- Tagline: ${bc.tagline}` : ''}
${bc.brand_voice?.personality ? `- Personality: ${bc.brand_voice.personality}` : ''}
${bc.brand_voice?.tone ? `- Tone: ${bc.brand_voice.tone}` : ''}
${bc.target_audience?.demographics ? `- Target: ${bc.target_audience.demographics}` : ''}
${bc.target_audience?.psychographics ? `- Psychographics: ${bc.target_audience.psychographics}` : ''}
${bc.target_audience?.lifestyle ? `- Lifestyle: ${bc.target_audience.lifestyle}` : ''}`;

  const storiesSection = req.stories?.length
    ? `\nSTORIES DEFINED:\n${req.stories.map(s => `- "${s.name}": ${s.narrative || 'No narrative'} — Mood: ${s.mood?.join(', ') || 'N/A'}`).join('\n')}`
    : '';

  const user = `${storiesSection}
${req.userDirection ? `\nUSER DIRECTION: ${req.userDirection}` : ''}

TASK:
1. Define 3-5 CONTENT PILLARS — recurring themes that anchor all content
2. Define BRAND VOICE GUIDELINES — how the brand speaks
3. Define TONE VARIATIONS per story — same voice, different tone

OUTPUT (JSON):
{
  "content_pillars": [
    {
      "name": "Pillar Name",
      "description": "What this pillar covers",
      "examples": ["Example post topic", "Example email angle"],
      "stories_alignment": ["Which stories this pillar maps to"]
    }
  ],
  "brand_voice": {
    "personality": "3-5 adjective description",
    "tone": "Overall tone description",
    "do_rules": ["Writing style rules to follow"],
    "dont_rules": ["Things to avoid"],
    "vocabulary": ["Key words/phrases to use"],
    "example_caption": "A sample social media caption in this voice"
  },
  "story_tones": [
    {
      "story_name": "Story Name",
      "tone_variation": "How voice adapts for this story",
      "sample_headline": "Example headline for this story"
    }
  ]
}`;

  return { system, user };
}

function buildProductCopyPrompt(req: GenerateRequest): { system: string; user: string } {
  const bc = req.brandContext;
  const system = `You are an expert fashion copywriter. Write compelling, on-brand copy.

BRAND VOICE:
- Name: ${bc.brand_name || 'Unknown'}
${bc.brand_voice?.tone ? `- Tone: ${bc.brand_voice.tone}` : ''}
${bc.brand_voice?.personality ? `- Personality: ${bc.brand_voice.personality}` : ''}
${bc.brand_voice?.keywords?.length ? `- Keywords to use: ${bc.brand_voice.keywords.join(', ')}` : ''}
${bc.brand_voice?.doNot?.length ? `- Do NOT: ${bc.brand_voice.doNot.join(', ')}` : ''}
${bc.target_audience?.demographics ? `- Target: ${bc.target_audience.demographics}` : ''}
${req.brandVoiceSummary ? `\nBRAND VOICE CONFIG: ${req.brandVoiceSummary}` : ''}
${req.contentPillars ? `\nCONTENT PILLARS: ${req.contentPillars}` : ''}`;

  const sc = req.storyContext;
  const sku = req.skuContext;

  const user = `${sc ? `\nSTORY CONTEXT (this product belongs to "${sc.name}"):\n- Narrative: ${sc.narrative || 'N/A'}\n- Mood: ${sc.mood?.join(', ') || 'N/A'}\n- Tone: ${sc.tone || 'N/A'}` : ''}

Write a compelling product description for:
Product: ${sku?.name || 'Fashion product'}
${sku?.category ? `Category: ${sku.category} / Family: ${sku.family}` : ''}
${sku?.pvp ? `Price: €${sku.pvp}` : ''}
${sku?.colorways?.length ? `Colorways: ${sku.colorways.join(', ')}` : ''}
${sku?.materials ? `Materials: ${sku.materials}` : ''}
${sku?.type ? `Type: ${sku.type}` : ''}
${sku?.notes ? `Designer notes: ${sku.notes}` : ''}

Include: headline (max 8 words), short description (2-3 sentences that evoke the story mood), key features as bullet points, materials/care note.
Format as JSON: { "headline": "...", "description": "...", "features": ["..."], "care": "..." }
${req.extraInstructions ? `\nAdditional instructions: ${req.extraInstructions}` : ''}`;

  return { system, user };
}

function buildSocialTemplatesPrompt(req: GenerateRequest): { system: string; user: string } {
  const system = `You are a social media strategist for a fashion brand.

BRAND VOICE: ${req.brandVoiceSummary || req.brandContext.brand_voice?.personality || 'Fashion-forward, aspirational'}
CONTENT PILLARS: ${req.contentPillars || 'Not defined yet'}`;

  const sc = req.storyContext;
  const platform = req.platform || 'instagram';

  const platformInstructions: Record<string, string> = {
    instagram: 'Instagram-optimized. Max 2200 chars. Include up to 15 relevant hashtags. Use line breaks for readability.',
    tiktok: 'TikTok-optimized. Short, trendy, Gen-Z friendly. Max 5 hashtags. Hook in first line.',
    pinterest: 'Pinterest-optimized. Keyword-rich, descriptive, 2-3 sentences. SEO-friendly. 5 hashtags.',
    facebook: 'Facebook-optimized. Conversational tone. Encourage engagement. 3-5 hashtags.',
  };

  const user = `Create social media templates for the "${sc?.name || 'Collection'}" story.
${sc?.narrative ? `Story narrative: ${sc.narrative}` : ''}
${sc?.mood?.length ? `Story mood: ${sc.mood.join(', ')}` : ''}
${sc?.tone ? `Story tone: ${sc.tone}` : ''}

Platform: ${platform}
${platformInstructions[platform] || ''}

Generate 5 caption templates that:
1. Align with the story's mood and tone
2. Reference content pillars where natural
3. Are ready to use (just swap product specifics)
4. Include hashtag strategy for this story

Format as JSON:
{
  "templates": [
    {
      "type": "product_feature" | "lifestyle" | "behind_the_scenes" | "styling_tip" | "story_narrative",
      "caption": "...",
      "hashtags": ["..."],
      "cta": "...",
      "best_paired_with": "render | lifestyle | editorial | video"
    }
  ],
  "story_hashtag_set": ["Core hashtags for this story"]
}
${req.extraInstructions ? `\nAdditional instructions: ${req.extraInstructions}` : ''}`;

  return { system, user };
}

function buildEmailTemplatePrompt(req: GenerateRequest): { system: string; user: string } {
  const bc = req.brandContext;
  const system = `You are an email marketing specialist for fashion brands.

BRAND: ${bc.brand_name || 'Fashion Brand'}
VOICE: ${req.brandVoiceSummary || bc.brand_voice?.personality || 'Aspirational, refined'}`;

  const emailType = req.emailType || 'launch';
  const sc = req.storyContext;

  const user = `Create a ${emailType.replace('_', ' ')} email for the collection launch.
${sc ? `This email announces the "${sc.name}" story drop.\nStory: ${sc.narrative || 'N/A'}\nMood: ${sc.mood?.join(', ') || 'N/A'}` : ''}
${req.season ? `Season: ${req.season}` : ''}

Format as JSON: {
  "subject_line": "...",
  "preview_text": "...",
  "heading": "...",
  "body": "...",
  "cta_text": "...",
  "cta_url_placeholder": "..."
}
${req.extraInstructions ? `\nAdditional instructions: ${req.extraInstructions}` : ''}`;

  return { system, user };
}

function buildSeoPrompt(req: GenerateRequest): { system: string; user: string } {
  const bc = req.brandContext;
  const sku = req.skuContext;
  const sc = req.storyContext;

  const system = 'You are an SEO specialist for fashion e-commerce.';

  const user = `Generate SEO metadata for:
Product: ${sku?.name || 'Fashion product'}
${sku?.category ? `Category: ${sku.category} / Family: ${sku.family}` : ''}
${sku?.pvp ? `Price: €${sku.pvp}` : ''}
Brand: ${bc.brand_name || 'Fashion Brand'}
${sc ? `Story: "${sc.name}" — ${sc.narrative || 'N/A'}` : ''}
${req.season ? `Season: ${req.season}` : ''}
${bc.target_audience?.demographics ? `Target market: ${bc.target_audience.demographics}` : ''}

Format as JSON: {
  "meta_title": "... (max 60 chars, include brand + product + key attribute)",
  "meta_description": "... (max 155 chars, compelling + story reference)",
  "alt_text": "... (descriptive for accessibility)",
  "keywords": ["... (10-15 relevant keywords)"],
  "og_title": "... (for social sharing)",
  "og_description": "... (for social sharing)"
}
${req.extraInstructions ? `\nAdditional instructions: ${req.extraInstructions}` : ''}`;

  return { system, user };
}

// Claude for long-form: pillars_voice, product_copy, email_template
// Gemini for short-form: social_templates, seo
function useClaude(mode: GenerateMode): boolean {
  return ['pillars_voice', 'product_copy', 'email_template'].includes(mode);
}

async function generateWithClaude(system: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

async function generateWithGemini(system: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleaned);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body: GenerateRequest = await req.json();
    const { mode, brandContext } = body;

    if (!mode || !brandContext) {
      return NextResponse.json({ error: 'mode and brandContext are required' }, { status: 400 });
    }

    const useClaudeModel = useClaude(mode);
    if (useClaudeModel && !ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }
    if (!useClaudeModel && !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    let prompt: { system: string; user: string };
    switch (mode) {
      case 'pillars_voice':
        prompt = buildPillarsVoicePrompt(body);
        break;
      case 'product_copy':
        prompt = buildProductCopyPrompt(body);
        break;
      case 'social_templates':
        prompt = buildSocialTemplatesPrompt(body);
        break;
      case 'email_template':
        prompt = buildEmailTemplatePrompt(body);
        break;
      case 'seo':
        prompt = buildSeoPrompt(body);
        break;
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }

    const rawText = useClaudeModel
      ? await generateWithClaude(prompt.system, prompt.user)
      : await generateWithGemini(prompt.system, prompt.user);

    let parsed: unknown;
    try {
      parsed = parseJsonFromText(rawText);
    } catch {
      parsed = { raw: rawText };
    }

    return NextResponse.json({
      result: parsed,
      raw: rawText,
      model: useClaudeModel ? 'claude-sonnet-4' : 'gemini-flash',
    });
  } catch (error) {
    console.error('Error generating content strategy:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
