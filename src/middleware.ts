import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = [
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
];

// Routes that should be completely skipped by middleware
const skipPaths = [
  '/api/webhooks/',
  '/api/cron/',
  '/api/auth/',
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use getSession() — it reads from storage without
  // validating the JWT. Always use getUser() which validates via Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Skip auth check for public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route
  );

  // Skip auth check for API routes that handle their own auth
  const isSkippedPath = skipPaths.some((path) => pathname.startsWith(path));

  // If not authenticated and trying to access a protected route, redirect to landing
  if (!user && !isPublicRoute && !isSkippedPath && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
