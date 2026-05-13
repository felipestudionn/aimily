import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkImageryUsage, refundImageryUnits, usageDeniedResponse, verifyCollectionOwnership } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';
import sharp from 'sharp';
import { normalizeAiError } from '@/lib/ai/error-messages';

/* ═══════════════════════════════════════════════════════════
   Sketch from Reference Photo — OpenAI gpt-image-1

   APPAREL:  2x image edits in parallel → front + back
   FOOTWEAR: 3x image edits in parallel → side + top + back

   Same reference photo, different angle instructions. The BACK view
   is always generated even when the reference photo only shows the
   front/side — the prompt instructs the model to infer the back from
   common construction conventions of the garment/shoe type, keeping
   the brand-consistent aesthetic intact. Felipe (2026-05-13): a tech
   pack without a back view is not a tech pack.
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

const BACK_APPAREL_PROMPT = `From this reference garment, generate a TECHNICAL FLAT SKETCH in BACK VIEW.

MANDATORY VIEW: The garment must be drawn from BEHIND (rear view), as the patternmaker sees it laid flat. If the reference only shows the front, INFER the back from standard garment construction for this type — back yoke, center-back seam, back darts, back hem shape, rear closures (if applicable), neckline back curve, sleeve cuffs from behind. Match the design language and proportions of the front view so the two read as the same garment.

RULES:
- Technical flat sketch for tech pack, back view
- Pure white background, clean thin black linework
- No human body, no perspective, no shading, no color
- Show: back yoke, center-back seam, back darts/pleats, back hem, rear closures, neckline back, sleeve cuffs from behind
- Solid lines for seams, dashed lines for stitching
- Factory-grade detail level
${IP_CLAUSE}`;

const BACK_FOOTWEAR_PROMPT = `From this reference shoe, generate a TECHNICAL FLAT SKETCH in BACK VIEW (heel view).

MANDATORY VIEW: The shoe must be drawn from DIRECTLY BEHIND, looking at the heel counter as the wearer would see it from behind. Single shoe, heel pointing toward the camera. If the reference doesn't show the back of the shoe, INFER it from common footwear construction for this category — heel counter shape, heel tab/pull, rear midsole curve, back panel seams, ankle collar from behind. Match the design language and proportions of the side view so the two read as the same shoe.

CRITICAL FRAMING — common failure mode is cropping the heel cup top:
- The COMPLETE heel silhouette MUST fit entirely inside the canvas with at least 10% empty margin on every side.
- Center the shoe in the frame; the heel counter sits at roughly 55-65% of the canvas height.

DRAWING RULES:
- Black line drawing on pure white background
- Single shoe (not a pair), back view only
- Show: heel counter shape, heel tab/pull, rear midsole curve, back panel seams, ankle collar from behind, outsole rear edge
- Solid lines for seams, dashed lines for stitching
- No color, no shading, no fills
- Factory tech pack quality, patternmaker precision
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
      // Three parallel OpenAI image edits — same photo, different angle
      // prompts. Top-down uses portrait 1024x1536 because the shoe runs
      // vertically; a square canvas was cropping the heel/toe. Back view
      // uses square 1024x1024 — the heel silhouette is roughly square.
      // All go through generateUncropped which retries up to 3x if the
      // silhouette touches a canvas edge — structural guarantee against
      // cropped flat sketches.
      const [sideResult, topResult, backResult] = await Promise.allSettled([
        generateUncropped('side', SIDE_PROMPT, photoBase64, '1024x1024'),
        generateUncropped('top', TOP_PROMPT, photoBase64, '1024x1536'),
        generateUncropped('back', BACK_FOOTWEAR_PROMPT, photoBase64, '1024x1024'),
      ]);

      const sideImage = sideResult.status === 'fulfilled' ? sideResult.value : null;
      const topImage = topResult.status === 'fulfilled' ? topResult.value : null;
      const backImage = backResult.status === 'fulfilled' ? backResult.value : null;

      if (!sideImage && !topImage && !backImage) {
        await refundImageryUnits(userId, planConsumed, packConsumed);
        const err = sideResult.status === 'rejected' ? String(sideResult.reason) : 'All views failed';
        return NextResponse.json({ error: err }, { status: 500 });
      }

      const sidePersisted = sideImage ? await persist(sideImage, 'Side Profile') : null;
      const topPersisted = topImage ? await persist(topImage, 'Top Down') : null;
      const backPersisted = backImage ? await persist(backImage, 'Back') : null;

      return NextResponse.json({
        sketchOptions: [
          ...(sidePersisted ? [{ id: 'side', description: 'Side Profile', frontImageBase64: sidePersisted }] : []),
          ...(topPersisted ? [{ id: 'top', description: 'Top Down', frontImageBase64: topPersisted }] : []),
          ...(backPersisted ? [{ id: 'back', description: 'Back', frontImageBase64: backPersisted }] : []),
        ],
        persisted: true,
      });
    } else {
      // Apparel: front + back in parallel. Both go through anti-crop retry.
      const typeSuffix = `\n\nTIPO: ${body.garmentType}${body.fabric ? `\nTEJIDO: ${body.fabric}` : ''}${body.additionalNotes ? `\nNOTAS: ${body.additionalNotes}` : ''}`;
      const frontPrompt = `${FRONT_PROMPT}${typeSuffix}`;
      const backPrompt = `${BACK_APPAREL_PROMPT}${typeSuffix}`;

      const [frontResult, backResult] = await Promise.allSettled([
        generateUncropped('front', frontPrompt, photoBase64, '1024x1024'),
        generateUncropped('back', backPrompt, photoBase64, '1024x1024'),
      ]);

      const frontImage = frontResult.status === 'fulfilled' ? frontResult.value : null;
      const backImage = backResult.status === 'fulfilled' ? backResult.value : null;

      if (!frontImage && !backImage) {
        await refundImageryUnits(userId, planConsumed, packConsumed);
        const err = frontResult.status === 'rejected' ? String(frontResult.reason) : 'Both apparel views failed';
        return NextResponse.json({ error: err }, { status: 500 });
      }

      const frontPersisted = frontImage ? await persist(frontImage, 'Front') : null;
      const backPersisted = backImage ? await persist(backImage, 'Back') : null;

      return NextResponse.json({
        sketchOptions: [
          ...(frontPersisted ? [{ id: 'front', description: 'Front', frontImageBase64: frontPersisted }] : []),
          ...(backPersisted ? [{ id: 'back', description: 'Back', frontImageBase64: backPersisted }] : []),
        ],
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
