import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkImageryUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';

/* ═══════════════════════════════════════════════════════════════
   Still Life — Freepik Nano Banana (Gemini 2.5 Flash Image Preview)

   Fashion still-life object photography. The product ALONE, as a
   standalone object on a surface, with considered light and shadow.
   ZERO humans in frame. Think Hereu / Jacquemus / Khaite e-commerce
   and editorial product shots — mule on marble, bag next to a
   ceramic bowl, shoe with its own long shadow.

   Categories Claude must NEVER confuse:
     - still_life  = product alone as object. This file. No humans.
     - on_model    = product worn by a brand model (/api/ai/freepik/tryon).
     - editorial   = on-model narrative scene (/api/ai/freepik/editorial).

   Nano Banana's reference-image compositing preserves the 3D render
   from the design phase (gpt-image-1.5) so the product identity
   survives through into the still-life scene.

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
 * Build the Nano Banana still-life prompt.
 *
 * "Still life" in fashion marketing is the product alone, as a sculpted
 * object on a surface, with considered light and curated props. Think
 * Hereu / Jacquemus / Khaite / Bottega lookbook imagery — not a cutout
 * of a catalog shoe with a pebble next to it.
 *
 * Categories Claude must NEVER confuse:
 *   - still_life  = product alone as object. No humans. (this file)
 *   - tryon       = product worn by a brand model (clean catalog).
 *   - editorial   = on-model narrative scene (/api/ai/freepik/editorial).
 *
 * PROMPT ARCHITECTURE:
 * The prompt treats the chosen scene preset as a LOOK — a signed
 * director-of-photography direction with surface, light, palette, props,
 * and composition rules baked in. Each preset in STILL_LIFE_LOOKS below
 * is a full paragraph the model can execute against, not just a scene
 * label like "marble" or "beach". The user picks the look, the model
 * composes inside its language.
 */

interface StillLifeLook {
  title: string;
  surface: string;
  light: string;
  palette: string;
  props: string;
  composition: string;
  reference: string; // editorial reference for style anchor
}

