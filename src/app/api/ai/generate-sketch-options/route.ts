import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, consumeCredits, refundCredits, usageDeniedResponse, verifyCollectionOwnership } from '@/lib/api-auth';
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
   canvas edge. A flat sketch must always have at least ~8% empty margin
   on every side; if the dark-pixel bounding box hugs an edge, the model
   cropped the heel/toe/sleeve/hem and the result is unusable.

   Bumped from 3% → 8% on 2026-05-13 after apparel back-view dresses
   were coming back with 0% top/bottom margin (silhouette touching both
   horizontal edges). 3% was permissive enough that the detector passed
   the canvas-edge image without retry. */
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
  const MIN_MARGIN = 0.08;
  const margins = { l: marginL, r: marginR, t: marginT, b: marginB };
  if (marginL < MIN_MARGIN) return { cropped: true, reason: `left edge (${(marginL * 100).toFixed(1)}%)`, marginPct: margins };
  if (marginR < MIN_MARGIN) return { cropped: true, reason: `right edge (${(marginR * 100).toFixed(1)}%)`, marginPct: margins };
  if (marginT < MIN_MARGIN) return { cropped: true, reason: `top edge (${(marginT * 100).toFixed(1)}%)`, marginPct: margins };
  if (marginB < MIN_MARGIN) return { cropped: true, reason: `bottom edge (${(marginB * 100).toFixed(1)}%)`, marginPct: margins };
  return { cropped: false, marginPct: margins };
}

/* Generate with up to 3 attempts; reject any image whose silhouette was
   cropped at the canvas edge. The third attempt prepends an ever-stronger
   anti-crop preamble to bias the model away from zoomed-in renders.

   Reinforcement messages are subject-agnostic ("the subject") since the
   same helper now serves apparel as well as footwear. Saying "the shoe"
   on a dress was producing junk retries that didn't fix the framing. */
