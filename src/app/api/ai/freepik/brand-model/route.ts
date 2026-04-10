import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════════
   Brand Model creation — Freepik Nano Banana
   (Gemini 2.5 Flash Image Preview)

   Generates editorial brand models (male / female / non-binary) that
   the brand reuses across visual campaigns. The goal is to build a
   small in-house roster of consistent, brand-aligned model "faces"
   rather than random AI strangers every time. The Virtual Try-On
   flow then composites products onto these saved brand models.

   Nano Banana is the right model here because:
     - It preserves input reference identity when provided
     - It generates hyper-realistic editorial portraits
     - Same provider/key as still-life and video, so the brand has
       one consistent aesthetic across every generation

   Nice-to-have flow: called from the brand settings / marketing card
   to populate a small library of brand models.
   ═══════════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const NANO_BANANA_ENDPOINT =
  'https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview';

interface BrandModelInput {
  gender?: 'female' | 'male' | 'non_binary';
  age_range?: string;
  ethnicity?: string;
  body_type?: string;
  height?: string;
  style_vibe?: string;
  hair?: string;
  reference_image_url?: string;
  brand_name?: string;
}

function buildPrompt(params: BrandModelInput): string {
  const {
    gender,
    age_range,
    ethnicity,
    body_type,
    height,
    style_vibe,
    hair,
    brand_name,
  } = params;

  const parts = [
    'Editorial fashion portrait photograph, magazine-quality casting card shot.',
    'Full-body shot, neutral studio backdrop, soft natural lighting, confident natural pose.',
    'Hyper-realistic skin textures, sharp focus, shallow depth of field, professional color grading.',
  ];

  const descriptors: string[] = [];
  if (gender) descriptors.push(gender.replace('_', '-'));
  if (age_range) descriptors.push(`${age_range} years old`);
  if (ethnicity) descriptors.push(ethnicity);
  if (body_type) descriptors.push(`${body_type} build`);
  if (height) descriptors.push(`${height} tall`);
  if (hair) descriptors.push(`hair: ${hair}`);

  if (descriptors.length > 0) {
    parts.push(`Model: ${descriptors.join(', ')}.`);
  }

  if (style_vibe) {
    parts.push(`Style vibe: ${style_vibe}.`);
  }

  if (brand_name) {
    parts.push(
      `This model is part of the ${brand_name} brand roster — capture an aesthetic consistent with the brand's editorial identity.`
    );
  }

  parts.push('No text, no watermark, no brand logos on clothing.');

  return parts.join(' ');
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
      ...(referenceImages.length ? { reference_images: referenceImages } : {}),
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('[Brand Model] Freepik create error:', createRes.status, errText.slice(0, 300));
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

    const body = (await req.json()) as BrandModelInput & {
      collectionPlanId?: string;
    };

    const { collectionPlanId, reference_image_url, ...modelInput } = body;

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

    const prompt = buildPrompt(modelInput);
    const referenceImages = reference_image_url ? [reference_image_url] : [];

    const generatedUrl = await createAndPoll(prompt, referenceImages);
    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Brand model generation failed' },
        { status: 502 }
      );
    }

    let finalUrl = generatedUrl;
    let assetId: string | null = null;
    if (collectionPlanId) {
      try {
        const result = await persistAsset({
          collectionPlanId,
          assetType: 'model',
          name: `Brand Model — ${modelInput.gender || 'unisex'} ${modelInput.age_range || ''}`.trim(),
          sourceUrl: generatedUrl,
          phase: 'creative',
          metadata: {
            prompt,
            ...modelInput,
            provider: 'freepik-nano-banana',
          },
          uploadedBy: user!.id,
        });
        if (result?.publicUrl) {
          finalUrl = result.publicUrl;
          assetId = result.assetId;
        }
      } catch (err) {
        console.error('[Brand Model] Persist failed:', err);
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, assetId, originalUrl: generatedUrl }],
      provider: 'freepik-nano-banana',
    });
  } catch (error) {
    console.error('[Brand Model] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Brand model generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
