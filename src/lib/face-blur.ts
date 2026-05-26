/**
 * Face preprocessing for editorial style reference images.
 *
 * The primary editorial engine is GPT Image 1.5 (when a model is selected).
 * This module provides two preprocessing paths:
 *
 * 1. compositeModelOntoStyleRef() — Used when a model IS selected (GPT path).
 *    Claude Vision detects the face position in the style reference, then
 *    the selected model's headshot is composited over it with a soft circular
 *    mask. The result is passed as Image 3 to GPT Image 1.5, giving it the
 *    correct face/hair identity with zero conflicts.
 *
 * 2. blurFaceInStyleReference() — Used when NO model is selected (Nano Banana
 *    fallback path, Case C: product + style ref only). Blurs the original
 *    face in the style reference so Nano Banana doesn't latch onto the
 *    wrong identity.
 *
 * Both paths rely on detectFacePosition(), which uses Claude Vision (Haiku)
 * to get a precise bounding box as fractions of image dimensions. This makes
 * both compositing and blurring position-accurate regardless of pose or crop.
 */

import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Use Claude Vision to detect the face bounding box in an image.
 * Returns {x, y, w, h} as fractions of image dimensions (0-1).
 */
async function detectFacePosition(imageBuffer: Buffer): Promise<{
  x: number; y: number; w: number; h: number;
}> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured for face detection');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const base64 = imageBuffer.toString('base64');
  const meta = await sharp(imageBuffer).metadata();
  const mediaType = meta.format === 'png' ? 'image/png' : 'image/jpeg';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: 'Look at this fashion photograph. Find the person\'s FACE only (skin region from forehead hairline down to chin, and from ear to ear — NOT including the hair above the forehead or hair falling on the sides). Return ONLY a JSON object with the face bounding box as fractions of the image dimensions (0 to 1): {"x": left_edge, "y": top_edge, "w": width, "h": height}. Tight to the face skin, not the whole head. Return ONLY the JSON, no other text.',
        },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[^}]+\}/);
  if (!match) throw new Error('Claude did not return face coordinates');

  const coords = JSON.parse(match[0]);
  return {
    x: Math.max(0, Math.min(1, Number(coords.x) || 0.3)),
    y: Math.max(0, Math.min(1, Number(coords.y) || 0.05)),
    w: Math.max(0.05, Math.min(0.8, Number(coords.w) || 0.3)),
    h: Math.max(0.05, Math.min(0.8, Number(coords.h) || 0.2)),
  };
}

/**
 * Face oval mask — narrower and softer than the previous full-bbox circle.
 * The mask covers ~75% of the face bbox width and ~85% of the height,
 * vertically biased toward forehead/eyes/nose/mouth (the IDENTITY zone),
 * with a long soft fade so the pasted face blends into the style ref's
 * skin and hair instead of looking like a circular sticker.
 *
 * Per Codex consult (2026-05-26): "composite only the face/identity
 * region, not the whole hair silhouette, unless the head pose is
 * compatible". A tighter mask preserves more of the style ref's hair
 * silhouette (no headshot hair conflict) and avoids the pasted-circle
 * look that crude radial masks produce.
 */
