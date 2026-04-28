#!/usr/bin/env tsx
/**
 * Configure the Stripe Customer Portal via API.
 *
 * Idempotent: updates the default configuration if it exists, otherwise
 * creates one. Sets:
 *   - Plan switcher with all 6 self-serve prices (Starter/Pro/Pro Max × monthly/annual)
 *   - Cancellations with prorate + feedback survey (6 reasons)
 *   - Customer update (email/address/phone/tax_id)
 *   - Payment methods management
 *   - Invoice history visible
 *   - Privacy + Terms URLs
 *   - Custom return URL
 *
 * Usage: tsx scripts/configure-stripe-portal.ts
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

const SK = process.env.STRIPE_SECRET_KEY!;
if (!SK || !SK.startsWith('sk_live_')) {
  console.error('Refusing to run: STRIPE_SECRET_KEY is not a LIVE key.');
  process.exit(1);
}

const PRICE_IDS = [
  process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
  process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
  process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
  process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
  process.env.STRIPE_PRO_MAX_MONTHLY_PRICE_ID,
  process.env.STRIPE_PRO_MAX_ANNUAL_PRICE_ID,
].filter(Boolean) as string[];

if (PRICE_IDS.length !== 6) {
  console.error(`Expected 6 price IDs in env, got ${PRICE_IDS.length}.`);
  console.error('Required: STRIPE_STARTER_MONTHLY_PRICE_ID, STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID, STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID, STRIPE_PRO_MAX_MONTHLY_PRICE_ID, STRIPE_PRO_MAX_ANNUAL_PRICE_ID');
  process.exit(1);
}

// We need the product IDs that each price belongs to so we can group them
async function fetchPriceProduct(priceId: string): Promise<string> {
  const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    headers: { Authorization: `Bearer ${SK}` },
  });
  if (!res.ok) {
    throw new Error(`Failed fetch price ${priceId}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.product as string;
}

interface ProductGroup {
  product: string;
  prices: string[];
}

async function buildProductGroups(): Promise<ProductGroup[]> {
  const productByPrice: Record<string, string> = {};
  for (const id of PRICE_IDS) {
    productByPrice[id] = await fetchPriceProduct(id);
  }
  const groups: Record<string, string[]> = {};
  for (const [priceId, productId] of Object.entries(productByPrice)) {
    if (!groups[productId]) groups[productId] = [];
    groups[productId].push(priceId);
  }
  return Object.entries(groups).map(([product, prices]) => ({ product, prices }));
}

async function listExistingConfigurations(): Promise<Array<{ id: string; is_default: boolean }>> {
  const res = await fetch('https://api.stripe.com/v1/billing_portal/configurations', {
    headers: { Authorization: `Bearer ${SK}` },
  });
  if (!res.ok) throw new Error(`List configs failed: ${res.status}`);
  const json = await res.json();
  return (json.data || []).map((c: { id: string; is_default: boolean }) => ({ id: c.id, is_default: c.is_default }));
}

async function configureBillingPortal() {
  console.log('\n🛠  Configuring Stripe Billing Portal...\n');

  const groups = await buildProductGroups();
  console.log(`  → ${groups.length} subscription products / ${PRICE_IDS.length} prices`);

  const existing = await listExistingConfigurations();
  const defaultConfig = existing.find((c) => c.is_default);

  // Build form-encoded body for billing_portal/configurations
  const params = new URLSearchParams();

  // Business profile
  params.append('business_profile[headline]', 'Manage your aimily subscription');
  params.append('business_profile[privacy_policy_url]', 'https://www.aimily.app/privacy');
  params.append('business_profile[terms_of_service_url]', 'https://www.aimily.app/terms');

  // Default return URL
  params.append('default_return_url', 'https://www.aimily.app/account');

  // Features: customer_update
  params.append('features[customer_update][enabled]', 'true');
  params.append('features[customer_update][allowed_updates][0]', 'email');
  params.append('features[customer_update][allowed_updates][1]', 'address');
  params.append('features[customer_update][allowed_updates][2]', 'phone');
  params.append('features[customer_update][allowed_updates][3]', 'tax_id');
  params.append('features[customer_update][allowed_updates][4]', 'name');

  // Features: invoice_history
  params.append('features[invoice_history][enabled]', 'true');

  // Features: payment_method_update
  params.append('features[payment_method_update][enabled]', 'true');

  // Features: subscription_cancel
  params.append('features[subscription_cancel][enabled]', 'true');
  params.append('features[subscription_cancel][mode]', 'at_period_end');
  params.append('features[subscription_cancel][proration_behavior]', 'none');
  params.append('features[subscription_cancel][cancellation_reason][enabled]', 'true');
  const reasons = [
    'too_expensive',
    'missing_features',
    'switched_service',
    'unused',
    'customer_service',
    'too_complex',
    'low_quality',
    'other',
  ];
  reasons.forEach((r, i) => params.append(`features[subscription_cancel][cancellation_reason][options][${i}]`, r));

  // Features: subscription_update — plan switcher
  params.append('features[subscription_update][enabled]', 'true');
  params.append('features[subscription_update][default_allowed_updates][0]', 'price');
  params.append('features[subscription_update][default_allowed_updates][1]', 'promotion_code');
  params.append('features[subscription_update][proration_behavior]', 'create_prorations');
  groups.forEach((g, idx) => {
    params.append(`features[subscription_update][products][${idx}][product]`, g.product);
    g.prices.forEach((pid, pidx) => {
      params.append(`features[subscription_update][products][${idx}][prices][${pidx}]`, pid);
    });
  });

  const url = defaultConfig
    ? `https://api.stripe.com/v1/billing_portal/configurations/${defaultConfig.id}`
    : 'https://api.stripe.com/v1/billing_portal/configurations';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    console.error('Stripe API error:');
    console.error(await res.text());
    process.exit(1);
  }

  const result = await res.json();
  console.log(`\n✅ Portal configured: ${result.id}`);
  console.log(`   Default: ${result.is_default}`);
  console.log(`   Plan switcher: ${groups.length} products, ${PRICE_IDS.length} prices`);
  console.log(`   Cancellation feedback: ${reasons.length} reasons enabled`);
  console.log(`   Privacy URL: ${result.business_profile?.privacy_policy_url}`);
  console.log(`   Terms URL: ${result.business_profile?.terms_of_service_url}`);
}

configureBillingPortal().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
