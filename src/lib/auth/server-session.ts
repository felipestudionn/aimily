/**
 * Server-side session loader for React Server Components.
 *
 * The browser-side AuthContext used to call `getSession()` on mount, which
 * forced every authenticated route through a "loading=true → resolved"
 * flash because the HTML always arrived without auth state. SSR'ing the
 * user removes that flash: the first paint already knows who's logged in.
 *
 * Always call `getUser()` (which revalidates the JWT against Supabase) and
 * never `getSession()` from a Server Component — `getSession()` returns
 * whatever's in the cookie without verifying it, which is unsafe for
 * server-side auth decisions. Auth contracts elsewhere in the app rely on
 * this distinction.
 *
 * Returns `{ user: null }` for any error case (no cookie, expired token,
 * Supabase down). Callers decide whether that's a redirect or a render of
 * the unauthenticated state.
 */
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export interface ServerSession {
  user: User | null;
}

export async function getServerSession(): Promise<ServerSession> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null };
    return { user };
  } catch {
    return { user: null };
  }
}
