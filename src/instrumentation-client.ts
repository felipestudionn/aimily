import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed',
    'Non-Error promise rejection captured',
  ],
});

/**
 * Required by Sentry SDK v10+ for navigation transaction instrumentation
 * in the App Router. Without this export, soft navigations are not traced.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
