import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

fal.config({ credentials: process.env.FAL_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const { image_url, prompt, background, width, height, story_context } = await req.json();

    if (!image_url && !prompt) {
      return NextResponse.json({ error: 'image_url or prompt is required' }, { status: 400 });
    }

    const promptParts = [
      prompt || 'Professional product photography',
    ];
    if (story_context) {
      promptParts.push(`Story context: "${story_context.name}" — ${story_context.tone || ''}`);
      if (story_context.brand_personality) promptParts.push(`Brand aesthetic: ${story_context.brand_personality}`);
    }
    promptParts.push(background ? `Background: ${background}` : 'Clean white studio background');
    promptParts.push('High resolution, commercial quality, fashion product shot');
    promptParts.push('Sharp focus, professional lighting, e-commerce ready');

    const fullPrompt = promptParts.join('. ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: fullPrompt,
      num_images: 2,
      image_size: { width: width || 1024, height: height || 1024 },
    };

    if (image_url) {
      input.image_url = image_url;
      input.strength = 0.75;
    }

    const result = await fal.subscribe('fal-ai/flux-2-pro', { input } as any);

    return NextResponse.json({
      images: result.data?.images || [],
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Product render error:', error);
    const message = error instanceof Error ? error.message : 'Product render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
