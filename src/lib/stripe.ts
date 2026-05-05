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

// Admin bypass — owner accounts with permanent enterprise access.
// Single canonical address: hello@aimily.app (Google Workspace inbox).
export const ADMIN_EMAILS = ['hello@aimily.app'];

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

// ────────────────────────────────────────────────────────────────────────
// Plan configuration — v6 (May 2026 rebrand)
// Renamed for clarity by ICP (target organization size):
//   • student    free  · for fashion students (12-month auto-verified)
//   • founder    €99   · solo founder bringing an idea to life
//   • team       €599  · 3-5 person startup (buyer + designer + marketing)
//   • team_pro   €1499 · 10-25 person consolidated brand
//   • enterprise custom · custom Stripe invoicing, not self-serve
//
// Imagery = AI image/video generations (sketches, colorize, editorials,
// still-life, try-on, brand-model, brand-references, Kling video). Text
// generation is unlimited on every plan because its cost is negligible.
// Brands and collections are unlimited on every plan.
// ────────────────────────────────────────────────────────────────────────
export const PLANS = {
  trial: {
    name: 'Trial',
    nameEs: 'Prueba',
    price: 0,
    priceAnnual: 0,
    limits: {
      collections: -1,
      imageryGenerations: 100,
      users: 1,
      exportEnabled: true,
      aiVideoEnabled: false,
      apiAccessEnabled: false,
      ssoEnabled: false,
    },
  },
  student: {
    name: 'Student',
    nameEs: 'Estudiante',
    price: 0,
    priceAnnual: 0,
    // Same limits as Founder; access auto-granted via academic email domain
    // for 12 months. Tracked in `student_verifications` table.
    limits: {
      collections: -1,
      imageryGenerations: 100,
      users: 1,
      exportEnabled: true,
      aiVideoEnabled: false,
      apiAccessEnabled: false,
      ssoEnabled: false,
    },
  },
  founder: {
    name: 'Founder',
    nameEs: 'Founder',
    price: 99,
    priceAnnual: 79,
    stripePriceId: process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_FOUNDER_ANNUAL_PRICE_ID,
    limits: {
      collections: -1,
      imageryGenerations: 100,
      users: 1,
      exportEnabled: true,
      aiVideoEnabled: false,
      apiAccessEnabled: false,
      ssoEnabled: false,
    },
  },
  team: {
    name: 'Team',
    nameEs: 'Team',
    price: 599,
    priceAnnual: 479,
    stripePriceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID,
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
  team_pro: {
    name: 'Team Pro',
    nameEs: 'Team Pro',
    price: 1499,
    priceAnnual: 1199,
    stripePriceId: process.env.STRIPE_TEAM_PRO_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_TEAM_PRO_ANNUAL_PRICE_ID,
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

// Self-serve = paid plans purchasable via Stripe Checkout
export function isSelfServePlan(plan: PlanId): boolean {
  return plan === 'founder' || plan === 'team' || plan === 'team_pro';
}

// Launch promo coupons — first 100 paid subs get a fixed €/mo discount
// per plan for 12 months. Absolute amounts (not %) so the resulting
// monthly charge always lands on a clean €X9 number:
//   Founder  €99 - €50 = €49/mo · Team €599 - €300 = €299/mo
//   Team Pro €1499 - €750 = €749/mo
// Counter shared across all 3 in `launch_promo_counter` table.
// Annual: monthly toggle is hidden in v2 — annual subs handled via
// Customer Portal post-trial without auto-applied promo (deliberate).
export const LAUNCH_PROMO_COUPONS: Record<'founder' | 'team' | 'team_pro', string> = {
  founder: 'LAUNCH-FOUNDER-M',
  team: 'LAUNCH-TEAM-M',
  team_pro: 'LAUNCH-TEAM-PRO-M',
};

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
