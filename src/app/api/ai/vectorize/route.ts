import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import sharp from 'sharp';
import potrace from 'potrace';

/* ═══════════════════════════════════════════════════════════
   Vectorize — Convert raster sketch (PNG/JPG) to SVG
   Uses potrace (pure JS, no WASM) for reliable serverless.
   Optimal for technical flat sketches (clean line art on white).
   ═══════════════════════════════════════════════════════════ */

function traceToSvg(imageBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const trace = new potrace.Potrace();
    trace.setParameters({
      threshold: 128,
      turdSize: 2,
      optCurve: true,
      optTolerance: 0.2,
      blackOnWhite: true,
      color: '#000000',
      background: 'transparent',
    });
    trace.loadImage(imageBuffer, (_potrace: unknown, err: Error | null) => {
      if (err) return reject(err);
      resolve(trace.getSVG());
    });
  });
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

    // Preprocess with sharp: grayscale → high contrast for clean tracing
    const processedBuffer = await sharp(imageBuffer)
      .greyscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    // Get dimensions for response
    const metadata = await sharp(imageBuffer).metadata();

    // Vectorize with potrace
    const svg = await traceToSvg(processedBuffer);

    return NextResponse.json({
      svg,
      width: metadata.width || 800,
      height: metadata.height || 600,
    });
  } catch (err) {
    console.error('[Vectorize] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Vectorization failed' },
      { status: 500 }
    );
  }
}
