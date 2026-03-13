import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

fal.config({ credentials: process.env.FAL_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const { image_url, motion_type, prompt, story_context, collectionPlanId } = await req.json();

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const motionPrompts: Record<string, string> = {
      subtle: 'Subtle gentle movement, slight fabric sway, soft breathing motion',
      walk: 'Model walking forward on runway, confident stride, fashion show',
      pan: 'Smooth cinematic camera pan from left to right, revealing the full outfit',
      zoom: 'Slow cinematic zoom in, focusing on details and texture',
    };

    const motionDesc = motionPrompts[motion_type] || motion_type || 'Subtle elegant movement';

    let fullPrompt = prompt || `Fashion video. ${motionDesc}. Professional quality, smooth motion.`;
    if (story_context && !prompt) {
      const parts = [
        story_context.name ? `Fashion video for "${story_context.name}" story.` : 'Fashion video.',
        motionDesc + '.',
        story_context.mood?.length ? `Mood: ${story_context.mood.join(', ')}.` : '',
        story_context.tone ? `Brand aesthetic: ${story_context.tone}.` : '',
        'Professional quality, smooth motion, editorial feel.',
      ].filter(Boolean);
      fullPrompt = parts.join(' ');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fal.subscribe('fal-ai/kling-video/v3/standard', {
      input: {
        prompt: fullPrompt,
        image_url,
        duration: 5,
      },
    } as any);

    const videoUrl = result.data?.video?.url || result.data?.video_url || null;

    // Auto-persist to Supabase Storage if collectionPlanId provided
    if (collectionPlanId && videoUrl) {
      try {
        const { publicUrl, assetId } = await persistAsset({
          collectionPlanId,
          assetType: 'video',
          name: `Fashion Video — ${motion_type || 'editorial'}`,
          sourceUrl: videoUrl,
          phase: 'design',
          metadata: { prompt: fullPrompt, motion_type, fal_request_id: result.requestId },
          uploadedBy: user.id,
        });
        return NextResponse.json({
          video_url: publicUrl,
          assetId,
          originalUrl: videoUrl,
          requestId: result.requestId,
          persisted: true,
        });
      } catch (err) {
        console.error('[Video] Persist failed:', err);
      }
    }

    return NextResponse.json({
      video_url: videoUrl,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Video generation error:', error);
    const message = error instanceof Error ? error.message : 'Video generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
