#!/usr/bin/env tsx
/**
 * ADDITIVE setup for Stripe LIVE:
 *   1. Professional Max product + 2 prices (€1.499/mo monthly · €1.199/mo annual)
 *   2. Aimily Credits — 3 one-time packs (+50 €29 / +250 €119 / +1000 €399)
 *
 * Idempotent: searches for existing products by metadata key `aimily_sku` before
 * creating. Safe to re-run. Prints env vars to add to Vercel + .env.local at end.
 *
 * Usage: tsx scripts/setup-stripe-pro-max-and-credits.ts
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

const SK = process.env.STRIPE_SECRET_KEY!;
if (!SK || !SK.startsWith('sk_live_')) {
  console.error('Refusing to run: STRIPE_SECRET_KEY is not a LIVE key.');
  process.exit(1);
}

interface StripeRecord {
  id: string;
  metadata?: Record<string, string>;
  default_price?: string;
}

async function stripeCall(path: string, body?: Record<string, string | number>): Promise<StripeRecord> {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (body) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) params.append(k, String(v));
    init.body = params.toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stripe ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function stripeGet(path: string): Promise<{ data: StripeRecord[] }> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${SK}` },
  });
  if (!res.ok) throw new Error(`Stripe GET ${path} failed: ${res.status}`);
  return res.json();
}

async function findOrCreateProduct(sku: string, name: string): Promise<string> {
  const search = await stripeGet(`/products/search?query=metadata['aimily_sku']:'${sku}'`);
  if (search.data.length > 0) {
    console.log(`  ↳ existing product: ${name} (${search.data[0].id})`);
    return search.data[0].id;
  }
  const product = await stripeCall('/products', {
    name,
    'metadata[aimily_sku]': sku,
  });
  console.log(`  ✓ created product: ${name} (${product.id})`);
  return product.id;
}

async function createPriceIfNeeded(
  productId: string,
  amount: number,
  interval: 'month' | 'year' | null,
  lookupKey: string,
): Promise<string> {
  const search = await stripeGet(`/prices/search?query=lookup_key:'${lookupKey}'`);
  if (search.data.length > 0) {
    console.log(`    ↳ existing price: ${lookupKey} (${search.data[0].id})`);
    return search.data[0].id;
  }
  const params: Record<string, string | number> = {
    product: productId,
    unit_amount: amount * 100,
    currency: 'eur',
    lookup_key: lookupKey,
  };
  if (interval) {
    params['recurring[interval]'] = interval;
  }
  const price = await stripeCall('/prices', params);
  console.log(`    ✓ created price: ${lookupKey} → €${amount} (${price.id})`);
  return price.id;
}

async function main() {
  console.log('\n🎯 Stripe LIVE additive setup — Pro Max + Aimily Credits\n');

  // 1. Professional Max — subscription product
  console.log('1. Professional Max');
  const proMaxProd = await findOrCreateProduct('professional_max', 'aimily Professional Max');
  const proMaxMonthly = await createPriceIfNeeded(proMaxProd, 1499, 'month', 'aimily_pro_max_monthly');
  // Annual price: total €14,388/year (= €1,199/mo equivalent). interval=year so
  // Stripe Customer Portal can offer it as the "annual" choice next to monthly.
  // (The original setup wrongly used interval=month; rebuilt 2026-04-28.)
  const proMaxAnnual = await createPriceIfNeeded(proMaxProd, 14388, 'year', 'aimily_pro_max_annual_v2');

  // 2. Aimily Credits packs — one-time payment products
  console.log('\n2. Aimily Credits — pack 50 (€29)');
  const pack50Prod = await findOrCreateProduct('credits_pack_50', '+50 Aimily Credits');
  const pack50Price = await createPriceIfNeeded(pack50Prod, 29, null, 'aimily_credits_pack_50');

  console.log('\n3. Aimily Credits — pack 250 (€119)');
  const pack250Prod = await findOrCreateProduct('credits_pack_250', '+250 Aimily Credits');
  const pack250Price = await createPriceIfNeeded(pack250Prod, 119, null, 'aimily_credits_pack_250');

  console.log('\n4. Aimily Credits — pack 1000 (€399)');
  const pack1000Prod = await findOrCreateProduct('credits_pack_1000', '+1000 Aimily Credits');
  const pack1000Price = await createPriceIfNeeded(pack1000Prod, 399, null, 'aimily_credits_pack_1000');

  // Output env vars
  console.log('\n\n📋 Add these to .env.local AND `vercel env add` for production:\n');
  console.log(`STRIPE_PRO_MAX_MONTHLY_PRICE_ID=${proMaxMonthly}`);
  console.log(`STRIPE_PRO_MAX_ANNUAL_PRICE_ID=${proMaxAnnual}`);
  console.log(`STRIPE_CREDITS_PACK_50_PRICE_ID=${pack50Price}`);
  console.log(`STRIPE_CREDITS_PACK_250_PRICE_ID=${pack250Price}`);
  console.log(`STRIPE_CREDITS_PACK_1000_PRICE_ID=${pack1000Price}`);
  console.log('\n✅ done\n');
}

main().catch((err) => {
  console.error('❌ setup failed:', err);
  process.exit(1);
});
