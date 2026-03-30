import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Sketch from Reference Photo

   APPAREL: OpenAI gpt-image-1 image edits (front view, faithful to ref)
   FOOTWEAR: 3-step pipeline:
     1. Gemini Vision → detailed text description of shoe construction
     2. Two parallel OpenAI gpt-image-1 GENERATIONS (text-to-image):
        - Side profile view
        - Top-down bird's eye view
     No reference image in step 2 = no angle replication.
     GPT-image-1 has superior prompt adherence for angle control.
   ═══════════════════════════════════════════════════════════ */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface RequestBody {
  images: Array<{ base64: string; mimeType: string; instructions: string }>;
  garmentType: string;
  season: string;
  styleName: string;
  fabric: string;
  additionalNotes: string;
}

/* ── Gemini Vision → describe shoe construction ── */
async function describeShoeWithGemini(base64: string, mimeType: string, styleName: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const url = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  url.searchParams.set('key', GEMINI_API_KEY);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: mimeType || 'image/png', data: base64 } },
          { text: `You are a footwear technical designer. From this photo, describe the shoe's CONSTRUCTION for a patternmaker to recreate it.

CRITICAL: Describe ONE shoe as a physical object. Do NOT mention the photo, its angle, how many shoes are shown, or the background. A patternmaker needs to know what to BUILD.

Describe:
1. TYPE: sneaker/sandal/boot/flat/runner, low/mid/high-top
2. SILHOUETTE: toe shape (round/pointed/split-toe), overall profile curve
3. UPPER: panel layout, number of pieces, overlays, cutouts, mesh areas, perforations
4. CLOSURE: laces/velcro strap/slip-on, eyelet count, strap width & placement
5. TONGUE: shape, attached/floating, visible padding
6. COLLAR: padded/raw, height, shape
7. SOLE: midsole thickness, outsole material, foxing, mudguard
8. HEEL: counter shape, pull tab, backstay
9. BRANDING: logo type & placement (lateral swoosh, tongue logo, heel text)
10. SPECIAL: split-toe, open-toe, sock-like, tabi-style, etc.

Style name: ${styleName || 'N/A'}

Output ONLY the description. Be precise and concise.` },
        ],
      }],
    }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/* ── OpenAI gpt-image-1 text-to-image generation (NO reference image) ── */
async function generateSketchOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI generation error: ${res.status} — ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    const imgRes = await fetch(data.data[0].url);
    const buf = await imgRes.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  }
  throw new Error('No image in OpenAI response');
}

/* ── Build view-specific prompts ── */
function buildSidePrompt(description: string, styleName: string): string {
  return `Technical flat sketch of a shoe for a factory tech pack.

VIEW: Side profile. The shoe is seen from the LEFT SIDE, pointing left, resting flat on a horizontal ground line. Full lateral view.

SHOE DESIGN: ${description}${styleName ? ` (Style: ${styleName})` : ''}

DRAWING RULES:
- Black line drawing on pure white background
- Single shoe, not a pair
- Show all construction: upper panels, tongue, closure system, midsole profile, outsole, heel counter, toe box, all seam lines
- Solid lines for panel edges and seams, dashed lines for stitching
- No color, no shading, no fills, no grey tones
- Factory-ready precision, patternmaker level of detail
- Clean, minimal, technical. No decorative elements.`;
}

function buildTopPrompt(description: string, styleName: string): string {
  return `Technical flat sketch of a shoe for a factory tech pack.

VIEW: Top-down, bird's eye. Looking straight down at the shoe from directly above. The toe points upward in the image.

SHOE DESIGN: ${description}${styleName ? ` (Style: ${styleName})` : ''}

DRAWING RULES:
- Black line drawing on pure white background
- Single shoe, not a pair
- Show collar opening, tongue, lacing/strap system, toe box contour, upper panel layout from above
- Solid lines for panel edges and seams, dashed lines for stitching
- No color, no shading, no fills, no grey tones
- Factory-ready precision, patternmaker level of detail
- Clean, minimal, technical. No decorative elements.`;
}

/* ── Apparel: OpenAI image edits (proven, faithful to reference) ── */
async function generateApparelSketch(
  garmentType: string, fabric: string, notes: string, photoBase64: string,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const prompt = `A partir de esta foto de referencia, genera un FLAT SKETCH TÉCNICO de la prenda.

REGLAS:
- Flat sketch técnico para tech pack
- Vista frontal
- Fondo blanco puro, trazo negro fino y limpio
- Sin cuerpo humano, sin perspectiva, sin sombras, sin color
- Todos los detalles constructivos: cierres, bolsillos, costuras, paneles
- Reproducir fielmente la prenda de la foto
- Nivel de detalle apto para fábrica

TIPO: ${garmentType}
${fabric ? `TEJIDO: ${fabric}` : ''}
${notes ? `NOTAS: ${notes}` : ''}`;

  const blob = new Blob([Buffer.from(photoBase64, 'base64')], { type: 'image/png' });
  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', blob, 'photo.png');
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  formData.append('quality', 'high');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`OpenAI edits error: ${res.status}`);

  const data = await res.json();
  if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
  if (data.data?.[0]?.url) {
    const imgRes = await fetch(data.data[0].url);
    const buf = await imgRes.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  }
  throw new Error('No image in OpenAI response');
}

