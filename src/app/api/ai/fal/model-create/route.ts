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

    const { reference_image_url, gender, age_range, ethnicity, body_type, style_vibe } = await req.json();

    if (!reference_image_url) {
      return NextResponse.json({ error: 'reference_image_url is required' }, { status: 400 });
    }

    const prompt = [
      `Professional fashion model photo`,
      gender ? `Gender: ${gender}` : '',
      age_range ? `Age: ${age_range}` : '',
      ethnicity ? `Ethnicity: ${ethnicity}` : '',
      body_type ? `Body type: ${body_type}` : '',
      style_vibe ? `Style: ${style_vibe}` : '',
      'High fashion editorial quality, studio lighting',
    ].filter(Boolean).join('. ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fal.subscribe('fal-ai/flux-2-pro', {
      input: {
        prompt,
        image_url: reference_image_url,
        num_images: 2,
        image_size: { width: 768, height: 1024 },
      },
    } as any);

    return NextResponse.json({
      images: result.data?.images || [],
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Model create error:', error);
    const message = error instanceof Error ? error.message : 'Model creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
