import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════════
   Still Life / Editorial — Freepik Nano Banana
   (Gemini 2.5 Flash Image Preview)

   This is the editorial "Vogue-shoot with the product" flow. The
   model takes the product's existing photoreal 3D render (from the
   design phase, gpt-image-1.5) as a reference image and composites
   it into a new editorial scene while preserving product identity.

   Why Nano Banana:
     Google's Gemini 2.5 Flash Image is designed specifically for
     reference-image compositing with identity preservation. It's
     the native fit for "put MY product in a new scene without
     reinterpreting it".

   Async pattern:
     Freepik returns a task_id. We poll /v1/ai/gemini-2-5-flash-image-preview/{id}
     every 3s until status is COMPLETED or FAILED (max ~60s).
   ═══════════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const NANO_BANANA_ENDPOINT =
  'https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview';

interface StoryContext {
  name?: string;
  narrative?: string;
  mood?: string[];
  tone?: string;
  color_palette?: string[];
  brand_personality?: string;
}

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
    console.error('[Still Life] Freepik create error:', createRes.status, errText.slice(0, 300));
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

/**
 * Build the Nano Banana still-life prompt. The design phase's colorize-sketch
 * prompt (in /api/ai/colorize-sketch/route.ts) sets the tone for the aimily
 * voice: pixel-perfect preservation, explicit negative rules, no hidden
 * freedom for the model to reinterpret the product. We mirror that here
 * because Nano Banana's reference-image compositing needs the same rigor —
 * any slack in the instructions produces the classic "I see my reference
 * pasted into the scene" failure mode.
 *
 * Prompt structure:
 *   1. Identify — tell the model what it's looking at.
 *   2. Preserve — hard constraints on the product (silhouette, colorway,
 *      materials, construction, logos, proportions).
 *   3. Compose — where/how the product is placed, who's wearing it.
 *   4. Scene — lighting, setting, mood.
 *   5. Story — brand context injected as editorial direction (optional).
 *   6. Reject list — things the model must never add.
 */