const STILL_LIFE_LOOKS: Record<string, StillLifeLook> = {
  sun_on_stone: {
    title: 'Sun on Stone',
    surface:
      'polished warm travertine slab or sun-bleached limestone surface, cream and sand tones with subtle natural veining',
    light:
      'hard high-noon directional sunlight from above and slightly to one side, casting a crisp angular shadow of the product onto the stone, with realistic edge gradient and subtle bounce',
    palette:
      'warm neutrals — travertine cream, sand, bone, soft tan, single warm ochre accent',
    props:
      'at most a single natural element placed at the edge of the frame — a dried olive branch, a piece of weathered driftwood, or a rounded beach pebble — with deep, intentional shadow of its own',
    composition:
      'product placed off-center following the rule of thirds, with the long shadow becoming a secondary graphic element in the composition; generous negative space to one side',
    reference:
      'Hereu + Bottega Veneta summer e-commerce imagery',
  },
  still_breakfast: {
    title: 'Still Breakfast',
    surface:
      'soft woven linen tablecloth (ecru or natural undyed) or warm cream ceramic tabletop, slightly wrinkled and lived-in, photographed from directly above (top-down flat lay)',
    light:
      'soft diffused morning window light from one side, gentle falloff across the linen, natural shadow of the props grounding them on the cloth',
    palette:
      'warm breakfast tones — ecru, cream, terracotta, a single fruit color (blood orange, lemon yellow, or deep plum) as the only saturated accent',
    props:
      'a curated still-life arrangement around the product: a clear glass bowl with a piece of fruit (half an orange, whole lemons, a plum), a silver or brass fork resting on the cloth, a folded linen napkin, a small matte ceramic dish — all real, all in sharp focus, composed like a Dutch still life painting reinterpreted for fashion',
    composition:
      'top-down flat lay, product anchors the composition with the props radiating outward; the arrangement feels intentional, never cluttered; 70% of the frame is surface and negative space around the arrangement',
    reference:
      'Hereu iconic "fork + fruit + shoe" campaign imagery',
  },
  atelier_floor: {
    title: 'Atelier Floor',
    surface:
      'aged wide-plank wooden studio floor with visible grain and soft patina, or raw polished concrete floor with subtle texture, photographed from a low ground-level angle',
    light:
      'single raking side light (large studio window or soft strobe) hitting the product at a sharp angle, creating a long soft shadow stretching across the floor, with deep shadow falloff into the background',
    palette:
      'muted earthy neutrals — weathered oak brown, warm grey concrete, soft black shadow, single muted accent color if the product asks for it',
    props:
      'nothing else in the frame, or at most one crumpled piece of butter-paper or a single strand of natural twine — the floor itself is the set',
    composition:
      'low ground-level camera angle that makes the product feel monumental, with the wood grain or concrete running horizontally behind it as a textural field; product slightly off-center; horizon line kept very low',
    reference:
      'Khaite + The Row quiet lookbook imagery',
  },
  gallery_plinth: {
    title: 'Gallery Plinth',
    surface:
      'matte white or pale beige museum plinth (rectangular pedestal) with clean edges, placed inside a softly lit gallery space with an out-of-focus neutral wall behind it',
    light:
      'directional museum-style light from above, sculpting the product with a soft highlight and a deep elegant shadow on the plinth surface, with gentle ambient fill from the gallery space',
    palette:
      'museum neutrals — gallery white, warm putty, stone grey, a single quiet accent if the product demands it',
    props:
      'no props — the plinth is the set; the out-of-focus gallery wall in the distant background may show the faintest hint of architectural detail (edge of a doorway, corner, or soft shadow play)',
    composition:
      'product centered on the plinth, photographed at a slightly low angle to make it feel sculptural and museum-worthy; background softly out of focus; the plinth occupies the lower third of the frame',
    reference:
      'Bottega Veneta museum campaign aesthetic',
  },
  window_light: {
    title: 'Window Light',
    surface:
      'natural washed linen fabric draped loosely over an aged wooden table, with deliberate folds and soft wrinkles, photographed at a 30-degree angle',
    light:
      'large soft window light from the left side, creating a long gentle shadow of the product across the linen, with visible atmospheric dust particles in the light beam, soft falloff into the right side of the frame',
    palette:
      'washed neutrals — bone linen, aged oak, soft grey shadow, ivory highlights, nothing saturated',
    props:
      'one quiet object at the far edge of the frame — a single dried flower stem, a small handmade matte ceramic vessel, or a folded cotton napkin — always out of focus or clearly secondary',
    composition:
      'product occupies the central 60% of the frame with the linen folds leading the eye toward it; the side light and long shadow become part of the composition; soft natural vignetting in the corners',
    reference:
      'Khaite + Jil Sander editorial imagery',
  },
  sand_and_shell: {
    title: 'Sand & Shell',
    surface:
      'fine sun-warmed coastal sand (pale gold to white) or small smooth beach pebbles, with subtle natural texture and faint wave marks or footprints brushed away',
    light:
      'warm golden-hour direct sunlight at a low angle from the side, creating long soft shadows on the sand and warm color bounce on the product, with the slightest atmospheric haze',
    palette:
      'sun-bleached coastal neutrals — pale sand, shell white, warm ivory, driftwood grey, single cool blue accent from distant ocean',
    props:
      'natural beach elements placed thoughtfully around the product — a single open shell (scallop, cowrie, or cockle), a smooth polished pebble, a dried piece of seaweed, or a sprig of dried beach grass — all casting their own shadows on the sand',
    composition:
      'photographed from a low or three-quarter angle so the horizon of sand fills most of the frame; product anchors the composition with shells and pebbles radiating naturally around it; the whole frame feels sun-soaked and quiet',
    reference:
      'Jacquemus summer campaign imagery',
  },
  color_wall: {
    title: 'Color Wall',
    surface:
      'a matte painted plaster wall in a single considered hue (warm ochre, deep terracotta, butter yellow, muted sage, or dusty rose — the palette hint should match the product colorway or serve the story), at a right angle to a smooth neutral concrete floor',
    light:
      'single hard directional studio light from the upper left, casting a crisp sculpted shadow of the product onto both the wall and the floor, creating strong graphic geometry with clean shadow edges',
    palette:
      'one dominant tonal color from the wall, echoed subtly in the floor, with the product as the clear focal contrast',
    props:
      'no props — the color wall and the sculpted shadow are the entire set',
    composition:
      'product placed close to the wall with roughly 60% of the frame being the painted wall and 40% the floor, so the shadow can stretch dramatically across both surfaces as a graphic element',
    reference:
      'Bottega Veneta + Loewe tonal campaign imagery',
  },
  ceramic_still: {
    title: 'Ceramic Still',
    surface:
      'a soft natural linen tablecloth (stone or putty tone) over a carved wooden table, photographed at a three-quarter angle that shows both the table surface and a hint of the wall behind',
    light:
      'soft diffused studio or large-window light from above and slightly in front, with gentle shadow wrapping around the product and the ceramic props, creating a calm interior feel',
    palette:
      'quiet interior neutrals — putty linen, cream ceramic, warm wood, soft clay, single muted accent',
    props:
      'a small curated grouping of matte ceramic objects near but not crowding the product — a handmade vessel, a simple bowl, a short vase with a single dried stem — all feeling like they belong to the same artisan',
    composition:
      'product is placed so it has a clear relationship with the ceramic grouping (conversation, not crowd); about 60% product, 25% ceramics, 15% breathing space; soft natural drop shadows ground everything on the linen',
    reference:
      'Khaite interior lookbook + Jil Sander still life imagery',
  },
};

