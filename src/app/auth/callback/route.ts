import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/my-collections';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine redirect based on the type of auth event
      const type = searchParams.get('type');

      if (type === 'recovery') {
        // Password reset flow — redirect to reset-password page
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      if (type === 'signup') {
        // Email confirmation — redirect to collections
        return NextResponse.redirect(`${origin}/my-collections`);
      }

      // Default: redirect to next param or my-collections
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange failed or no code, redirect to home with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`);
}
