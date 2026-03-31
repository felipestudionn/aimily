import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

/* ═══════════════════════════════════════════════════════════
   Vectorize — DEPRECATED: vectorization now runs client-side
   via imagetracerjs in the browser. This route is kept as
   a stub for backwards compatibility.
   ═══════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  return NextResponse.json(
    { error: 'Vectorization now runs client-side. Use imagetracerjs in the browser.' },
    { status: 410 }
  );
}
