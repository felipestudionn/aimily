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

// Plan configuration — v5 (Apr 2026)
// All plans get the SAME top-quality models. Differentiation is by quantity
// (imagery generations, seats), not by quality or feature gating that limits
// creativity. Brands and collections are unlimited on every plan.
//
// Imagery = AI image/video generations only (sketches, colorize, editorials,
// still-life, try-on, brand-model, brand-references, Kling video). Text
// generation is unlimited on every plan because its real cost is negligible
// (Haiku $0.001-$0.008/call, Gemini $0.0007/call).
export const PLANS = {
  trial: {
    name: 'Trial',
    nameEs: 'Prueba',
    price: 0,
    priceAnnual: 0,
    limits: {
      collections: -1,
      imageryGenerations: 200,
      users: 1,
      exportEnabled: true,
      aiVideoEnabled: false,
      apiAccessEnabled: false,
      ssoEnabled: false,
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
      collections: -1,
      imageryGenerations: 200,
      users: 1,
      exportEnabled: true,
      aiVideoEnabled: false,
      apiAccessEnabled: false,
      ssoEnabled: false,
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
      collections: -1,
      imageryGenerations: 1000,
      users: 5,
      exportEnabled: true,
      aiVideoEnabled: true,
      apiAccessEnabled: false,
      ssoEnabled: false,
    },
  },
  professional_max: {
    name: 'Professional Max',
    nameEs: 'Professional Max',
    price: 1499,
    priceAnnual: 1199,
    stripePriceId: process.env.STRIPE_PRO_MAX_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PRO_MAX_ANNUAL_PRICE_ID,
    limits: {
      collections: -1,
      imageryGenerations: 5000,
      users: 25,
      exportEnabled: true,
      aiVideoEnabled: true,
      apiAccessEnabled: false,
      ssoEnabled: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    nameEs: 'Enterprise',
    price: 3000, // floor; custom pricing
    priceAnnual: 3000,
    // Enterprise uses custom Stripe invoicing, not self-serve checkout
    limits: {
      collections: -1,
      imageryGenerations: -1, // unlimited
      users: -1,
      exportEnabled: true,
      aiVideoEnabled: true,
      apiAccessEnabled: true,
      ssoEnabled: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(plan: PlanId) {
  return PLANS[plan].limits;
}

// Helper: is this a paid self-serve plan?
export function isSelfServePlan(plan: PlanId): boolean {
  return plan === 'starter' || plan === 'professional' || plan === 'professional_max';
}

// Aimily Credits packs — one-time top-up for imagery generation
// Each pack adds N imagery to the user's `imagery_credits.balance` (no expiry).
// Packs are deliberately priced higher per imagery than the next plan tier so
// 2-3 months of pack usage signals an upgrade.
export const AIMILY_CREDITS_PACKS = {
  pack_50: {
    name: '+50 Aimily Credits',
    imagery: 50,
    price: 29,
    stripePriceId: process.env.STRIPE_CREDITS_PACK_50_PRICE_ID,
  },
  pack_250: {
    name: '+250 Aimily Credits',
    imagery: 250,
    price: 119,
    stripePriceId: process.env.STRIPE_CREDITS_PACK_250_PRICE_ID,
  },
  pack_1000: {
    name: '+1000 Aimily Credits',
    imagery: 1000,
    price: 399,
    stripePriceId: process.env.STRIPE_CREDITS_PACK_1000_PRICE_ID,
  },
} as const;

export type CreditPackId = keyof typeof AIMILY_CREDITS_PACKS;
