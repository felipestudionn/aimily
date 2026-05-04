import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { locales } from '@/i18n/config';

const intlMiddleware = createIntlMiddleware(routing);

// Marketing pages now live under [locale]/. They redirect bare paths
// (/, /contact, ...) to /[locale]/... and emit hreflang Link headers.
// All marketing routing is delegated to next-intl — no auth check.
const MARKETING_BARE_PATHS = ['', '/contact', '/trust', '/privacy', '/terms', '/cookies'];

function isMarketingPath(pathname: string): boolean {
  // Bare paths get caught by next-intl + redirected to /[locale]
  if (MARKETING_BARE_PATHS.includes(pathname === '/' ? '' : pathname)) return true;
  // Locale-prefixed marketing paths
  for (const locale of locales) {
    if (pathname === `/${locale}`) return true;
    for (const mp of MARKETING_BARE_PATHS) {
      if (mp && pathname === `/${locale}${mp}`) return true;
    }
  }
  return false;
}

// Page routes that don't require authentication (exact match). Marketing
// paths are now handled by next-intl (see isMarketingPath above) so this
// list keeps only auth + utility routes that live under (app)/.
const publicPageRoutes = [
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/confirm',
  '/video-reel',
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
  '/vendor/',  // Phase 5 vendor portal (token-gated read-only access)
];

// API routes that DON'T require auth (webhooks, cron with secret, OAuth callbacks)
const publicApiPrefixes = [
  '/api/webhooks/',          // Stripe webhook (verifies signature internally)
  '/api/cron/',              // Cron jobs (verify CRON_SECRET internally)
  '/api/auth/',              // OAuth callbacks (Pinterest, etc.)
  '/api/auth-email-hook',    // Supabase Send Email Hook (HMAC-SHA256 signature)
  '/api/chat-faq',           // Public FAQ chat — anyone can ask, per-IP rate limit
  '/api/vendor-portal/',     // Phase 5 vendor portal (token-validated internally)
  '/api/ai/translate',       // Phase 5 vendor translation (token-validated internally)
];

export async function middleware(request: NextRequest) {
  const { pathname: rawPath } = request.nextUrl;

  // ── Marketing pages: delegate to next-intl middleware
  // Handles /[locale] prefix injection, locale detection from
  // Accept-Language, sticky NEXT_LOCALE cookie, hreflang Link headers.
  // No Supabase auth or rate-limit needed — marketing is fully public.
  if (isMarketingPath(rawPath)) {
    return intlMiddleware(request);
  }

  // ── Rate limit AI endpoints by IP — first line of defence before any auth lookup
  if (rawPath.startsWith('/api/ai/') || rawPath.startsWith('/api/billing/checkout')) {
    const ip = clientIp(request);
    // 30 calls / minute per IP across all AI routes (per warm instance — see rate-limit.ts)
    if (!rateLimit.allow(`${ip}:ai`, 30, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Slow down a bit and try again.' },
        { status: 429, headers: { 'Retry-After': '30' } },
      );
    }
  }

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

  const pathname = rawPath;

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
    // Skip the middleware on:
    //   - Next.js internals (_next/static, _next/image)
    //   - any path ending with a static-asset extension
    //   - root-level static files (manifest.json, robots.txt, sitemap.xml,
    //     monitoring tunnel, well-known)
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|llms.txt|sw.js|monitoring|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|xml|txt|woff2?|ttf)$).*)',
  ],
};
