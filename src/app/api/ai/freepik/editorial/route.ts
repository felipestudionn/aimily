import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════════
   Editorial — Freepik Nano Banana (Gemini 2.5 Flash Image Preview)

   On-model narrative fashion photography. A human model wears or
   carries the product in a full editorial scene with mise-en-scène:
   environment, props, styling, attitude. Think Zara editorial,
   Hereu lookbook hero images, Jacquemus campaign hero, Khaite lookbook
   — a real person in a real space, the product as the hero of the
   look.

   Distinction from sibling endpoints:
     - /api/ai/freepik/still-life → product alone, zero humans
     - /api/ai/freepik/tryon      → clean brand-model catalog shot
                                    (multi-reference: brand model + product)
     - /api/ai/freepik/editorial  → this file. Narrative on-model scene,
                                    single product reference.

   Why Nano Banana:
     Google's Gemini 2.5 Flash Image is designed for reference-image
     compositing with identity preservation. Same reasoning as the
     still-life endpoint, but here the prompt invites a model.

   Async pattern:
     Freepik returns a task_id. We poll
     /v1/ai/gemini-2-5-flash-image-preview/{id} every 3s until
     status is COMPLETED or FAILED (max ~60s).
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
    console.error(
      '[Editorial] Freepik create error:',
      createRes.status,
      errText.slice(0, 300)
    );
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
 * Build the editorial on-model prompt.
 *
 * Structure mirrors the still-life sibling but inverts the human rule:
 * here we REQUIRE a single human model and describe how they wear or
 * carry the product in a narrative scene. The product preservation
 * contract is identical — Nano Banana's reference compositing must
 * keep the 3D render pixel-perfect.
 */
