import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import sharp from 'sharp';

/* ═══════════════════════════════════════════════════════════
   Vectorize — Convert raster sketch (PNG/JPG) to SVG
   Uses vtracer-wasm for high-quality spline-based tracing.
   Optimal for technical flat sketches (clean line art).
   ═══════════════════════════════════════════════════════════ */

let vtracerReady = false;

async function ensureVtracer() {
  if (vtracerReady) return;
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const { initSync } = await import('vtracer-wasm');
  const wasmPath = join(process.cwd(), 'node_modules/vtracer-wasm/vtracer.wasm');
  const wasmBytes = readFileSync(wasmPath);
  initSync(wasmBytes);
  vtracerReady = true;
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const { image_base64, image_url } = await req.json();

    // Get image buffer from base64 or URL
    let imageBuffer: Buffer;
    if (image_base64) {
      const base64Data = image_base64.includes(',') ? image_base64.split(',')[1] : image_base64;
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (image_url) {
      const res = await fetch(image_url);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      return NextResponse.json({ error: 'image_base64 or image_url required' }, { status: 400 });
    }

    // Preprocess: grayscale → threshold → RGBA pixels
    const { data, info } = await sharp(imageBuffer)
      .greyscale()
      .threshold(128)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Vectorize with vtracer-wasm
    await ensureVtracer();
    const { to_svg } = await import('vtracer-wasm');

    const svg = to_svg(new Uint8Array(data.buffer), info.width, info.height, {
      colormode: 'bw',
      mode: 'spline',
      filter_speckle: 4,
      corner_threshold: 60,
      segment_length: 3.5,
      splice_threshold: 45,
      path_precision: 3,
    });

    return NextResponse.json({
      svg,
      width: info.width,
      height: info.height,
    });
  } catch (err) {
    console.error('[Vectorize] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Vectorization failed' },
      { status: 500 }
    );
  }
}
