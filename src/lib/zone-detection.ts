import Anthropic from '@anthropic-ai/sdk';
import { getDefaultZones } from './product-zones';

/* ═══════════════════════════════════════════════════════════
   Zone Detection — AI Vision identifies product zones in image
   Claude analyzes the raster sketch directly and returns
   bounding polygons for each zone. No vectorization needed.
   ═══════════════════════════════════════════════════════════ */

export interface ZoneRegion {
  zone: string;
  /** Bounding box as percentage of image (0-100) */
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect product zones in a sketch image using Claude Vision.
 * Returns bounding boxes (as % of image dimensions) for each zone.
 */
export async function detectImageZones(
  imageBase64: string,
  category: string
): Promise<ZoneRegion[]> {
  const zones = getDefaultZones(category);
  const zoneNames = zones.map(z => z.zone);

  const client = new Anthropic();
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: imageBase64 },
        },
        {
          type: 'text',
          text: `You are a technical fashion product designer. This image shows a ${category} product sketch (side profile).

Identify each product zone and return its bounding rectangle as a percentage of the image dimensions (0-100 for x, y, width, height).

The zones to identify for ${category}: ${zoneNames.join(', ')}

Guidelines for footwear (side profile view):
- Upper: main body of the shoe, typically 30-70% of image height, 20-80% width
- Tongue: small panel at the top-center where laces meet upper
- Midsole: horizontal band at the bottom, typically 65-80% from top, full width of shoe
- Outsole: very bottom strip, typically 80-95% from top
- Heel Counter: rear portion, right 15-30% of shoe width, mid height
- Laces: narrow area at top-center
- Eyelets: tiny region near laces (can overlap with laces area)
- Lining: thin strip visible at shoe opening (top edge)
- Branding: where logos appear (side panel)

Return ONLY a JSON array. Every zone MUST be included even if approximate:
[{"zone": "Upper", "x": 20, "y": 25, "width": 55, "height": 40, "confidence": "high"}, ...]

x = left edge %, y = top edge %, width = zone width %, height = zone height %.
All values relative to full image dimensions (0-100).`,
        },
      ],
    }],
  });

  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    // Fallback: return default positioned zones
    return getDefaultZonePositions(category);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ZoneRegion[];
    // Validate and clamp values
    return parsed.map(z => ({
      zone: z.zone,
      x: Math.max(0, Math.min(100, z.x)),
      y: Math.max(0, Math.min(100, z.y)),
      width: Math.max(5, Math.min(100, z.width)),
      height: Math.max(5, Math.min(100, z.height)),
      confidence: z.confidence || 'medium',
    }));
  } catch {
    return getDefaultZonePositions(category);
  }
}

/** Fallback zone positions when AI detection fails */
function getDefaultZonePositions(category: string): ZoneRegion[] {
  if (category === 'CALZADO') {
    return [
      { zone: 'Upper', x: 15, y: 15, width: 55, height: 40, confidence: 'low' },
      { zone: 'Tongue', x: 40, y: 5, width: 15, height: 20, confidence: 'low' },
      { zone: 'Midsole', x: 10, y: 60, width: 70, height: 15, confidence: 'low' },
      { zone: 'Outsole', x: 10, y: 75, width: 70, height: 12, confidence: 'low' },
      { zone: 'Heel Counter', x: 65, y: 20, width: 18, height: 35, confidence: 'low' },
      { zone: 'Laces', x: 35, y: 10, width: 15, height: 15, confidence: 'low' },
      { zone: 'Lining', x: 20, y: 10, width: 45, height: 8, confidence: 'low' },
      { zone: 'Eyelets', x: 32, y: 15, width: 10, height: 10, confidence: 'low' },
      { zone: 'Branding', x: 40, y: 35, width: 20, height: 15, confidence: 'low' },
    ];
  }
  // Generic fallback
  const zones = getDefaultZones(category);
  const count = zones.length;
  return zones.map((z, i) => ({
    zone: z.zone,
    x: 10,
    y: 10 + (i * (80 / count)),
    width: 60,
    height: Math.max(10, 70 / count),
    confidence: 'low' as const,
  }));
}
