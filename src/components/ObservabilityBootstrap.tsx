'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Centralised observability bootstrap. Mounted once in the root layout.
 * Initialises BOTH Sentry (browser SDK) and PostHog explicitly, instead of
 * relying on Next.js auto-loading instrumentation-client.ts (which proved
 * unreliable in our setup with @sentry/nextjs v10 + Next.js 16).
 *
 * Both inits are no-ops when the corresponding env var is missing.
 */
export function ObservabilityBootstrap() {
  const { user } = useAuth();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    // ── PostHog ───────────────────────────────────────────────────────
    (async () => {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return;
      try {
        const ph = (await import('posthog-js')).default;
        ph.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: 'history_change',
          capture_pageleave: true,
          autocapture: true,
        });
        // Expose for debugging + identify hooks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).posthog = ph;
      } catch (err) {
        console.warn('[observability] PostHog init failed:', err);
      }
    })();

    // ── Sentry ────────────────────────────────────────────────────────
    (async () => {
      const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
      if (!dsn) return;
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.init({
          dsn,
          enabled: true,
          tracesSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          replaysSessionSampleRate: 0,
          integrations: [
            Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
          ],
          ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed',
            'Non-Error promise rejection captured',
          ],
        });
      } catch (err) {
        console.warn('[observability] Sentry init failed:', err);
      }
    })();
  }, []);

  // Identify on auth changes
  useEffect(() => {
    (async () => {
      if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
      try {
        const ph = (await import('posthog-js')).default;
        if (user?.id) {
          ph.identify(user.id, { email: user.email });
        } else {
          ph.reset();
        }
      } catch {
        /* never throw on telemetry */
      }
    })();

    (async () => {
      if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
      try {
        const Sentry = await import('@sentry/nextjs');
        if (user?.id) {
          Sentry.setUser({ id: user.id, email: user.email });
        } else {
          Sentry.setUser(null);
        }
      } catch {
        /* never throw on telemetry */
      }
    })();
  }, [user?.id, user?.email]);

  return null;
}
