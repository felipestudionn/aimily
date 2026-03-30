import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Freepik Flux Dev — Technical Flat Sketch Generation
   €0.01/image — 5x cheaper than Fal.ai Flux 2 Pro
   ═══════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FLUX_DEV_ENDPOINT = 'https://api.freepik.com/v1/ai/text-to-image/flux-dev';

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

    // Build specialized flat sketch prompt (same as Fal.ai version)
    const promptParts = [
      'Technical fashion flat sketch, black line drawing on pure white background',
      'Clean technical illustration for a tech pack / spec sheet',
      'Front view only, no perspective, no shadows, no color, no human body',
      'Precise construction details: seams, stitching, panels, closures, pockets, topstitching',
      'Proportions accurate for pattern-making, factory-ready level of detail',
      'Think like a patternmaker, not an illustrator',
      `Product: ${productType || 'garment'}`,
    ];

    if (family) promptParts.push(`Category: ${family}`);
    if (skuName) promptParts.push(`Style: ${skuName}`);
    if (description) promptParts.push(`Design direction: ${description}`);
    if (concept) promptParts.push(`Concept: ${concept}`);
    promptParts.push('Minimal, precise, technical. Black ink on white. No decorative elements.');

    const fullPrompt = promptParts.join('. ');

    // Create task
    const createRes = await fetch(FLUX_DEV_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': FREEPIK_API_KEY,
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        aspect_ratio: 'square_1_1',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('[Freepik Sketch] Create failed:', err);
      return NextResponse.json({ error: err.message || 'Freepik API error' }, { status: createRes.status });
    }

    const { data: createData } = await createRes.json();
    const taskId = createData?.task_id;

    if (!taskId) {
      return NextResponse.json({ error: 'No task_id returned' }, { status: 500 });
    }

    // Poll for completion (max 60 seconds)
    let images: string[] = [];
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`${FLUX_DEV_ENDPOINT}/${taskId}`, {
        headers: { 'x-freepik-api-key': FREEPIK_API_KEY },
      });
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === 'COMPLETED') {
        images = statusData.data?.generated || [];
        break;
      }
      if (status === 'FAILED') {
        console.error('[Freepik Sketch] Task failed:', statusData);
        return NextResponse.json({ error: 'Sketch generation failed' }, { status: 500 });
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'Sketch timed out' }, { status: 504 });
    }

    // Persist to Supabase Storage
    if (collectionPlanId) {
      const persisted = await Promise.all(
        images.map(async (imgUrl: string, i: number) => {
          try {
            const { publicUrl } = await persistAsset({
              collectionPlanId,
              assetType: 'sketch',
              name: `AI Sketch ${skuName || ''} ${i + 1}`.trim(),
              sourceUrl: imgUrl,
              phase: 'design',
              metadata: { provider: 'freepik-flux-dev', taskId },
              uploadedBy: user.id,
            });
            return { url: publicUrl, originalUrl: imgUrl };
          } catch {
            return { url: imgUrl, originalUrl: imgUrl };
          }
        })
      );
      return NextResponse.json({ images: persisted, taskId, provider: 'freepik-flux-dev' });
    }

    return NextResponse.json({
      images: images.map(url => ({ url, originalUrl: url })),
      taskId,
      provider: 'freepik-flux-dev',
    });
  } catch (error) {
    console.error('[Freepik Sketch] Error:', error);
    const message = error instanceof Error ? error.message : 'Sketch generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
