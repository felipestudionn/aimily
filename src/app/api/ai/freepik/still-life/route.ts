import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';

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
 * IMPORTANT: "Still life" in fashion marketing is a specific photography
 * category — the product ALONE, as an object, arranged on a surface with
 * considered light, shadow, and optional props. There is NO human, NO
 * model, NO limbs. Think of how Hereu, Jacquemus, or Khaite shoot their
 * products for e-commerce + editorial: the shoe sits on marble with a
 * dramatic shadow; the bag rests on linen with a single ceramic bowl;
 * the dress is folded over a carved wooden chair.
 *
 * Categories Claude must NEVER confuse:
 *   - still_life  = product alone as object. No humans.
 *   - on_model    = product worn by a model (that's /api/ai/freepik/tryon).
 *   - editorial   = narrative scene, may include humans (that's editorial tab).
 *
 * Prompt structure mirrors the rigor of the design-phase colorize-sketch
 * prompt so Nano Banana's reference compositing doesn't reinterpret the
 * product.
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
        : 'fashion accessory';

  // Surface / support per category — where the product physically rests.
  const surfaceContext =
    category === 'CALZADO'
      ? 'resting on the surface at a three-quarter angle that reveals its silhouette, side profile, and top construction simultaneously'
      : category === 'ROPA'
        ? 'softly folded or draped over the surface so the garment shows its fabric weight, texture, and color clearly without being worn'
        : 'placed on the surface in a deliberate, considered way that makes its form and craftsmanship legible';

  // Scene presets tailored to OBJECT photography (no humans).
  const sceneMap: Record<string, string> = {
    'white-studio':
      'clean pure white studio backdrop (#FFFFFF), soft even high-key lighting, subtle natural contact shadow directly beneath the product on the ground plane, minimalist e-commerce aesthetic',
    marble:
      'polished cream or grey marble surface with soft directional daylight casting an elegant long shadow across the veining, museum-like stillness',
    gradient:
      'smooth seamless studio gradient backdrop (warm cream to sand or cool grey to white), single directional light from upper left creating a sculpted drop shadow',
    street:
      'weathered concrete or stone urban surface — curb, paving, textured wall at ground level — bathed in late-afternoon natural light, long natural shadow, no people in frame',
    cafe:
      'aged wooden or marble café tabletop photographed from above or at 45 degrees, with subtle bistro props out of focus (a ceramic espresso cup, a folded linen napkin) at the edges of the frame — no hands, no people',
    beach:
      'sun-bleached sand or smooth coastal pebbles in direct warm golden-hour light, with a single natural prop like a dried palm leaf or a seashell placed thoughtfully nearby',
    office:
      'clean minimalist desk surface — oak or pale concrete — with soft diffused daylight from a nearby window, one or two quiet props (a leather notebook, a ceramic vessel) at the edge of the frame',
    runway:
      'polished dark concrete or black terrazzo floor with a single dramatic overhead spotlight, high-contrast editorial lighting, deep cinematic shadow',
    nature:
      'natural outdoor surface — weathered wood, mossy stone, or dried leaves — photographed in soft dappled daylight through foliage, earthy color palette',
    urban:
      'raw industrial surface — exposed concrete, rusted metal sheet, or brushed steel — in cinematic directional light, editorial mood, no people, no movement',
  };
  const sceneDesc =
    sceneMap[scene || ''] ||
    scene ||
    'clean editorial surface with considered light and shadow, magazine-quality object photography';

  const parts: string[] = [];

  // 1. Frame — declare the category explicitly so Nano Banana doesn't pull
  //    in its "fashion photo" default, which usually includes a person.
  parts.push(
    `HIGH-END FASHION STILL LIFE PHOTOGRAPH (object photography, no humans). Magazine editorial quality in the style of Hereu, Jacquemus, Khaite, Bottega Veneta e-commerce and lookbook imagery. The reference image shows the exact ${productType} called "${productName}". This ${productType} — and ONLY this ${productType} — is the subject of the photograph.`
  );

  // 2. Absolute no-human rule — Nano Banana's default for "fashion photo"
  //    usually invents a model, so we ban humans with maximum explicitness.
  parts.push(
    `ABSOLUTE RULES — NO HUMANS IN THE FRAME:`
  );
  parts.push(
    `• NO model, NO person, NO face, NO hands, NO feet, NO legs, NO arms, NO body parts of any kind. Zero humans.`
  );
  parts.push(
    `• The product is NOT being worn. The product is photographed as a standalone object on a surface.`
  );
  parts.push(
    `• If you are tempted to add a person wearing or holding the product, DO NOT. This is still-life object photography.`
  );

  // 3. Preserve — the core pixel-perfect identity contract.
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
    `• DO NOT alter scale, proportions, or color temperature of the product itself.`
  );
  parts.push(
    `• If any brand-like markings are visible in the reference, render them as clean unbranded surfaces — do not invent or replace logos.`
  );

  // 4. Composition — how the product sits on the surface.
  parts.push(
    `COMPOSITION: the ${productType} is ${surfaceContext}. The product is the hero and occupies roughly 60-70% of the frame. Negative space around the product is intentional and gives the image breathing room. Camera angle is either a clean 45-degree three-quarter view or a direct top-down flat-lay, whichever best reveals the product's silhouette.`
  );

  // 5. Surface + lighting.
  parts.push(`SURFACE & SCENE: ${sceneDesc}.`);
  parts.push(
    `LIGHTING: single dominant directional light source (natural window light or soft studio strobe) creating a clear, elegant shadow that grounds the product on the surface. The shadow tells the viewer the product is a real physical object, not a cutout. Realistic shadow softness, realistic color bounce off the surface, no flat ambient lighting.`
  );

  // 6. Props — optional curated objects that belong in fashion still-life.
  parts.push(
    `PROPS (optional, at most 1-2 quiet objects at the edge of the frame if they serve the story): natural tactile objects that never compete with the product — a ceramic vessel, a single stem of dried grass, a folded linen square, a polished stone, a piece of seasonal fruit. Props must be OUT OF FOCUS or clearly secondary. NEVER add props that imply a person (no hands, no half-visible bodies, no clothing worn).`
  );

  // 7. Story — optional brand context.
  if (story?.name) {
    parts.push(`EDITORIAL DIRECTION (from the collection story "${story.name}"):`);
    if (story.narrative) parts.push(story.narrative.replace(/\.$/, '') + '.');
    if (story.mood?.length) parts.push(`Mood: ${story.mood.join(', ')}.`);
    if (story.tone) parts.push(`Tone: ${story.tone}.`);
    if (story.color_palette?.length)
      parts.push(
        `Story color palette references (may inform surface and prop colors, NOT the product colorway): ${story.color_palette.join(', ')}.`
      );
    if (story.brand_personality) parts.push(`Brand aesthetic: ${story.brand_personality}.`);
  }

  // 8. Craft.
  parts.push(
    `CRAFT: sharp focus on the product, realistic material textures (leather grain, fabric weave, metal, rubber as applicable), shallow depth of field on props only, natural color grading, no CGI plastic look, no artificial gloss, no HDR over-processing.`
  );

  // 9. Final reject list — everything Claude must actively refuse to generate.
  parts.push(
    `REJECT LIST (the final image MUST NOT contain): no humans or body parts of any kind, no faces, no hands, no feet, no legs, no models wearing or holding the product, no text, no captions, no watermarks, no logos, no added brand markings, no multiple copies of the product, no CGI/plastic textures, no surreal dreamlike backgrounds, no motion blur, no fashion-show runway crowd.`
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