function createFaceOvalMask(width: number, height: number): Buffer {
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  // Tighter oval: 75% wide, 88% tall. Vertical orientation matches
  // human face aspect ratio (~1:1.3 height:width).
  const rx = Math.round(width * 0.375);
  const ry = Math.round(height * 0.44);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%">
          <stop offset="0%" stop-color="white" stop-opacity="1"/>
          <stop offset="60%" stop-color="white" stop-opacity="1"/>
          <stop offset="85%" stop-color="white" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g)"/>
    </svg>`
  );
}

/**
 * Tone-match the headshot's mean luminance and per-channel mean to the
 * style ref's face region. Without this, the pasted face often looks
 * brighter / cooler / warmer than the surrounding skin — the classic
 * "pasted sticker" giveaway.
 *
 * Approach: compute mean RGB of both face regions, derive a per-channel
 * linear scale, apply with sharp.linear(scale, 0). Clamped to a sensible
 * range so a wildly different headshot doesn't get over-corrected.
 *
 * Per Codex consult (2026-05-26): "Match color temperature/exposure
 * to the style ref".
 */
async function toneMatch(
  headshotBuffer: Buffer,
  faceRegionFromStyleRef: Buffer,
): Promise<Buffer> {
  try {
    const [headshotStats, styleStats] = await Promise.all([
      sharp(headshotBuffer).stats(),
      sharp(faceRegionFromStyleRef).stats(),
    ]);

    // channels[0..2] = R, G, B means in 0-255 range
    const hMeans = [headshotStats.channels[0].mean, headshotStats.channels[1].mean, headshotStats.channels[2].mean];
    const sMeans = [styleStats.channels[0].mean, styleStats.channels[1].mean, styleStats.channels[2].mean];

    // Per-channel linear scale to match style ref's mean.
    // Clamp 0.7..1.3 so a wildly off headshot doesn't get clipped/blown.
    const scales = hMeans.map((h, i) => {
      if (h < 1) return 1;
      const s = sMeans[i] / h;
      return Math.max(0.7, Math.min(1.3, s));
    }) as [number, number, number];

    return await sharp(headshotBuffer)
      .linear(scales, [0, 0, 0])
      .toBuffer();
  } catch {
    // If stats fail (e.g., grayscale image), return original
    return headshotBuffer;
  }
}

/**
 * Composite the aimily model's head onto the style reference image,
 * using Claude Vision to detect the exact face position.
 */
export async function compositeModelOntoStyleRef(
  styleRefUrl: string,
  modelHeadshotUrl: string
): Promise<Buffer> {
  const [styleBuffer, headshotBuffer] = await Promise.all([
    fetchImageBuffer(styleRefUrl),
    fetchImageBuffer(modelHeadshotUrl),
  ]);

  const styleMeta = await sharp(styleBuffer).metadata();
  const styleW = styleMeta.width!;
  const styleH = styleMeta.height!;

  // Detect face position using Claude Vision
  const face = await detectFacePosition(styleBuffer);

  // Convert fractions to pixels
  const faceX = Math.round(face.x * styleW);
  const faceY = Math.round(face.y * styleH);
  const faceW = Math.round(face.w * styleW);
  const faceH = Math.round(face.h * styleH);

  // Step 1: extract the style ref's face region — used for tone-matching
  // the headshot before composite (per Codex: match color temperature
  // and exposure to the style ref).
  const styleFaceRegion = await sharp(styleBuffer)
    .extract({ left: faceX, top: faceY, width: faceW, height: faceH })
    .toBuffer();

  // Step 2: resize the headshot. `fit: cover, position: top` keeps the
  // face at the top of the headshot frame (where it usually is) and
  // crops the shoulders/torso out. The smaller-then-fade mask below
  // means hair edges from the headshot get blended away.
  const resizedHeadshot = await sharp(headshotBuffer)
    .resize(faceW, faceH, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Step 3: tone-match the resized headshot to the style ref's face
  // region — same lighting, similar undertone, no "pasted sticker" look.
  const toneMatchedHeadshot = await toneMatch(resizedHeadshot, styleFaceRegion);

  // Step 4: tighter face-oval mask (per Codex: composite only the
  // face/identity region, not the whole hair silhouette).
  const maskSvg = createFaceOvalMask(faceW, faceH);
  const mask = await sharp(maskSvg)
    .resize(faceW, faceH)
    .grayscale()
    .toBuffer();

  // Step 5: apply mask to the tone-matched headshot — preserve alpha,
  // PNG for lossless edge handling.
  const maskedHeadshot = await sharp(toneMatchedHeadshot)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' as const }])
    .png()
    .toBuffer();

  // Step 6: composite onto style reference at the detected face position.
  // High-quality JPEG (95) since this image goes straight to GPT — any
  // compression artifacts can degrade GPT's face fidelity.
  const result = await sharp(styleBuffer)
    .composite([{
      input: maskedHeadshot,
      top: faceY,
      left: faceX,
      blend: 'over' as const,
    }])
    .jpeg({ quality: 95 })
    .toBuffer();

  return result;
}

/**
 * Legacy blur function — kept as fallback.
 */
export async function blurFaceInStyleReference(
  imageUrl: string
): Promise<Buffer> {
  const originalBuffer = await fetchImageBuffer(imageUrl);
  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // Use Claude Vision for precise blur too
  let cx: number, cy: number, rx: number, ry: number;
  try {
    const face = await detectFacePosition(originalBuffer);
    cx = Math.round((face.x + face.w / 2) * width);
    cy = Math.round((face.y + face.h / 2) * height);
    rx = Math.round((face.w / 2) * width * 1.3); // 30% larger than detected
    ry = Math.round((face.h / 2) * height * 1.3);
  } catch {
    // Fallback to heuristic if Vision fails
    cx = Math.round(width / 2);
    cy = Math.round(height * 0.18);
    rx = Math.round(width * 0.35);
    ry = Math.round(height * 0.22);
  }

  const maskSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="black"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/>
    </svg>`
  );

  const blurredBuffer = await sharp(originalBuffer).blur(40).toBuffer();
  const mask = await sharp(maskSvg).resize(width, height).grayscale().toBuffer();
  const blurredFace = await sharp(blurredBuffer)
    .composite([{ input: mask, blend: 'dest-in' as const }])
    .toBuffer();

  return await sharp(originalBuffer)
    .composite([{ input: blurredFace, blend: 'over' as const }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
