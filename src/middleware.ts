import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { locales } from '@/i18n/config';
import { extractStorefrontHost } from '@/lib/storefront/host';

const intlMiddleware = createIntlMiddleware(routing);

// Marketing pages now live under [locale]/. They redirect bare paths
// (/, /contact, ...) to /[locale]/... and emit hreflang Link headers.
// All marketing routing is delegated to next-intl — no auth check.
const MARKETING_BARE_PATHS = ['', '/contact', '/trust', '/privacy', '/terms', '/cookies'];
// Public marketing pages that LIVE under [locale]/ but DON'T need a bare-path
// redirect (because there's an authenticated route at the same name). Anyone
// linking to /[locale]/studio must do so with the locale prefix explicitly.
// This avoids the routing conflict between (app)/studio (authenticated
// dashboard at /studio) and [locale]/studio (public landing at /es/studio).
const MARKETING_LOCALE_ONLY_PATHS = ['/studio', '/strategy', '/in-season'];

// Marketing path PREFIXES — content-driven sub-trees (workflows, vs, etc.)
// added in Wave 1+. Anything under these is public and should be delegated
// to next-intl regardless of auth state.
const MARKETING_PREFIXES = ['/workflows', '/vs', '/learn', '/for', '/compare', '/how-to', '/student'];

function isMarketingPath(pathname: string): boolean {
  // Bare paths get caught by next-intl + redirected to /[locale]
  if (MARKETING_BARE_PATHS.includes(pathname === '/' ? '' : pathname)) return true;
  // Bare prefix paths (/workflows/foo, /vs/bar — no locale yet)
  if (MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // Locale-prefixed marketing paths
  for (const locale of locales) {
    if (pathname === `/${locale}`) return true;
    for (const mp of MARKETING_BARE_PATHS) {
      if (mp && pathname === `/${locale}${mp}`) return true;
    }
    // Locale + content prefix (/en/workflows/brand-dna, /es/vs/centric, …)
    if (MARKETING_PREFIXES.some((p) => pathname === `/${locale}${p}` || pathname.startsWith(`/${locale}${p}/`))) {
      return true;
    }
    // Locale-only marketing paths (no bare-path equivalent — avoids conflict
    // with authenticated routes that own the bare path).
    for (const mp of MARKETING_LOCALE_ONLY_PATHS) {
      if (pathname === `/${locale}${mp}` || pathname.startsWith(`/${locale}${mp}/`)) return true;
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
  // SEO files (now go through middleware so storefront wildcard rewrite works;
  // these allow aimily.app/sitemap.xml etc. to keep serving from src/app/sitemap.ts)
  '/sitemap.xml',
  '/robots.txt',
  // Per-storefront dynamic OG image (rewritten via wildcard host)
  '/og.png',
  // Aimily app static icons (Next.js src/app/icon.png + apple-icon.png)
  '/icon.png',
  '/apple-icon.png',
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
  '/images/',  // public/ static images (PNGs aren't in the matcher exclusion
              // because storefronts need /og.png routed through middleware;
              // without this prefix, anonymous /images/aimily-logo-*.png
              // requests redirect to / and the public landing renders a
              // broken image in incognito).
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
  '/api/promo/',             // Public launch-promo counter for pricing page
  '/api/academic-domains/',  // Public list of supported universities (Student page)
];

export async function middleware(request: NextRequest) {
  const { pathname: rawPath } = request.nextUrl;
  const host = request.headers.get('host') ?? '';

  // ── Ecom storefront routing (BEFORE anything else) ──
  // *.aimily.shop and custom domains rewrite to the (storefront) route group.
  // Storefronts are 100% public — no auth, no rate-limit, no Supabase JWT validate.
  // The page resolves the host → storefront row in Supabase via service role.
  const storefrontHost = extractStorefrontHost(host);
  if (storefrontHost && !rawPath.startsWith('/storefront/')) {
    const url = request.nextUrl.clone();
    // encodeURIComponent so ports (`:`) and any future special chars don't
    // break the dynamic [host] segment matching in the route group.
    url.pathname = `/storefront/${encodeURIComponent(storefrontHost)}${rawPath === '/' ? '' : rawPath}`;
    return NextResponse.rewrite(url);
  }

  // Block direct access to /storefront/* from non-storefront hosts
  // (the route group exists only to be reachable via the rewrite above)
  if (rawPath.startsWith('/storefront/') && !storefrontHost) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
    // Note: sitemap.xml/robots.txt/og.png are NOT excluded — storefronts need them
    // routed through middleware so the wildcard host rewrite can deliver per-host
    // SEO assets. The aimily.app sitemap/robots are served by their own routes
    // and the middleware's marketing-path / public-page checks let them through.
    // Note: png/sitemap.xml/robots.txt/og.png are NOT excluded — storefronts
    // need them routed through middleware so the wildcard host rewrite can
    // deliver per-host SEO assets. The aimily.app sitemap/icons are served
    // by their own routes (publicPageRoutes lets them through unprotected).
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|llms.txt|llms-full.txt|ed97cba5c7d058f0d68f9c41b0db19e7\\.txt|sw.js|monitoring|\\.well-known|.*\\.(?:svg|jpg|jpeg|gif|webp|ico|json|woff2?|ttf)$).*)',
  ],
};
