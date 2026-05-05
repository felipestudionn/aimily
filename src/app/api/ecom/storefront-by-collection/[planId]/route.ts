/* GET /api/ecom/storefront-by-collection/[planId]
   Returns the storefront row for a collection plan (1-to-1), or 404 if not yet published. */
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { loadStorefrontByCollectionId } from '@/lib/storefront/load-storefront';

interface Ctx { params: Promise<{ planId: string }>; }

export async function GET(_: Request, ctx: Ctx) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { planId } = await ctx.params;
  const ownership = await verifyCollectionOwnership(user.id, planId, 'view_all');
  if (!ownership.authorized) return ownership.error;

  const storefront = await loadStorefrontByCollectionId(planId);
  if (!storefront) {
    return NextResponse.json({ storefront: null });
  }

  return NextResponse.json({ storefront });
}
