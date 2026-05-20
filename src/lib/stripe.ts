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
// Founder + canonical workspace inbox. Both bypass imagery quota and
// Studio output budget checks for testing / dogfooding.
export const ADMIN_EMAILS = ['hello@aimily.app', 'felipe.studionn@gmail.com'];

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
      users: 10,
      exportEnabled: true,
      aiVideoEnabled: true,
      apiAccessEnabled: false,
      ssoEnabled: false,
    },
  },
  team_pro: {
    name: 'Team Pro',
    nameEs: 'Team Pro',
    price: 999,
    priceAnnual: 799,
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

/**
 * Monthly credits bucket per plan. Alias of `imageryGenerations` — same
 * field, named for what it conceptually is. The DB column is still
 * `ai_usage.imagery_count` for backwards-compat; rename happens in a
 * dedicated follow-up sprint once all surfaces consume via this helper.
 */
export function getMonthlyCredits(plan: PlanId): number {
  return PLANS[plan].limits.imageryGenerations;
}

// ────────────────────────────────────────────────────────────────────────
// Credit costs · what each AI/analysis action subtracts from the monthly
// bucket. Single source of truth — every endpoint that consumes credits
// (Studio renders, In-Season runs, design phase, video) reads from here.
//
// Pricing UI shows the same numbers to the client so they know what 100
// or 1.000 credits buys them. Felipe 2026-05-20 night.
// ────────────────────────────────────────────────────────────────────────
export const CREDIT_COSTS = {
  /** 1 sketch / colorize / brand-board / brand-reference (single image). */
  sketch: 1,
  /** 1 still life (product alone) or try-on. */
  still_life: 3,
  tryon: 3,
  /** 1 editorial (foto con modelo). */
  editorial: 5,
  /** 1 vídeo Kling 2.1 Pro (5-15s). */
  video_kling: 30,
  /** 1 análisis In-Season completo (orchestrator + LLM narrative). Flat
   *  cost — Felipe quiere que un Founder valga tanto como un Team por
   *  análisis. Volumen es la palanca de upsell, no la potencia del run. */
  in_season_run: 10,
} as const satisfies Record<string, number>;
export type CreditAction = keyof typeof CREDIT_COSTS;

/**
 * What the marketing copy on `/pricing` should render below each plan
 * for the "≈ X análisis · Y editoriales · …" line. Derived from
 * `monthlyCredits / CREDIT_COSTS[action]` so it stays consistent.
 */
export function creditsEquivalents(monthlyCredits: number) {
  return {
    in_season_runs: Math.floor(monthlyCredits / CREDIT_COSTS.in_season_run),
    editorials: Math.floor(monthlyCredits / CREDIT_COSTS.editorial),
    still_lifes: Math.floor(monthlyCredits / CREDIT_COSTS.still_life),
    sketches: Math.floor(monthlyCredits / CREDIT_COSTS.sketch),
    videos: Math.floor(monthlyCredits / CREDIT_COSTS.video_kling),
  };
}

// Self-serve = paid plans purchasable via Stripe Checkout
export function isSelfServePlan(plan: PlanId): boolean {
  return plan === 'founder' || plan === 'team' || plan === 'team_pro';
}

// Public launch promo retired May 2026 (decision: no public discount,
// brand is premium fashion). Outreach now uses the private STUDIONN50
// promotion code that customers type at checkout. The 3 coupons
// LAUNCH-FOUNDER-M / LAUNCH-TEAM-M / LAUNCH-TEAM-PRO-M have been
// archived in Stripe and the launch_promo_counter row has
// active = false in Supabase. Reactivate by recreating the coupons
// + re-importing this map if needed.

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
