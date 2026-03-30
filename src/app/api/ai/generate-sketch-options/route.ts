import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Sketch from Reference Photo

   APPAREL: OpenAI gpt-image-1 (image edits) — front view flat
   FOOTWEAR: 3-step pipeline:
     1. Gemini Vision analyzes reference → detailed text description
     2. Two parallel Flux Dev calls (€0.01 each):
        - Side profile view
        - Top-down bird's eye view
     Same description = same shoe design, different angles.
     Total cost: ~€0.021
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

/* ── Gemini Vision → describe the shoe ── */
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
          { text: `You are a footwear technical designer. Analyze this shoe photo and describe it in detail for a patternmaker to recreate it as a flat sketch.

Be extremely specific about:
1. SILHOUETTE: shape, height (low/mid/high), toe shape, profile line
2. UPPER: panel layout, overlays, cutouts, perforations, split-toe details
3. CLOSURE: laces/velcro/slip-on/buckles, eyelet count, strap placement
4. TONGUE: shape, padding, attachment
5. COLLAR: height, shape from above
6. SOLE: midsole profile, outsole tread, foxing, mudguard
7. HEEL: counter shape, pull tab, backstay
8. BRANDING: logo placement, style
9. SPECIAL FEATURES: split-toe, open-toe, mesh panels, etc.

Style: ${styleName || 'N/A'}

Output ONLY the technical description, no preamble. Concise but complete.` },
        ],
      }],
    }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/* ── Flux Dev → single view sketch ── */
async function generateFluxSketch(prompt: string): Promise<string> {
  if (!FREEPIK_API_KEY) throw new Error('FREEPIK_API_KEY not configured');

  const createRes = await fetch(FLUX_DEV_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': FREEPIK_API_KEY },
    body: JSON.stringify({ prompt, aspect_ratio: 'square_1_1' }),
  });
  if (!createRes.ok) throw new Error(`Flux Dev create error: ${createRes.status}`);

  const { data } = await createRes.json();
  const taskId = data?.task_id;
  if (!taskId) throw new Error('No task_id');

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${FLUX_DEV_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY },
    });
    const sd = await res.json();
    if (sd.data?.status === 'COMPLETED') return sd.data?.generated?.[0] || '';
    if (sd.data?.status === 'FAILED') throw new Error('Flux task failed');
  }
  throw new Error('Flux timed out');
}

/* ── Build single-view sketch prompts ── */
function buildSidePrompt(description: string, styleName: string): string {
  return [
    'Technical fashion flat sketch, black line drawing on pure white background.',
    'Side profile view of a single shoe pointing left, resting on a horizontal ground line.',
    'Show the full lateral silhouette: upper panels, tongue, closure system, midsole profile, outsole tread, heel counter, toe box shape.',
    'All seam lines visible: solid lines for seams, dashed lines for stitching.',
    `Shoe: ${description}`,
    styleName ? `Style: ${styleName}` : '',
    'Factory-ready tech pack illustration. Black ink only. No color, no shading, no fills. Single shoe, not a pair.',
  ].filter(Boolean).join(' ');
}

function buildTopPrompt(description: string, styleName: string): string {
  return [
    'Technical fashion flat sketch, black line drawing on pure white background.',
    'Top-down bird\'s eye view looking straight down at a single shoe from directly above.',
    'Show the collar opening, tongue shape, lacing or strap layout, toe box contour, and upper panel distribution from above.',
    'All seam lines visible: solid lines for seams, dashed lines for stitching.',
    `Shoe: ${description}`,
    styleName ? `Style: ${styleName}` : '',
    'Factory-ready tech pack illustration. Black ink only. No color, no shading, no fills. Single shoe, not a pair.',
  ].filter(Boolean).join(' ');
}

/* ── Apparel: OpenAI image edits ── */
async function generateSketchWithOpenAI(
  garmentType: string, fabric: string, additionalNotes: string, photoBase64: string,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const prompt = `A partir de esta foto de referencia, genera un FLAT SKETCH TÉCNICO de la prenda.

REGLAS:
- Flat sketch técnico para tech pack
- Vista frontal
- Fondo blanco puro, trazo negro fino y limpio
- Sin cuerpo humano, sin perspectiva, sin sombras, sin color
- Todos los detalles constructivos: cierres, bolsillos, costuras, paneles
- Reproducir fielmente lo que se ve en la foto
- Nivel de detalle apto para fábrica

TIPO: ${garmentType}
${fabric ? `TEJIDO: ${fabric}` : ''}
${additionalNotes ? `NOTAS: ${additionalNotes}` : ''}`;

  const blob = new Blob([Buffer.from(photoBase64, 'base64')], { type: 'image/png' });
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
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

  const data = await response.json();
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
      // ── FOOTWEAR: Gemini describes → 2x Flux Dev in parallel ──
      console.log('[Sketch] Footwear — Gemini Vision + 2x Flux Dev');
      const description = await describeShoeWithGemini(
        primaryPhoto.base64, primaryPhoto.mimeType, body.styleName
      );
      console.log('[Sketch] Description:', description.slice(0, 150));

      // Launch both views in parallel
      const [sideResult, topResult] = await Promise.allSettled([
        generateFluxSketch(buildSidePrompt(description, body.styleName)),
        generateFluxSketch(buildTopPrompt(description, body.styleName)),
      ]);

      const sideUrl = sideResult.status === 'fulfilled' ? sideResult.value : null;
      const topUrl = topResult.status === 'fulfilled' ? topResult.value : null;

      if (!sideUrl && !topUrl) {
        return NextResponse.json({ error: 'Both sketch views failed' }, { status: 500 });
      }

      // Use side view as the primary sketch_url (most important for tech pack)
      const primarySketch = sideUrl || topUrl!;

      // Persist both views
      const persist = async (url: string, label: string) => {
        if (!body.collectionPlanId) return url;
        try {
          const { publicUrl } = await persistAsset({
            collectionPlanId: body.collectionPlanId,
            assetType: 'sketch',
            name: `Sketch ${body.styleName || ''} — ${label}`.trim(),
            sourceUrl: url,
            phase: 'design',
            metadata: { pipeline: 'gemini+flux-dev', view: label },
            uploadedBy: user.id,
          });
          return publicUrl;
        } catch { return url; }
      };

      const sidePersisted = sideUrl ? await persist(sideUrl, 'Side Profile') : null;
      const topPersisted = topUrl ? await persist(topUrl, 'Top Down') : null;

      return NextResponse.json({
        sketchOptions: [{
          id: '1',
          description: 'Side Profile',
          frontImageBase64: sidePersisted || sideUrl,
        }, ...(topPersisted || topUrl ? [{
          id: '2',
          description: 'Top Down',
          frontImageBase64: topPersisted || topUrl,
        }] : [])],
        views: { side: sidePersisted || sideUrl, top: topPersisted || topUrl },
        persisted: true,
        pipeline: 'gemini-vision+flux-dev-dual',
      });

    } else {
      // ── APPAREL: OpenAI image edits ──
      const sketchImage = await generateSketchWithOpenAI(
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
