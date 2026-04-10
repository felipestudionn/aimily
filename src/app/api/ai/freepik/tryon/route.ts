import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════════
   Virtual Try-On — Freepik Nano Banana (multi-reference)
   (Gemini 2.5 Flash Image Preview)

   Composites a product (garment / footwear / accessory) onto a brand
   model. Both inputs are passed as reference_images so Nano Banana
   preserves BOTH identities: the model's face/body and the
   product's silhouette, materials, and colorway.

   Compared to a dedicated try-on model like FASHN, this is more
   general (any product category, not just top/bottom garments) and
   stays on the same provider as all the other marketing flows.

   Nice-to-have flow: called from ProductVisualsCard "On-Model" button.
   ═══════════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const NANO_BANANA_ENDPOINT =
  'https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview';

async function createAndPoll(
  prompt: string,
  referenceImages: string[]
): Promise<string | null> {
  const createRes = await fetch(NANO_BANANA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': FREEPIK_API_KEY!,
    },
    body: JSON.stringify({
      prompt,
      reference_images: referenceImages,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('[Try-On] Freepik create error:', createRes.status, errText.slice(0, 300));
    return null;
  }

  const { data } = await createRes.json();
  const taskId = data?.task_id;
  if (!taskId) return null;

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${NANO_BANANA_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY! },
    });
    if (!statusRes.ok) continue;
    const sd = await statusRes.json();
    const status: string | undefined = sd.data?.status;
    if (status === 'COMPLETED') return sd.data?.generated?.[0] || null;
    if (status === 'FAILED') return null;
  }
  return null;
}

function buildPrompt(params: {
  productName: string;
  category: string | undefined;
}): string {
  const { productName, category } = params;
  const productType =
    category === 'CALZADO'
      ? 'footwear'
      : category === 'ROPA'
        ? 'garment'
        : 'fashion product';

  return [
    'Editorial fashion photograph, full-body shot.',
    `The model shown in the FIRST reference image is wearing the ${productType} shown in the SECOND reference image (${productName}).`,
    'CRITICAL: preserve the model identity (face, body, hair, proportions) from the first reference exactly.',
    `CRITICAL: preserve the ${productType} exactly as shown in the second reference — silhouette, colorway, materials, stitching, construction. Do not redesign it, do not add logos, do not alter proportions.`,
    'Natural fit, realistic draping, appropriate shadows where the product meets the body.',
    'Editorial studio setting, soft professional lighting, shallow depth of field, high-end color grading.',
    'No text, no watermark, no brand logos added.',
  ].join(' ');
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    if (!FREEPIK_API_KEY) {
      return NextResponse.json(
        { error: 'FREEPIK_API_KEY not configured' },
        { status: 500 }
      );
    }

    const {
      brand_model_url,
      product_image_url,
      product_name,
      category,
      collectionPlanId,
    } = await req.json();

    if (!brand_model_url || !product_image_url) {
      return NextResponse.json(
        {
          error:
            'brand_model_url and product_image_url are both required',
        },
        { status: 400 }
      );
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

    const prompt = buildPrompt({
      productName: product_name || 'fashion product',
      category,
    });

    // Order matters: [model, product] — the prompt references them in
    // this order ("FIRST reference ... SECOND reference").
    const generatedUrl = await createAndPoll(prompt, [
      brand_model_url,
      product_image_url,
    ]);

    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Try-on generation failed' },
        { status: 502 }
      );
    }

    let finalUrl = generatedUrl;
    let assetId: string | null = null;
    if (collectionPlanId) {
      try {
        const result = await persistAsset({
          collectionPlanId,
          assetType: 'tryon',
          name: `Try-On — ${product_name || 'product'}`,
          sourceUrl: generatedUrl,
          phase: 'design',
          metadata: {
            prompt,
            category,
            provider: 'freepik-nano-banana',
          },
          uploadedBy: user!.id,
        });
        if (result?.publicUrl) {
          finalUrl = result.publicUrl;
          assetId = result.assetId;
        }
      } catch (err) {
        console.error('[Try-On] Persist failed:', err);
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, assetId, originalUrl: generatedUrl }],
      provider: 'freepik-nano-banana',
    });
  } catch (error) {
    console.error('[Try-On] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Try-on generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
