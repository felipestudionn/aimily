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
      ? 'footwear'
      : category === 'ROPA'
        ? 'garment'
        : 'fashion product';

  const sceneMap: Record<string, string> = {
    street: 'urban street-style setting, city backdrop, golden hour natural light',
    cafe: 'European café terrace, warm ambient light, morning atmosphere',
    beach: 'sandy beach at golden hour, soft ocean waves, natural sunlight',
    office: 'modern minimalist office interior, clean lines, bright diffused light',
    runway: 'fashion show runway, dramatic editorial spotlight, high-end atmosphere',
    nature: 'lush natural outdoor setting, soft dappled daylight, organic textures',
    urban: 'raw industrial urban environment, concrete textures, cinematic light',
    'white-studio': 'clean white studio backdrop, soft even lighting, high-key',
    marble: 'elegant marble gallery interior, sculpted natural light',
    gradient: 'smooth gradient studio backdrop, contemporary editorial light',
  };
  const sceneDesc = sceneMap[scene || ''] || scene || 'editorial magazine-quality setting';

  const parts = [
    `High-end editorial fashion photograph, magazine-cover quality.`,
    `A model wearing the ${productType} (${productName}) shown in the reference image.`,
    `CRITICAL: preserve the reference ${productType} exactly as shown — silhouette, colorway, materials, stitching, construction. Do not redesign it, do not add logos, do not alter proportions.`,
    `Scene: ${sceneDesc}.`,
  ];

  if (story?.name) {
    parts.push(`Story context: "${story.name}".`);
    if (story.narrative) parts.push(story.narrative + '.');
    if (story.mood?.length) parts.push(`Mood: ${story.mood.join(', ')}.`);
    if (story.tone) parts.push(`Tone: ${story.tone}.`);
    if (story.color_palette?.length)
      parts.push(`Color palette references: ${story.color_palette.join(', ')}.`);
    if (story.brand_personality) parts.push(`Brand aesthetic: ${story.brand_personality}.`);
  }

  parts.push(
    'Shot like a Vogue editorial: confident natural pose, cinematic composition, sharp focus on the product, realistic skin and fabric textures, depth of field, professional color grading.'
  );
  parts.push('No text, no watermark, no brand logos added.');

  if (userPrompt) parts.push(`Art direction: ${userPrompt}.`);

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
