const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      // Legacy marketing aliases → home in English (avoids the
      // /pre-Wave-0-path → / → /en double-hop the middleware would do)
      { source: '/meet-aimily', destination: '/en', permanent: true },
      { source: '/how-it-works', destination: '/en', permanent: true },
      { source: '/discover', destination: '/en', permanent: true },
      { source: '/pricing', destination: '/en#pricing', permanent: true },
      /* Zombie routes from the pre-2026-04-15 cleanup — survived
         /trends, /categories/*, /svg-test, /analytics, /creative-space.
         None are linked from the active sidebar; they shipped with
         hardcoded EN strings and stale data. Redirect to /my-collections
         (authenticated) to catch any lingering external link instead of
         letting the page render a stale UI. */
      { source: '/creative-space', destination: '/my-collections', permanent: true },
      { source: '/trends', destination: '/my-collections', permanent: true },
      { source: '/svg-test', destination: '/my-collections', permanent: true },
      { source: '/analytics', destination: '/my-collections', permanent: true },
      { source: '/categories', destination: '/my-collections', permanent: true },
      { source: '/categories/:path*', destination: '/my-collections', permanent: true },
    ];
  },
  // Felipe 2026-05-19 noche · Sprint A rename Strategy → In-Season.
  // Source files YA MOVIDOS: src/app/(app)/strategy/ → in-season/ y
  // src/app/api/strategy/ → in-season/. /in-season/* es la canónica
  // ahora. Mantenemos rewrites de /strategy/* → /in-season/* para que
  // los bookmarks externos sigan funcionando (back-compat). El siguiente
  // sprint (DB rename) renombrará strategy_* tables → in_season_*.
  async rewrites() {
    return [
      { source: '/strategy/:path*', destination: '/in-season/:path*' },
      { source: '/api/strategy/:path*', destination: '/api/in-season/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://*.posthog.com https://eu.i.posthog.com https://us.i.posthog.com https://va.vercel-scripts.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.googleadservices.com https://www.googleadservices.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              // media-src controls <video> and <audio> sources. Without it the
              // browser falls back to default-src 'self' and blocks any external
              // media — Studio's generated videos live on Supabase Storage so
              // we must whitelist that origin (plus data: / blob: for any
              // in-page playback). Same permissive policy as img-src — video
              // sources are validated server-side per asset.
              "media-src 'self' data: blob: https: http:",
              "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://td.doubleclick.net https://*.googletagmanager.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Google Ads enhanced conversions POST to two endpoints:
              //   1. https://www.google.com/ccm/collect (cross-domain CCM)
              //   2. https://www.google.<TLD>/pagead/1p-conversion/<id> (first-party
              //      conversion ping — the TLD matches the user's COUNTRY, not the
              //      site domain). A user in Spain triggers google.es, a user in
              //      France triggers google.fr, etc.
              // Listing only google.com would silently drop conversions from every
              // non-US user — exactly the European cold-traffic we're paying for.
              // The list below covers the 9 locales we serve (en/es/fr/it/de/pt/nl/no/sv)
              // plus US (.com) and UK (.co.uk).
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.fal.ai https://api.perplexity.ai https://api.stripe.com https://*.vercel.app https://*.vercel-insights.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.posthog.com https://eu.i.posthog.com https://us.i.posthog.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google.com https://www.google.co.uk https://www.google.es https://www.google.fr https://www.google.it https://www.google.de https://www.google.pt https://www.google.nl https://www.google.se https://www.google.no https://www.google-analytics.com https://*.google-analytics.com https://*.googleadservices.com https://www.googleadservices.com https://*.g.doubleclick.net",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  // tunnelRoute disabled — was causing 405s on /?o=... requests when not
  // properly proxied. We can re-enable once Sentry+Next.js 16 stabilises.
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
