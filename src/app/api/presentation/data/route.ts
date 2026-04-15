/* ═══════════════════════════════════════════════════════════════════
   GET /api/presentation/data?collectionId=<uuid>

   Returns slide-shaped data for the Presentation deck. Wraps the
   server-side loadPresentationData() so the deck (a client component)
   can fetch once, cache, and hydrate each template with real CIS data
   instead of editorial placeholders.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { loadPresentationData } from '@/lib/presentation/load-presentation-data';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const collectionId = req.nextUrl.searchParams.get('collectionId');
  if (!collectionId) {
    return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 });
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  try {
    const data = await loadPresentationData(collectionId);
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/presentation/data] failed:', e);
    return NextResponse.json({ error: 'Failed to load presentation data' }, { status: 500 });
  }
}
