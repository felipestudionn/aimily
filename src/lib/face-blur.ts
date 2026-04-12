/**
 * Face preprocessing for editorial style reference images.
 *
 * STRATEGY v3 (2026-04-12): Instead of blurring the face (which still
 * let hair/identity leak through), we now COMPOSITE the aimily model's
 * headshot onto the style reference. The result is a single image that
 * has the style reference's body/pose/lighting/wardrobe WITH the aimily
 * model's face and hair. Nano Banana then only receives 2 reference
 * images (product + composited style) instead of 3, which eliminates
 * the identity conflict entirely.
 *
 * Approach:
 * 1. Take the style reference (full editorial photo)
 * 2. Take the aimily model headshot (casting Polaroid)
 * 3. Resize the headshot to fit the head region of the style reference
 * 4. Composite the headshot over the head area with a soft circular mask
 * 5. Result: style reference body + model face/hair = perfect input
 *
 * Fallback: if compositing fails for any reason, fall back to the
 * previous blur strategy so generation isn't blocked.
 */

import sharp from 'sharp';

/**
 * Download an image from a URL and return it as a Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Create a circular gradient mask for smooth blending.
 */
function createCircleMask(size: number): Buffer {
  const r = Math.round(size / 2);
  // Radial gradient from white center to transparent edge for soft blend
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g">
          <stop offset="0%" stop-color="white" stop-opacity="1"/>
          <stop offset="60%" stop-color="white" stop-opacity="1"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${r}" cy="${r}" r="${r}" fill="url(#g)"/>
    </svg>`
  );
}

/**
 * Composite the aimily model's head onto the style reference image.
 *
 * The headshot is resized to match the approximate head size in the
 * style reference (based on the image dimensions — editorial fashion
 * photos follow consistent framing conventions), then overlaid with
 * a soft circular mask for natural blending.
 *
 * @param styleRefUrl - URL of the style reference image
 * @param modelHeadshotUrl - URL of the aimily model headshot
 * @returns Buffer of the composited JPEG image
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

  // Estimate head size in the style reference based on image dimensions.
  // In editorial fashion photos (full body / three-quarter):
  // - Head width ≈ 20-30% of image width
  // - Head is in the upper 25% of the image
  const headSize = Math.round(styleW * 0.28);
  const headX = Math.round(styleW / 2 - headSize / 2);
  const headY = Math.round(styleH * 0.02); // Very top with small margin

  // Resize the headshot to fit the head area, crop to square from top
  const resizedHeadshot = await sharp(headshotBuffer)
    .resize(headSize, headSize, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Create soft circular mask for natural blending
  const maskSvg = createCircleMask(headSize);
  const mask = await sharp(maskSvg)
    .resize(headSize, headSize)
    .grayscale()
    .toBuffer();

  // Apply mask to headshot (makes edges transparent)
  const maskedHeadshot = await sharp(resizedHeadshot)
    .ensureAlpha()
    .composite([{
      input: mask,
      blend: 'dest-in' as const,
    }])
    .png()
    .toBuffer();

  // Composite masked headshot onto the style reference
  const result = await sharp(styleBuffer)
    .composite([{
      input: maskedHeadshot,
      top: headY,
      left: headX,
      blend: 'over' as const,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return result;
}

/**
 * Legacy blur function — kept as fallback if compositing fails.
 */
export async function blurFaceInStyleReference(
  imageUrl: string
): Promise<Buffer> {
  const originalBuffer = await fetchImageBuffer(imageUrl);
  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const cx = Math.round(width / 2);
  const cy = Math.round(height * 0.18);
  const rx = Math.round(width * 0.35);
  const ry = Math.round(height * 0.22);

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
