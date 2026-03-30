import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Sketch from Reference Photo

   APPAREL: OpenAI gpt-image-1 (image edits) — front view flat
   FOOTWEAR: 2-step pipeline:
     1. Gemini Vision analyzes reference → detailed text description
     2. Freepik Flux Dev generates flat sketch from description
        → side profile + top-down in correct views
   ═══════════════════════════════════════════════════════════ */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FLUX_DEV_ENDPOINT = 'https://api.freepik.com/v1/ai/text-to-image/flux-dev';

interface RequestBody {
  images: Array<{ base64: string; mimeType: string; instructions: string }>;
  garmentType: string;
  season: string;
  styleName: string;
  fabric: string;
  additionalNotes: string;
}

/* ── Step 1: Gemini Vision → describe the shoe ── */
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
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: base64,
            },
          },
          {
            text: `You are a footwear technical designer. Analyze this shoe photo and provide a DETAILED technical description for a patternmaker to recreate it as a flat sketch.

Describe in English, be extremely specific about:
1. SILHOUETTE: Overall shape, height (low-top/mid/high), toe shape (round/pointed/square), profile line
2. UPPER CONSTRUCTION: Number and shape of panels, overlays, cutouts, perforations, split-toe details
3. CLOSURE SYSTEM: Laces/velcro straps/slip-on/buckles, number of eyelets, strap width and placement
4. TONGUE: Shape, visibility, padding, attachment style
5. COLLAR: Height, padding, shape when viewed from above
6. SOLE UNIT: Midsole profile, outsole tread pattern, foxing, mudguard
7. HEEL: Counter shape, pull tab, backstay details
8. BRANDING: Logo placement, size, style (embroidered/printed/debossed)
9. SPECIAL FEATURES: Split-toe, open toe, mesh panels, etc.

Style name for context: ${styleName || 'N/A'}

Output ONLY the technical description, no preamble. Be concise but complete.`,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${res.status} — ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No description from Gemini');
  return text;
}

/* ── Step 2: Flux Dev → flat sketch from description ── */
async function generateSketchWithFluxDev(description: string, styleName: string): Promise<string> {
  if (!FREEPIK_API_KEY) throw new Error('FREEPIK_API_KEY not configured');

  const prompt = `Technical spec sheet: two black line drawings of one shoe on white background, stacked vertically.

DRAWING 1 (upper half of image): SIDE VIEW — the shoe seen from the left side, pointing left, resting on a horizontal ground line. Show the full lateral profile: upper panels, tongue, laces or straps, midsole, outsole tread, heel counter, toe box shape, all seam lines.

DRAWING 2 (lower half of image): TOP VIEW — the same shoe seen from directly above, bird's eye. Show the collar opening, tongue, lacing/strap layout, toe box outline, panel shapes from above.

A thin horizontal line separates the two drawings. Both drawings show the SAME single shoe (not a pair).

The shoe to draw: ${description}${styleName ? `. Style: ${styleName}` : ''}

Rules: black ink technical flat sketch on pure white. No color, no shading, no fills. Solid lines for seams, dashed lines for stitching. Factory-ready precision. No decorative elements.`;

  // Create task
  const createRes = await fetch(FLUX_DEV_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': FREEPIK_API_KEY,
    },
    body: JSON.stringify({ prompt, aspect_ratio: 'traditional_3_4' }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Flux Dev error: ${JSON.stringify(err).slice(0, 200)}`);
  }

  const { data: createData } = await createRes.json();
  const taskId = createData?.task_id;
  if (!taskId) throw new Error('No task_id from Flux Dev');

  // Poll (max 60s)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`${FLUX_DEV_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY },
    });
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    if (status === 'COMPLETED') {
      const imgUrl = statusData.data?.generated?.[0];
      if (!imgUrl) throw new Error('No image in completed task');
      return imgUrl;
    }
    if (status === 'FAILED') throw new Error('Flux Dev task failed');
  }
  throw new Error('Flux Dev timed out');
}

