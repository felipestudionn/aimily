import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';
import sharp from 'sharp';

/* ═══════════════════════════════════════════════════════════
   Sketch from Reference Photo — OpenAI gpt-image-1

   APPAREL: 1x image edit → front view
   FOOTWEAR: 2x image edits in parallel → side profile + top-down
   Same reference photo, different angle instructions.
   ═══════════════════════════════════════════════════════════ */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateWithOpenAI(prompt: string, photoBase64: string, size = '1024x1024'): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  // Convert any image format (AVIF, WEBP, HEIC, etc.) to PNG for OpenAI compatibility
  const inputBuffer = Buffer.from(photoBase64, 'base64');
  const pngBuffer = await sharp(inputBuffer).png().toBuffer();
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', blob, 'photo.png');
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', size);
  formData.append('quality', 'high');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} — ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
  if (data.data?.[0]?.url) {
    const imgRes = await fetch(data.data[0].url);
    const buf = await imgRes.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  }
  throw new Error('No image in OpenAI response');
}

/* ── Footwear prompts ── */
/* ── IP Protection clause (shared across all sketch prompts) ── */
const IP_CLAUSE = `
INTELLECTUAL PROPERTY — CRITICAL:
- If the reference contains ANY recognizable brand logos, trademarks, or proprietary design elements (Nike swoosh, Adidas stripes/trefoil, Puma formstrip, Jordan jumpman, New Balance N, Converse star, etc.), you MUST replace them with an original, neutral design element that preserves the same visual weight and placement but is legally distinct.
- The overall silhouette should be inspired by the reference (~90% similar) but introduce subtle original variations: slightly different toe box curvature, modified heel counter shape, adjusted panel proportions, or reworked midsole profile. The result must read as an original design inspired by the reference, not a replica.
- Never reproduce branded outsole patterns, proprietary cushioning shapes, or trademarked closure systems verbatim.`;

const SIDE_PROMPT = `From this reference shoe, generate a TECHNICAL FLAT SKETCH in SIDE PROFILE VIEW.

MANDATORY VIEW: The shoe must be drawn from the RIGHT SIDE (lateral/exterior), pointing right, resting on a horizontal ground line. Show the full lateral exterior silhouette.

DRAWING RULES:
- Black line drawing on pure white background
- Single shoe (not a pair), side profile only
- Show all construction: upper panels, tongue, closure, midsole, outsole, heel counter, toe box, seam lines
- Solid lines for seams, dashed lines for stitching
- No color, no shading, no fills
- Factory tech pack quality, patternmaker precision
${IP_CLAUSE}`;

const TOP_PROMPT = `From this reference shoe, generate a TECHNICAL FLAT SKETCH in TOP-DOWN VIEW.

MANDATORY VIEW: The shoe must be drawn as seen from DIRECTLY ABOVE, bird's eye perspective, looking straight down. The toe points upward.

DRAWING RULES:
- Black line drawing on pure white background
- Single shoe (not a pair), top-down only
- Show collar opening, tongue, lacing/strap system, toe box contour, upper panel layout
- Solid lines for seams, dashed lines for stitching
- No color, no shading, no fills
- Factory tech pack quality, patternmaker precision
${IP_CLAUSE}`;

const FRONT_PROMPT = `From this reference garment, generate a TECHNICAL FLAT SKETCH.

RULES:
- Technical flat sketch for tech pack, front view
- Pure white background, clean thin black linework
- No human body, no perspective, no shading, no color
- All construction details: closures, pockets, seams, panels
- Factory-grade detail level
${IP_CLAUSE}`;

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body = await req.json();

    if (!body.images?.length) {
      return NextResponse.json({ error: 'At least 1 reference photo required' }, { status: 400 });
    }

    const photoBase64 = body.images[0].base64;
    const isFootwear = body.garmentType === 'CALZADO' || /shoe|sneaker|boot|sandal|footwear|calzado/i.test(body.garmentType || '');

    const persist = async (imageData: string, label: string) => {
      if (!body.collectionPlanId) return imageData;
      try {
        const result = await persistAsset({
          collectionPlanId: body.collectionPlanId,
          assetType: 'sketch',
          name: `Sketch ${body.styleName || ''} — ${label}`.trim(),
          base64: imageData, mimeType: 'image/png',
          phase: 'design',
          metadata: { view: label },
          uploadedBy: user.id,
        });
        return result.publicUrl;
      } catch { return imageData; }
    };

    if (isFootwear) {
      // Two parallel OpenAI image edits — same photo, different angle prompts
      const [sideResult, topResult] = await Promise.allSettled([
        generateWithOpenAI(SIDE_PROMPT, photoBase64),
        generateWithOpenAI(TOP_PROMPT, photoBase64),
      ]);

      const sideImage = sideResult.status === 'fulfilled' ? sideResult.value : null;
      const topImage = topResult.status === 'fulfilled' ? topResult.value : null;

      if (!sideImage && !topImage) {
        const err = sideResult.status === 'rejected' ? String(sideResult.reason) : 'Both views failed';
        return NextResponse.json({ error: err }, { status: 500 });
      }

      const sidePersisted = sideImage ? await persist(sideImage, 'Side Profile') : null;
      const topPersisted = topImage ? await persist(topImage, 'Top Down') : null;

      return NextResponse.json({
        sketchOptions: [
          ...(sidePersisted ? [{ id: 'side', description: 'Side Profile', frontImageBase64: sidePersisted }] : []),
          ...(topPersisted ? [{ id: 'top', description: 'Top Down', frontImageBase64: topPersisted }] : []),
        ],
        persisted: true,
      });
    } else {
      // Apparel: single front-view edit
      const prompt = `${FRONT_PROMPT}\n\nTIPO: ${body.garmentType}${body.fabric ? `\nTEJIDO: ${body.fabric}` : ''}${body.additionalNotes ? `\nNOTAS: ${body.additionalNotes}` : ''}`;
      const sketch = await generateWithOpenAI(prompt, photoBase64);
      const persisted = await persist(sketch, 'Front');

      return NextResponse.json({
        sketchOptions: [{ id: 'front', description: 'Front', frontImageBase64: persisted }],
        persisted: true,
      });
    }
  } catch (error) {
    console.error('Sketch error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
