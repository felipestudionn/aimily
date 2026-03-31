import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { detectSvgZones, applySvgZoneLabels } from '@/lib/zone-detection';

/* ═══════════════════════════════════════════════════════════
   Detect Zones — AI identifies product zones in SVG sketch
   Uses Claude Vision (dual input: raster + SVG source)
   Returns labeled SVG + zone mappings
   ═══════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const { svg, category } = await req.json();

    if (!svg || !category) {
      return NextResponse.json(
        { error: 'svg and category required' },
        { status: 400 }
      );
    }

    // Detect zones via Claude Vision
    const mappings = await detectSvgZones(svg, category);

    // Apply labels to SVG
    const labeledSvg = applySvgZoneLabels(svg, mappings);

    return NextResponse.json({
      svg: labeledSvg,
      mappings,
      zonesFound: mappings.filter(m => m.zone !== 'none').length,
      totalElements: mappings.length,
    });
  } catch (err) {
    console.error('[DetectZones] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Zone detection failed' },
      { status: 500 }
    );
  }
}
