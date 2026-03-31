/* ═══════════════════════════════════════════════════════════
   Canvas Utilities — Gap closing & image processing
   Pure client-side pixel operations for line art coloring.
   ═══════════════════════════════════════════════════════════ */

/**
 * Morphological dilation — thickens dark pixels by `radius` px.
 * Used to close small gaps in line art before flood fill.
 * Operates on a grayscale interpretation: pixels darker than
 * `threshold` are considered "line" pixels and get expanded.
 */
export function dilateLines(
  imageData: ImageData,
  radius: number = 2,
  threshold: number = 180
): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      // If this pixel is already dark (a line), skip
      if (gray < threshold) continue;

      // Check if any neighbor within radius is dark (a line)
      let foundLine = false;
      for (let dy = -radius; dy <= radius && !foundLine; dy++) {
        for (let dx = -radius; dx <= radius && !foundLine; dx++) {
          if (dx === 0 && dy === 0) continue;
          // Circle check
          if (dx * dx + dy * dy > radius * radius) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = (ny * width + nx) * 4;
          const nGray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
          if (nGray < threshold) foundLine = true;
        }
      }

      // If a line pixel is nearby, darken this pixel (expand the line)
      if (foundLine) {
        out[idx] = 0;
        out[idx + 1] = 0;
        out[idx + 2] = 0;
        out[idx + 3] = 255;
      }
    }
  }

  return new ImageData(out, width, height);
}

/**
 * Convert ImageData to grayscale + threshold for clean boundary detection.
 * Returns a new ImageData where lines are pure black and background is pure white.
 */
export function binarize(
  imageData: ImageData,
  threshold: number = 128
): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = gray < threshold ? 0 : 255;
    out[i] = val;
    out[i + 1] = val;
    out[i + 2] = val;
    out[i + 3] = 255;
  }

  return new ImageData(out, width, height);
}

/**
 * Prepare a line art image for flood fill:
 * 1. Binarize (clean black/white)
 * 2. Dilate lines to close gaps
 * Returns the processed ImageData to use as boundary map.
 */
export function prepareForFloodFill(
  imageData: ImageData,
  dilateRadius: number = 2
): ImageData {
  const binarized = binarize(imageData, 140);
  return dilateLines(binarized, dilateRadius, 180);
}

/**
 * Create a mask from a flood fill result.
 * Compares before/after ImageData and returns which pixels changed.
 */
export function extractFillMask(
  before: ImageData,
  after: ImageData
): boolean[] {
  const mask = new Array(before.width * before.height);
  for (let i = 0; i < mask.length; i++) {
    const idx = i * 4;
    mask[i] =
      before.data[idx] !== after.data[idx] ||
      before.data[idx + 1] !== after.data[idx + 1] ||
      before.data[idx + 2] !== after.data[idx + 2] ||
      before.data[idx + 3] !== after.data[idx + 3];
  }
  return mask;
}

/**
 * Apply a color with alpha to a canvas using a boolean mask.
 * Only pixels where mask[i] === true get colored.
 */
export function applyMaskColor(
  ctx: CanvasRenderingContext2D,
  mask: boolean[],
  width: number,
  color: { r: number; g: number; b: number; a: number }
) {
  const imageData = ctx.getImageData(0, 0, width, mask.length / width);
  const { data } = imageData;

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const idx = i * 4;
    // Alpha blend
    const srcA = color.a / 255;
    const dstA = data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);

    if (outA > 0) {
      data[idx] = (color.r * srcA + data[idx] * dstA * (1 - srcA)) / outA;
      data[idx + 1] = (color.g * srcA + data[idx + 1] * dstA * (1 - srcA)) / outA;
      data[idx + 2] = (color.b * srcA + data[idx + 2] * dstA * (1 - srcA)) / outA;
      data[idx + 3] = outA * 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Parse hex color to RGBA components */
export function hexToRgba(hex: string, alpha: number = 77): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    a: alpha,
  };
}
