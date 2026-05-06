/**
 * GET /api/derived-setup-data?planId=<uuid>
 *
 * Returns the derived merchandising snapshot for a collection. This is
 * the client-side counterpart to the server-side `loadDerivedSetupData`
 * loader. Computed on every read — there is no cache.
 *
 * Auth: requires an authenticated user with view_all access to the plan
 * (owner or any team seat with collection access).
 *
 * Response: DerivedSetupData (see src/lib/derive-setup-data.ts) — every
 * field optional, consumers must handle absent values.
 *
 * Replaces consumers that used to read `collection_plans.setup_data` as
 * a poorly-maintained cache. See onboarding lifecycle audit (2026-05-06).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { loadDerivedSetupData } from '@/lib/derive-setup-data';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const planId = req.nextUrl.searchParams.get('planId');
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
  if (!authorized) return ownerError;

  const derived = await loadDerivedSetupData(planId);
  return NextResponse.json(derived);
}