function buildPrompt(params: {
  productName: string;
  category: string | undefined;
  scene: string | undefined;
  story?: StoryContext;
  userPrompt?: string;
}): string {
  const { productName, category, scene, story, userPrompt } = params;

  const productType =
    category === 'CALZADO'
      ? 'footwear (shoe)'
      : category === 'ROPA'
        ? 'apparel garment'
        : 'fashion product';

  const wearContext =
    category === 'CALZADO'
      ? 'worn on the feet of a model whose legs and feet are visible in the frame'
      : category === 'ROPA'
        ? 'worn by a model, shown in a three-quarter or full-length editorial composition'
        : 'held or worn by a model in a way that keeps the product as the hero of the frame';

  const sceneMap: Record<string, string> = {
    street: 'urban street-style setting with real city architecture, golden hour natural light, soft directional sunlight, subtle depth of field',
    cafe: 'European café terrace, warm ambient morning light, marble or worn-wood table surface, out-of-focus background patrons',
    beach: 'sandy coastal beach at golden hour, soft ocean waves in the distance, warm low-angle sunlight, natural color grading',
    office: 'modern minimalist office interior, clean architectural lines, bright diffused daylight from large windows, neutral palette',
    runway: 'fashion show runway, dramatic editorial spotlight from above, cinematic backstage atmosphere, high-contrast lighting',
    nature: 'lush outdoor natural setting, soft dappled daylight through foliage, organic textures, earthy palette',
    urban: 'raw industrial urban environment with concrete and metal textures, cinematic directional light, editorial mood',
    'white-studio': 'clean pure white studio backdrop (#FFFFFF), soft even high-key lighting, minimal contact shadow beneath the product, magazine cover aesthetic',
    marble: 'elegant marble gallery interior, sculpted natural light from high windows, cool neutral tones, architectural depth',
    gradient: 'smooth studio gradient backdrop, contemporary editorial lighting, soft color wash',
  };
  const sceneDesc = sceneMap[scene || ''] || scene || 'editorial magazine-quality setting';

  const parts: string[] = [];

  // 1. Identify
  parts.push(
    `High-end editorial fashion photograph, Vogue magazine cover quality. The image in the reference is the exact ${productType} called "${productName}" that must appear in the final photograph.`
  );

  // 2. Preserve — the core contract. Mirrors the colorize-sketch design prompt.
  parts.push(
    `CRITICAL PRESERVATION RULES (read carefully, these are non-negotiable):`
  );
  parts.push(
    `• The ${productType} in the final photograph MUST be identical to the one in the reference image: same silhouette, same proportions, same colorway, same materials, same stitching, same construction details, same closure system, same hardware. Pixel-perfect identity preservation.`
  );
  parts.push(
    `• DO NOT redesign, reinterpret, simplify, or stylize the product. DO NOT substitute it for a similar-looking product.`
  );
  parts.push(
    `• DO NOT add any element that is not already in the reference: no added logos, no added straps, no added laces, no added buckles, no added branding, no added trims, no added prints or patterns.`
  );
  parts.push(
    `• DO NOT alter the product's proportions, scale, or orientation beyond what is necessary to place it naturally into the scene.`
  );
  parts.push(
    `• If any brand-like markings are visible in the reference, render them as clean unbranded surfaces — do not invent or replace logos.`
  );

  // 3. Compose
  parts.push(
    `COMPOSITION: the ${productType} is ${wearContext}. Frame the shot so the product is the visual hero — sharp focus, clear silhouette, prominent in the composition. The model supports the product, not the other way around.`
  );

  // 4. Scene
  parts.push(`SCENE: ${sceneDesc}.`);
  parts.push(
    `LIGHTING: professional editorial lighting that flatters the product's materials and colorway. Realistic shadows, realistic depth of field, realistic color grading consistent with the scene.`
  );

  // 5. Story — optional brand context
  if (story?.name) {
    parts.push(`EDITORIAL DIRECTION (from the collection story "${story.name}"):`);
    if (story.narrative) parts.push(story.narrative.replace(/\.$/, '') + '.');
    if (story.mood?.length) parts.push(`Mood: ${story.mood.join(', ')}.`);
    if (story.tone) parts.push(`Tone: ${story.tone}.`);
    if (story.color_palette?.length)
      parts.push(
        `Story color palette references (may inform lighting/background, NOT the product colorway): ${story.color_palette.join(', ')}.`
      );
    if (story.brand_personality) parts.push(`Brand aesthetic: ${story.brand_personality}.`);
  }

  // 6. Craft + reject list
  parts.push(
    `CRAFT: confident natural model pose, cinematic composition, sharp focus on the product, realistic skin tones, realistic fabric textures, natural depth of field, professional color grading.`
  );
  parts.push(
    `REJECT LIST (things the final image must NOT contain): no text, no captions, no watermarks, no logos, no added brand markings, no multiple copies of the product, no distorted anatomy, no plastic or CGI-looking textures, no surreal artifacts, no dream-like backgrounds.`
  );

  if (userPrompt) parts.push(`ADDITIONAL ART DIRECTION: ${userPrompt}.`);

  return parts.join(' ');
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
      product_image_url,
      product_name,
      category,
      scene,
      story_context,
      user_prompt,
      collectionPlanId,
    } = await req.json();

    if (!product_image_url) {
      return NextResponse.json(
        { error: 'product_image_url is required (use sku.render_urls["3d"])' },
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
      scene,
      story: story_context,
      userPrompt: user_prompt,
    });

    const generatedUrl = await createAndPoll(prompt, [product_image_url]);
    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Still life generation failed' },
        { status: 502 }
      );
    }

    // Persist to Supabase Storage if we know the collection plan
    let finalUrl = generatedUrl;
    let assetId: string | null = null;
    if (collectionPlanId) {
      try {
        const result = await persistAsset({
          collectionPlanId,
          assetType: 'lifestyle',
          name: `Still Life — ${product_name || 'editorial'}`,
          sourceUrl: generatedUrl,
          phase: 'design',
          metadata: {
            prompt,
            scene,
            provider: 'freepik-nano-banana',
          },
          uploadedBy: user!.id,
        });
        if (result?.publicUrl) {
          finalUrl = result.publicUrl;
          assetId = result.assetId;
        }
      } catch (err) {
        console.error('[Still Life] Persist failed:', err);
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, assetId, originalUrl: generatedUrl }],
      provider: 'freepik-nano-banana',
    });
  } catch (error) {
    console.error('[Still Life] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Still life generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
