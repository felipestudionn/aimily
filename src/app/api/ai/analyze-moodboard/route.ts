import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import Anthropic from '@anthropic-ai/sdk';
import { generateJSON, extractJSON } from '@/lib/ai/llm-client';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Gemini 2.5 Flash (full, not Lite) for vision fallback
const GEMINI_VISION_MODEL = 'models/gemini-2.5-flash';
const SONNET_MODEL = 'claude-sonnet-4-20250514';

// Max images per batch
const BATCH_SIZE = 8;

interface ImageData {
  base64: string;
  mimeType: string;
}

interface AnalysisResult {
  collectionName?: string;
  keyColors: string[];
  keyTrends: string[];
  keyBrands: string[];
  keyItems: string[];
  keyStyles: string[];
  keyMaterials: string[];
  seasonalFit: string;
  moodDescription: string;
  targetAudience: string;
}

const ANALYSIS_SYSTEM = `You are a senior creative director and trend analyst who has led collection development at Balenciaga, Celine, and The Row. You combine WGSN-level forecasting rigor with the editorial eye of a Vogue creative team.

TODAY'S DATE: March 2026
CURRENT RUNWAY CONTEXT:
- FW26 RTW — shown Feb-Mar 2026 (New York, London, Milan, Paris)
- SS26 — currently in stores
- PF26 — shipping to wholesale

ANALYSIS METHODOLOGY:
You don't describe images generically. You decode visual signals into actionable collection intelligence — the kind that would survive a buying committee at Net-a-Porter or a trend board at Inditex.

QUALITY RULES:
- Use Pantone-style color names with hex codes when possible (e.g., "Dusty Rose (#DCAE96)")
- Name real brands, real designers, real runway references — never generic
- Cite specific garment constructions, not vague descriptions ("raglan-sleeve oversized wool coat" not "nice coat")
- Materials must be specific: "bouclé wool 320gsm" not just "wool"
- Every trend must connect to verifiable runway/street/social signals
- FORBIDDEN generic words: "elevate", "curate", "versatile", "timeless", "effortless", "essential"

Return ONLY valid JSON, no markdown wrapping.`;

const ANALYSIS_USER = `Analyze these moodboard images as a professional trend report for collection development.

Look at EACH IMAGE carefully and extract:

1. **KEY COLORS** (5-7): Actual dominant + accent colors. Use Pantone-style names with hex when identifiable. Include the visual context where each color appears.

2. **KEY TRENDS** (3-5): Current fashion movements these images represent. Reference specific FW26/SS26 runway shows, designers, or social aesthetics. Be specific about silhouettes, proportions, styling.

3. **KEY BRANDS** (4-6): Brands with similar aesthetics RIGHT NOW. Mix: 1-2 luxury (The Row, Loro Piana, Bottega Veneta), 2-3 contemporary (COS, Totême, Jacquemus), 1-2 accessible (Zara, Mango). Only brands whose current collections match.

4. **KEY ITEMS** (5-8): Specific garments/accessories you SEE. Be precise with construction: "raglan-sleeve oversized double-faced wool coat" not "wool coat".

5. **KEY STYLES** (2-3): Broader aesthetic categories with specificity: "Post-Quiet Luxury: structured softness with visible craft" not just "Minimalism".

6. **KEY MATERIALS** (3-5): Fabrics and textures visible with weight/hand descriptions: "brushed cashmere blend 280gsm", "vegetable-tanned smooth calf leather".

7. **SEASONAL FIT**: Which season + why (SS26, Pre-Fall 2026, Resort 2026, or FW26).

8. **MOOD DESCRIPTION**: 3-4 sentences — the world this collection lives in. Who is she? Where does she go? What does she care about? Make it cinematic, not generic.

9. **TARGET AUDIENCE**: Demographics + psychographics + shopping behavior. Name real stores she shops at, real neighborhoods she lives in.

10. **COLLECTION NAME**: Evocative, original, not cliché. Think editorial headline, not marketing slogan.

Return JSON:
{
  "collectionName": "string",
  "keyColors": ["Color Name (#hex) — where seen in images"],
  "keyTrends": ["Trend: specific analysis with runway/cultural references"],
  "keyBrands": ["Brand — why it connects to this aesthetic"],
  "keyItems": ["Item — precise construction + material + styling detail"],
  "keyStyles": ["Style category: specific sub-description"],
  "keyMaterials": ["Material — weight/hand/origin if identifiable"],
  "seasonalFit": "Season — reasoning",
  "moodDescription": "Cinematic mood paragraph",
  "targetAudience": "Detailed audience profile"
}

CRITICAL: Base analysis on what you ACTUALLY SEE. Generic fashion advice = failure.`;

