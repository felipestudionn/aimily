/**
 * POST /api/in-season/webhooks/stripe
 *
 * Felipe 2026-05-19 noche · sister al webhook Shopify. Stripe envía aquí
 * eventos como charge.succeeded, charge.refunded, customer.subscription.*,
 * etc. Realtime alternative al cron diario para tenants pagando vía Stripe.
 *
 * MVP scope:
 *   - Verifica firma con STRIPE_WEBHOOK_SECRET env.
 *   - Identifica el tenant via account_id del payload o un mapping en
 *     tenant_sales_connections (Stripe Connect platform model).
 *   - Setea next_sync_at=now() para que el cron procese delta inmediato.
 *
 * Production-ready needs:
 *   - Stripe Connect platform mode (un único webhook secret en aimily +
 *     payload.account identifica al sub-account).
 *   - Idempotency keys (Stripe envía event.id).
 *   - Dead-letter queue.
 *   - Per-event-type routing (charge vs subscription vs payout).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

/** Verifica la firma de Stripe sin la lib oficial (evita añadir dependencia
 *  para un scaffold). Stripe-Signature format:
 *    t=<timestamp>,v1=<hmac>,v0=<deprecated>
 *  HMAC se computa sobre `<timestamp>.<rawBody>`.
 *  Production should use `stripe.webhooks.constructEvent` from the official SDK. */
function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): boolean {
  const parts = sigHeader.split(',');
  let timestamp: string | undefined;
  let v1: string | undefined;
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = v;
    if (k === 'v1') v1 = v;
  }
  if (!timestamp || !v1) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  if (expected.length !== v1.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

export async function POST(req: NextRequest) {
  const sigHeader = req.headers.get('stripe-signature');
  if (!sigHeader) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifyStripeSignature(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the event after signature verification
  let event: { id?: string; type?: string; account?: string; data?: { object?: { customer?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Tenant resolution: when in Stripe Connect platform mode the payload
  // carries `account: 'acct_xxx'` identifying the sub-account. We look it
  // up in tenant_sales_connections (provider=stripe). If aimily is running
  // single-account mode (one Stripe key per aimily install) we fall back
  // to the single active stripe connection. MVP: single-tenant fallback.
  const stripeAccount = event.account;
  const { data: conns } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('id, tenant_id, status, shop_domain')
    .eq('provider', 'stripe')
    .eq('status', 'active');

  let connection: { id: string; tenant_id: string } | null = null;
  if (stripeAccount && conns) {
    connection =
      ((conns as Array<{ id: string; tenant_id: string; shop_domain: string | null }>)
        .find((c) => c.shop_domain === stripeAccount) ?? null) as { id: string; tenant_id: string } | null;
  }
  if (!connection && conns && conns.length === 1) {
    connection = conns[0] as { id: string; tenant_id: string };
  }
  if (!connection) {
    return NextResponse.json({ ok: true, ignored: 'no matching connection' });
  }

  await supabaseAdmin
    .from('tenant_sales_connections')
    .update({ next_sync_at: new Date().toISOString() })
    .eq('id', connection.id);

  await supabaseAdmin.from('tenant_sales_sync_runs').insert({
    connection_id: connection.id,
    tenant_id: connection.tenant_id,
    trigger: 'webhook',
    status: 'queued',
    error: event.id ? `event_id:${event.id} type:${event.type}` : null,
  });

  return NextResponse.json({ ok: true, queued: true, event_type: event.type });
}
