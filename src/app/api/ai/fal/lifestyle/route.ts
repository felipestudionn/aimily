import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { image_url, scene, prompt, width, height } = await req.json();

    if (!image_url && !prompt) {
      return NextResponse.json({ error: 'image_url or prompt is required' }, { status: 400 });
    }

    const sceneDescriptions: Record<string, string> = {
      street: 'Urban street style, city backdrop, golden hour lighting',
      cafe: 'Cozy café terrace, warm ambient lighting, European style',
      beach: 'Sandy beach, ocean waves, bright natural sunlight',
      office: 'Modern minimalist office, clean lines, professional setting',
      runway: 'Fashion runway, dramatic spotlight, editorial atmosphere',
      nature: 'Lush green nature, soft natural light, outdoor editorial',
      urban: 'Raw urban environment, concrete and steel, street fashion',
      'white-studio': 'Clean white studio, professional lighting setup',
      marble: 'Elegant marble backdrop, luxury fashion editorial',
      gradient: 'Smooth gradient background, modern fashion photography',
    };

    const sceneDesc = sceneDescriptions[scene] || scene || 'Editorial lifestyle setting';

    const fullPrompt = [
      prompt || 'Fashion lifestyle editorial photograph',
      sceneDesc,
      'Professional fashion photography, high-end editorial quality',
      'Natural pose, aspirational lifestyle, magazine-worthy',
    ].join('. ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: fullPrompt,
      num_images: 2,
      image_size: { width: width || 1024, height: height || 1024 },
    };

    if (image_url) {
      input.image_url = image_url;
      input.strength = 0.65;
    }

    const result = await fal.subscribe('fal-ai/flux-2-pro', { input } as any);

    return NextResponse.json({
      images: result.data?.images || [],
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Lifestyle render error:', error);
    const message = error instanceof Error ? error.message : 'Lifestyle render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