/* ── Main handler ── */
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body: RequestBody & { collectionPlanId?: string } = await req.json();

    if (!body.images?.length) {
      return NextResponse.json({ error: 'At least 1 reference photo required' }, { status: 400 });
    }

    const isFootwear = body.garmentType === 'CALZADO' || /shoe|sneaker|boot|sandal|footwear|calzado/i.test(body.garmentType);
    const primaryPhoto = body.images[0];

    if (isFootwear) {
      // ── FOOTWEAR: Gemini describes → 2x OpenAI generations in parallel ──
      console.log('[Sketch] Footwear — Gemini Vision + 2x OpenAI gpt-image-1 generations');
      const description = await describeShoeWithGemini(
        primaryPhoto.base64, primaryPhoto.mimeType, body.styleName
      );
      console.log('[Sketch] Description:', description.slice(0, 200));

      // Two parallel OpenAI text-to-image calls (no reference image = no angle replication)
      const [sideResult, topResult] = await Promise.allSettled([
        generateSketchOpenAI(buildSidePrompt(description, body.styleName)),
        generateSketchOpenAI(buildTopPrompt(description, body.styleName)),
      ]);

      const sideImage = sideResult.status === 'fulfilled' ? sideResult.value : null;
      const topImage = topResult.status === 'fulfilled' ? topResult.value : null;

      if (!sideImage && !topImage) {
        const err = sideResult.status === 'rejected' ? sideResult.reason : topResult.status === 'rejected' ? topResult.reason : 'Unknown';
        return NextResponse.json({ error: `Sketch generation failed: ${err}` }, { status: 500 });
      }

      // Persist
      const persist = async (imageData: string, label: string) => {
        if (!body.collectionPlanId) return imageData;
        try {
          const isUrl = imageData.startsWith('http');
          const result = await persistAsset({
            collectionPlanId: body.collectionPlanId,
            assetType: 'sketch',
            name: `Sketch ${body.styleName || ''} — ${label}`.trim(),
            ...(isUrl ? { sourceUrl: imageData } : { base64: imageData, mimeType: 'image/png' }),
            phase: 'design',
            metadata: { pipeline: 'gemini+openai-gen', view: label },
            uploadedBy: user.id,
          });
          return result.publicUrl;
        } catch { return imageData; }
      };

      const sidePersisted = sideImage ? await persist(sideImage, 'Side Profile') : null;
      const topPersisted = topImage ? await persist(topImage, 'Top Down') : null;

      return NextResponse.json({
        sketchOptions: [
          ...(sidePersisted ? [{ id: '1', description: 'Side Profile', frontImageBase64: sidePersisted }] : []),
          ...(topPersisted ? [{ id: '2', description: 'Top Down', frontImageBase64: topPersisted }] : []),
        ],
        views: { side: sidePersisted, top: topPersisted },
        persisted: true,
        pipeline: 'gemini-vision+openai-generations',
      });

    } else {
      // ── APPAREL: OpenAI image edits ──
      const sketchImage = await generateApparelSketch(
        body.garmentType, body.fabric, body.additionalNotes, primaryPhoto.base64,
      );

      let persistedUrl: string | null = null;
      if (body.collectionPlanId) {
        try {
          const result = await persistAsset({
            collectionPlanId: body.collectionPlanId,
            assetType: 'sketch',
            name: `Sketch — ${body.garmentType}`,
            base64: sketchImage, mimeType: 'image/png',
            phase: 'design',
            metadata: { pipeline: 'openai-image-edits' },
            uploadedBy: user.id,
          });
          persistedUrl = result.publicUrl;
        } catch (err) {
          console.error('[Sketch] Persist failed:', err);
        }
      }

      return NextResponse.json({
        sketchOptions: [{
          id: '1',
          description: `Front view: ${body.garmentType}`,
          frontImageBase64: persistedUrl || sketchImage,
        }],
        persisted: !!persistedUrl,
        pipeline: 'openai-image-edits',
      });
    }
  } catch (error) {
    console.error('Sketch generation error:', error);
    const message = error instanceof Error ? error.message : 'Sketch generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
