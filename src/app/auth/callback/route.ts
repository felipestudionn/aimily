import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWelcomeEmail } from '@/lib/transactional-emails';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/my-collections';
  // Open-redirect guard: only allow same-origin paths.
  // Reject protocol-relative ("//evil.com"), absolute URLs ("https://evil.com"),
  // and anything that doesn't start with "/".
  const next = /^\/(?!\/)/.test(rawNext) ? rawNext : '/my-collections';

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
        // Welcome email — only on the very first signup confirmation per user.
        // Idempotent via a `welcome_email_sent_at` column on subscriptions.
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const { data: sub } = await supabaseAdmin
              .from('subscriptions')
              .select('welcome_email_sent_at')
              .eq('user_id', user.id)
              .single();
            if (!sub?.welcome_email_sent_at) {
              await sendWelcomeEmail({
                to: user.email,
                name: (user.user_metadata?.full_name as string | undefined) || undefined,
              });
              await supabaseAdmin
                .from('subscriptions')
                .update({ welcome_email_sent_at: new Date().toISOString() })
                .eq('user_id', user.id);
            }
          }
        } catch (err) {
          console.error('[auth/callback] welcome email error:', err);
          // Never block signup on email error
        }
        // Pass signup=1 so the client-side analytics handler can fire
        // SIGNUP_COMPLETED. The query is stripped from the URL after
        // the toast/track effect runs.
        return NextResponse.redirect(`${origin}/my-collections?signup=1`);
      }

      // Default: redirect to next param or my-collections
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange failed or no code, redirect to home with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`);
}
