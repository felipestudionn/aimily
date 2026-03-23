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

/**
 * Generate a technical flat sketch from a design description.
 * Uses fal.ai Flux 2 Pro with a specialized fashion flat sketch prompt.
 *
 * Input: { description, productType, family, concept, collectionPlanId?, skuId? }
 * Output: { images: [{ url }], requestId }
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const {
      description,
      productType,
      family,
      concept,
      skuName,
      collectionPlanId,
      skuId,
    } = await req.json();

    if (!description && !concept) {
      return NextResponse.json(
        { error: 'description or concept is required' },
        { status: 400 }
      );
    }

    // Build specialized flat sketch prompt
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


    const result = await fal.subscribe('fal-ai/flux-2-pro', {
      input: {
        prompt: fullPrompt,
        num_images: 2,
        image_size: { width: 1024, height: 1024 },
        guidance_scale: 7.5,
      },
    } as any);

    const falImages = result.data?.images || [];


    // Auto-persist if collectionPlanId provided
    if (collectionPlanId && falImages.length > 0) {
      const persisted = await Promise.all(
        falImages.map(async (img: { url: string }, i: number) => {
          try {
            const { publicUrl, assetId } = await persistAsset({
              collectionPlanId,
              assetType: 'sketch',
              name: `AI Sketch ${skuName || ''} ${i + 1}`.trim(),
              sourceUrl: img.url,
              phase: 'design',
              metadata: {
                prompt: fullPrompt,
                productType,
                family,
                skuId,
                fal_request_id: result.requestId,
              },
              uploadedBy: user.id,
            });
            return { url: publicUrl, assetId, originalUrl: img.url };
          } catch (err) {
            console.error('[Sketch Gen] Persist failed:', err);
            return { url: img.url, assetId: null, originalUrl: img.url };
          }
        })
      );
      return NextResponse.json({
        images: persisted,
        requestId: result.requestId,
        persisted: true,
      });
    }

    return NextResponse.json({
      images: falImages,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Sketch generation error:', error);
    const message = error instanceof Error ? error.message : 'Sketch generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
