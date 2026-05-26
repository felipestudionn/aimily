import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkImageryUsage,
  refundImageryUnits,
  usageDeniedResponse,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset, uploadToStorage } from '@/lib/storage';
import { compositeModelOntoStyleRef, blurFaceInStyleReference } from '@/lib/face-blur';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';
import { normalizeAiError } from '@/lib/ai/error-messages';
import {
  fetchAsPng,
  gptImageEdit,
  gptImageEditParallel,
  nanoBananaCreateAndPoll,
  type GptImageInput,
} from '@/lib/ai/image-generation';
import { pickBestEditorialCandidate } from '@/lib/ai/editorial-evaluator';

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

interface StoryContext {
  name?: string;
  narrative?: string;
  mood?: string[];
  tone?: string;
  color_palette?: string[];
  brand_personality?: string;
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
  /** True when the style reference IS the composite (model's face pasted
   *  onto the style ref body) and no separate headshot is being sent.
   *  In this mode buildPrompt skips the "Image 3 is headshot" priority
   *  block and describes Image 2 as the model+scene composite that must
   *  be preserved verbatim (face, hair, body, pose) — only the product
   *  is replaced from Image 1. Bug fix: prior to this flag, buildPrompt
   *  generated a 3-image prompt while the route only sent 2 images,
   *  which confused Nano Banana and caused it to invent face + product. */
  styleRefIsModelComposite?: boolean;
  modelDirectives?: ModelDirectives;
}): string {
  const { productName, category, scene, story, userPrompt, hasStyleReference, hasModelHeadshot, styleRefIsModelComposite, modelDirectives } = params;

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

  // 9. Visual style reference — describes the *behavior* the final
  // photograph must reproduce. Explicit partition of what comes from
  // where, no contradictions. The composite case (when the model's
  // face has already been pasted onto the style ref body before being
  // sent to Nano Banana) is handled with its own block further down.
  if (hasStyleReference && !styleRefIsModelComposite) {
    parts.push(
      `STYLE / COMPOSITION REFERENCE (second reference image): The second reference image defines the BEHAVIOR of the photograph — the entire shot direction. The final image must reproduce ALL of the following from the style reference, exactly:`
    );
    parts.push(
      `• Pose, body position, body language, gesture, weight distribution.`
    );
    parts.push(
      `• Head tilt, head angle, neck position, chin position.`
    );
    parts.push(
      `• GAZE DIRECTION — where the model is looking. If she looks sideways in the reference, she looks sideways in the output. If she looks down at her foot, she looks down at her foot. If her eyes are closed, eyes closed. Replicate the gaze precisely.`
    );
    parts.push(
      `• Facial expression, mouth shape, eye expression, acting, attitude, mood.`
    );
    parts.push(
      `• Composition, framing, camera angle, depth of field.`
    );
    parts.push(
      `• Lighting setup, key light direction, shadows, color grade, atmosphere.`
    );
    parts.push(
      `• Wardrobe styling around the product (tights, jacket, dress, accessories) — keep these as in the reference unless they ARE the product being substituted.`
    );
    parts.push(
      `• The PRODUCT visible on the model in the style reference is the WRONG product — replace it with the ${productType} from the first reference image. Do NOT copy any product, garment, shoes, or accessory shown in the style reference unless the prompt explicitly says so.`
    );
    if (!hasModelHeadshot) {
      // Legacy v2 path (no casting model selected) — the only allowed
      // change is the face identity, for likeness rights.
      parts.push(
        `• FACE IDENTITY (legal requirement): generate a DIFFERENT face from the person shown in the style reference — different eye shape, different nose, different jawline, different lip shape. Same complexion range and hair vibe, but a believably different person. Think "same casting brief, different model".`
      );
    }
  }

  // 9b. Composite case — Image 2 is already "model + scene" baked together.
  // The casting model's face has been pasted onto the style ref body
  // BEFORE Nano Banana sees it. No separate headshot is sent. The
  // contract is: preserve Image 2 verbatim (face, hair, pose, expression,
  // gaze, lighting, atmosphere) and ONLY replace the product.
  if (styleRefIsModelComposite) {
    parts.push(
      `COMPOSITE REFERENCE (second reference image) — non-negotiable, single source of truth for the entire shot: Image 2 is the FINAL composition minus the product. It already contains the correct casting model (her face, her hair, her complexion) placed in the correct editorial scene (correct pose, correct body language, correct head tilt, correct gaze direction, correct facial expression, correct lighting, correct atmosphere, correct wardrobe). Reproduce Image 2 verbatim, pixel-faithful.`
    );
    parts.push(
      `The ONLY change from Image 2 to the output: replace the ${productType} that the model is interacting with in Image 2 (on her feet, in her hands, around her body — whatever applies) with the EXACT ${productType} from Image 1. Same pose, same gaze, same expression, same lighting, same scene — only the product changes.`
    );
    parts.push(
      `Do NOT regenerate the face. Do NOT change the hair. Do NOT alter the gaze direction or where the model is looking. Do NOT change the head tilt. Do NOT modify the body pose. Image 2 IS the answer for everything except the product.`
    );
  }

  // 10. Model headshot reference — only when sent as a SEPARATE image
  // (not in composite mode). Defines IDENTITY only: face structure,
  // hair, complexion. NOT expression, NOT gaze, NOT head pose — those
  // come from the style reference above.
  if (hasModelHeadshot && !styleRefIsModelComposite) {
    parts.push(
      `MODEL HEADSHOT — identity-only reference (last reference image): The headshot defines WHO this model is. Take ONLY the identity attributes from this image:`
    );
    parts.push(
      `• Face structure: eye shape, nose shape, lip shape, jawline, cheekbones, eyebrow shape. These define WHO she is.`
    );
    parts.push(
      `• Hair: color, length, texture (straight / wavy / curly / braided), cut / style. Do NOT take the hair DIRECTION or how it falls from the headshot — hair fall follows the body pose from the style reference.`
    );
    parts.push(
      `• Complexion and skin tone.`
    );
    parts.push(
      `DO NOT take from the headshot: facial expression, gaze direction, head tilt, head pose, neck angle, mood, energy. The headshot is typically a static front-on portrait; those behavioral attributes come exclusively from the style reference. WHO the person is = headshot. WHAT she is doing = style reference.`
    );

    if (hasStyleReference) {
      parts.push(
        `REFERENCE IMAGE ROLES (three images sent):`
      );
      parts.push(
        `• Image 1 (product): replace into the final image, pixel-perfect.`
      );
      parts.push(
        `• Image 2 (style / composition): everything the photograph is DOING — pose, gaze, head tilt, expression, lighting, atmosphere, scene. The face in Image 2 has been blurred on purpose; do not use it for identity. The body, pose, and behavior of Image 2 ARE the final shot direction.`
      );
      parts.push(
        `• Image 3 (model headshot): the IDENTITY of the face/hair/complexion that replaces the blurred face in Image 2. Identity only — do not copy the headshot's pose or expression.`
      );
      parts.push(
        `Final image = Image 2's behavior + Image 3's identity + Image 1's product.`
      );
    } else {
      parts.push(
        `REFERENCE IMAGE ROLES (two images sent): Image 1 = product (pixel-perfect). Image 2 = model headshot (identity for face / hair / complexion). Compose a high-end editorial scene of the model wearing or carrying the product.`
      );
    }
  }

  if (userPrompt) parts.push(`ADDITIONAL ART DIRECTION: ${userPrompt}.`);

  return parts.join(' ');
}

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  let planConsumed = 0;
  let packConsumed = 0;
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    userId = user!.id;

    const rateLimited = enforceAiUserRateLimit(userId, 'image');
    if (rateLimited) return rateLimited;

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
      skuId,
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

    const usage = await checkImageryUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);
    planConsumed = usage.planConsumed ?? 0;
    packConsumed = usage.packConsumed ?? 0;

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

    // When BOTH a style ref AND a casting model are selected, we
    // composite the model's face onto the style ref body before
    // sending to Nano Banana — Image 2 is then a "model + scene"
    // composite, not a raw style ref, and no separate headshot is
    // sent. buildPrompt needs this flag to switch to the composite-
    // aware contract (preserve Image 2 verbatim, swap only the
    // product) instead of the legacy 3-image prompt that talked
    // about a non-existent Image 3 headshot.
    const willCompositeForNanoBanana = !!(style_reference_url && aiModel?.headshot_url);

    const prompt = buildPrompt({
      productName: product_name || 'fashion product',
      category,
      scene,
      story: enrichedStory,
      userPrompt: enrichedUserPrompt,
      hasStyleReference: !!style_reference_url,
      hasModelHeadshot: !!aiModel,
      styleRefIsModelComposite: willCompositeForNanoBanana,
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

    // ═══ STRUCTURAL DEFENSE ═══
    // Path selection:
    //   - With aimily MODEL → GPT Image 1.5 (3-tier moderation defense),
    //     Nano Banana only if all 3 GPT tiers fail.
    //   - Without model → Nano Banana directly (GPT can't preserve face
    //     identity without a headshot reference).
    //
    // Each tier on rejection retries with a progressively safer prompt
    // and fewer images. Hot path returns from Tier 1 — Tier 2 / Tier 3
    // / Nano only run when prior tier was moderation-blocked.
    let generatedUrl: string | null = null;
    let providerUsed = 'freepik-nano-banana';
    let lastGptError: string | null = null;
    let nanoBananaErrorCode: string | null = null;

    // Multi-candidate state, populated by the GPT branch below. Used by
    // persistAsset metadata + ai_generations input_data so the forensic
    // trail includes every alternate the evaluator considered + scores.
    let alternateUrls: string[] = [];
    let evaluatorReasoning: string | null = null;
    let evaluatorScores: unknown = null;

    // GPT primary, always. The Nano Banana block below is a silent
    // emergency fallback only — never user-selectable. The A/B test
    // concluded GPT wins on identity, composition, and product fidelity.
    if (aiModel?.headshot_url && process.env.OPENAI_API_KEY) {
      providerUsed = 'openai-gpt-image-1.5';

      // Prepare image buffers once — reused across tiers.
      const productPng = await fetchAsPng(product_image_url);
      const headshotPng = await fetchAsPng(aiModel.headshot_url);

      let stylePng: Buffer | undefined;
      if (style_reference_url) {
        try {
          const compositedBuffer = await compositeModelOntoStyleRef(
            style_reference_url,
            aiModel.headshot_url,
          );
          stylePng = await sharp(compositedBuffer)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer();
        } catch {
          const styleRes = await fetch(style_reference_url);
          const styleBuf = Buffer.from(await styleRes.arrayBuffer());
          stylePng = await sharp(styleBuf)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer();
        }
      }

      const images: GptImageInput[] = [
        { buffer: productPng, filename: 'product.png' },
        { buffer: headshotPng, filename: 'model.png' },
      ];
      if (stylePng) images.push({ buffer: stylePng, filename: 'style.png' });

      // Day-perfect GPT prompt — restored verbatim from commit 9f3a21b~1.
      // This is the prompt Felipe validated as producing the correct pose
      // / hair-fall / attitude fidelity to the style reference. Do NOT
      // unify or refactor without explicit approval — past attempts to
      // "unify with buildPrompt()" silently dropped composition fidelity.
      // ─── STRUCTURED PROMPT per Codex consult (2026-05-26) ───
      // Replaces the previous flat join(' ') wall-of-text with labeled
      // sections separated by line breaks (\n\n). OpenAI cookbook +
      // Codex both confirm: "structure beats length" — labeled segments
      // give GPT better instruction hierarchy than equivalent prose.
      // Cut blocks (BLINDAJE 4 mirror, BLINDAJE 5 final verification,
      // pixel-perfect false-precision language) per Codex — competing
      // constraints + theater. Added Codex's 3 worth-adding clauses
      // (material fidelity, skin tone, product angle) into the right
      // sections instead of as standalone blindajes.
      const calzadoProductLine = `For footwear: shoes are worn on both feet, visible from an editorial front or three-quarter side angle. Outsole is not the dominant view unless Image 3 explicitly shows it. The upper, strap, and silhouette must read clearly.`;
      const ropaProductLine = `For garments: the garment is worn naturally on the model, drapes correctly, shows fabric weight and silhouette. The garment is the hero of the frame.`;
      const accesorioProductLine = `For accessories: the product is held, worn, or carried in a way that keeps it prominent and identifiable in the frame.`;
      const productLine = category === 'CALZADO' ? calzadoProductLine
        : category === 'ROPA' ? ropaProductLine
        : accesorioProductLine;

      const inputsLines = style_reference_url
        ? [
            `Image 1: product reference (${product_name || 'fashion product'}). Source of product identity, material, color, silhouette, hardware.`,
            `Image 2: model identity reference. Source of face structure, hair color/length/texture/cut, complexion, skin tone. NOT pose, NOT gaze, NOT expression — those come from Image 3.`,
            `Image 3: scene + pose + style reference (the model in Image 3 has already had the casting model's head composited onto her body). Source of pose, body language, head tilt, gaze direction (where she is looking — if sideways, output sideways; if down at her foot, output down at her foot), facial expression, mood, lighting, atmosphere, environment, camera angle, framing, wardrobe styling around the product.`,
          ]
        : [
            `Image 1: product reference (${product_name || 'fashion product'}). Source of product identity, material, color, silhouette.`,
            `Image 2: model identity reference. Source of face, hair, complexion, skin tone.`,
            `Compose a high-end editorial scene from scratch — the model from Image 2 wearing or carrying the product from Image 1.`,
          ];

      const nonNegotiables = style_reference_url
        ? [
            `1. Model identity (face / hair / complexion / skin tone) comes from Image 2. Identity wins over any conflicting cue.`,
            `2. Product (shape, color, material, hardware, details) comes from Image 1. The scene accommodates the product, not the other way around.`,
            `3. Pose, gaze direction, head tilt, body language, facial expression, lighting, framing, environment come from Image 3 — reproduce exactly.`,
            `4. ${productLine}`,
            `5. Full body, head-to-toe crop. Shot on 85mm telephoto compression. Editorial 8-head body proportion (head ≈ 1/8 of total height crown-to-feet). Slight low camera angle. Magazine cover full-figure crop — not portrait, not headshot.`,
          ]
        : [
            `1. Model identity (face / hair / complexion / skin tone) comes from Image 2.`,
            `2. Product (shape, color, material, hardware, details) comes from Image 1.`,
            `3. ${productLine}`,
            `4. Full body, head-to-toe crop. 85mm telephoto compression. Editorial 8-head body proportion. Magazine cover crop.`,
          ];

      const gptPrompt = [
        `## TASK`,
        `Create one full-body high-end editorial fashion photograph.`,
        ``,
        `## INPUTS`,
        ...inputsLines,
        ``,
        `## NON-NEGOTIABLES`,
        ...nonNegotiables,
        ``,
        `## EDITORIAL QUALITY`,
        `Runway / editorial casting bone structure: slender swan-like neck, visible defined clavicle where the wardrobe permits, sculpted cheekbones with natural shadow, defined jawline, slim sculpted face. At least one side of the hair is tucked behind the ear, revealing the earlobe and side of the jawline (when the hair length and pose permit). Natural skin texture with realistic pores and subtle highlights. Premium magazine campaign lighting.`,
        ``,
        `## MATERIAL FIDELITY`,
        `Preserve the product's material finish from Image 1 exactly. Leather stays leather (specular highlights, visible grain). Suede stays suede (matte, fine nap). Satin stays satin (smooth specular). Cotton stays cotton, denim stays denim. Do NOT substitute one material for another. Hardware (buckles, rivets, eyelets) stays the same color and finish as in Image 1.`,
        ``,
        `## SKIN TONE`,
        `Match Image 2's complexion and undertone under Image 3's scene lighting. Do not tan, bleach, or shift ethnicity. Variation should only come from light, never from rendering the model as a different person.`,
        ``,
        `## ANATOMY`,
        `Exactly 2 arms, 2 legs, 2 feet, 10 fingers, 10 toes. Feet naturally mirrored: left foot points outward to the model's left, right foot to the model's right. Big toe on medial (inside) edge of each foot. Heels backward. Hands have 5 distinguishable fingers each with natural joint orientation and visible separation between thumb and other fingers — never fused, melted, or merged with surfaces or products.`,
        ``,
        `## DO NOT`,
        `- Do not change leather into suede or substitute any material.`,
        `- Do not lighten, darken, or shift the model's skin tone beyond what scene lighting justifies.`,
        `- Do not simplify or remove background elements visible in Image 3 (mirrors, furniture, props, architectural details).`,
        `- Do not invent extra limbs, fingers, or toes.`,
        `- Do not add text, captions, watermarks, brand names, phone numbers, page numbers, or magazine markings — even if any of these are visible in Image 3 (they belong to the original publication and must be erased from the output).`,
        `- Do not render two left feet or two right feet (mirror them naturally).`,
        user_prompt ? `` : '',
        user_prompt ? `## ADDITIONAL CREATIVE DIRECTION` : '',
        user_prompt ? user_prompt : '',
      ].filter((p) => p !== '').join('\n');

      // ─── n=4 PARALLEL + VISION EVALUATOR (Codex consult, 2026-05-26) ───
      // Replaces single-candidate gptImageEdit. Fires 4 parallel gpt-image-2
      // requests, then Claude Haiku vision picks the best against explicit
      // criteria. Hides the multi-candidate generation from the user — they
      // only see the winner. The 3 losers are persisted to storage as
      // alternates in case Felipe wants to inspect them later.
      //
      // Wall time: ~30-35s (parallel execution, same as single n=1).
      // Cost per generation: ~4x output billing (was $0.25 → now ~$1.00),
      // plus ~$0.07 evaluator. Covered by Founder credit pricing.
      //
      // Per Codex: "Candidate selection is the biggest jump toward
      // production consistency because it accepts that generation is
      // stochastic instead of pretending the prompt can remove sampling
      // variance."
      const N_CANDIDATES = Number(process.env.EDITORIAL_CANDIDATES || 4);
      const gptResult = await gptImageEditParallel({
        images,
        prompt: gptPrompt,
        collectionPlanId,
        assetType: 'editorial',
        n: N_CANDIDATES,
      });

      if (gptResult.urls.length > 0) {
        // Vision evaluator picks the best candidate
        const compositedStyleRefUrl = referenceImages.length > 1 ? referenceImages[1] : undefined;
        const evalResult = await pickBestEditorialCandidate({
          candidates: gptResult.urls,
          productUrl: product_image_url,
          headshotUrl: aiModel?.headshot_url,
          styleRefUrl: compositedStyleRefUrl,
          productName: product_name,
          category: category as 'CALZADO' | 'ROPA' | 'ACCESORIO' | undefined,
        });

        generatedUrl = evalResult.winnerUrl;
        alternateUrls = gptResult.urls.filter((u) => u !== evalResult.winnerUrl);
        evaluatorReasoning = evalResult.reasoning;
        evaluatorScores = evalResult.scores;
        providerUsed = `openai-gpt-image-2-best-of-${gptResult.urls.length}`;

        console.log(
          `[editorial] picked candidate ${evalResult.winnerIndex + 1}/${gptResult.urls.length}: ${evalResult.reasoning}`,
        );
      } else if (gptResult.error) {
        lastGptError = gptResult.error.errorCode;
      }
    }

    // ═══ NANO BANANA FALLBACK ═══
    // Reached when: (a) no model selected (no GPT path), or
    // (b) all 3 GPT tiers were moderation-blocked / errored.
    if (!generatedUrl) {
      const nb = await nanoBananaCreateAndPoll(prompt, referenceImages);
      if (nb.url) {
        generatedUrl = nb.url;
        providerUsed = providerUsed === 'freepik-nano-banana'
          ? 'freepik-nano-banana'
          : 'freepik-nano-banana-fallback';
      } else {
        nanoBananaErrorCode = nb.errorCode;
      }
    }

    if (!generatedUrl) {
      await refundImageryUnits(userId, planConsumed, packConsumed);
      // Surface a specific diagnostic so the UI can tell the user
      // whether to wait / retry / contact support, instead of the
      // generic "generation failed".
      const isModeration = lastGptError === 'moderation';
      const isIpBlock = nanoBananaErrorCode === 'ip_block';
      const userMessage = isModeration
        ? 'Both image providers rejected this combination of references. Try a different style reference photo and retry — the photo content (not your settings) is what got blocked.'
        : isIpBlock
          ? 'The image service is temporarily throttling us. Please retry in a minute.'
          : 'Editorial generation failed. Please retry.';
      return NextResponse.json(
        {
          error: userMessage,
          code: isModeration ? 'moderation_blocked' : isIpBlock ? 'service_throttled' : 'generation_failed',
          diagnostics: {
            gptError: lastGptError,
            nanoBananaError: nanoBananaErrorCode,
          },
        },
        { status: 502 },
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
            // sku_id is the join key for storefront SKU-specific imagery
            // (load-storefront-data.ts:304). Always include when known.
            ...(skuId ? { sku_id: skuId } : {}),
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

    // Record the generation in ai_generations server-side. The frontend
    // used to do this in a second fetch after the editorial call, but
    // iOS Safari was killing the long-lived editorial connection
    // (Vercel function returned 200, mobile saw "Load failed") which
    // meant the asset existed in storage but ai_generations had no row
    // and the UI never saw the image. Atomic server-side insert fixes
    // that class of bug.
    let generationId: string | null = null;
    if (collectionPlanId) {
      const promptLabel = `Editorial for ${product_name || 'product'}${user_prompt ? ` — ${user_prompt}` : ''}`;
      const { data: genRow, error: genErr } = await supabaseAdmin
        .from('ai_generations')
        .insert({
          user_id: user!.id,
          collection_plan_id: collectionPlanId,
          generation_type: 'editorial',
          prompt: promptLabel,
          input_data: {
            sku_id: skuId || null,
            sku_name: product_name || null,
            model_id: model_id || null,
            // n=4 + evaluator forensic trail (YOLO Commit 3)
            n_candidates: alternateUrls.length + (generatedUrl ? 1 : 0),
            evaluator_reasoning: evaluatorReasoning,
            evaluator_scores: evaluatorScores,
          },
          output_data: {
            images: [{ url: finalUrl, assetId, originalUrl: generatedUrl }],
            // All the candidates the evaluator considered. Winner is
            // already in `images[0]` above; these are the rejected
            // alternates, preserved for forensic inspection.
            alternate_candidates: alternateUrls,
          },
          provider_request_id: null,
          model_used: providerUsed,
          status: 'completed',
          is_favorite: false,
          story_id: null,
        })
        .select('id')
        .single();
      if (genErr) {
        console.error('[Editorial] ai_generations insert failed:', genErr);
      } else {
        generationId = genRow?.id ?? null;
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, assetId, originalUrl: generatedUrl }],
      provider: providerUsed,
      generationId,
    });
  } catch (error) {
    if (userId) await refundImageryUnits(userId, planConsumed, packConsumed);
    console.error('[Editorial] Error:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}

export const maxDuration = 300;
