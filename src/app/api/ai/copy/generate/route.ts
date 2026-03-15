import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

type CopyMode = 'product_description' | 'brand_story' | 'seo_meta' | 'email_template' | 'social_caption';

interface BrandVoice {
  tone?: string;
  keywords?: string[];
  personality?: string;
  doNot?: string[];
}

interface BrandContext {
  brand_name?: string;
  tagline?: string;
  brand_story?: string;
  brand_voice?: BrandVoice;
  target_audience?: { demographics?: string; psychographics?: string; lifestyle?: string };
}

interface SkuContext {
  name: string;
  category: string;
  family: string;
  pvp: number;
  notes?: string;
  colorways?: string[];
}

interface GenerateRequest {
  mode: CopyMode;
  brandContext: BrandContext;
  skuContext?: SkuContext;
  extraInstructions?: string;
  emailType?: 'welcome' | 'launch' | 'cart_abandonment' | 'post_purchase';
  platform?: 'instagram' | 'tiktok' | 'pinterest' | 'facebook';
}

function buildSystemPrompt(mode: CopyMode, bc: BrandContext): string {
  const brandBlock = [
    bc.brand_name ? `Brand: ${bc.brand_name}` : '',
    bc.tagline ? `Tagline: "${bc.tagline}"` : '',
    bc.brand_voice?.tone ? `Voice tone: ${bc.brand_voice.tone}` : '',
    bc.brand_voice?.personality ? `Brand personality: ${bc.brand_voice.personality}` : '',
    bc.brand_voice?.keywords?.length ? `Signature vocabulary: ${bc.brand_voice.keywords.join(', ')}` : '',
    bc.brand_voice?.doNot?.length ? `Never use: ${bc.brand_voice.doNot.join(', ')}` : '',
    bc.target_audience?.demographics ? `Target: ${bc.target_audience.demographics}` : '',
    bc.target_audience?.psychographics ? `Psychographics: ${bc.target_audience.psychographics}` : '',
    bc.target_audience?.lifestyle ? `Lifestyle: ${bc.target_audience.lifestyle}` : '',
  ].filter(Boolean).join('\n');

  const modePersonas: Record<CopyMode, string> = {
    product_description: `You are a senior fashion copywriter who has written product copy for Net-a-Porter, Matches Fashion, and Ssense. You understand how product language drives conversion — every word earns its place. You write copy that makes the reader feel the fabric, see the silhouette, and imagine themselves wearing it. Never generic, always specific.`,
    brand_story: `You are a brand strategist and narrative director who has built brand stories for emerging and established fashion houses. You craft founding narratives that feel authentic, not manufactured — stories that give consumers a reason to believe. You balance emotional resonance with commercial clarity.`,
    seo_meta: `You are a fashion e-commerce SEO specialist who has optimized product pages for top-tier fashion retailers. You write meta titles and descriptions that rank AND convert — balancing search intent keywords with compelling copy that earns the click. Every character counts.`,
    email_template: `You are a CRM and email marketing director for premium fashion brands. You write emails that feel personal, not promotional — subject lines that earn opens, body copy that drives clicks, and CTAs that feel like invitations, not demands. You understand the fashion purchase journey.`,
    social_caption: `You are a social media creative director for fashion brands. You write captions that stop the scroll — hooks that intrigue, copy that builds desire, and CTAs that feel natural. You know each platform's culture and adapt your voice accordingly.`,
  };

  return `${modePersonas[mode]}

BRAND CONTEXT:
${brandBlock}

QUALITY RULES:
- Write copy that could ONLY belong to this specific brand — not interchangeable with any competitor
- Use sensory language: textures, movements, temperatures, light
- Avoid these generic words: "elevate", "curate", "versatile", "timeless", "effortless", "essential" — find more specific alternatives
- Every sentence must do work: inform, persuade, or create desire
- Return ONLY raw JSON, no markdown wrapping, no explanation`;
}

