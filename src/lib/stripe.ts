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

// Convenience alias for route handlers
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripeServer() as any)[prop];
  },
});

// Plan configuration
export const PLANS = {
  free: {
    name: 'Free',
    nameEs: 'Gratis',
    price: 0,
    priceAnnual: 0,
    limits: {
      collections: 1,
      aiGenerations: 10,
      users: 1,
      exportEnabled: false,
      trendsEnabled: false,
      goToMarketEnabled: false,
    },
  },
  pro: {
    name: 'Pro',
    nameEs: 'Pro',
    price: 49,
    priceAnnual: 39,
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    limits: {
      collections: -1, // unlimited
      aiGenerations: 100,
      users: 3,
      exportEnabled: true,
      trendsEnabled: true,
      goToMarketEnabled: false,
    },
  },
  business: {
    name: 'Business',
    nameEs: 'Business',
    price: 299,
    priceAnnual: 199,
    stripePriceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID,
    limits: {
      collections: -1,
      aiGenerations: 500,
      users: 10,
      exportEnabled: true,
      trendsEnabled: true,
      goToMarketEnabled: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    nameEs: 'Enterprise',
    price: 499,
    priceAnnual: 399,
    stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
    limits: {
      collections: -1,
      aiGenerations: -1, // unlimited
      users: -1,
      exportEnabled: true,
      trendsEnabled: true,
      goToMarketEnabled: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(plan: PlanId) {
  return PLANS[plan].limits;
}
