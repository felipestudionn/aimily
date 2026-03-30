import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Freepik Flux Dev — Technical Flat Sketch Generation
   €0.01/image
   Footwear: 2 parallel calls (side + top-down) = €0.02
   Apparel: 1 call (front view) = €0.01
   ═══════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FLUX_DEV_ENDPOINT = 'https://api.freepik.com/v1/ai/text-to-image/flux-dev';

async function createAndPoll(prompt: string): Promise<string | null> {
  const createRes = await fetch(FLUX_DEV_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': FREEPIK_API_KEY! },
    body: JSON.stringify({ prompt, aspect_ratio: 'square_1_1' }),
  });
  if (!createRes.ok) return null;
  const { data } = await createRes.json();
  const taskId = data?.task_id;
  if (!taskId) return null;

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${FLUX_DEV_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY! },
    });
    const sd = await res.json();
    if (sd.data?.status === 'COMPLETED') return sd.data?.generated?.[0] || null;
    if (sd.data?.status === 'FAILED') return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    if (!FREEPIK_API_KEY) {
      return NextResponse.json({ error: 'Freepik API key not configured' }, { status: 500 });
    }

    const { description, productType, family, concept, skuName, collectionPlanId } = await req.json();

    if (!description && !concept) {
      return NextResponse.json({ error: 'description or concept is required' }, { status: 400 });
    }

    const isFootwear = productType === 'CALZADO' || /shoe|sneaker|boot|sandal|footwear|calzado/i.test(family || '');
    const designDesc = [description, concept, skuName, family].filter(Boolean).join('. ');

    const baseRules = 'Factory-ready tech pack illustration. Black ink only on pure white. No color, no shading, no fills. Single shoe, not a pair. Solid lines for seams, dashed lines for stitching.';

    // Build prompts
    const prompts: { label: string; prompt: string }[] = [];

    if (isFootwear) {
      prompts.push({
        label: 'Side Profile',
        prompt: `Technical fashion flat sketch, black line drawing on pure white background. Side profile view of a single shoe pointing left, resting on a horizontal ground line. Show the full lateral silhouette: upper panels, tongue, closure system, midsole profile, outsole tread, heel counter, toe box shape, all seam lines. Shoe: ${designDesc}. ${baseRules}`,
      });
      prompts.push({
        label: 'Top Down',
        prompt: `Technical fashion flat sketch, black line drawing on pure white background. Top-down bird's eye view looking straight down at a single shoe from directly above. Show the collar opening, tongue shape, lacing or strap layout, toe box contour, and upper panel distribution from above. All seam lines visible. Shoe: ${designDesc}. ${baseRules}`,
      });
    } else {
      prompts.push({
        label: 'Front',
        prompt: `Technical fashion flat sketch, black line drawing on pure white background. Front view only, no perspective, no shadows, no color, no human body. Precise construction details: seams, stitching, panels, closures, topstitching. Proportions accurate for pattern-making. Product: ${productType || 'garment'}. ${designDesc}. ${baseRules}`,
      });
    }

    // Launch all in parallel
    const results = await Promise.allSettled(
      prompts.map(p => createAndPoll(p.prompt))
    );

    const images: { url: string; originalUrl: string; label: string }[] = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== 'fulfilled' || !r.value) continue;
      const url = r.value;
      const label = prompts[i].label;

      let finalUrl = url;
      if (collectionPlanId) {
        try {
          const { publicUrl } = await persistAsset({
            collectionPlanId,
            assetType: 'sketch',
            name: `AI Sketch ${skuName || ''} — ${label}`.trim(),
            sourceUrl: url,
            phase: 'design',
            metadata: { provider: 'freepik-flux-dev', view: label },
            uploadedBy: user.id,
          });
          finalUrl = publicUrl;
        } catch { /* keep original */ }
      }
      images.push({ url: finalUrl, originalUrl: url, label });
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'Sketch generation failed' }, { status: 500 });
    }

    return NextResponse.json({
      images,
      isFootwear,
      views: images.map(i => i.label),
      provider: 'freepik-flux-dev',
    });
  } catch (error) {
    console.error('[Freepik Sketch] Error:', error);
    const message = error instanceof Error ? error.message : 'Sketch generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
