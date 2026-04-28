/**
 * PostHog event helpers. The actual SDK init lives in ObservabilityBootstrap.
 * `track()` reads window.posthog (set by the bootstrap) and is a no-op when
 * the SDK isn't available — never throws.
 */

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ph = (window as any).posthog;
  if (!ph || typeof ph.capture !== 'function') return;
  try {
    ph.capture(event, properties);
  } catch {
    /* never throw on telemetry */
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