function buildUserPrompt(req: GenerateRequest): string {
  const { mode, skuContext: sku, extraInstructions } = req;

  switch (mode) {
    case 'product_description': {
      const skuBlock = sku ? [
        `Product: ${sku.name}`,
        `Category: ${sku.category} | Family: ${sku.family}`,
        `Price point: €${sku.pvp}`,
        sku.colorways?.length ? `Colorways: ${sku.colorways.join(', ')}` : '',
        sku.notes ? `Designer notes: ${sku.notes}` : '',
      ].filter(Boolean).join('\n') : 'No specific product provided — write a template.';

      return `Write a product description that converts browsers into buyers.

${skuBlock}

Deliver JSON with this structure:
{
  "headline": "max 8 words — the hook that stops the scroll",
  "description": "2-3 sentences — make the reader feel the product",
  "features": ["3-5 bullet points — specific, not generic"],
  "care": "materials + care in 1-2 sentences"
}${extraInstructions ? `\n\nAdditional direction: ${extraInstructions}` : ''}`;
    }

    case 'brand_story': {
      return `Write a brand story that makes consumers feel like insiders.
${req.brandContext.brand_story ? `\nCurrent draft to refine:\n${req.brandContext.brand_story}` : ''}

Deliver JSON:
{
  "narrative": "2-3 paragraphs — the founding story, told with texture and conviction",
  "values": ["3-5 brand values — specific and ownable, not generic platitudes"],
  "vision": "1 sentence — where the brand is heading"
}${extraInstructions ? `\n\nAdditional direction: ${extraInstructions}` : ''}`;
    }

    case 'seo_meta': {
      const skuBlock = sku ? [
        `Product: ${sku.name}`,
        `Category: ${sku.category} | Family: ${sku.family}`,
        `Price: €${sku.pvp}`,
      ].filter(Boolean).join('\n') : 'Generate generic fashion product SEO.';

      return `Generate SEO metadata that ranks AND converts.

${skuBlock}

Deliver JSON:
{
  "meta_title": "max 60 chars — brand + product + key differentiator",
  "meta_description": "max 155 chars — search-intent keywords + compelling copy",
  "alt_text": "descriptive image alt text for the product photo",
  "keywords": ["8-12 long-tail keywords a buyer would search"]
}${extraInstructions ? `\n\nAdditional direction: ${extraInstructions}` : ''}`;
    }

    case 'email_template': {
      const typeLabel = (req.emailType || 'launch').replace('_', ' ');
      return `Write a ${typeLabel} email that feels personal, not promotional.

Deliver JSON:
{
  "subject_line": "max 50 chars — earn the open",
  "preview_text": "max 90 chars — complement the subject, don't repeat it",
  "heading": "the hero headline inside the email",
  "body": "2-3 short paragraphs — build desire, not pressure",
  "cta_text": "the button text — an invitation, not a demand",
  "cta_url_placeholder": "{{product_url}} or {{collection_url}}"
}${extraInstructions ? `\n\nAdditional direction: ${extraInstructions}` : ''}`;
    }

    case 'social_caption': {
      const platform = req.platform || 'instagram';
      const platformRules: Record<string, string> = {
        instagram: 'Instagram: max 2200 chars. Hook in first line (before "more"). Up to 15 hashtags. Use line breaks for readability.',
        tiktok: 'TikTok: short, punchy, trend-aware. Hook in 3 words. Max 5 hashtags. Gen-Z fluent but not try-hard.',
        pinterest: 'Pinterest: keyword-rich, descriptive, 2-3 sentences. SEO-optimized. 5 hashtags that match search terms.',
        facebook: 'Facebook: conversational, community-driven. Ask a question or spark discussion. 3-5 hashtags.',
      };

      return `Write a ${platform} caption that stops the scroll.
${sku ? `Product: ${sku.name} (${sku.category})` : ''}

Platform rules: ${platformRules[platform] || ''}

Deliver JSON:
{
  "caption": "the full caption text including line breaks",
  "hashtags": ["relevant hashtags without the # symbol"],
  "cta": "the call-to-action phrase"
}${extraInstructions ? `\n\nAdditional direction: ${extraInstructions}` : ''}`;
    }
  }
}

const TEMPERATURES: Record<CopyMode, number> = {
  product_description: 0.7,
  brand_story: 0.8,
  seo_meta: 0.5,
  email_template: 0.7,
  social_caption: 0.75,
};

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

    const system = buildSystemPrompt(mode, brandContext);
    const userPrompt = buildUserPrompt(body);

    const { data, model, fallback } = await generateJSON({
      system,
      user: userPrompt,
      temperature: TEMPERATURES[mode],
      language,
    });

    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Error generating copy:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