function renderLook(look: StillLifeLook): string {
  return [
    `LOOK: "${look.title}" — in the style of ${look.reference}.`,
    `SURFACE: ${look.surface}.`,
    `LIGHTING: ${look.light}.`,
    `PALETTE: ${look.palette}.`,
    `PROPS: ${look.props}.`,
    `COMPOSITION: ${look.composition}.`,
  ].join(' ');
}

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
        : 'fashion accessory';

  const look = STILL_LIFE_LOOKS[scene || ''] || STILL_LIFE_LOOKS.sun_on_stone;

  const parts: string[] = [];

  // 1. Frame — declare the category explicitly.
  parts.push(
    `HIGH-END FASHION STILL LIFE PHOTOGRAPH (object photography, zero humans). Magazine editorial quality — not e-commerce catalog. The reference image shows the exact ${productType} called "${productName}". This ${productType} — and ONLY this ${productType} — is the subject of the photograph. The output must feel like a page from a fashion lookbook, NOT a cutout of the product on a flat background.`
  );

  // 2. Absolute no-human rule.
  parts.push(
    `ABSOLUTE NO-HUMAN RULE: NO model, NO person, NO face, NO hands, NO feet, NO legs, NO arms, NO body parts of any kind. Zero humans. The product is NOT being worn. If you are tempted to add a person, do not — this is still-life object photography.`
  );

  // 3. The LOOK — the heart of the prompt. A signed editorial direction.
  parts.push(renderLook(look));

  // 4. Explicit "this is not a catalog shot" direction to break Nano Banana
  //    out of its e-commerce cutout default.
  parts.push(
    `EDITORIAL OVER CATALOG: the image must NOT look like a product cutout on a plain background. The surface, light, shadow, and props must read as a deliberately composed editorial still life — the kind a creative director would sign off on for a seasonal lookbook. The product must feel integrated into the surface, not floating on it.`
  );

  // 5. Product preservation contract — same rigor as colorize-sketch.
  parts.push(
    `CRITICAL PRODUCT PRESERVATION (non-negotiable):`
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
    `• DO NOT alter the intrinsic colors of the product. The scene's light may cast shadows on it, but its colorway must match the reference exactly.`
  );
  parts.push(
    `• If any brand-like markings are visible in the reference, render them as clean unbranded surfaces — do not invent or replace logos.`
  );

  // 6. Story overlay — optional, never overrides the LOOK.
  if (story?.name) {
    parts.push(
      `EDITORIAL DIRECTION OVERLAY (from the collection story "${story.name}", adds flavor on top of the LOOK above without replacing it):`
    );
    if (story.narrative) parts.push(story.narrative.replace(/\.$/, '') + '.');
    if (story.mood?.length) parts.push(`Mood: ${story.mood.join(', ')}.`);
    if (story.tone) parts.push(`Tone: ${story.tone}.`);
    if (story.color_palette?.length)
      parts.push(
        `Story color palette (may subtly tint the surface or props, NEVER the product colorway): ${story.color_palette.join(', ')}.`
      );
    if (story.brand_personality)
      parts.push(`Brand aesthetic: ${story.brand_personality}.`);
  }

  // 7. Craft.
  parts.push(
    `CRAFT: sharp focus on the product, realistic material textures (leather grain, fabric weave, metal, rubber as applicable), natural color grading, deliberate depth of field with props slightly soft only when appropriate, no CGI plastic look, no artificial gloss, no HDR over-processing, no cutout-on-background feel.`
  );

  // 8. Reject list.
  parts.push(
    `REJECT LIST (the final image MUST NOT contain): no humans or body parts of any kind, no faces, no hands, no feet, no legs, no models wearing or holding the product, no text, no captions, no watermarks, no brand logos, no multiple copies of the product, no CGI/plastic textures, no cutout-on-flat-background look, no e-commerce white studio default, no runway crowd.`
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

    const usage = await checkImageryUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

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

    const prompt = buildPrompt({
      productName: product_name || 'fashion product',
      category,
      scene,
      story: enrichedStory,
      userPrompt: enrichedUserPrompt,
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
          assetType: 'still_life',
          name: `Still Life — ${product_name || 'object shot'}`,
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
