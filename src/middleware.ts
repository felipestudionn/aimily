import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Page routes that don't require authentication (exact match)
const publicPageRoutes = [
  '/',
  '/discover',
  '/contact',
  '/pricing',
  '/terms',
  '/privacy',
  '/cookies',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/confirm',
  '/meet-aimily',
  '/how-it-works',
  '/video-reel',
  '/trust',
];

// Page routes that don't require auth (prefix match). Used by:
// - /p/[token]                — public shared-presentation links
// - /presentation/export/[id] — internal PDF-export route hit by
//                               the /api/presentation/export Function's
//                               headless Chrome. Auth is enforced by
//                               the signed JWT in ?token, validated
//                               inside the page component.
const publicPagePrefixes = [
  '/p/',
  '/presentation/export/',
  '/tech-pack/export/',
];

// API routes that DON'T require auth (webhooks, cron with secret, OAuth callbacks)
const publicApiPrefixes = [
  '/api/webhooks/',      // Stripe webhook (verifies signature internally)
  '/api/cron/',          // Cron jobs (verify CRON_SECRET internally)
  '/api/auth/',          // OAuth callbacks (Pinterest, etc.)
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate JWT via Supabase Auth (NOT getSession which skips validation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── API route protection ──
  if (pathname.startsWith('/api/')) {
    const isPublicApi = publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
    if (!isPublicApi && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return supabaseResponse;
  }

  // ── Page route protection ──
  const isPublicPage =
    publicPageRoutes.some((route) => pathname === route) ||
    publicPagePrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
