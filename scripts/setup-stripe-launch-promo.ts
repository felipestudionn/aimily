/**
 * Set up Stripe products + prices + coupon for the May 2026 rebrand.
 *
 * Idempotent — looks up existing products/prices by metadata before
 * creating. Safe to re-run.
 *
 * Creates:
 *   1. Product "Aimily Founder" + monthly (€99) and annual (€79/mo billed yearly) prices
 *   2. Product "Aimily Team" + monthly (€599) and annual (€479/mo billed yearly) prices
 *   3. Product "Aimily Team Pro" + monthly (€1499) and annual (€1199/mo billed yearly) prices
 *   4. Coupon "LAUNCH-50-Y1" — 50% off, repeating, 12 months
 *
 * Run:
 *   npx tsx scripts/setup-stripe-launch-promo.ts
 *
 * Required env: STRIPE_SECRET_KEY (LIVE)
 *
 * After running, copy the printed price IDs into Vercel env vars:
 *   STRIPE_FOUNDER_MONTHLY_PRICE_ID
 *   STRIPE_FOUNDER_ANNUAL_PRICE_ID
 *   STRIPE_TEAM_MONTHLY_PRICE_ID
 *   STRIPE_TEAM_ANNUAL_PRICE_ID
 *   STRIPE_TEAM_PRO_MONTHLY_PRICE_ID
 *   STRIPE_TEAM_PRO_ANNUAL_PRICE_ID
 *   STRIPE_LAUNCH_PROMO_COUPON_ID = LAUNCH-50-Y1
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

interface PlanSpec {
  productKey: string;     // metadata.aimily_plan
  productName: string;
  monthly: number;        // €/mo
  annualMonthly: number;  // €/mo when billed annually (×12 = total)
}

const PLANS: PlanSpec[] = [
  { productKey: 'founder',  productName: 'Aimily Founder',  monthly: 99,   annualMonthly: 79 },
  { productKey: 'team',     productName: 'Aimily Team',     monthly: 599,  annualMonthly: 479 },
  { productKey: 'team_pro', productName: 'Aimily Team Pro', monthly: 1499, annualMonthly: 1199 },
];

async function findOrCreateProduct(spec: PlanSpec): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata['aimily_plan']:'${spec.productKey}' AND active:'true'`,
  });
  if (existing.data.length > 0) {
    console.log(`  ✓ Product exists: ${existing.data[0].id} (${spec.productName})`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name: spec.productName,
    metadata: { aimily_plan: spec.productKey, rebrand: 'may2026' },
  });
  console.log(`  + Created product: ${product.id} (${spec.productName})`);
  return product;
}

async function findOrCreatePrice(
  product: Stripe.Product,
  amountEur: number,
  interval: 'month' | 'year',
  intervalLabel: string,
): Promise<Stripe.Price> {
  const amountCents = amountEur * 100;
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = prices.data.find(
    (p) =>
      p.unit_amount === amountCents &&
      p.recurring?.interval === interval &&
      p.currency === 'eur',
  );
  if (existing) {
    console.log(`    ✓ Price exists: ${existing.id} (${intervalLabel} €${amountEur})`);
    return existing;
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amountCents,
    currency: 'eur',
    recurring: { interval },
    metadata: { interval_label: intervalLabel },
  });
  console.log(`    + Created price: ${price.id} (${intervalLabel} €${amountEur})`);
  return price;
}

async function findOrCreateLaunchCoupon(): Promise<Stripe.Coupon> {
  const couponId = 'LAUNCH-50-Y1';
  try {
    const existing = await stripe.coupons.retrieve(couponId);
    console.log(`✓ Coupon exists: ${existing.id} (${existing.name})`);
    return existing;
  } catch {
    const coupon = await stripe.coupons.create({
      id: couponId,
      name: 'Launch — first 100 · 50% off · 12 months',
      percent_off: 50,
      duration: 'repeating',
      duration_in_months: 12,
      metadata: { rebrand: 'may2026', purpose: 'first-100-launch' },
    });
    console.log(`+ Created coupon: ${coupon.id} (${coupon.name})`);
    return coupon;
  }
}

async function main() {
  console.log('Setting up Stripe products + prices + launch coupon…\n');

  const envLines: string[] = [];

  for (const spec of PLANS) {
    console.log(`\n${spec.productName}:`);
    const product = await findOrCreateProduct(spec);
    const monthly = await findOrCreatePrice(product, spec.monthly, 'month', `monthly_eur_${spec.monthly}`);
    const annual = await findOrCreatePrice(product, spec.annualMonthly, 'year', `annual_eur_${spec.annualMonthly}_per_mo`);
    // NOTE: annual price is configured as `interval=year` with the
    // ×12 amount. We multiply here so the recurring charge is the full
    // year, while the per-month label remains accurate in UI.
    // Reset: replace annual price with the year-billed one
    if (annual.unit_amount !== spec.annualMonthly * 12 * 100) {
      // unit_amount of an annual price should be year total, not /mo
      const correctedAnnual = await stripe.prices.create({
        product: product.id,
        unit_amount: spec.annualMonthly * 12 * 100,
        currency: 'eur',
        recurring: { interval: 'year' },
        metadata: { interval_label: `annual_eur_${spec.annualMonthly}_per_mo`, displayed_per_month: String(spec.annualMonthly) },
      });
      console.log(`    + Created CORRECTED annual price: ${correctedAnnual.id} (€${spec.annualMonthly}/mo billed yearly = €${spec.annualMonthly * 12}/year)`);
      // Archive the wrong one
      await stripe.prices.update(annual.id, { active: false });
      console.log(`    - Archived bad annual price: ${annual.id}`);
      envLines.push(`STRIPE_${spec.productKey.toUpperCase()}_ANNUAL_PRICE_ID=${correctedAnnual.id}`);
    } else {
      envLines.push(`STRIPE_${spec.productKey.toUpperCase()}_ANNUAL_PRICE_ID=${annual.id}`);
    }
    envLines.push(`STRIPE_${spec.productKey.toUpperCase()}_MONTHLY_PRICE_ID=${monthly.id}`);
  }

  console.log('\nLaunch coupon:');
  const coupon = await findOrCreateLaunchCoupon();
  envLines.push(`STRIPE_LAUNCH_PROMO_COUPON_ID=${coupon.id}`);

  console.log('\n──────────────────────────────────────────────────');
  console.log('Add to Vercel env (Production + Preview):');
  console.log('──────────────────────────────────────────────────');
  for (const line of envLines) console.log(line);
  console.log('──────────────────────────────────────────────────\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
