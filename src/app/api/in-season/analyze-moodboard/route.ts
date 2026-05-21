/**
 * POST /api/in-season/analyze-moodboard
 *
 * Strategy-specific moodboard analysis · stricter prompt than the shared
 * /api/ai/analyze-moodboard. Felipe's rules:
 *
 * 1. NO INVENTING BRANDS. A brand is returned only when a logo or a
 *    signature characteristic (cut, hardware, pattern, label) is visibly
 *    identifiable. "Vibe matches Toteme" is NOT enough — Toteme would
 *    only land if visually confirmed.
 *
 * 2. SILHOUETTE = TREND, NOT PHOTO DETAIL. The model must abstract a
 *    photo into a broadly applicable silhouette trend (max 5 words),
 *    in fashion editor vocabulary. "Vestido midi al bies con cuello
 *    asimétrico envolvente y nudo pectoral" is FORBIDDEN. "Vestido midi
 *    al bies" or "Vestido drapeado fluido" is the level expected.
 *
 * 3. MATERIAL = TREND. Same rule — capture the texture/family trend,
 *    not the specific weight tied to one photo.
 *
 * Same response shape as the shared endpoint so CreativeBlock can read
 * keyItems / keyMaterials / keyColors / keyBrands without refactor.
 *
 * Auth: requires Strategy tenant access (analyst minRole) — NOT bound
 * to a collection plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, enforceAiUserRateLimit } from '@/lib/api-auth';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';

export const runtime = 'nodejs';
export const maxDuration = 90;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_VISION_MODEL = 'models/gemini-2.5-flash';
const SONNET_MODEL = 'claude-sonnet-4-20250514';
const BATCH_SIZE = 8;

interface ImageData {
  base64: string;
  mimeType: string;
}

interface AnalysisResult {
  keyColors: string[];
  keyBrands: string[];
  keyItems: string[];
  keyStyles: string[];
  keyMaterials: string[];
}

const SYSTEM_PROMPT = `You are a senior FASHION EDITOR writing for Vogue Business / Business of Fashion. You decode moodboards for fashion BUYERS who will use your output to seed Market Trends / Market Research for next-season buying.

PRIMARY MANDATE · ACCURACY ABOVE ALL.
Every pill you return becomes a market-research input. If it's wrong, it poisons the buy. If you are uncertain, omit — silence is better than noise. Coverage is not the goal; precision is.

CRITICAL RULES — failing any of these is a hard failure:

RULE 1 · DO NOT INVENT BRANDS.
- A brand goes into "keyBrands" ONLY when one of these is true:
  · a logo is visibly identifiable in the image
  · a signature hardware/pattern/cut is unmistakably from one specific brand (e.g. Bottega's woven Intrecciato, Loewe's puzzle bag silhouette, Jacquemus's mini-bag scale)
- If you cannot identify a brand with that level of certainty, return an EMPTY array for keyBrands. An empty array is the RIGHT answer when in doubt.
- "Feels like Toteme" / "The Row vibe" / "Khaite-coded" — FORBIDDEN. Vibe-matching is not identification.
- Felipe's rule: "si no sabes la marca, no añadas marca. Te inventas nombres y no me merece la pena."

RULE 2 · SILHOUETTE = ACCURATE TREND LABEL, NOT PHOTO DETAIL.
- keyItems is a list of SILHOUETTE TRENDS observable across the board, written as recognizable fashion editor labels.
- Each entry is 2-5 words. It must be:
  · PRECISE enough that a buyer/pattern-maker knows what to look for ("vestido midi al bies", NOT "vestido bonito").
  · GENERIC enough to apply across multiple garments, not glued to one photo's quirks ("vestido midi al bies", NOT "vestido midi al bies con cuello asimétrico envolvente y nudo pectoral").
- GOOD: "Vestido midi al bies", "Sastre relajado", "Trench corto estructurado", "Abrigo cocoon", "Falda tubo midi", "Camisa túnica fluida".
- BAD: "Vestido midi al bies con cuello asimétrico envolvente y nudo pectoral", "Blazer doble botonadura raglan con bolsillos de parche", "Look 14 del moodboard".
- Only include silhouettes you can actually SEE on the board. Do not guess silhouettes that "would fit the mood".

RULE 3 · MATERIAL = ACCURATE TREND LABEL.
- keyMaterials is the list of material/textile trends visible on the board. 2-4 words max.
- GOOD: "Bouclé wool", "Crêpe de chine fluido", "Punto compacto", "Cuero engrasado", "Sarga de algodón teñida en prenda", "Lana doble cara".
- BAD: "Bouclé wool 320gsm tejido en Italia con acabado raised" (too photo-specific), "Tejidos variados" (too vague).
- Only materials you can actually identify visually. If the texture is ambiguous, omit.

RULE 4 · STYLES = AESTHETIC PATTERN LABELS.
- keyStyles: 2-4 word labels for the dominant aesthetic patterns. Examples: "minimalismo editorial", "romántico contemporáneo", "tailoring fluido", "luxe deportivo".

RULE 5 · COLORS = name + hex, accurate to what's on the board.
- keyColors: each entry must include a color name AND a hex code that REPRESENTS THE ACTUAL COLOR seen, not a generic close match.
- Format: "Color Name (#RRGGBB)".
- Cover 4-7 dominant colors. If two photos share a near-identical tone, return one entry (the dominant one), not duplicates.

Output language: Spanish (Castilian) unless instructed otherwise.

Return ONLY valid JSON, no markdown wrapping, matching exactly:
{
  "keyColors": ["Color Name (#RRGGBB)"],
  "keyBrands": ["Brand Name"],
  "keyItems": ["Silhouette trend label"],
  "keyStyles": ["Aesthetic label"],
  "keyMaterials": ["Material trend label"]
}`;

const USER_PROMPT = `Analyze these moodboard images for a fashion buyer who will seed their Market Research with what you return.

Apply RULES 1-5 from the system prompt with zero exceptions. Accuracy beats coverage every single time.

Target counts (drop any item that doesn't meet the accuracy bar — empty/short arrays are correct when in doubt):
- keyColors: 4-7 (each MUST include hex)
- keyBrands: 0-5 (zero is fine; only visually identifiable brands)
- keyItems: 4-8 silhouette trend labels
- keyStyles: 2-4 aesthetic labels
- keyMaterials: 3-5 material trend labels

Begin output with the JSON object.`;

const LANG_INSTRUCTION_ES = '\n\nLANGUAGE: Respond entirely in Spanish (Castilian). Universal English fashion terms (mood board, drop, SKU, oversize, cropped, bias-cut, raglan, kimono sleeve, wrap, shirtdress, tunic, pleated, bouclé, jacquard) may stay in English.';

async function analyzeBatchSonnet(imageBatch: ImageData[], systemPrompt: string): Promise<AnalysisResult | null> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
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
  (content as Anthropic.ContentBlockParam[]).push({ type: 'text', text: USER_PROMPT });

  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
    temperature: 0.4,
  });
  const block = response.content[0];
  if (block.type !== 'text' || !block.text) throw new Error('Empty response from Sonnet');
  return extractJSON<AnalysisResult>(block.text);
}

async function analyzeBatchGemini(imageBatch: ImageData[], systemPrompt: string): Promise<AnalysisResult | null> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  for (const img of imageBatch) {
    parts.push({ inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.base64 } });
  }
  parts.push({ text: `${systemPrompt}\n\n${USER_PROMPT}` });

  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/${GEMINI_VISION_MODEL}:generateContent`);
  url.searchParams.set('key', GEMINI_API_KEY!);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision ${response.status}: ${errorText.slice(0, 200)}`);
  }
  const data = await response.json();
  if (data?.candidates?.[0]?.finishReason === 'SAFETY') throw new Error('Content blocked by safety filters');
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini Vision');
  return extractJSON<AnalysisResult>(text);
}

async function analyzeBatch(imageBatch: ImageData[], language?: 'en' | 'es'): Promise<AnalysisResult | null> {
  const systemPrompt = language === 'es' ? SYSTEM_PROMPT + LANG_INSTRUCTION_ES : SYSTEM_PROMPT;
  if (ANTHROPIC_API_KEY) {
    try {
      const r = await analyzeBatchSonnet(imageBatch, systemPrompt);
      if (r) return r;
    } catch (err) {
      console.warn('[Strategy Moodboard] Sonnet failed, falling back to Gemini:', (err as Error).message);
    }
  }
  if (GEMINI_API_KEY) {
    try {
      const r = await analyzeBatchGemini(imageBatch, systemPrompt);
      if (r) return r;
    } catch (err) {
      console.error('[Strategy Moodboard] Gemini fallback also failed:', (err as Error).message);
    }
  }
  return null;
}

function mergeResults(results: AnalysisResult[]): AnalysisResult {
  const dedupe = (xs: string[]) => Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));
  return {
    keyColors: dedupe(results.flatMap((r) => r.keyColors || [])).slice(0, 8),
    keyBrands: dedupe(results.flatMap((r) => r.keyBrands || [])).slice(0, 6),
    keyItems: dedupe(results.flatMap((r) => r.keyItems || [])).slice(0, 10),
    keyStyles: dedupe(results.flatMap((r) => r.keyStyles || [])).slice(0, 6),
    keyMaterials: dedupe(results.flatMap((r) => r.keyMaterials || [])).slice(0, 8),
  };
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'heavy-text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
    return NextResponse.json({ error: 'No AI provider configured for vision analysis' }, { status: 500 });
  }

  let body: {
    imageUrls?: string[];
    images?: ImageData[];
    language?: 'en' | 'es';
    tenantSlug?: string;
    tenantId?: string;
  } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantSlug = body?.tenantSlug;
  const tenantId = body?.tenantId;
  if (!tenantSlug && !tenantId) {
    return NextResponse.json({ error: 'tenantSlug or tenantId required' }, { status: 400 });
  }
  const access = await requireStrategyAccess({ tenantSlug, tenantId, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const rawImages = body?.images;
  const imageUrls = body?.imageUrls;
  if ((!rawImages || rawImages.length === 0) && (!imageUrls || imageUrls.length === 0)) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  }

  try {
    let images: ImageData[] = rawImages || [];
    if (imageUrls && imageUrls.length > 0) {
      const fetched = await Promise.all(
        imageUrls.map(async (url): Promise<ImageData | null> => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const buf = Buffer.from(await res.arrayBuffer());
            const mimeType = res.headers.get('content-type') || 'image/jpeg';
            return { base64: buf.toString('base64'), mimeType };
          } catch {
            return null;
          }
        })
      );
      images = [...images, ...fetched.filter((x): x is ImageData => x !== null)];
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'Could not load any images' }, { status: 400 });
    }

    const batches: ImageData[][] = [];
    for (let i = 0; i < images.length; i += BATCH_SIZE) batches.push(images.slice(i, i + BATCH_SIZE));

    const batchResults: AnalysisResult[] = [];
    for (const batch of batches) {
      const r = await analyzeBatch(batch, body?.language ?? 'es');
      if (r) batchResults.push(r);
    }

    if (batchResults.length === 0) {
      return NextResponse.json({ error: 'Failed to analyze any images' }, { status: 500 });
    }

    const final = batchResults.length === 1 ? batchResults[0] : mergeResults(batchResults);
    return NextResponse.json(final);
  } catch (error) {
    console.error('[Strategy Moodboard] error:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json({ error: norm.userMessage, code: norm.internalCode }, { status: norm.httpStatus });
  }
}
