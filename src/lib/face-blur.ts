/**
 * Face preprocessing for editorial style reference images.
 *
 * STRATEGY v4 (2026-04-12): Use Claude Vision to detect the exact face
 * position in the style reference, then composite the aimily model's
 * headshot precisely over it. No more heuristic guessing.
 *
 * Flow:
 * 1. Send style reference to Claude Sonnet Vision: "where is the face?"
 * 2. Get back {x, y, width, height} as percentage of image dimensions
 * 3. Resize model headshot to match that exact region
 * 4. Composite with soft circular mask
 * 5. Result: style reference body + model face/hair = one clean image
 *
 * Nano Banana then receives only 2 references: product + composited style.
 * Zero identity conflict.
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
          text: 'Look at this fashion photograph. Find the person\'s HEAD (face + hair). Return ONLY a JSON object with the bounding box as fractions of the image dimensions (0 to 1): {"x": left_edge, "y": top_edge, "w": width, "h": height}. The box should include the entire head from the top of the hair to the chin, and from ear to ear including all hair. Return ONLY the JSON, no other text.',
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

function createCircleMask(width: number, height: number): Buffer {
  const rx = Math.round(width / 2);
  const ry = Math.round(height / 2);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%">
          <stop offset="0%" stop-color="white" stop-opacity="1"/>
          <stop offset="55%" stop-color="white" stop-opacity="1"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" fill="url(#g)"/>
    </svg>`
  );
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

  // Resize model headshot to match the detected face region
  const resizedHeadshot = await sharp(headshotBuffer)
    .resize(faceW, faceH, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Create soft elliptical mask
  const maskSvg = createCircleMask(faceW, faceH);
  const mask = await sharp(maskSvg)
    .resize(faceW, faceH)
    .grayscale()
    .toBuffer();

  // Apply mask to headshot
  const maskedHeadshot = await sharp(resizedHeadshot)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' as const }])
    .png()
    .toBuffer();

  // Composite onto style reference at the exact detected position
  const result = await sharp(styleBuffer)
    .composite([{
      input: maskedHeadshot,
      top: faceY,
      left: faceX,
      blend: 'over' as const,
    }])
    .jpeg({ quality: 90 })
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
