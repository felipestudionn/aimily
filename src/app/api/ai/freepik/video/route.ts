import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkAIUsage,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════════
   Video — Freepik Kling 2.1 (image-to-video)

   Two tiers:
     - 'pro'  (default) → /v1/ai/image-to-video/kling-v2-1-pro
     - 'std'            → /v1/ai/image-to-video/kling-v2-1-std
   Two durations: 5s or 10s.

   Default is Pro / 5s for best quality. The card can opt into Std for
   quick iterations and 10s for longer ads.

   Input image should be the Still Life / editorial shot generated
   upstream (by /api/ai/freepik/still-life), so the video preserves the
   product and scene from Nano Banana.
   ═══════════════════════════════════════════════════════════════ */

// Video generation can take 2-4 minutes. Make the function timeout
// explicit so the polling loop has room to finish.
export const maxDuration = 300;

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const KLING_PRO_ENDPOINT =
  'https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-pro';
const KLING_STD_ENDPOINT =
  'https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-std';

type VideoTier = 'pro' | 'std';
type VideoDuration = '5' | '10';

const MOTION_PRESETS: Record<string, string> = {
  subtle:
    'Subtle elegant movement: slight fabric sway, soft natural breathing, camera holds steady',
  walk: 'Model walking forward on runway, confident stride, fashion show atmosphere',
  pan: 'Smooth cinematic camera pan from left to right, revealing the full outfit',
  zoom: 'Slow cinematic zoom in, focusing on details, materials, and stitching',
  turn: 'Model turning slowly, 180-degree rotation showing the product from multiple angles',
  dolly: 'Smooth dolly-in camera movement, pulling the viewer into the scene',
};

interface StoryContext {
  name?: string;
  narrative?: string;
  mood?: string[];
  tone?: string;
}

function buildPrompt(params: {
  productName: string;
  motion: string;
  story?: StoryContext;
  userPrompt?: string;
}): string {
  const { productName, motion, story, userPrompt } = params;
  const motionDesc = MOTION_PRESETS[motion] || motion || MOTION_PRESETS.subtle;

  const parts = [
    `High-end fashion editorial motion piece featuring ${productName}.`,
    `${motionDesc}.`,
  ];

  if (story?.name) {
    parts.push(`Story context: "${story.name}".`);
    if (story.narrative) parts.push(story.narrative + '.');
    if (story.mood?.length) parts.push(`Mood: ${story.mood.join(', ')}.`);
    if (story.tone) parts.push(`Tone: ${story.tone}.`);
  }

  parts.push(
    'Cinematic lighting, shallow depth of field, professional color grading, editorial feel.'
  );
  parts.push('No text, no watermark, no brand logos added.');

  if (userPrompt) parts.push(`Art direction: ${userPrompt}.`);

  return parts.join(' ');
}

async function createAndPollKling(params: {
  endpoint: string;
  prompt: string;
  imageUrl: string;
  duration: VideoDuration;
}): Promise<string | null> {
  const { endpoint, prompt, imageUrl, duration } = params;

  const createRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': FREEPIK_API_KEY!,
    },
    body: JSON.stringify({
      image: imageUrl,
      prompt,
      duration,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('[Video] Freepik create error:', createRes.status, errText.slice(0, 300));
    return null;
  }

  const { data } = await createRes.json();
  const taskId = data?.task_id;
  if (!taskId) return null;

  // Video generation takes longer than images. Poll up to ~4 minutes.
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 6000));
    const statusRes = await fetch(`${endpoint}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY! },
    });
    if (!statusRes.ok) continue;
    const sd = await statusRes.json();
    const status: string | undefined = sd.data?.status;
    if (status === 'COMPLETED') {
      return sd.data?.generated?.[0] || sd.data?.video_url || null;
    }
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

    const {
      image_url,
      product_name,
      motion,
      duration: rawDuration,
      tier: rawTier,
      story_context,
      user_prompt,
      collectionPlanId,
    } = await req.json();

    if (!image_url) {
      return NextResponse.json(
        { error: 'image_url is required (use a still life or 3D render)' },
        { status: 400 }
      );
    }

    // Clamp tier + duration to the safe defaults.
    const tier: VideoTier = rawTier === 'std' ? 'std' : 'pro';
    const duration: VideoDuration = rawDuration === '10' ? '10' : '5';

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
      motion,
      story: story_context,
      userPrompt: user_prompt,
    });

    const endpoint = tier === 'pro' ? KLING_PRO_ENDPOINT : KLING_STD_ENDPOINT;
    const modelUsed =
      tier === 'pro' ? 'freepik-kling-2.1-pro' : 'freepik-kling-2.1-std';

    const generatedUrl = await createAndPollKling({
      endpoint,
      prompt,
      imageUrl: image_url,
      duration,
    });

    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Video generation failed' },
        { status: 502 }
      );
    }

    let finalUrl = generatedUrl;
    let assetId: string | null = null;
    if (collectionPlanId) {
      try {
        const result = await persistAsset({
          collectionPlanId,
          assetType: 'video',
          name: `Video — ${product_name || 'editorial'} (${tier} ${duration}s)`,
          sourceUrl: generatedUrl,
          phase: 'design',
          metadata: {
            prompt,
            motion,
            tier,
            duration,
            provider: modelUsed,
          },
          uploadedBy: user!.id,
        });
        if (result?.publicUrl) {
          finalUrl = result.publicUrl;
          assetId = result.assetId;
        }
      } catch (err) {
        console.error('[Video] Persist failed:', err);
      }
    }

    return NextResponse.json({
      video_url: finalUrl,
      assetId,
      originalUrl: generatedUrl,
      provider: modelUsed,
      tier,
      duration,
    });
  } catch (error) {
    console.error('[Video] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Video generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
