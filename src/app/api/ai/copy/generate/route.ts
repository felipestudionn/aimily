import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

type CopyMode = 'product_description' | 'brand_story' | 'seo_meta' | 'email_template' | 'social_caption';

interface GenerateRequest {
  mode: CopyMode;
  brandContext: {
    brand_name?: string;
    tagline?: string;
    brand_story?: string;
    brand_voice?: { tone?: string; keywords?: string[]; personality?: string; doNot?: string[] };
    target_audience?: { demographics?: string; psychographics?: string; lifestyle?: string };
  };
  skuContext?: {
    name: string;
    category: string;
    family: string;
    pvp: number;
    notes?: string;
    colorways?: string[];
  };
  extraInstructions?: string;
  // For email templates
  emailType?: 'welcome' | 'launch' | 'cart_abandonment' | 'post_purchase';
  // For social captions
  platform?: 'instagram' | 'tiktok' | 'pinterest' | 'facebook';
}

function buildBrandSystemPrompt(ctx: GenerateRequest['brandContext']): string {
  const parts = ['You are an expert fashion copywriter. Write compelling, on-brand copy.'];
  if (ctx.brand_name) parts.push(`Brand: ${ctx.brand_name}`);
  if (ctx.tagline) parts.push(`Tagline: ${ctx.tagline}`);
  if (ctx.brand_voice) {
    if (ctx.brand_voice.tone) parts.push(`Tone: ${ctx.brand_voice.tone}`);
    if (ctx.brand_voice.personality) parts.push(`Personality: ${ctx.brand_voice.personality}`);
    if (ctx.brand_voice.keywords?.length) parts.push(`Key words to use: ${ctx.brand_voice.keywords.join(', ')}`);
    if (ctx.brand_voice.doNot?.length) parts.push(`Do NOT: ${ctx.brand_voice.doNot.join(', ')}`);
  }
  if (ctx.target_audience) {
    const ta = ctx.target_audience;
    if (ta.demographics) parts.push(`Target demographics: ${ta.demographics}`);
    if (ta.psychographics) parts.push(`Psychographics: ${ta.psychographics}`);
    if (ta.lifestyle) parts.push(`Lifestyle: ${ta.lifestyle}`);
  }
  return parts.join('\n');
}

function buildUserPrompt(req: GenerateRequest): string {
  const { mode, skuContext, extraInstructions } = req;

  switch (mode) {
    case 'product_description': {
      if (!skuContext) return 'Write a compelling fashion product description.';
      return [
        `Write a compelling product description for:`,
        `Product: ${skuContext.name}`,
        `Category: ${skuContext.category}`,
        `Family: ${skuContext.family}`,
        `Price: €${skuContext.pvp}`,
        skuContext.colorways?.length ? `Available colorways: ${skuContext.colorways.join(', ')}` : '',
        skuContext.notes ? `Designer notes: ${skuContext.notes}` : '',
        '',
        'Include: a catchy headline (max 8 words), a short description (2-3 sentences), key features as bullet points, and a materials/care note.',
        'Format as JSON: { "headline": "...", "description": "...", "features": ["..."], "care": "..." }',
        extraInstructions ? `\nAdditional instructions: ${extraInstructions}` : '',
      ].filter(Boolean).join('\n');
    }
    case 'brand_story': {
      return [
        'Write a compelling brand story / about page for a fashion brand.',
        req.brandContext.brand_story ? `Current draft to improve: ${req.brandContext.brand_story}` : '',
        '',
        'Include: a founding narrative (2-3 paragraphs), brand values, and a vision statement.',
        'Format as JSON: { "narrative": "...", "values": ["..."], "vision": "..." }',
        extraInstructions ? `\nAdditional instructions: ${extraInstructions}` : '',
      ].filter(Boolean).join('\n');
    }
    case 'seo_meta': {
      if (!skuContext) return 'Generate SEO meta tags for a fashion product.';
      return [
        `Generate SEO metadata for:`,
        `Product: ${skuContext.name}`,
        `Category: ${skuContext.category}`,
        `Price: €${skuContext.pvp}`,
        '',
        'Format as JSON: { "meta_title": "... (max 60 chars)", "meta_description": "... (max 155 chars)", "alt_text": "... (for product image)", "keywords": ["..."] }',
        extraInstructions ? `\nAdditional instructions: ${extraInstructions}` : '',
      ].filter(Boolean).join('\n');
    }
    case 'email_template': {
      const typeLabel = req.emailType || 'launch';
      return [
        `Write a ${typeLabel.replace('_', ' ')} email for a fashion brand.`,
        '',
        'Format as JSON: { "subject_line": "...", "preview_text": "...", "heading": "...", "body": "...", "cta_text": "...", "cta_url_placeholder": "..." }',
        extraInstructions ? `\nAdditional instructions: ${extraInstructions}` : '',
      ].filter(Boolean).join('\n');
    }
    case 'social_caption': {
      const platform = req.platform || 'instagram';
      return [
        `Write a ${platform} caption for a fashion brand post.`,
        skuContext ? `Product: ${skuContext.name} (${skuContext.category})` : '',
        '',
        `Platform: ${platform}`,
        platform === 'instagram' ? 'Include up to 15 relevant hashtags.' : '',
        platform === 'tiktok' ? 'Keep it short, trendy, Gen-Z friendly. Include 5 hashtags.' : '',
        platform === 'pinterest' ? 'Keyword-rich, descriptive, 2-3 sentences. Include 5 hashtags.' : '',
        '',
        'Format as JSON: { "caption": "...", "hashtags": ["..."], "cta": "..." }',
        extraInstructions ? `\nAdditional instructions: ${extraInstructions}` : '',
      ].filter(Boolean).join('\n');
    }
  }
}

// Use Claude for long-form (brand_story, product_description, email_template)
// Use Gemini for short-form (seo_meta, social_caption)
function isLongForm(mode: CopyMode): boolean {
  return ['product_description', 'brand_story', 'email_template'].includes(mode);
}

async function generateWithClaude(system: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
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
    const body: GenerateRequest = await req.json();
    const { mode, brandContext } = body;

    if (!mode || !brandContext) {
      return NextResponse.json(
        { error: 'mode and brandContext are required' },
        { status: 400 }
      );
    }

    const useClaude = isLongForm(mode);
    if (useClaude && !ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }
    if (!useClaude && !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const system = buildBrandSystemPrompt(brandContext);
    const userPrompt = buildUserPrompt(body);

    const rawText = useClaude
      ? await generateWithClaude(system, userPrompt)
      : await generateWithGemini(system, userPrompt);

    let parsed: unknown;
    try {
      parsed = parseJsonFromText(rawText);
    } catch {
      parsed = { raw: rawText };
    }

    return NextResponse.json({
      result: parsed,
      raw: rawText,
      model: useClaude ? 'claude-sonnet-4' : 'gemini-flash',
    });
  } catch (error) {
    console.error('Error generating copy:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