async function generateUncropped(label: string, prompt: string, photoBase64: string, size: string): Promise<string> {
  let lastDataUrl: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const reinforced = attempt === 1 ? prompt
      : attempt === 2 ? `RETRY — the previous render cropped the subject at the canvas edge. Pull the camera back so the COMPLETE subject is visible with at least 12% empty margin on every side (top, bottom, left, right).\n\n${prompt}`
      : `URGENT FRAMING — two prior attempts cropped the subject. Render the silhouette at NO MORE than 70% of canvas size, perfectly centered, with at least 15% empty white margin on every side. The full silhouette MUST be visible end-to-end, with clear white space above the highest point and below the lowest point.\n\n${prompt}`;
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

const FRONT_PROMPT = `From this reference garment, generate a TECHNICAL FLAT SKETCH in FRONT VIEW.

CRITICAL FRAMING — the most common failure mode is cropping the hem, sleeve, or shoulder:
- The COMPLETE garment outline (from highest shoulder point to lowest hem point) MUST fit entirely inside the canvas with at least 10% empty white margin on every side.
- Center the garment in the frame. Render the silhouette at roughly 70-80% of canvas height — never edge-to-edge.
- If the reference photo crops the garment, EXTEND the missing portions so the complete piece is shown — do NOT reproduce the crop.

DRAWING RULES:
- Technical flat sketch for tech pack, front view
- Pure white background, clean thin black linework
- No human body, no perspective, no shading, no color
- All construction details: closures, pockets, seams, panels, neckline curve, sleeve / strap construction, hem shape
- Solid lines for seams, dashed lines for stitching
- Factory-grade detail level
${IP_CLAUSE}`;

const BACK_APPAREL_PROMPT = `From this reference garment, generate a TECHNICAL FLAT SKETCH in BACK VIEW.

INTENT: Render the EXACT SAME GARMENT rotated 180°. The back must read as the same piece as the front — same silhouette, same length, same proportions, same strap / sleeve / hem placement. The patternmaker should be able to lay the front and back side by side and see ONE garment, not two.

WHAT MUST STAY IDENTICAL TO THE FRONT (do NOT redesign):
- Overall silhouette and outer outline (shoulder slope, side seams, waist shape, hem curve)
- Garment length (hem position relative to overall canvas)
- Strap / sleeve width and where they attach to the shoulder
- Hem shape (straight / curved / asymmetric — match exactly)
- Any visible front print or pattern density: if the front has a polka-dot lower half, the back has the SAME polka-dot lower half in the SAME position
- Construction style (fitted vs flared, bodice/skirt proportion split)

WHAT CHANGES (only the things physically required by the rear view):
- Neckline: replace the front neckline curve with the rear neckline curve
- Closures: if the garment closes at the back (zipper, hooks), show them along the center-back seam
- Back yoke / back darts: ONLY if implied by the garment's structure (e.g. shirts often have a yoke); do NOT add yokes to dresses that don't need them
- Any front-only details (front pockets, front zipper, front buttons, front graphics asymmetric to back) disappear

DO NOT INVENT details not implied by the front. When in doubt, mirror.

CRITICAL FRAMING (same as front):
- Complete garment outline MUST fit entirely inside canvas with at least 10% empty white margin on every side
- Center the silhouette; render at 70-80% of canvas height

DRAWING RULES:
- Technical flat sketch for tech pack, back view
- Pure white background, clean thin black linework
- No human body, no perspective, no shading, no color
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

    const usage = await consumeCredits(user.id, user.email!, 'sketch');
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
      // Felipe sprint Aimily Design 2026-05-19: misma directiva de
      // variación para footwear cuando viene del In-Season.
      const replicaSuffix = typeof body.replicate_concept_brief === 'string' && body.replicate_concept_brief
        ? `\n\nMODO REPLICACIÓN INSPIRADA (brief: ${body.replicate_concept_brief}): variación sutil del referente — 85% inspiración / 15% variación creativa. MODELO NUEVO inspirado en el hero, no una réplica.`
        : '';
      const sidePrompt = SIDE_PROMPT + replicaSuffix;
      const topPrompt = TOP_PROMPT + replicaSuffix;
      const backPrompt = BACK_FOOTWEAR_PROMPT + replicaSuffix;
      const [sideResult, topResult, backResult] = await Promise.allSettled([
        generateUncropped('side', sidePrompt, photoBase64, '1024x1024'),
        generateUncropped('top', topPrompt, photoBase64, '1024x1536'),
        generateUncropped('back', backPrompt, photoBase64, '1024x1024'),
      ]);

      const sideImage = sideResult.status === 'fulfilled' ? sideResult.value : null;
      const topImage = topResult.status === 'fulfilled' ? topResult.value : null;
      const backImage = backResult.status === 'fulfilled' ? backResult.value : null;

      if (!sideImage && !topImage && !backImage) {
        await refundCredits(userId, planConsumed, packConsumed);
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
      // Apparel: front + back in parallel. Portrait canvas (1024x1536)
      // matches the natural aspect of a garment — square canvas was
      // forcing the model to stretch dresses/tops edge-to-edge with no
      // headroom, defeating the anti-crop guardrail. Both go through
      // generateUncropped which enforces ≥8% margin on every side.
      //
      // Felipe sprint Aimily Design 2026-05-19 · dos modos opuestos:
      // - replicate_concept_brief: variación creativa 85/15 (modelo nuevo
      //   inspirado en hero, para amplify_next_season del In-Season).
      // - preserve_reference_exactly: réplica FIEL del producto referente,
      //   con todos los detalles 1:1 (para extend_colors del In-Season —
      //   el objetivo es solo cambiar el color, no redibujar el producto).
      const replicaSuffix = typeof body.replicate_concept_brief === 'string' && body.replicate_concept_brief
        ? `\n\nMODO REPLICACIÓN INSPIRADA (brief: ${body.replicate_concept_brief}): Este sketch debe variar LIGERAMENTE del producto referente — silueta familiar pero con sutiles diferencias en proporciones, detalles, longitud, fit o tejido. Conserva el DNA conceptual del original (que es un hero comercial probado) pero introduce variación creativa para que sea un MODELO NUEVO inspirado, no una réplica idéntica. Inspírate ~85% en el original, varía ~15%.`
        : body.preserve_reference_exactly
          ? `\n\nMODO RÉPLICA FIEL — DIRECTIVAS CRÍTICAS (lee dos veces):

OBJETIVO ÚNICO: trazar exactamente el producto en la imagen de referencia para luego cambiarle el color. NO es un rediseño, NO es una "interpretación de flat sketch típico" del tipo de prenda. Es una traducción 1:1 del producto específico que tienes delante.

PROHIBICIONES ABSOLUTAS:
- NO añadas bolsillos a menos que sean CLARAMENTE visibles en la foto de referencia. Una camisa, blusa, o jacket "típica" en flat sketch puede tener bolsillos por convención — IGNORA esa convención. Si el referente no muestra bolsillos, el sketch tampoco los tiene. Punto.
- NO añadas botones tradicionales si el referente tiene otro tipo de cierre (nudo, lazo, cremallera oculta, sin cierre visible). Mira CUIDADOSAMENTE el centro frontal del referente y replica lo que ves.
- NO añadas costuras decorativas, paneles, o construcciones que no veas en el referente.
- NO completes "lo que falta" con detalles inventados. Si la referencia no muestra un detalle, ese detalle NO va.

INSPECCIÓN OBLIGATORIA — antes de dibujar, mira la imagen y pregúntate:
- ¿Tiene bolsillos visibles? (sí/no — si no estás 100% seguro, NO los dibujes)
- ¿Cómo cierra? (botones / nudo / lazo / oculto / sin cierre)
- ¿Cuello? (mao / camisero / volante / sin cuello)
- ¿Bajo? (recto / curvo / asimétrico / con dobladillo visible)
- ¿Mangas? (cortas / largas / 3/4 / sin mangas / con puños / sin puños)

REGLA DE DUDA: si dudas, simplifica. Mejor un sketch que carezca de detalle que un sketch que invente detalle.`
          : '';
      const typeSuffix = `\n\nTIPO: ${body.garmentType}${body.fabric ? `\nTEJIDO: ${body.fabric}` : ''}${body.additionalNotes ? `\nNOTAS: ${body.additionalNotes}` : ''}${replicaSuffix}`;
      const frontPrompt = `${FRONT_PROMPT}${typeSuffix}`;
      const backPrompt = `${BACK_APPAREL_PROMPT}${typeSuffix}`;

      const [frontResult, backResult] = await Promise.allSettled([
        generateUncropped('front', frontPrompt, photoBase64, '1024x1536'),
        generateUncropped('back', backPrompt, photoBase64, '1024x1536'),
      ]);

      const frontImage = frontResult.status === 'fulfilled' ? frontResult.value : null;
      const backImage = backResult.status === 'fulfilled' ? backResult.value : null;

      if (!frontImage && !backImage) {
        await refundCredits(userId, planConsumed, packConsumed);
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
    if (userId) await refundCredits(userId, planConsumed, packConsumed);
    console.error('Sketch error:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}
