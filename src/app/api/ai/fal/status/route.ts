import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY || '' });

export async function GET(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get('requestId');
    const endpointId = req.nextUrl.searchParams.get('endpointId');

    if (!requestId || !endpointId) {
      return NextResponse.json({ error: 'requestId and endpointId are required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = await (fal.queue as any).status(endpointId, { requestId });

    return NextResponse.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    const message = error instanceof Error ? error.message : 'Status check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
