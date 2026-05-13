/**
 * Extract the dominant colors from an image URL.
 *
 * Used by /api/ai/design-generate (type=color-suggest) to seed the FIRST
 * colorway proposal with the actual colors from the SKU's reference
 * photo. Felipe's rule (2026-05-13): "one of the proposals — the first —
 * has to read back the colors of the reference photo. If we extract
 * them, save them so we don't extract twice."
 *
 * Implementation: downsample the image to a small canvas (sharp), then
 * cluster pixels into `count` color groups by truncating each channel to
 * a 5-bit bucket. This is faster than full k-means and good enough for
 * choosing 5-6 anchor hex values from a reference photo — quantization
 * artifacts disappear once the LLM rephrases the colors into a colorway.
 *
 * Background / near-white / near-black pixels are deprioritised so a
 * studio shot doesn't dominate the result with the seamless behind the
 * model. The "main subject" colors win.
 */
import sharp from 'sharp';

export interface PaletteColor {
  hex: string;
  /** 0-1 fraction of pixels in this bucket (after background filter). */
  share: number;
}

/**
 * @param imageUrlOrBuffer  Public URL (http/https), data URL, or raw Buffer
 * @param count             Target number of colors (default 6)
 */
export async function extractImagePalette(
  imageUrlOrBuffer: string | Buffer,
  count: number = 6,
): Promise<PaletteColor[]> {
  let buffer: Buffer;
  if (Buffer.isBuffer(imageUrlOrBuffer)) {
    buffer = imageUrlOrBuffer;
  } else if (imageUrlOrBuffer.startsWith('data:')) {
    const b64 = imageUrlOrBuffer.split(',')[1] || '';
    buffer = Buffer.from(b64, 'base64');
  } else {
    const res = await fetch(imageUrlOrBuffer);
    if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
    const ab = await res.arrayBuffer();
    buffer = Buffer.from(ab);
  }

  // 128px on the long edge is plenty for picking dominant tones, and
  // keeps the scan loop well under 20k pixels.
  const { data, info } = await sharp(buffer)
    .resize(128, 128, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  /* Bucket by 5-bit RGB (≤ 32k buckets) and tally pixel counts.
   * Pixels closer to the image center weigh more, on the assumption
   * that the subject (garment, shoe, accessory) lives in the central
   * 60% of the frame and the edges are sky / floor / studio. Without
   * this bias a model in a polka-dot dress against the sky produced
   * a palette dominated by sky tones, not the dress. */
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      /* Background filter: near-white (every channel > 240) and near-black
         (every channel < 15) are almost always seamless / shadow. Skip. */
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;

      /* Center-weight: 1.0 at the center, 0.25 at the corners. */
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const weight = 0.25 + 0.75 * (1 - dist / maxDist);

      const key = (r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3);
      const entry = buckets.get(key);
      if (entry) {
        entry.r += r * weight; entry.g += g * weight; entry.b += b * weight; entry.n += weight;
      } else {
        buckets.set(key, { r: r * weight, g: g * weight, b: b * weight, n: weight });
      }
    }
  }

  if (buckets.size === 0) return [];

  /* Sort buckets by population, pick top `count` while keeping picks
     reasonably distinct (Lab-ish distance check). */
  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .map(e => ({
      r: Math.round(e.r / e.n),
      g: Math.round(e.g / e.n),
      b: Math.round(e.b / e.n),
      n: e.n,
    }));

  const totalPixels = sorted.reduce((acc, c) => acc + c.n, 0);
  const picks: typeof sorted = [];
  const DIST_MIN = 28; // a perceptual-ish RGB distance threshold

  for (const c of sorted) {
    if (picks.length >= count) break;
    const tooClose = picks.some(p =>
      Math.sqrt((p.r - c.r) ** 2 + (p.g - c.g) ** 2 + (p.b - c.b) ** 2) < DIST_MIN,
    );
    if (!tooClose) picks.push(c);
  }

  return picks.map(p => ({
    hex: rgbToHex(p.r, p.g, p.b),
    share: Number((p.n / totalPixels).toFixed(3)),
  }));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}