/**
 * Analyze moodboard images — Claude Sonnet (vision) primary, Gemini Flash fallback
 * Supports unlimited images by batching and merging results
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'No AI provider configured for vision analysis' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { images, language } = body as { images: ImageData[]; language?: 'en' | 'es' };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    console.log(`[Moodboard] Received ${images.length} images for analysis`);

    // Split images into batches
    const batches: ImageData[][] = [];
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      batches.push(images.slice(i, i + BATCH_SIZE));
    }

    console.log(`[Moodboard] Split into ${batches.length} batches of max ${BATCH_SIZE} images`);

    // Analyze each batch
    const batchResults: AnalysisResult[] = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`[Moodboard] Analyzing batch ${i + 1}/${batches.length}...`);
      const result = await analyzeBatch(batches[i], language);
      if (result) {
        batchResults.push(result);
      }
    }

    if (batchResults.length === 0) {
      return NextResponse.json(
        { error: 'Failed to analyze any images' },
        { status: 500 }
      );
    }

    // If only one batch, return directly
    if (batchResults.length === 1) {
      return NextResponse.json(batchResults[0]);
    }

    // Merge results from multiple batches using AI
    console.log(`[Moodboard] Merging ${batchResults.length} batch results...`);
    const mergedResult = await mergeAnalysisResults(batchResults, language);
    return NextResponse.json(mergedResult);

  } catch (error) {
    console.error('[Moodboard] Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// ─── Vision: Sonnet primary, Gemini Flash fallback ───

const LANG_INSTRUCTION_ES = '\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in Spanish (Castilian). ALL text content, descriptions, labels, names, recommendations, and explanations must be written in Spanish. Technical fashion terms universally used in English (e.g., "mood board", "drop", "SKU") may remain in English.';

async function analyzeBatch(imageBatch: ImageData[], language?: 'en' | 'es'): Promise<AnalysisResult | null> {
  const systemPrompt = language === 'es' ? ANALYSIS_SYSTEM + LANG_INSTRUCTION_ES : ANALYSIS_SYSTEM;

  // Try Sonnet first
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await analyzeBatchSonnet(imageBatch, systemPrompt);
      if (result) {
        console.log('[Moodboard] Batch analyzed with Sonnet');
        return result;
      }
    } catch (err) {
      console.warn('[Moodboard] Sonnet vision failed, trying Gemini:', (err as Error).message);
    }
  }

  // Fallback to Gemini Flash (vision)
  if (GEMINI_API_KEY) {
    try {
      const result = await analyzeBatchGemini(imageBatch, systemPrompt);
      if (result) {
        console.log('[Moodboard] Batch analyzed with Gemini Flash (fallback)');
        return result;
      }
    } catch (err) {
      console.error('[Moodboard] Gemini vision fallback also failed:', (err as Error).message);
    }
  }

  return null;
}

async function analyzeBatchSonnet(imageBatch: ImageData[], systemPrompt: string): Promise<AnalysisResult | null> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // Build content array with images + text
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  for (const img of imageBatch) {
    (content as Anthropic.ContentBlockParam[]).push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: (img.mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: img.base64,
      },
    });
  }

  (content as Anthropic.ContentBlockParam[]).push({
    type: 'text',
    text: ANALYSIS_USER,
  });

  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
    temperature: 0.7,
  });

  const block = response.content[0];
  if (block.type !== 'text' || !block.text) {
    throw new Error('Empty response from Sonnet');
  }

  return extractJSON<AnalysisResult>(block.text);
}

async function analyzeBatchGemini(imageBatch: ImageData[], systemPrompt: string): Promise<AnalysisResult | null> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  for (const img of imageBatch) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64,
      },
    });
  }

  parts.push({ text: `${systemPrompt}\n\n${ANALYSIS_USER}` });

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_VISION_MODEL}:generateContent`
  );
  url.searchParams.set('key', GEMINI_API_KEY!);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Content blocked by safety filters');
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini Vision');
  }

  return extractJSON<AnalysisResult>(text);
}

// ─── Merge multiple batch results using unified LLM client ───

async function mergeAnalysisResults(results: AnalysisResult[], language?: 'en' | 'es'): Promise<AnalysisResult> {
  const allColors = Array.from(new Set(results.flatMap(r => r.keyColors || [])));
  const allTrends = Array.from(new Set(results.flatMap(r => r.keyTrends || [])));
  const allBrands = Array.from(new Set(results.flatMap(r => r.keyBrands || [])));
  const allItems = Array.from(new Set(results.flatMap(r => r.keyItems || [])));
  const allStyles = Array.from(new Set(results.flatMap(r => r.keyStyles || [])));
  const allMaterials = Array.from(new Set(results.flatMap(r => r.keyMaterials || [])));
  const allMoods = results.map(r => r.moodDescription).filter(Boolean);
  const allAudiences = results.map(r => r.targetAudience).filter(Boolean);
  const allSeasons = results.map(r => r.seasonalFit).filter(Boolean);
  const allNames = results.map(r => r.collectionName).filter(Boolean);

  const system = `You are a senior creative director synthesizing multiple trend analysis reports into one cohesive collection direction. Your synthesis should feel like a single, decisive creative brief — not a committee average.`;

  const user = `Synthesize these batch analyses into ONE unified collection direction.

COLORS: ${allColors.join(' | ')}
TRENDS: ${allTrends.join(' | ')}
BRANDS: ${allBrands.join(' | ')}
ITEMS: ${allItems.join(' | ')}
STYLES: ${allStyles.join(' | ')}
MATERIALS: ${allMaterials.join(' | ')}
MOODS: ${allMoods.join(' | ')}
AUDIENCES: ${allAudiences.join(' | ')}
SEASONS: ${allSeasons.join(', ')}
COLLECTION NAMES: ${allNames.join(', ')}

Select the most cohesive elements. The result should feel like a single creative vision, not a mashup.

Return JSON:
{
  "collectionName": "one evocative name",
  "keyColors": [5-7 most cohesive],
  "keyTrends": [3-5 most relevant],
  "keyBrands": [4-6 most aligned],
  "keyItems": [6-8 key items],
  "keyStyles": [2-3 defining styles],
  "keyMaterials": [3-5 key materials],
  "seasonalFit": "most appropriate season",
  "moodDescription": "synthesized 3-4 sentence mood",
  "targetAudience": "unified audience profile"
}`;

  try {
    const { data } = await generateJSON<AnalysisResult>({
      system,
      user,
      temperature: 0.5,
      maxTokens: 4096,
      language,
    });
    return data;
  } catch (error) {
    console.error('[Moodboard] Merge synthesis failed:', error);
  }

  // Fallback: simple merge without AI
  return {
    collectionName: allNames[0] || 'Untitled Collection',
    keyColors: allColors.slice(0, 7),
    keyTrends: allTrends.slice(0, 5),
    keyBrands: allBrands.slice(0, 6),
    keyItems: allItems.slice(0, 8),
    keyStyles: allStyles.slice(0, 3),
    keyMaterials: allMaterials.slice(0, 5),
    seasonalFit: allSeasons[0] || 'SS26',
    moodDescription: allMoods[0] || 'A cohesive collection direction based on the moodboard analysis.',
    targetAudience: allAudiences[0] || 'Style-conscious consumers seeking contemporary fashion.',
  };
}
