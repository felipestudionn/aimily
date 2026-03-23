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

    const { reference_image_url, gender, age_range, ethnicity, body_type, style_vibe, collectionPlanId } = await req.json();

    if (!reference_image_url) {
      return NextResponse.json({ error: 'reference_image_url is required' }, { status: 400 });
    }

    const prompt = [
      `Professional fashion model photo`,
      gender ? `Gender: ${gender}` : '',
      age_range ? `Age: ${age_range}` : '',
      ethnicity ? `Ethnicity: ${ethnicity}` : '',
      body_type ? `Body type: ${body_type}` : '',
      style_vibe ? `Style: ${style_vibe}` : '',
      'High fashion editorial quality, studio lighting',
    ].filter(Boolean).join('. ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fal.subscribe('fal-ai/flux-2-pro', {
      input: {
        prompt,
        image_url: reference_image_url,
        num_images: 2,
        image_size: { width: 768, height: 1024 },
      },
    } as any);

    const falImages = result.data?.images || [];

    // Auto-persist to Supabase Storage if collectionPlanId provided
    if (collectionPlanId && falImages.length > 0) {
      const persisted = await Promise.all(
        falImages.map(async (img: { url: string }, i: number) => {
          try {
            const { publicUrl, assetId } = await persistAsset({
              collectionPlanId,
              assetType: 'model',
              name: `Brand Model ${gender || ''} ${i + 1}`.trim(),
              sourceUrl: img.url,
              phase: 'creative',
              metadata: { prompt, gender, age_range, ethnicity, body_type, style_vibe, fal_request_id: result.requestId },
              uploadedBy: user.id,
            });
            return { url: publicUrl, assetId, originalUrl: img.url };
          } catch (err) {
            console.error('[Model Create] Persist failed:', err);
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
    console.error('Model create error:', error);
    const message = error instanceof Error ? error.message : 'Model creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