/* ── Apparel path: OpenAI image edits (unchanged) ── */
async function generateSketchWithOpenAI(
  garmentType: string, fabric: string, additionalNotes: string,
  photoBase64: string,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const prompt = `A partir de esta foto de referencia, genera un FLAT SKETCH TÉCNICO de la prenda.

REGLAS DEL DIBUJO:
- Flat sketch técnico para ficha técnica / tech pack
- Vista frontal
- Fondo blanco puro
- Trazo negro fino, limpio y uniforme
- Sin cuerpo humano, sin perspectiva, sin sombras, sin color, sin texturas
- Proporciones realistas de patronaje
- Todos los detalles constructivos visibles: cierres, bolsillos, costuras, paneles, pinzas, tapetas, vistas
- No reinterpretar ni inventar detalles — reproducir fielmente lo que se ve en la foto
- Nivel de detalle apto para fábrica

Piensa como un patronista, no como un ilustrador.

TIPO DE PRENDA: ${garmentType}
${fabric ? `TEJIDO: ${fabric}` : ''}
${additionalNotes ? `NOTAS: ${additionalNotes}` : ''}`;

  const imageBuffer = Buffer.from(photoBase64, 'base64');
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', blob, 'photo.png');
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  formData.append('quality', 'high');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    const imgRes = await fetch(data.data[0].url);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
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

    if (!body.images || body.images.length === 0) {
      return NextResponse.json({ error: 'At least 1 reference photo required' }, { status: 400 });
    }
    if (!body.garmentType) {
      return NextResponse.json({ error: 'Garment type is required' }, { status: 400 });
    }

    const isFootwear = body.garmentType === 'CALZADO' || /shoe|sneaker|boot|sandal|footwear|calzado/i.test(body.garmentType);
    const primaryPhoto = body.images[0];

    let sketchImage: string;

    if (isFootwear) {
      // 2-step: Gemini describes → Flux Dev draws in correct views
      console.log('[Sketch] Footwear detected — using Gemini Vision + Flux Dev pipeline');
      const description = await describeShoeWithGemini(
        primaryPhoto.base64, primaryPhoto.mimeType, body.styleName
      );
      console.log('[Sketch] Gemini description:', description.slice(0, 200));
      sketchImage = await generateSketchWithFluxDev(description, body.styleName);
    } else {
      // Apparel: OpenAI image edits (proven, works well for front-view)
      sketchImage = await generateSketchWithOpenAI(
        body.garmentType, body.fabric, body.additionalNotes, primaryPhoto.base64,
      );
    }

    // Persist to Supabase Storage
    let persistedUrl: string | null = null;
    let assetId: string | null = null;
    if (body.collectionPlanId) {
      try {
        const isUrl = sketchImage.startsWith('http');
        const result = await persistAsset({
          collectionPlanId: body.collectionPlanId,
          assetType: 'sketch',
          name: `Sketch — ${body.garmentType}${isFootwear ? ' (Side + Top)' : ''}`,
          ...(isUrl ? { sourceUrl: sketchImage } : { base64: sketchImage, mimeType: 'image/png' }),
          phase: 'design',
          metadata: {
            garmentType: body.garmentType,
            pipeline: isFootwear ? 'gemini-vision+flux-dev' : 'openai-image-edits',
          },
          uploadedBy: user.id,
        });
        persistedUrl = result.publicUrl;
        assetId = result.assetId;
      } catch (err) {
        console.error('[Sketch] Persist failed:', err);
      }
    }

    const finalImage = persistedUrl || sketchImage;

    return NextResponse.json({
      sketchOptions: [{
        id: '1',
        description: isFootwear ? 'Side profile + Top-down' : `Front view: ${body.garmentType}`,
        frontImageBase64: finalImage,
        ...(persistedUrl && { url: persistedUrl, assetId }),
      }],
      persisted: !!persistedUrl,
      pipeline: isFootwear ? 'gemini-vision+flux-dev' : 'openai-image-edits',
    });
  } catch (error) {
    console.error('Sketch generation error:', error);
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
