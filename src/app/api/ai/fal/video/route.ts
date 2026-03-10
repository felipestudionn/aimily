import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { image_url, motion_type, prompt } = await req.json();

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fal.subscribe('fal-ai/kling-video/v3/standard', {
      input: {
        prompt: prompt || `Fashion video. ${motionDesc}. Professional quality, smooth motion.`,
        image_url,
        duration: 5,
      },
    } as any);

    return NextResponse.json({
      video_url: result.data?.video?.url || result.data?.video_url || null,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Video generation error:', error);
    const message = error instanceof Error ? error.message : 'Video generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
