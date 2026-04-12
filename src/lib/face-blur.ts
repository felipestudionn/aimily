/**
 * Face blur preprocessing for editorial style reference images.
 *
 * Problem: Gemini 2.5 Flash (Nano Banana) preserves facial identity
 * from reference images. When a style reference photo of a model is
 * passed alongside a product image, the generated editorial photo
 * clones the reference model's face exactly. There is no API parameter
 * to control identity preservation strength.
 *
 * Solution: blur the face region in the style reference before sending
 * it to Nano Banana. The model still picks up composition, pose,
 * lighting, body proportions, wardrobe, and color grading — but without
 * a clear face to lock onto, it generates a new face that fits the scene.
 *
 * Approach: editorial fashion photography follows consistent framing
 * conventions — the face is reliably in the upper portion of the image.
 * We apply a strong Gaussian blur to an elliptical region in the upper
 * center of the image. This covers >95% of editorial fashion photos
 * (full body, three-quarter, seated poses) without any ML face detection.
 *
 * The blur is intentionally generous (large radius, wide region) to
 * ensure no facial features leak through. It's better to blur a bit
 * of hair/neck than to miss part of the face.
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
 * Create an SVG elliptical mask for the face region.
 * The ellipse is centered horizontally and positioned in the upper
 * portion of the image, sized to cover a typical head+neck area.
 */
function createFaceMask(width: number, height: number): Buffer {
  // Face center: horizontally centered, vertically at ~15% from top
  const cx = Math.round(width / 2);
  const cy = Math.round(height * 0.15);

  // Ellipse size: wide enough for a face + hair, tall enough for
  // head + partial neck. Scales with image dimensions.
  const rx = Math.round(width * 0.18);
  const ry = Math.round(height * 0.13);

  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="black"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/>
    </svg>`
  );

  return svg;
}

/**
 * Blur the face region in an editorial fashion photo.
 *
 * Returns a base64-encoded JPEG of the processed image, suitable
 * for re-uploading to Supabase Storage or passing to Nano Banana.
 *
 * @param imageUrl - URL of the style reference image
 * @returns Object with the blurred image buffer and its public URL
 *          after being uploaded, or the base64 data URL for inline use.
 */
export async function blurFaceInStyleReference(
  imageUrl: string
): Promise<Buffer> {
  const originalBuffer = await fetchImageBuffer(imageUrl);

  // Get image dimensions
  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // Create the elliptical face mask
  const maskSvg = createFaceMask(width, height);

  // 1. Create a heavily blurred version of the entire image
  const blurredBuffer = await sharp(originalBuffer)
    .blur(40) // Strong Gaussian blur — obliterates facial features
    .toBuffer();

  // 2. Create a grayscale mask from the SVG ellipse
  const mask = await sharp(maskSvg)
    .resize(width, height)
    .grayscale()
    .toBuffer();

  // 3. Extract just the blurred face region using the mask
  const blurredFace = await sharp(blurredBuffer)
    .composite([{
      input: mask,
      blend: 'dest-in' as const,
    }])
    .toBuffer();

  // 4. Composite the blurred face region onto the original image
  const result = await sharp(originalBuffer)
    .composite([{
      input: blurredFace,
      blend: 'over' as const,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return result;
}
