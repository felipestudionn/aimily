import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Colorize Sketch — gpt-image-1.5
   Two modes:
     • Colorization: B&W sketch + color instructions → colored flat (medium, ~$0.034)
     • 3D Render:    colored sketch → photorealistic product photo (high + input_fidelity high, ~$0.133)
   ═══════════════════════════════════════════════════════════ */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const { sketch_url, colorway_name, color_description, zone_colors, category, product_name, family, collectionPlanId, is_3d_render } = await req.json();

    if (!sketch_url) {
      return NextResponse.json({ error: 'sketch_url required' }, { status: 400 });
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // Build zone-specific color instructions
    const zoneInstructions = zone_colors?.length
      ? zone_colors.map((z: { zone: string; hex: string }) => `• ${z.zone} → ${z.hex.toUpperCase()}`).join('\n')
      : color_description || 'natural colors';

    // Product-aware context
    const productType = category === 'CALZADO' ? 'footwear/shoe' : category === 'ROPA' ? 'apparel/garment' : 'accessory';
    const productDesc = product_name ? `"${product_name}"${family ? ` from the ${family} family` : ''}` : 'this product';

    const prompt = is_3d_render
      ? `Convert this colored sketch into a photorealistic photograph of the exact same ${productType}: ${productDesc}. Change ONLY the rendering style from illustration to photo. Keep everything else identical.

WHAT TO CHANGE: rendering style only. Make the flat illustration look like a real photograph with realistic material textures (leather grain, suede nap, rubber, mesh weave, fabric), natural lighting, and a soft contact shadow beneath.

WHAT MUST STAY IDENTICAL: the exact silhouette, proportions, viewing angle, every panel, every zone, every color, the closure system (if velcro then velcro, if laces then laces, if slip-on then slip-on), and the sole shape. Count the panels in the sketch and match them exactly.

BACKGROUND: pure flat white (#FFFFFF). No pedestal, no box, no surface, no gradient. Just white with a subtle drop shadow under the shoe.

STRICTLY FORBIDDEN — do not do any of these:
• Do NOT add laces if the sketch has no laces.
• Do NOT add text, logos, brand names, or any writing on the shoe.
• Do NOT add any element that is not visible in the sketch.
• Do NOT place the shoe on any surface, box, or pedestal.
• Do NOT change the number of panels, straps, or overlays.
• Do NOT include a human foot or mannequin.

This is a style transfer, not a redesign. The sketch is the blueprint — follow it exactly.`
      : `You are an expert fashion product illustrator. This sketch shows a ${productType}: ${productDesc}.

STEP 1 — IDENTIFY THE PRODUCT:
Look at this sketch carefully. Identify what type of ${productType} it is and recognize its anatomical zones (the different structural parts visible in the drawing).

STEP 2 — APPLY COLORWAY "${colorway_name || 'colorway'}":
Color each zone with its assigned color. The zones and their colors are:

${zoneInstructions}

STEP 3 — EXECUTION RULES (CRITICAL — READ CAREFULLY):
• DO NOT ALTER THE SKETCH IN ANY WAY. The silhouette, proportions, line positions, construction details, angle, and composition must be PIXEL-PERFECT identical to the input image. You are ONLY adding color fills — nothing else changes.
• Fill each identified zone with its flat color. Use the exact hex specified.
• Each zone MUST be visually distinguishable from adjacent zones.
• Keep ALL original line art visible: construction lines, stitching, seam lines remain as darker outlines within colored areas.
• Add very subtle tonal variation within zones for dimensionality (lighter on top, slightly darker on bottom).
• This is a colored technical flat illustration — NOT photorealistic. Think "fashion flat with color" — the same drawing, just with color added.
• Background: clean white.
• DO NOT redraw, reinterpret, or modify the shoe/product shape. ONLY add color to the existing drawing.`;

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

    // gpt-image-1.5: 4x faster, 20% cheaper, better edit precision than gpt-image-1
    // input_fidelity="high" preserves sketch structure (silhouette, proportions, details)
    const blob = new Blob([Buffer.from(sketchBase64, 'base64')], { type: 'image/png' });
    const formData = new FormData();
    formData.append('model', 'gpt-image-1.5');
    formData.append('image', blob, 'sketch.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('quality', is_3d_render ? 'high' : 'medium');
    if (is_3d_render) formData.append('input_fidelity', 'high');

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