function buildPrompt(params: {
  productName: string;
  category: string | undefined;
  scene: string | undefined;
  story?: StoryContext;
  userPrompt?: string;
  hasStyleReference?: boolean;
}): string {
  const { productName, category, scene, story, userPrompt, hasStyleReference } = params;

  const productType =
    category === 'CALZADO'
      ? 'footwear (shoes)'
      : category === 'ROPA'
        ? 'apparel garment'
        : 'fashion accessory';

  // How the model interacts with the product per category.
  const wearContext =
    category === 'CALZADO'
      ? 'worn on the feet of a single human model. Frame from mid-thigh down OR full body so the footwear is unambiguously visible and recognizable as the hero of the shot. The model stands, walks, or poses naturally — never seated on the ground hiding the shoes.'
      : category === 'ROPA'
        ? 'worn by a single human model in a three-quarter or full-length editorial pose. The garment drapes naturally, shows its fabric weight and silhouette, and is the unambiguous hero of the frame.'
        : 'carried, worn, or held by a single human model in a pose that keeps the product prominent and well-lit. The model supports the product, not the other way around.';

  // Scene presets tailored for NARRATIVE on-model photography (people in real spaces).
  const sceneMap: Record<string, string> = {
    street:
      'real urban street-style setting — city sidewalk, crosswalk, or storefront backdrop. Soft golden-hour directional sunlight, natural passers-by blurred deep in the background, documentary editorial feel',
    cafe:
      'European café terrace or interior with aged wood or marble tables, warm ambient morning light, relaxed candid editorial feel, soft out-of-focus props in the background',
    beach:
      'sandy coastal beach at golden hour with soft ocean waves in the distance, warm low-angle sunlight, editorial magazine atmosphere, sand texture underfoot',
    office:
      'modern minimalist office or gallery interior with clean architectural lines, bright diffused daylight from large windows, neutral palette, quiet editorial mood',
    runway:
      'backstage or runway-adjacent editorial space, dramatic directional spotlight, high-contrast cinematic lighting, editorial fashion-show atmosphere',
    nature:
      'lush outdoor natural setting — field, forest clearing, wooded path — with soft dappled daylight through foliage, organic textures, earthy palette',
    urban:
      'raw industrial urban environment with exposed concrete, brushed metal, or weathered brick. Cinematic directional light, editorial mood, gritty but considered',
    'white-studio':
      'clean pure white studio backdrop (#FFFFFF) with soft even high-key lighting. Editorial lookbook aesthetic — think Zara/H&M editorial hero shot, not catalog',
    marble:
      'elegant marble gallery interior with sculpted natural light from high windows, cool neutral tones, architectural depth, museum-like quiet',
    gradient:
      'smooth studio gradient backdrop (warm cream, sand, or cool grey) with contemporary editorial lighting, soft color wash, lookbook aesthetic',
  };
  const sceneDesc =
    sceneMap[scene || ''] ||
    scene ||
    'editorial on-model fashion scene, magazine-quality mise-en-scène';

  const parts: string[] = [];

  // 1. Frame — declare the category explicitly: on-model editorial.
  parts.push(
    `HIGH-END EDITORIAL FASHION PHOTOGRAPH (on-model, single human model). Magazine-cover quality in the style of Zara editorial hero imagery, Hereu lookbook, Jacquemus campaign, Khaite lookbook, and Bottega Veneta editorial. The reference image shows the exact ${productType} called "${productName}". The final photograph features this ${productType} — and ONLY this ${productType} — as the hero of an editorial scene with a human model.`
  );

  // 2. Human rule — exactly one model, realistic body.
  parts.push(`HUMAN MODEL RULES (required and non-negotiable):`);
  parts.push(
    `• EXACTLY ONE human model in the frame. No crowds, no secondary models, no background humans in focus.`
  );
  parts.push(
    `• The model is a real-looking, natural human — realistic skin texture, realistic proportions, realistic hair. No CGI, no plastic skin, no over-smoothed retouching, no extra fingers or limbs.`
  );
  parts.push(
    `• Natural confident pose appropriate to the scene. No stiff mannequin poses, no awkward hand positions, no disembodied limbs.`
  );
  parts.push(
    `• The model's styling, wardrobe, hair, and attitude should serve the story (see EDITORIAL DIRECTION below) and NEVER compete with or obscure the product.`
  );

  // 3. Product placement — how the product relates to the model.
  parts.push(`PRODUCT PLACEMENT: the ${productType} is ${wearContext}`);

  // 4. Pixel-perfect preservation contract (same as still-life).
  parts.push(
    `CRITICAL PRODUCT PRESERVATION (non-negotiable — same contract used across every aimily visual):`
  );
  parts.push(
    `• The ${productType} in the final photograph MUST be identical to the reference: same silhouette, same proportions, same colorway, same materials, same stitching, same construction, same closures, same hardware. Pixel-perfect identity preservation.`
  );
  parts.push(
    `• DO NOT redesign, reinterpret, simplify, stylize, or substitute the product for a similar one.`
  );
  parts.push(
    `• DO NOT add anything not already in the reference: no added logos, straps, laces, buckles, branding, trims, prints, or patterns.`
  );
  parts.push(
    `• DO NOT alter scale, proportions, orientation, or color temperature of the product itself. The scene's lighting may cast shadows on the product, but the product's intrinsic colors must match the reference exactly.`
  );
  parts.push(
    `• If any brand-like markings are visible in the reference, render them as clean unbranded surfaces — do not invent or replace logos.`
  );

  // 5. Scene + lighting.
  parts.push(`SCENE: ${sceneDesc}.`);
  parts.push(
    `LIGHTING: natural or cinematic directional light appropriate to the scene. Soft key light with controlled fall-off, realistic shadows that ground the model in the space, realistic color bounce from the environment onto the product and the model. No flat ambient light, no over-blown highlights, no HDR over-processing.`
  );

  // 6. Story — optional brand context, same structure as still-life.
  if (story?.name) {
    parts.push(`EDITORIAL DIRECTION (from the collection story "${story.name}"):`);
    if (story.narrative) parts.push(story.narrative.replace(/\.$/, '') + '.');
    if (story.mood?.length) parts.push(`Mood: ${story.mood.join(', ')}.`);
    if (story.tone) parts.push(`Tone: ${story.tone}.`);
    if (story.color_palette?.length)
      parts.push(
        `Story color palette references (may inform the scene, wardrobe and environment, NOT the product colorway): ${story.color_palette.join(', ')}.`
      );
    if (story.brand_personality)
      parts.push(`Brand aesthetic: ${story.brand_personality}.`);
  }

  // 7. Craft.
  parts.push(
    `CRAFT: confident natural model pose, cinematic composition, sharp focus on the product, realistic skin tones, realistic fabric textures on both the model's wardrobe and the product, natural depth of field, professional color grading. Documentary editorial feel, not catalog flat.`
  );

  // 8. Reject list — things Claude must actively refuse.
  parts.push(
    `REJECT LIST (the final image MUST NOT contain): no text, no captions, no watermarks, no logos, no added brand markings, no multiple copies of the product, no second model, no visible crowd, no distorted anatomy (extra fingers, merged limbs, missing features), no CGI/plastic skin textures, no surreal dreamlike backgrounds, no motion blur on the product, no product obscured or cropped out of frame.`
  );

  // 9. Visual style reference — when the user provides a second image
  // as art direction. The first reference_image is always the product;
  // the second is this style reference. Tell Nano Banana to use it for
  // composition, lighting, pose, and mood — but never to copy the
  // products/garments from the style reference.
  if (hasStyleReference) {
    parts.push(
      `STYLE REFERENCE (second reference image): A second image is provided as VISUAL ART DIRECTION. Match its composition, lighting mood, camera angle, color grading, pose energy, and editorial atmosphere as closely as possible. However, the PRODUCT in the final image must be ONLY the ${productType} from the first reference image — do NOT copy or include any products, garments, shoes, or accessories visible in the style reference image. The style reference dictates HOW the shot looks; the first reference dictates WHAT product appears.`
    );
  }

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
      style_reference_url,
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
      hasStyleReference: !!style_reference_url,
    });

    // Reference images: product is always first. If the user provided
    // a style reference (a photo that shows the desired composition,
    // lighting, pose, mood), it goes second. Nano Banana composites
    // the product identity from image 1 into the aesthetic of image 2.
    const referenceImages = [product_image_url];
    if (style_reference_url) referenceImages.push(style_reference_url);

    const generatedUrl = await createAndPoll(prompt, referenceImages);
    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Editorial generation failed' },
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
          assetType: 'editorial',
          name: `Editorial — ${product_name || 'shoot'}`,
          sourceUrl: generatedUrl,
          phase: 'marketing',
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
        console.error('[Editorial] Persist failed:', err);
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, assetId, originalUrl: generatedUrl }],
      provider: 'freepik-nano-banana',
    });
  } catch (error) {
    console.error('[Editorial] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Editorial generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 300;
