/**
 * POST /api/strategy/buy-strategy-archetypes
 *
 * Static curated list — instant load, no AI call. Returns the 4
 * buy-strategy archetypes (A/B/C/D) the user picks from in the Setup
 * workspace kickoff phase.
 *
 * Mirrors POST /api/sales-strategy-archetypes (Block 4) and POST
 * /api/scenarios-archetypes (Block 2). Authenticated tenant member can
 * call it; viewer role is enough.
 *
 * Body:    { tenant_id: string }
 * Returns: { archetypes: BuyStrategyArchetype[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { BUY_STRATEGY_ARCHETYPES } from '@/lib/strategy/sales-archetypes';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { tenant_id?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantId = body?.tenant_id;
  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantId });
  if (!access.ok) return access.response;

  return NextResponse.json({ archetypes: BUY_STRATEGY_ARCHETYPES });
}
