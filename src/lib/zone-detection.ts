import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { getDefaultZones } from './product-zones';

/* ═══════════════════════════════════════════════════════════
   Zone Detection — AI Vision identifies product zones in SVG
   Uses Claude Sonnet with dual input (raster + SVG source)
   for maximum accuracy in zone-to-path mapping.
   ═══════════════════════════════════════════════════════════ */

export interface ZoneMapping {
  idx: number;
  zone: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect zones in an SVG sketch using Claude Vision.
 * Returns a mapping of SVG element indices to zone names.
 */
export async function detectSvgZones(
  svgSource: string,
  category: string
): Promise<ZoneMapping[]> {
  const zones = getDefaultZones(category).map(z => z.zone);

  // 1. Render SVG to PNG for vision input
  const pngBuffer = await sharp(Buffer.from(svgSource)).png().toBuffer();
  const pngBase64 = pngBuffer.toString('base64');

  // 2. Index all shape elements
  let idx = 0;
  const indexedSvg = svgSource.replace(
    /<(path|ellipse|circle|rect|polygon|line)(\s)/g,
    (_, tag, sp) => `<${tag} data-idx="${idx++}"${sp}`
  );
  const totalElements = idx;

  if (totalElements === 0) return [];

  // 3. Send both image + SVG to Claude
  const client = new Anthropic();
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: pngBase64 },
        },
        {
          type: 'text',
          text: `You are a technical fashion designer. This image is a ${category} product sketch.
Below is the SVG source. Each shape element is tagged data-idx="N" (${totalElements} elements total).

Map each element to one of these product zones: ${zones.join(', ')}.
Elements that are guidelines, construction lines, or background → zone: "none".

For footwear:
- Upper = main body panels (largest area, mid-to-top)
- Midsole = horizontal band between upper and outsole (bottom third)
- Outsole = very bottom surface/tread
- Tongue = central panel in lace area
- Laces = crossing lines near top-center
- Heel Counter = rear curved section
- Eyelets = small circles near laces
- Lining = inner visible edge panels
- Branding = logo marks, text elements

Analyze the Y-coordinates and shape of each path to determine zone placement.

Return ONLY a JSON array, no explanation:
[{"idx": 0, "zone": "Upper", "confidence": "high"}, ...]

SVG source:
\`\`\`xml
${indexedSvg}
\`\`\``,
        },
      ],
    }],
  });

  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

/**
 * Apply zone labels to SVG paths based on detection mappings.
 * Returns a new SVG string with data-zone attributes on each element.
 */
export function applySvgZoneLabels(
  svgSource: string,
  mappings: ZoneMapping[]
): string {
  let idx = 0;
  return svgSource.replace(
    /<(path|ellipse|circle|rect|polygon|line)([\s>])/g,
    (match, tag, after) => {
      const mapping = mappings.find(m => m.idx === idx);
      idx++;
      const zone = mapping?.zone || 'none';
      return `<${tag} data-zone="${zone}" data-idx="${idx - 1}"${after}`;
    }
  );
}

/**
 * Extract zone colors from a labeled SVG.
 * Reads fill attributes from elements with data-zone.
 */
export function extractZoneColors(
  svgSource: string
): { zone: string; hex: string }[] {
  const zoneColors: { zone: string; hex: string }[] = [];
  const regex = /data-zone="([^"]+)"[^>]*fill="([^"]+)"/g;
  let match;
  while ((match = regex.exec(svgSource)) !== null) {
    const [, zone, fill] = match;
    if (zone !== 'none' && fill !== 'none' && fill !== 'transparent') {
      // Check if this zone already exists
      const existing = zoneColors.find(z => z.zone === zone);
      if (!existing) {
        zoneColors.push({ zone, hex: fill });
      }
    }
  }
  return zoneColors;
}
