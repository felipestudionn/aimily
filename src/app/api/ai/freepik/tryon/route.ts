import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkImageryUsage,
  refundImageryUnits,
  usageDeniedResponse,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';
import { normalizeAiError } from '@/lib/ai/error-messages';
import {
  fetchAsPng,
  gptImageEditTiered,
  nanoBananaCreateAndPoll,
  type GptImageInput,
} from '@/lib/ai/image-generation';

/* Same long-poll constraint as still-life. */
export const runtime = 'nodejs';
export const maxDuration = 120;

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

/** Either OPENAI_API_KEY (primary GPT path) or FREEPIK_API_KEY (Nano
 *  Banana fallback) must be configured for the route to function. */
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;

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
  /* Function-scope so the catch can refund whatever was consumed. */
  let userId: string | undefined;
  let planConsumed = 0;
  let packConsumed = 0;
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    userId = user!.id;

    const rateLimited = enforceAiUserRateLimit(userId, 'image');
    if (rateLimited) return rateLimited;

    if (!process.env.OPENAI_API_KEY && !FREEPIK_API_KEY) {
      return NextResponse.json(
        { error: 'No image provider configured (need OPENAI_API_KEY or FREEPIK_API_KEY)' },
        { status: 500 },
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

    const usage = await checkImageryUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);
    planConsumed = usage.planConsumed ?? 0;
    packConsumed = usage.packConsumed ?? 0;

    // ═══ SERVER-SIDE: Load FULL context from CIS + Creative + Brief ═══
    let enrichedProductName: string = product_name || 'fashion product';
    if (collectionPlanId) {
      const serverCtx = await loadFullContext(collectionPlanId);
      const flat: Record<string, string> = {
        productName: product_name || '',
        category: category || '',
        brandDNA: '',
        vibe: '',
      };
      mergeContextWithInput(serverCtx, flat);
      // Use enriched product name if the frontend sent nothing
      if (!product_name && flat.collectionName) {
        enrichedProductName = `${flat.collectionName} ${flat.productCategory || 'fashion'} product`;
      }
    }

    const prompt = buildPrompt({
      productName: enrichedProductName,
      category,
    });

    // ═══ STRUCTURAL DEFENSE ═══
    // GPT Image 1.5 primary with 3-tier moderation defense, Nano
    // Banana fallback. Image order matters for the prompt's references.
    let generatedUrl: string | null = null;
    let providerUsed: string = 'openai-gpt-image-1.5';
    let lastGptError: string | null = null;
    let nanoBananaErrorCode: string | null = null;

    if (process.env.OPENAI_API_KEY) {
      const modelPng = await fetchAsPng(brand_model_url);
      const productPng = await fetchAsPng(product_image_url);
      const images: GptImageInput[] = [
        { buffer: modelPng, filename: 'model.png' },
        { buffer: productPng, filename: 'product.png' },
      ];

      const safePrompt = [
        `Professional commercial fashion catalog photograph for a clothing brand.`,
        `Fully clothed model from Image 1 wearing the product (${enrichedProductName}) from Image 2.`,
        `Replicate the model's likeness from Image 1 and the product from Image 2 exactly.`,
        category === 'CALZADO' ? `Footwear is worn on the feet.` : '',
        `Photorealistic, magazine catalog quality, modest professional fashion photography.`,
      ].filter(Boolean).join(' ');

      const minimalPrompt = `Commercial fashion catalog photograph. Fully clothed model from Image 1 wearing the product from Image 2. Photorealistic, professional, modest.`;

      const gptResult = await gptImageEditTiered({
        images,
        prompt,
        safePrompt,
        minimalPrompt,
        collectionPlanId,
        assetType: 'tryon',
      });

      if (gptResult.url) {
        generatedUrl = gptResult.url;
        providerUsed = gptResult.tierUsed === 'creative'
          ? 'openai-gpt-image-1.5'
          : `openai-gpt-image-1.5-${gptResult.tierUsed}`;
      } else if (gptResult.lastError) {
        lastGptError = gptResult.lastError.errorCode;
      }
    }

    if (!generatedUrl) {
      // Nano Banana fallback — image order [model, product] matches the prompt.
      const nb = await nanoBananaCreateAndPoll(prompt, [brand_model_url, product_image_url]);
      if (nb.url) {
        generatedUrl = nb.url;
        providerUsed = process.env.OPENAI_API_KEY ? 'freepik-nano-banana-fallback' : 'freepik-nano-banana';
      } else {
        nanoBananaErrorCode = nb.errorCode;
      }
    }

    if (!generatedUrl) {
      await refundImageryUnits(userId, planConsumed, packConsumed);
      const isModeration = lastGptError === 'moderation';
      const isIpBlock = nanoBananaErrorCode === 'ip_block';
      const userMessage = isModeration
        ? 'The image filter rejected this combination. Try a different model or product photo.'
        : isIpBlock
          ? 'The image service is temporarily throttling us. Please retry in a minute.'
          : 'Try-on generation failed. Please retry.';
      return NextResponse.json(
        {
          error: userMessage,
          code: isModeration ? 'moderation_blocked' : isIpBlock ? 'service_throttled' : 'generation_failed',
          diagnostics: { gptError: lastGptError, nanoBananaError: nanoBananaErrorCode },
        },
        { status: 502 },
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
            provider: providerUsed,
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
      provider: providerUsed,
    });
  } catch (error) {
    if (userId) await refundImageryUnits(userId, planConsumed, packConsumed);
    console.error('[Try-On] Error:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}
