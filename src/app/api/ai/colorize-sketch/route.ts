import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Colorize Sketch — gpt-image-1-mini (low quality)
   Takes a B&W sketch + color instructions → colored version.
   Cost: ~$0.007/image (8x cheaper than Freepik Mystic)
   ═══════════════════════════════════════════════════════════ */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const { sketch_url, colorway_name, color_description, zone_colors, collectionPlanId } = await req.json();

    if (!sketch_url) {
      return NextResponse.json({ error: 'sketch_url required' }, { status: 400 });
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // Build zone-specific color instructions
    const zoneInstructions = zone_colors?.length
      ? zone_colors.map((z: { zone: string; hex: string }) => `${z.zone}: ${z.hex}`).join(', ')
      : color_description || 'natural colors';

    const prompt = `Colorize this technical product sketch with the following color scheme: ${colorway_name || 'colorway'}.

Zone colors: ${zoneInstructions}

RULES:
- Apply the specified colors to each zone of the product
- Keep the original line art/sketch structure intact
- Fill each zone with the solid color specified
- Maintain clean, professional product illustration style
- Keep the white/light background
- The result should look like a professional colored flat sketch / fashion illustration
- Do NOT make it photorealistic — keep it as a colored technical drawing`;

    // Get sketch as base64
    let sketchBase64: string;
    if (sketch_url.startsWith('data:image')) {
      sketchBase64 = sketch_url.split(',')[1];
    } else if (sketch_url.length > 500 && !sketch_url.startsWith('http')) {
      sketchBase64 = sketch_url;
    } else {
      const imgRes = await fetch(sketch_url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      sketchBase64 = buf.toString('base64');
    }

    // Call OpenAI gpt-image-1-mini
    const blob = new Blob([Buffer.from(sketchBase64, 'base64')], { type: 'image/png' });
    const formData = new FormData();
    formData.append('model', 'gpt-image-1-mini');
    formData.append('image', blob, 'sketch.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('quality', 'low');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Colorize] OpenAI error:', res.status, errText.slice(0, 300));
      return NextResponse.json({ error: `OpenAI error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    let imageUrl: string;

    if (data.data?.[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    } else if (data.data?.[0]?.url) {
      imageUrl = data.data[0].url;
    } else {
      return NextResponse.json({ error: 'No image in response' }, { status: 502 });
    }

    // Persist to storage if collectionPlanId provided
    if (collectionPlanId && imageUrl.startsWith('data:')) {
      try {
        const result = await persistAsset({
          collectionPlanId,
          assetType: 'render',
          name: `colorize-${colorway_name || 'preview'}`,
          base64: imageUrl.split(',')[1],
          mimeType: 'image/png',
          phase: 'design',
        });
        if (result?.publicUrl) imageUrl = result.publicUrl;
      } catch { /* use data URL as fallback */ }
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error('[Colorize] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Colorization failed' },
      { status: 500 }
    );
  }
}
