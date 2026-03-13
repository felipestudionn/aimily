import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

fal.config({ credentials: process.env.FAL_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const { garment_image_url, model_image_url, category, collectionPlanId } = await req.json();

    if (!garment_image_url) {
      return NextResponse.json({ error: 'garment_image_url is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fal.subscribe('fal-ai/fashn/tryon/v1.6', {
      input: {
        garment_image: garment_image_url,
        model_image: model_image_url || undefined,
        category: category || 'auto',
      },
    } as any);

    const falImages = result.data?.output
      ? [{ url: result.data.output }]
      : result.data?.images || [];

    // Auto-persist to Supabase Storage if collectionPlanId provided
    if (collectionPlanId && falImages.length > 0) {
      const persisted = await Promise.all(
        falImages.map(async (img: { url: string }, i: number) => {
          try {
            const { publicUrl, assetId } = await persistAsset({
              collectionPlanId,
              assetType: 'tryon',
              name: `Virtual Try-On ${i + 1}`,
              sourceUrl: img.url,
              phase: 'design',
              metadata: { category, fal_request_id: result.requestId },
              uploadedBy: user.id,
            });
            return { url: publicUrl, assetId, originalUrl: img.url };
          } catch (err) {
            console.error('[Try-On] Persist failed:', err);
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
    console.error('FASHN try-on error:', error);
    const message = error instanceof Error ? error.message : 'Try-on generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
