import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
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

    const { image_url, prompt, background, width, height, story_context, collectionPlanId, design_context } = await req.json();

    if (!image_url && !prompt) {
      return NextResponse.json({ error: 'image_url or prompt is required' }, { status: 400 });
    }

    if (collectionPlanId) {
      const perm = await checkTeamPermission({
        userId: user!.id,
        collectionPlanId,
        permission: 'generate_ai_marketing',
      });
      if (!perm.allowed) return perm.error!;
    }

    const usage = await checkAIUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const promptParts: string[] = [];

    // Design context — structured data from SKU (sketch + colors + materials)
    if (design_context) {
      const dc = design_context;
      // CRITICAL: The prompt must preserve the EXACT silhouette from the sketch.
      // The sketch is the source of truth for the shape — the prompt adds color, material, and lighting.
      promptParts.push(`Transform this technical flat sketch into a photorealistic product photograph`);
      promptParts.push(`PRESERVE THE EXACT SILHOUETTE, proportions, and design details from the sketch`);
      promptParts.push(`Product: ${dc.productName || 'fashion product'} (${dc.productType || ''})`);
      if (dc.colorway) promptParts.push(`Apply these exact colors: ${dc.colorway}`);
      if (dc.materials) promptParts.push(`Material appearance: ${dc.materials}`);
      if (dc.designNotes) promptParts.push(`Design details to preserve: ${dc.designNotes}`);
      promptParts.push('Three-quarter angle, pair of shoes, neutral light grey background (#E8E8E8)');
      promptParts.push('Soft natural shadow beneath product, studio photography lighting');
      promptParts.push('Sharp focus on material texture, stitching details, and construction');
      promptParts.push('No human body, no mannequin, product only floating on clean background');
      promptParts.push('Photorealistic, high-end e-commerce product shot, 8K quality');
    } else {
      promptParts.push(prompt || 'Professional product photography');
      if (story_context) {
        promptParts.push(`Story context: "${story_context.name}" — ${story_context.tone || ''}`);
        if (story_context.brand_personality) promptParts.push(`Brand aesthetic: ${story_context.brand_personality}`);
      }
      promptParts.push(background ? `Background: ${background}` : 'Clean white studio background');
      promptParts.push('High resolution, commercial quality, fashion product shot');
      promptParts.push('Sharp focus, professional lighting, e-commerce ready');
    }

    const fullPrompt = promptParts.join('. ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: fullPrompt,
      num_images: 2,
      image_size: { width: width || 1024, height: height || 1024 },
    };

    if (image_url) {
      input.image_url = image_url;
      input.strength = design_context ? 0.55 : 0.75;
    }

    let result;
    if (design_context && image_url) {
      // ControlNet Lineart — trained specifically for line art / technical sketches
      // Uses promeai/FLUX.1-controlnet-lineart-promeai (understands sketch semantics)
      try {
        result = await fal.subscribe('fal-ai/flux-general', {
          input: {
            prompt: fullPrompt,
            num_images: 2,
            image_size: { width: width || 1024, height: height || 1024 },
            num_inference_steps: 28,
            guidance_scale: 3.5,
            controlnets: [{
              path: 'promeai/FLUX.1-controlnet-lineart-promeai',
              control_image_url: image_url,
              conditioning_scale: 0.85,
            }],
          },
        } as any);
      } catch (controlNetErr) {
        console.error('[Product Render] ControlNet Lineart failed, trying Flux 2 Pro:', controlNetErr);
        result = await fal.subscribe('fal-ai/flux-2-pro', { input } as any);
      }
    } else {
      result = await fal.subscribe('fal-ai/flux-2-pro', { input } as any);
    }
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
