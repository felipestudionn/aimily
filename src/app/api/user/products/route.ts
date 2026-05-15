import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getUserProducts } from '@/lib/auth/getUserProducts';
import { ADMIN_EMAILS } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

/**
 * GET /api/user/products
 *
 * Returns the products the authenticated user has access to plus their
 * active IDs for direct redirect. Used by the top-bar product switcher
 * to render conditionally — switcher appears when the user has BOTH
 * products OR is an admin (admins see the switcher regardless).
 */
export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const products = await getUserProducts(user!.id);

  // Admin detection — admins see Studio in their nav even before they
  // create their first project. Mirrors the bypass logic in
  // /api/studio/generate and the server pages.
  const isAdminByEmail = ADMIN_EMAILS.includes(user!.email || '');
  let isAdminByDb = false;
  if (!isAdminByEmail) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('is_admin')
      .eq('user_id', user!.id)
      .maybeSingle();
    isAdminByDb = !!sub?.is_admin;
  }
  const isAdmin = isAdminByEmail || isAdminByDb;

  return NextResponse.json({
    ...products,
    isAdmin,
  });
}
