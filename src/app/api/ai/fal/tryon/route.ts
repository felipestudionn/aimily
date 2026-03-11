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

    const { garment_image_url, model_image_url, category } = await req.json();

    if (!garment_image_url) {
      return NextResponse.json({ error: 'garment_image_url is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fal.subscribe('fal-ai/fashn/tryon/v1.6', {
      input: {
        garment_image: garment_image_url,
        model_image: model_image_url || undefined,
        category: category || 'auto',
      },
    } as any);

    return NextResponse.json({
      images: result.data?.output ? [{ url: result.data.output }] : result.data?.images || [],
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('FASHN try-on error:', error);
    const message = error instanceof Error ? error.message : 'Try-on generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
