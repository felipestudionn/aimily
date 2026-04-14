import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset, uploadToStorage } from '@/lib/storage';
import { compositeModelOntoStyleRef, blurFaceInStyleReference } from '@/lib/face-blur';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';

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
interface ModelDirectives {
  complexion?: string;
  age?: string;
  hair?: string;
}

function buildPrompt(params: {
  productName: string;
  category: string | undefined;
  scene: string | undefined;
  story?: StoryContext;
  userPrompt?: string;
  hasStyleReference?: boolean;
  hasModelHeadshot?: boolean;
  modelDirectives?: ModelDirectives;
}): string {
  const { productName, category, scene, story, userPrompt, hasStyleReference, hasModelHeadshot, modelDirectives } = params;

  const productType =
    category === 'CALZADO'
      ? 'footwear (shoes)'
      : category === 'ROPA'
        ? 'apparel garment'
        : 'fashion accessory';

  // How the model interacts with the product per category.
  // For footwear: absolutely critical that it is ON THE FEET, not held
  // in hand, placed on a table, or used as a prop. Nano Banana defaults
  // to "holding" when the reference image is a flat product shot, so
  // the instruction must be explicit and repeated.
  const wearContext =
    category === 'CALZADO'
      ? 'WORN ON THE FEET of the model — the shoes/sandals MUST be on the model\'s feet, visible, and recognizable. The model is STANDING, WALKING, or POSING with the footwear on their feet. NEVER holding the footwear in their hands, NEVER placing it on a surface, NEVER carrying it as a handbag or prop. Frame: full body or mid-thigh down so both feet are visible. The footwear is the hero product of the shot.'
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
    `• The model is a real-looking, natural human with CORRECT ANATOMY: exactly 2 arms, exactly 2 legs, exactly 2 feet, exactly 5 fingers per hand. Realistic skin texture, realistic proportions, realistic hair. No CGI, no plastic skin, no over-smoothed retouching. VERIFY the limb count before finalizing — extra or merged limbs are the #1 most common error to avoid.`
  );
  parts.push(
    `• Natural confident pose appropriate to the scene. No stiff mannequin poses, no awkward hand positions, no disembodied limbs.`
  );
  parts.push(
    `• The model's styling, wardrobe, hair, and attitude should serve the story (see EDITORIAL DIRECTION below) and NEVER compete with or obscure the product.`
  );

  // 2b. Model appearance directives — user-selected casting brief.
  if (modelDirectives) {
    const complexionMap: Record<string, string> = {
      light: 'light / fair skin tone',
      medium: 'medium skin tone',
      olive: 'olive / Mediterranean skin tone',
      tan: 'tan / warm brown skin tone',
      dark: 'dark / deep brown skin tone',
    };
    const ageMap: Record<string, string> = {
      '20s': 'in their early-to-mid 20s',
      '30s': 'in their early-to-mid 30s',
      '40s': 'in their early-to-mid 40s',
      '50s': 'in their 50s, mature and confident',
    };
    const hairMap: Record<string, string> = {
      short_straight: 'short straight hair',
      short_curly: 'short curly or coily hair',
      medium_straight: 'medium-length straight hair',
      medium_wavy: 'medium-length wavy hair',
      long_straight: 'long straight hair',
      long_curly: 'long curly hair',
      buzz: 'buzz cut or very short cropped hair',
      updo: 'hair styled up in a bun or updo',
    };

    const dirParts: string[] = [];
    if (modelDirectives.complexion && modelDirectives.complexion !== 'any') {
      dirParts.push(complexionMap[modelDirectives.complexion] || modelDirectives.complexion);
    }
    if (modelDirectives.age && modelDirectives.age !== 'any') {
      dirParts.push(ageMap[modelDirectives.age] || `approximately ${modelDirectives.age}`);
    }
    if (modelDirectives.hair && modelDirectives.hair !== 'any') {
      dirParts.push(hairMap[modelDirectives.hair] || modelDirectives.hair.replace('_', ' '));
    }

    if (dirParts.length > 0) {
      parts.push(`MODEL CASTING BRIEF: the model should have ${dirParts.join(', ')}. These are the selected appearance directives — follow them precisely.`);
    }
  }

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
  const rejectItems = [
    'no text, no captions, no watermarks, no logos, no added brand markings',
    'no multiple copies of the product',
    'no second model, no visible crowd',
    'no distorted anatomy — EXACTLY two arms, EXACTLY two legs, EXACTLY two feet, EXACTLY ten fingers, EXACTLY ten toes. No extra limbs, no merged limbs, no missing limbs, no third leg, no phantom arm. Count the limbs before rendering.',
    'no CGI/plastic skin textures',
    'no surreal dreamlike backgrounds',
    'no motion blur on the product',
    'no product obscured or cropped out of frame',
  ];
  if (category === 'CALZADO') {
    rejectItems.push(
      'NEVER show the model holding footwear in their hands — shoes/sandals must ONLY appear on the feet'
    );
  }
  parts.push(
    `REJECT LIST (the final image MUST NOT contain): ${rejectItems.join(', ')}.`
  );

  // 9. Visual style reference — when the user provides a second image
  // as art direction. The first reference_image is always the product;
  // the second is this style reference. Tell Nano Banana to use it for
  // composition, lighting, pose, and mood — but never to copy the
  // products/garments from the style reference.
  if (hasStyleReference) {
    parts.push(
      `STYLE REFERENCE (second reference image): A second image is provided as VISUAL ART DIRECTION. Match its composition, lighting mood, camera angle, color grading, pose energy, and editorial atmosphere as closely as possible.`
    );
    parts.push(
      `CRITICAL — STYLE REFERENCE RULES:`
    );
    parts.push(
      `• The PRODUCT in the final image must be ONLY the ${productType} from the first reference image — do NOT copy or include any products, garments, shoes, or accessories visible in the style reference image.`
    );
    parts.push(
      `• MODEL IDENTITY (non-negotiable): keep EVERYTHING from the style reference — same pose, same body language, same styling, same energy, same complexion, same hair direction, same wardrobe vibe. The ONLY thing that MUST change is the FACE: generate a DIFFERENT face with different facial features (different eyes, different nose, different jawline, different lip shape). The body, pose, lighting, composition, and mood stay identical to the reference. Think "same photo reshoot with a different model from the same agency." This is a legal requirement — the face must not match the reference person.`
    );
    parts.push(
      `• The style reference dictates HOW the shot looks (composition, lighting, mood, pose); the first reference dictates WHAT product appears.`
    );
  }

  // 10. Model headshot reference — when the user selects an aimily model,
  // their headshot is passed as the last reference image. This provides
  // the face identity signal. The style reference (if any) has its face
  // blurred, so this headshot is the ONLY face Nano Banana can latch onto.
  if (hasModelHeadshot) {
    parts.push(
      `MODEL HEADSHOT — HIGHEST PRIORITY REFERENCE (last reference image): The last reference image is a headshot of the EXACT model who MUST appear in the final photograph. This is the most important reference of all three — it defines WHO appears in the image.`
    );
    parts.push(
      `FACE IDENTITY (non-negotiable, overrides everything else): The person in the final image must have the EXACT SAME face as this headshot — same facial structure, same jawline, same nose shape, same lip shape, same eye shape, same eyebrow shape, same complexion, same skin tone. This is NOT a suggestion, this is the #1 priority of the entire generation. If the face does not match the headshot, the image is WRONG.`
    );
    parts.push(
      `HAIR IDENTITY (non-negotiable): The person in the final image must have the EXACT SAME hair as the headshot — same hair color, same hair length, same hair texture (straight/wavy/curly/braided), same hair style. Do NOT change the hair from the headshot under any circumstance. The hair is part of this model's identity.`
    );
    parts.push(
      `MODEL ATTITUDE: The model's facial expression and body language should match the energy of the headshot — the same confidence, the same editorial intensity, the same attitude. This specific model was CAST for this shot by the creative director because of her unique look and presence. Preserve that.`
    );

    // When we have both a style ref AND a model headshot, clarify the roles
    if (hasStyleReference) {
      parts.push(
        `REFERENCE IMAGE PRIORITY ORDER (most important first): #1 PRIORITY = Image 3 (model headshot) — the face, hair, skin tone, and attitude MUST match this person exactly. #2 PRIORITY = Image 1 (product) — the product must be pixel-perfect identical to this reference. #3 PRIORITY = Image 2 (style reference) — use for composition, lighting, pose, camera angle, and mood only. The face in Image 2 is blurred on purpose — IGNORE it completely and use the face from Image 3 instead.`
      );
    } else {
      parts.push(
        `REFERENCE IMAGE PRIORITY ORDER: #1 PRIORITY = Image 2 (model headshot) — the face, hair, skin tone, and attitude MUST match this person exactly. #2 PRIORITY = Image 1 (product) — the product must be pixel-perfect identical.`
      );
    }
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
      model_id,
      product_name,
      category,
      scene,
      story_context,
      user_prompt,
      model_directives,
      collectionPlanId,
    } = await req.json();

    // Look up the selected aimily model if provided
    let aiModel: { name: string; headshot_url: string; description: string; gender: string; complexion: string; hair_style: string; hair_color: string } | null = null;
    if (model_id) {
      const { data } = await supabaseAdmin
        .from('aimily_models')
        .select('name, headshot_url, description, gender, complexion, hair_style, hair_color')
        .eq('id', model_id)
        .eq('is_active', true)
        .single();
      aiModel = data;
    }

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

    // When the user selects an aimily model, we use the model's metadata
    // to override the model_directives (complexion/hair/etc) so the prompt
    // is consistent with the headshot being passed as a reference image.
    // ═══ SERVER-SIDE: Load FULL context from CIS + Creative + Brief ═══
    let enrichedStory: StoryContext | undefined = story_context;
    let enrichedUserPrompt: string | undefined = user_prompt;
    if (collectionPlanId) {
      const serverCtx = await loadFullContext(collectionPlanId);
      const flat: Record<string, string> = {
        productName: product_name || '',
        category: category || '',
        scene: scene || '',
        brandDNA: '',
        vibe: '',
        consumer: '',
        trends: '',
      };
      mergeContextWithInput(serverCtx, flat);

      // Enrich story_context with CIS brand data if not already provided
      if (!enrichedStory?.brand_personality && flat.brandDNA) {
        enrichedStory = { ...enrichedStory, brand_personality: flat.brandDNA };
      }
      if (!enrichedStory?.narrative && flat.vibe) {
        enrichedStory = { ...enrichedStory, narrative: flat.vibe };
      }

      // Append CIS context to user_prompt so it reaches the prompt builder
      const cisParts: string[] = [];
      if (flat.consumer) cisParts.push(`Target consumer: ${flat.consumer}`);
      if (flat.trends) cisParts.push(`Current trends: ${flat.trends}`);
      if (cisParts.length) {
        const cisBlock = cisParts.join('. ');
        enrichedUserPrompt = enrichedUserPrompt
          ? `${enrichedUserPrompt}. BRAND CONTEXT: ${cisBlock}`
          : `BRAND CONTEXT: ${cisBlock}`;
      }
    }

    const effectiveModelDirectives = aiModel
      ? { complexion: aiModel.complexion, hair: aiModel.hair_style, age: '20s' }
      : (model_directives || undefined);

    const prompt = buildPrompt({
      productName: product_name || 'fashion product',
      category,
      scene,
      story: enrichedStory,
      userPrompt: enrichedUserPrompt,
      hasStyleReference: !!style_reference_url,
      hasModelHeadshot: !!aiModel,
      modelDirectives: effectiveModelDirectives,
    });

    // Reference images array — order matters for Nano Banana:
    //   [0] Product 3D render (identity preservation — pixel-perfect)
    //   [1] Style reference (composition/lighting/pose — face blurred)
    //   [2] Model headshot (face identity — the aimily model's face)
    //
    // Any of [1] or [2] may be absent. When both are present, the prompt
    // instructs Nano Banana which image provides what signal.
    // Reference images: ONLY 2 images max to avoid identity conflicts.
    //
    // Strategy v3: when both style_reference AND model are selected,
    // we COMPOSITE the model's head onto the style reference BEFORE
    // sending to Nano Banana. This gives Nano Banana a single image
    // that already has the right face + right pose/lighting. No more
    // 3-image confusion.
    //
    //   Case A: product only → [product]
    //   Case B: product + model (no style ref) → [product, model_headshot]
    //   Case C: product + style ref (no model) → [product, blurred_style_ref]
    //   Case D: product + style ref + model → [product, composited_style_ref]
    //
    const referenceImages = [product_image_url];

    if (style_reference_url && aiModel?.headshot_url) {
      // Case D: composite model head onto style reference
      try {
        const compositedBuffer = await compositeModelOntoStyleRef(
          style_reference_url,
          aiModel.headshot_url
        );
        if (collectionPlanId) {
          const upload = await uploadToStorage(
            collectionPlanId,
            'editorial',
            `style-ref-composited-${Date.now()}.jpg`,
            compositedBuffer,
            'image/jpeg'
          );
          referenceImages.push(upload.publicUrl);
        } else {
          // Fallback: pass both separately
          referenceImages.push(style_reference_url);
          referenceImages.push(aiModel.headshot_url);
        }
      } catch (compErr) {
        console.error('[Editorial] Composite failed, falling back to blur+headshot:', compErr);
        // Fallback: blur face + separate headshot (old v2 strategy)
        try {
          const blurredBuffer = await blurFaceInStyleReference(style_reference_url);
          if (collectionPlanId) {
            const upload = await uploadToStorage(
              collectionPlanId, 'editorial',
              `style-ref-blurred-${Date.now()}.jpg`, blurredBuffer, 'image/jpeg'
            );
            referenceImages.push(upload.publicUrl);
          } else {
            referenceImages.push(style_reference_url);
          }
        } catch {
          referenceImages.push(style_reference_url);
        }
        referenceImages.push(aiModel.headshot_url);
      }
    } else if (style_reference_url) {
      // Case C: style ref only — blur the face
      try {
        const blurredBuffer = await blurFaceInStyleReference(style_reference_url);
        if (collectionPlanId) {
          const upload = await uploadToStorage(
            collectionPlanId, 'editorial',
            `style-ref-blurred-${Date.now()}.jpg`, blurredBuffer, 'image/jpeg'
          );
          referenceImages.push(upload.publicUrl);
        } else {
          referenceImages.push(style_reference_url);
        }
      } catch (blurErr) {
        console.error('[Editorial] Face blur failed, using original:', blurErr);
        referenceImages.push(style_reference_url);
      }
    } else if (aiModel?.headshot_url) {
      // Case B: model only — pass headshot directly
      referenceImages.push(aiModel.headshot_url);
    }

    // Choose generation engine:
    // - When an aimily MODEL is selected → GPT Image 1.5 (best face fidelity)
    // - When no model (product ± style ref only) → Nano Banana (good for scenes)
    let generatedUrl: string | null = null;
    let providerUsed = 'freepik-nano-banana';

    if (aiModel?.headshot_url && process.env.OPENAI_API_KEY) {
      // ═══ GPT IMAGE 1.5 PATH ═══
      // OpenAI's images/edits with input_fidelity="high" preserves face identity
      // much better than Nano Banana's generic reference_images.
      // We pass multiple images and reference each by index in the prompt.
      providerUsed = 'openai-gpt-image-1.5';

      // Fetch all images as PNG buffers
      const fetchAsPng = async (url: string): Promise<Buffer> => {
        const res = await fetch(url);
        const buf = Buffer.from(await res.arrayBuffer());
        return await sharp(buf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      };

      const productPng = await fetchAsPng(product_image_url);
      const headshotPng = await fetchAsPng(aiModel.headshot_url);

      const formData = new FormData();
      formData.append('model', 'gpt-image-1.5');
      formData.append('image[]', new Blob([productPng], { type: 'image/png' }), 'product.png');
      formData.append('image[]', new Blob([headshotPng], { type: 'image/png' }), 'model.png');

      // If we have a style reference, add it too (face composited or blurred)
      if (style_reference_url) {
        try {
          const compositedBuffer = await compositeModelOntoStyleRef(style_reference_url, aiModel.headshot_url);
          const compositedPng = await sharp(compositedBuffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
          formData.append('image[]', new Blob([compositedPng], { type: 'image/png' }), 'style.png');
        } catch {
          const styleRes = await fetch(style_reference_url);
          const styleBuf = Buffer.from(await styleRes.arrayBuffer());
          const stylePng = await sharp(styleBuf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
          formData.append('image[]', new Blob([stylePng], { type: 'image/png' }), 'style.png');
        }
      }

      // Build a GPT-specific prompt that references images by index
      const gptPrompt = [
        `HIGH-END EDITORIAL FASHION PHOTOGRAPH.`,
        `Image 1 shows the EXACT product (${product_name || 'fashion product'}). The product in the final photo MUST be pixel-perfect identical to Image 1 — same shape, same colors, same materials, same details.`,
        `Image 2 shows the EXACT model who must appear. Her face, facial features, hair color, hair length, hair style, skin tone, and overall appearance MUST be identical to Image 2. Do NOT change her face or hair in any way. This is non-negotiable.`,
        style_reference_url
          ? `Image 3 shows the composition, pose, lighting, and wardrobe to follow. Match the scene setup from Image 3 but use the face/hair from Image 2 and the product from Image 1.`
          : `Create a high-end editorial fashion scene. The model from Image 2 wears/carries the product from Image 1.`,
        category === 'CALZADO'
          ? `The product is footwear — it MUST be worn on the model's feet, visible and recognizable. NEVER held in hands.`
          : '',
        `ANATOMY: exactly 2 arms, 2 legs, 2 feet, 10 fingers. No extra limbs.`,
        `Style: magazine editorial quality, natural lighting, realistic skin texture.`,
        user_prompt ? `Additional direction: ${user_prompt}` : '',
      ].filter(Boolean).join(' ');

      formData.append('prompt', gptPrompt);
      formData.append('n', '1');
      formData.append('size', '1024x1536');
      formData.append('quality', 'high');
      formData.append('input_fidelity', 'high');

      const gptRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      });

      if (!gptRes.ok) {
        const errText = await gptRes.text();
        console.error('[Editorial GPT] OpenAI error:', gptRes.status, errText.slice(0, 500));
        // Fallback to Nano Banana
        generatedUrl = await createAndPoll(prompt, referenceImages);
        providerUsed = 'freepik-nano-banana-fallback';
      } else {
        const gptData = await gptRes.json();
        if (gptData.data?.[0]?.b64_json) {
          // Upload base64 to storage
          const imgBuffer = Buffer.from(gptData.data[0].b64_json, 'base64');
          if (collectionPlanId) {
            const upload = await uploadToStorage(
              collectionPlanId, 'editorial',
              `editorial-gpt-${Date.now()}.png`, imgBuffer, 'image/png'
            );
            generatedUrl = upload.publicUrl;
          } else {
            generatedUrl = `data:image/png;base64,${gptData.data[0].b64_json}`;
          }
        } else if (gptData.data?.[0]?.url) {
          generatedUrl = gptData.data[0].url;
        }
      }
    } else {
      // ═══ NANO BANANA PATH (no model selected) ═══
      generatedUrl = await createAndPoll(prompt, referenceImages);
    }

    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Editorial generation failed' },
        { status: 502 }
      );
    }

    // Persist to Supabase Storage if we know the collection plan
    let finalUrl = generatedUrl;
    let assetId: string | null = null;
    if (collectionPlanId && !generatedUrl.startsWith('data:')) {
      try {
        const result = await persistAsset({
          collectionPlanId,
          assetType: 'editorial',
          name: `Editorial — ${product_name || 'shoot'}`,
          sourceUrl: generatedUrl,
          phase: 'marketing',
          metadata: {
            prompt: providerUsed === 'openai-gpt-image-1.5' ? '(GPT prompt)' : prompt,
            scene,
            provider: providerUsed,
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
      provider: providerUsed,
    });
  } catch (error) {
    console.error('[Editorial] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Editorial generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 300;
