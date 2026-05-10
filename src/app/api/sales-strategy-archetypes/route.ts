/**
 * POST /api/sales-strategy-archetypes
 *
 * Sprint B-pre · 04.0 Estrategia de Venta · KICK-OFF.
 *
 * Static-curated lookup — NO AI call. Returns the 3 sales-strategy
 * archetypes (A · Brand DTC · B · Creator brand · C · Made-to-Order)
 * with their full spec (narrative, levers, marketing budget mix,
 * cadence, kpis, benchmarks, cascade defaults).
 *
 * Same return for every collection · loads instant.
 *
 * Body:    { collectionPlanId: string, language?: string }
 * Returns: { result: { archetypes: SalesArchetype[] } }
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  verifyCollectionOwnership,
} from '@/lib/api-auth';
import { SALES_ARCHETYPES } from '@/lib/sales-strategy/archetypes';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const collectionPlanId = body?.collectionPlanId as string | undefined;

  if (!collectionPlanId) {
    return NextResponse.json(
      { error: 'collectionPlanId is required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  return NextResponse.json({ result: { archetypes: SALES_ARCHETYPES } });
}
