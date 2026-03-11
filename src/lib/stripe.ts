import Stripe from 'stripe';

// Lazy init — avoids crash when STRIPE_SECRET_KEY is missing at build time
let _stripe: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover', typescript: true });
  }
  return _stripe;
}

// Admin bypass — owner accounts with permanent enterprise access
export const ADMIN_EMAILS = ['felipe.studionn@gmail.com'];

export function isAdminUser(email: string | undefined): boolean {
  return ADMIN_EMAILS.includes(email || '');
}

// Convenience alias for route handlers
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripeServer() as any)[prop];
  },
});

// Plan configuration — v4 (Mar 2026)
// Trial: 14 days full access (professional level), no card required
// After trial: read-only until plan selected
export const PLANS = {
  trial: {
    name: 'Trial',
    nameEs: 'Prueba',
    price: 0,
    priceAnnual: 0,
    limits: {
      collections: -1,
      aiGenerations: 250,
      users: 10,
      exportEnabled: true,
      trendsEnabled: true,
      trendAlertsEnabled: true,
      goToMarketEnabled: true,
      aiModelsEnabled: true,
      aiVideoEnabled: true,
      collaborationEnabled: true,
      rolesEnabled: true,
      multiBrandEnabled: false,
      lookbookEnabled: true,
      techPackPdfEnabled: true,
      ssoEnabled: false,
      apiAccessEnabled: false,
    },
  },
  starter: {
    name: 'Starter',
    nameEs: 'Starter',
    price: 199,
    priceAnnual: 159,
    stripePriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    limits: {
      collections: 2,
      aiGenerations: 100,
      users: 1,
      exportEnabled: true,
      trendsEnabled: true,
      trendAlertsEnabled: false,
      goToMarketEnabled: true,
      aiModelsEnabled: true,
      aiVideoEnabled: true,
      collaborationEnabled: false,
      rolesEnabled: false,
      multiBrandEnabled: false,
      lookbookEnabled: true,
      techPackPdfEnabled: true,
      ssoEnabled: false,
      apiAccessEnabled: false,
    },
  },
  professional: {
    name: 'Professional',
    nameEs: 'Professional',
    price: 599,
    priceAnnual: 479,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
    limits: {
      collections: -1, // unlimited
      aiGenerations: 500,
      users: 10,
      exportEnabled: true,
      trendsEnabled: true,
      trendAlertsEnabled: true,
      goToMarketEnabled: true,
      aiModelsEnabled: true,
      aiVideoEnabled: true,
      collaborationEnabled: true,
      rolesEnabled: true,
      multiBrandEnabled: true,
      lookbookEnabled: true,
      techPackPdfEnabled: true,
      ssoEnabled: false,
      apiAccessEnabled: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    nameEs: 'Enterprise',
    price: 1500, // minimum, custom pricing
    priceAnnual: 1500,
    // Enterprise uses custom Stripe invoicing, not self-serve checkout
    limits: {
      collections: -1,
      aiGenerations: -1, // unlimited
      users: -1, // unlimited
      exportEnabled: true,
      trendsEnabled: true,
      trendAlertsEnabled: true,
      goToMarketEnabled: true,
      aiModelsEnabled: true,
      aiVideoEnabled: true,
      collaborationEnabled: true,
      rolesEnabled: true,
      multiBrandEnabled: true,
      lookbookEnabled: true,
      techPackPdfEnabled: true,
      ssoEnabled: true,
      apiAccessEnabled: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(plan: PlanId) {
  return PLANS[plan].limits;
}

// Helper: is this a paid self-serve plan?
export function isSelfServePlan(plan: PlanId): boolean {
  return plan === 'starter' || plan === 'professional';
}
