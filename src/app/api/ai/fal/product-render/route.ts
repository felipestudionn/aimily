import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

fal.config({
  credentials: process.env.FAL_KEY || '',
  requestMiddleware: async (request) => ({
    ...request,
    headers: { ...request.headers, 'X-Fal-Object-Lifecycle-Preference': 'delete-after-24h' },
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const { image_url, prompt, background, width, height, story_context, collectionPlanId } = await req.json();

    if (!image_url && !prompt) {
      return NextResponse.json({ error: 'image_url or prompt is required' }, { status: 400 });
    }

    const promptParts = [
      prompt || 'Professional product photography',
    ];
    if (story_context) {
      promptParts.push(`Story context: "${story_context.name}" — ${story_context.tone || ''}`);
      if (story_context.brand_personality) promptParts.push(`Brand aesthetic: ${story_context.brand_personality}`);
    }
    promptParts.push(background ? `Background: ${background}` : 'Clean white studio background');
    promptParts.push('High resolution, commercial quality, fashion product shot');
    promptParts.push('Sharp focus, professional lighting, e-commerce ready');

    const fullPrompt = promptParts.join('. ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: fullPrompt,
      num_images: 2,
      image_size: { width: width || 1024, height: height || 1024 },
    };

    if (image_url) {
      input.image_url = image_url;
      input.strength = 0.75;
    }

    const result = await fal.subscribe('fal-ai/flux-2-pro', { input } as any);
    const falImages = result.data?.images || [];

    // Auto-persist to Supabase Storage if collectionPlanId provided
    if (collectionPlanId && falImages.length > 0) {
      const persisted = await Promise.all(
        falImages.map(async (img: { url: string }, i: number) => {
          try {
            const { publicUrl, assetId } = await persistAsset({
              collectionPlanId,
              assetType: 'render',
              name: `Product Render ${i + 1}`,
              sourceUrl: img.url,
              phase: 'design',
              metadata: { prompt: fullPrompt, fal_request_id: result.requestId },
              uploadedBy: user.id,
            });
            return { url: publicUrl, assetId, originalUrl: img.url };
          } catch (err) {
            console.error('[Product Render] Persist failed:', err);
            return { url: img.url, assetId: null, originalUrl: img.url };
          }
        })
      );
      return NextResponse.json({ images: persisted, requestId: result.requestId, persisted: true });
    }

    return NextResponse.json({
      images: falImages,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Product render error:', error);
    const message = error instanceof Error ? error.message : 'Product render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
