import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getUserProducts } from '@/lib/auth/getUserProducts';

export const runtime = 'nodejs';

/**
 * GET /api/user/products
 *
 * Returns the products the authenticated user has access to plus their
 * active IDs for direct redirect. Used by the top-bar product switcher
 * to render conditionally — switcher only appears when the user has
 * BOTH Aimily 360 (a collection) AND Aimily Studio (a project).
 */
export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const products = await getUserProducts(user!.id);
  return NextResponse.json(products);
}
