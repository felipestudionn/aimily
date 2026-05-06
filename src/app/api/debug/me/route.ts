/**
 * GET /api/debug/me
 *
 * TEMPORARY: investigates the gap between auth.users.raw_user_meta_data
 * (which has language='es') and the user.user_metadata that
 * /api/planner/create reads when capturing seed CIS rows.
 *
 * Returns three views of the same user:
 *   - ssr   : what supabase.auth.getUser() exposes from the SSR client
 *   - admin : what supabaseAdmin.auth.admin.getUserById returns
 *   - db    : raw SELECT from auth.users.raw_user_meta_data
 *
 * Gate: only Felipe (hardcoded user_id) — to delete after debugging.
 */
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_USER_ID = 'd70fcd1d-e480-4ac8-b75e-d37ab936ef84';

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  if (user.id !== ALLOWED_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // SSR view — what /api/planner/create sees
  const ssr = {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
    user_metadata_keys: Object.keys(user.user_metadata || {}),
    user_metadata_language: user.user_metadata?.language ?? null,
    user_metadata_language_typeof: typeof user.user_metadata?.language,
  };

  // Admin view — what we'd get if we re-fetched fresh from auth API
  let admin: Record<string, unknown> = { error: 'not_fetched' };
  try {
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    admin = {
      id: adminUser?.user?.id,
      user_metadata: adminUser?.user?.user_metadata,
      user_metadata_keys: Object.keys(adminUser?.user?.user_metadata || {}),
      user_metadata_language: (adminUser?.user?.user_metadata as Record<string, unknown> | undefined)?.language ?? null,
    };
  } catch (e) {
    admin = { error: e instanceof Error ? e.message : String(e) };
  }

  // DB view — raw SELECT
  let db: Record<string, unknown> = { error: 'not_fetched' };
  try {
    const { data } = await supabaseAdmin
      .schema('auth' as never)
      .from('users')
      .select('id, email, raw_user_meta_data')
      .eq('id', user.id)
      .single();
    db = {
      id: (data as Record<string, unknown> | null)?.id,
      raw_user_meta_data: (data as Record<string, unknown> | null)?.raw_user_meta_data,
    };
  } catch (e) {
    db = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ ssr, admin, db });
}
