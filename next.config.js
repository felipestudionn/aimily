const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      { source: '/meet-aimily', destination: '/', permanent: true },
      { source: '/how-it-works', destination: '/', permanent: true },
      { source: '/discover', destination: '/', permanent: true },
      { source: '/pricing', destination: '/#pricing', permanent: true },
      /* Zombie routes from the pre-2026-04-15 cleanup — survived
         /trends, /categories/*, /svg-test, /analytics, /creative-space.
         None are linked from the active sidebar; they shipped with
         hardcoded EN strings and stale data. Redirect to the home
         to catch any lingering external link instead of letting the
         page render a stale UI. */
      { source: '/creative-space', destination: '/my-collections', permanent: true },
      { source: '/trends', destination: '/my-collections', permanent: true },
      { source: '/svg-test', destination: '/my-collections', permanent: true },
      { source: '/analytics', destination: '/my-collections', permanent: true },
      { source: '/categories', destination: '/my-collections', permanent: true },
      { source: '/categories/:path*', destination: '/my-collections', permanent: true },
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://*.posthog.com https://eu.i.posthog.com https://us.i.posthog.com https://va.vercel-scripts.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.fal.ai https://api.perplexity.ai https://api.stripe.com https://*.vercel.app https://*.vercel-insights.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.posthog.com https://eu.i.posthog.com https://us.i.posthog.com",
              "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
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
