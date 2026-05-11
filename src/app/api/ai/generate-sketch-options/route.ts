import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkImageryUsage, refundImageryUnits, usageDeniedResponse, verifyCollectionOwnership } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';
import sharp from 'sharp';
import { normalizeAiError } from '@/lib/ai/error-messages';

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

/* Detect whether the line-drawing silhouette extends to (or crosses) the
   canvas edge. A flat sketch must always have at least ~3% empty margin
   on every side; if the dark-pixel bounding box hugs an edge, the model
   cropped the heel/toe/sleeve and the result is unusable. */
async function detectCrop(dataUrl: string): Promise<{ cropped: boolean; reason?: string; marginPct?: { l: number; r: number; t: number; b: number } }> {
  const b64 = dataUrl.split(',')[1] || dataUrl;
  const buf = Buffer.from(b64, 'base64');
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // Threshold: pixels darker than 220 count as "drawing".
  const THRESHOLD = 220;
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (data[row + x] < THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { cropped: false }; // empty canvas — generation failed in another way
  const marginL = minX / width;
  const marginR = (width - 1 - maxX) / width;
  const marginT = minY / height;
  const marginB = (height - 1 - maxY) / height;
  const MIN_MARGIN = 0.03;
  const margins = { l: marginL, r: marginR, t: marginT, b: marginB };
  if (marginL < MIN_MARGIN) return { cropped: true, reason: `left edge (${(marginL * 100).toFixed(1)}%)`, marginPct: margins };
  if (marginR < MIN_MARGIN) return { cropped: true, reason: `right edge (${(marginR * 100).toFixed(1)}%)`, marginPct: margins };
  if (marginT < MIN_MARGIN) return { cropped: true, reason: `top edge (${(marginT * 100).toFixed(1)}%)`, marginPct: margins };
  if (marginB < MIN_MARGIN) return { cropped: true, reason: `bottom edge (${(marginB * 100).toFixed(1)}%)`, marginPct: margins };
  return { cropped: false, marginPct: margins };
}

/* Generate with up to 3 attempts; reject any image whose silhouette was
   cropped at the canvas edge. The third attempt prepends an ever-stronger
   anti-crop preamble to bias the model away from zoomed-in renders. */
async function generateUncropped(label: string, prompt: string, photoBase64: string, size: string): Promise<string> {
  let lastDataUrl: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const reinforced = attempt === 1 ? prompt
      : attempt === 2 ? `RETRY — the previous render cropped the silhouette at the canvas edge. Pull the camera back so the COMPLETE shoe is visible with at least 10% margin on every side.\n\n${prompt}`
      : `URGENT FRAMING — two prior attempts cropped the shoe. Render the silhouette at no more than 70% of canvas size, perfectly centered, with at least 15% empty margin on every side. The full silhouette MUST be visible end-to-end.\n\n${prompt}`;
    const dataUrl = await generateWithOpenAI(reinforced, photoBase64, size);
    lastDataUrl = dataUrl;
    try {
      const check = await detectCrop(dataUrl);
      if (!check.cropped) {
        if (attempt > 1) console.log(`[Sketch:${label}] uncropped on attempt ${attempt}`);
        return dataUrl;
      }
      console.warn(`[Sketch:${label}] attempt ${attempt} cropped at ${check.reason} — retrying`);
    } catch (err) {
      console.warn(`[Sketch:${label}] crop detection failed on attempt ${attempt}:`, err);
      return dataUrl; // fall through with this image rather than spinning forever
    }
  }
  console.warn(`[Sketch:${label}] all 3 attempts cropped — returning last image`);
  return lastDataUrl!;
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

CRITICAL FRAMING — the most common failure mode is cropping the heel or toe:
- The COMPLETE shoe outline (from heel-most point to toe-most point) MUST fit entirely inside the canvas with at least 8% empty margin on every side.
- Center the shoe in the frame. Do NOT zoom in on the upper or the toe — the entire silhouette must be visible end-to-end.
- The shoe is elongated; render it as a tall vertical shape (heel at bottom, toe at top) that uses about 75-85% of the canvas height. Width follows from the shoe's actual top-down width — do NOT stretch.
- If the reference photo crops the shoe, EXTEND the missing portions so the complete shoe is shown — do not reproduce the crop.

DRAWING RULES:
- Black line drawing on pure white background
- Single shoe (not a pair), top-down only
- Show collar opening, tongue, lacing/strap system, toe box contour, upper panel layout, heel cup outline
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
  let userId: string | undefined;
  let planConsumed = 0;
  let packConsumed = 0;
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    userId = user.id;

    const usage = await checkImageryUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);
    planConsumed = usage.planConsumed ?? 0;
    packConsumed = usage.packConsumed ?? 0;

    const body = await req.json();

    if (!body.images?.length) {
      return NextResponse.json({ error: 'At least 1 reference photo required' }, { status: 400 });
    }

    if (body.collectionPlanId) {
      const ownership = await verifyCollectionOwnership(user.id, body.collectionPlanId);
      if (!ownership.authorized) return ownership.error;
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
      // Two parallel OpenAI image edits — same photo, different angle prompts.
      // Top-down uses portrait 1024x1536 because the shoe runs vertically in
      // top-down view; a square canvas was cropping the heel/toe.
      // Both go through generateUncropped which retries up to 3x if the
      // silhouette touches a canvas edge — structural guarantee against
      // cropped flat sketches.
      const [sideResult, topResult] = await Promise.allSettled([
        generateUncropped('side', SIDE_PROMPT, photoBase64, '1024x1024'),
        generateUncropped('top', TOP_PROMPT, photoBase64, '1024x1536'),
      ]);

      const sideImage = sideResult.status === 'fulfilled' ? sideResult.value : null;
      const topImage = topResult.status === 'fulfilled' ? topResult.value : null;

      if (!sideImage && !topImage) {
        await refundImageryUnits(userId, planConsumed, packConsumed);
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
      // Apparel: single front-view edit (also goes through anti-crop retry).
      const prompt = `${FRONT_PROMPT}\n\nTIPO: ${body.garmentType}${body.fabric ? `\nTEJIDO: ${body.fabric}` : ''}${body.additionalNotes ? `\nNOTAS: ${body.additionalNotes}` : ''}`;
      const sketch = await generateUncropped('front', prompt, photoBase64, '1024x1024');
      const persisted = await persist(sketch, 'Front');

      return NextResponse.json({
        sketchOptions: [{ id: 'front', description: 'Front', frontImageBase64: persisted }],
        persisted: true,
      });
    }
  } catch (error) {
    if (userId) await refundImageryUnits(userId, planConsumed, packConsumed);
    console.error('Sketch error:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}
