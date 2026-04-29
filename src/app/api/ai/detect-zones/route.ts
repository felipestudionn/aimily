import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { detectImageZones } from '@/lib/zone-detection';

/* ═══════════════════════════════════════════════════════════
   Detect Zones — AI identifies product zones in sketch image
   Claude Vision analyzes the raster image directly, returns
   bounding boxes (% of image) for each product zone.
   No vectorization needed.
   ═══════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { image_base64, image_url, category } = await req.json();

    if (!category) {
      return NextResponse.json({ error: 'category required' }, { status: 400 });
    }

    // Get base64 from URL if needed
    let base64 = image_base64;
    if (!base64 && image_url) {
      // Handle data URIs
      if (image_url.startsWith('data:')) {
        base64 = image_url.split(',')[1];
      } else if (image_url.length > 500 && !image_url.startsWith('http')) {
        // Raw base64
        base64 = image_url;
      } else {
        // Fetch from URL
        const res = await fetch(image_url);
        const buf = Buffer.from(await res.arrayBuffer());
        base64 = buf.toString('base64');
      }
    }

    if (!base64) {
      return NextResponse.json({ error: 'image_base64 or image_url required' }, { status: 400 });
    }

    // Clean base64 (remove data URI prefix if present)
    if (base64.includes(',')) base64 = base64.split(',')[1];

    const zones = await detectImageZones(base64, category);

    return NextResponse.json({
      zones,
      zonesFound: zones.length,
    });
  } catch (err) {
    console.error('[DetectZones] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Zone detection failed' },
      { status: 500 }
    );
  }
}
