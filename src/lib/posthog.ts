import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.opt_out_capturing();
      }
    },
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* never throw on telemetry */
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!initialized) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* never throw */
  }
}

export function reset() {
  if (typeof window === 'undefined') return;
  if (!initialized) return;
  try {
    posthog.reset();
  } catch {
    /* never throw */
  }
}

/** Funnel events the launch dashboard cares about. */
export const Events = {
  LANDING_VIEWED: 'landing_viewed',
  CTA_CLICKED: 'cta_clicked',
  AUTH_OPENED: 'auth_opened',
  SIGNUP_COMPLETED: 'signup_completed',
  COLLECTION_CREATED: 'collection_created',
  AI_GENERATION_STARTED: 'ai_generation_started',
  AI_GENERATION_SUCCEEDED: 'ai_generation_succeeded',
  AI_GENERATION_FAILED: 'ai_generation_failed',
  IMAGERY_LIMIT_REACHED: 'imagery_limit_reached',
  CHECKOUT_OPENED: 'checkout_opened',
  CREDIT_PACK_OPENED: 'credit_pack_opened',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
} as const;
