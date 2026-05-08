/**
 * POST /api/scenarios-archetypes
 *
 * Sprint B.1 (2026-05-08) · 02.1 Estrategia de Compra · KICK-OFF.
 *
 * Static-curated table lookup — NO AI call. Returns the 4 archetypes
 * (A · Cápsula · B · Colección Esencial · C · Apuesta Fuerte ·
 * D · Drops Escalonados) with 3 sampled brand benchmarks each from
 * the 10-deep curated pool. Same collection always sees the same
 * brands across reloads (deterministic seed = collectionPlanId);
 * different collections see different selections.
 *
 * The earlier Sonnet-driven endpoint hallucinated Y1 numbers and
 * founders ("Devota & Lomba 1974" was wrong — they founded 1986).
 * Editorial control + factual ground beat AI variety here. The user
 * gets consistency, instant load (~50ms), zero AI cost.
 *
 * Body:    { collectionPlanId: string, language?: string }
 * Returns: { result: { archetypes: ScenarioArchetype[] } }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  verifyCollectionOwnership,
} from '@/lib/api-auth';
import { resolveArchetypes } from '@/lib/scenarios-archetypes-table';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const collectionPlanId = body?.collectionPlanId as string | undefined;

  if (!collectionPlanId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const archetypes = resolveArchetypes(collectionPlanId);
  return NextResponse.json({ result: { archetypes } });
}
