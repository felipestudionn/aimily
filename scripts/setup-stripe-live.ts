#!/usr/bin/env tsx
/**
 * One-time setup of Stripe LIVE products, prices, and webhook for aimily.
 * Outputs the new price IDs and webhook secret to update .env.local + Vercel.
 *
 * Pricing (from src/app/page.tsx):
 *   Starter:      €199/mo monthly · €159/mo billed annually (= €1908/yr)
 *   Professional: €599/mo monthly · €479/mo billed annually (= €5748/yr)
 *
 * Webhook:
 *   URL:    https://www.aimily.app/api/webhooks/stripe
 *   Events: subscription.* + invoice.* + payment_intent.* + charge.dispute.*
 *
 * Usage: tsx scripts/setup-stripe-live.ts
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

const SK = process.env.STRIPE_SECRET_KEY!;
if (!SK || !SK.startsWith('sk_live_')) {
  console.error('Refusing to run: STRIPE_SECRET_KEY is not a LIVE key.');
  process.exit(1);
}

async function stripeCall(path: string, body?: Record<string, string | number | string[]> | URLSearchParams) {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${SK}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (body) {
    init.body = body instanceof URLSearchParams ? body : new URLSearchParams(body as Record<string, string>);
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const json = await res.json();
  if (!res.ok) {
    console.error(`✗ ${path}:`, json.error?.message || JSON.stringify(json));
    throw new Error(json.error?.message || 'Stripe error');
  }
  return json;
}

async function createProduct(name: string, description: string) {
  console.log(`→ Creating product: ${name}`);
  return stripeCall('/products', {
    name,
    description,
    'metadata[plan]': name.toLowerCase().replace(/^aimily /i, ''),
  });
}

async function createPrice(productId: string, amountCents: number, interval: 'month' | 'year', nickname: string) {
  console.log(`→ Creating price: ${nickname}  €${amountCents / 100} / ${interval}`);
  return stripeCall('/prices', {
    product: productId,
    currency: 'eur',
    unit_amount: amountCents.toString(),
    'recurring[interval]': interval,
    nickname,
  });
}

async function createWebhook() {
  console.log(`→ Creating webhook endpoint`);
  const params = new URLSearchParams();
  params.append('url', 'https://www.aimily.app/api/webhooks/stripe');
  params.append('description', 'aimily production webhook (LIVE)');
  const events = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.created',
    'invoice.finalized',
    'invoice.paid',
    'invoice.payment_failed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'checkout.session.completed',
    'customer.created',
    'customer.updated',
  ];
  events.forEach((e) => params.append('enabled_events[]', e));
  return stripeCall('/webhook_endpoints', params);
}

async function main() {
  console.log(`Setting up Stripe LIVE for aimily — ${SK.slice(0, 14)}...`);
  console.log('');

  // STARTER
  const starter = await createProduct(
    'aimily Starter',
    '1 user · 2 collections · 100 AI generations / month · all blocks',
  );
  const starterMonthly = await createPrice(starter.id, 19900, 'month', 'Starter Monthly');
  const starterAnnual = await createPrice(starter.id, 190800, 'year', 'Starter Annual (€159/mo)');

  console.log('');

  // PROFESSIONAL
  const pro = await createProduct(
    'aimily Professional',
    '10 users · unlimited collections · 500 AI generations / month · multi-brand · realtime collaboration',
  );
  const proMonthly = await createPrice(pro.id, 59900, 'month', 'Professional Monthly');
  const proAnnual = await createPrice(pro.id, 574800, 'year', 'Professional Annual (€479/mo)');

  console.log('');

  // WEBHOOK
  const webhook = await createWebhook();

  // OUTPUT — for copy-paste to .env.local + Vercel
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✓ Stripe LIVE setup complete. Update env vars with:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`STRIPE_STARTER_MONTHLY_PRICE_ID=${starterMonthly.id}`);
  console.log(`STRIPE_STARTER_ANNUAL_PRICE_ID=${starterAnnual.id}`);
  console.log(`STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=${proMonthly.id}`);
  console.log(`STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=${proAnnual.id}`);
  console.log('');
  console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  console.log('');
  console.log(`# Reference: webhook ID ${webhook.id}`);
  console.log(`# Reference: starter product ${starter.id}`);
  console.log(`# Reference: professional product ${pro.id}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
