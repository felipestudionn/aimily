/**
 * POST /api/in-season/webhooks/stripe
 *
 * Felipe 2026-05-19 Sprint 4 · realtime sales sync sibling to the Shopify
 * webhook. Stripe delivers events like charge.succeeded, charge.refunded,
 * customer.subscription.*, etc. We verify the signature, identify the
 * tenant (Connect platform via event.account or single-tenant fallback),
 * idempotency-lock by event.id, then bump `next_sync_at=now()` so the
 * cron processes the delta on the next tick.
 *
 * Production hardening (migration 070):
 *   - Idempotency: insert into `tenant_sales_webhook_events` with a unique
 *     (provider, event_id) constraint; replays return 200 `duplicate`.
 *   - DLQ: failures with a raw body but no resolvable tenant land in
 *     `tenant_sales_webhook_dead_letters`.
 *   - Per-tenant secret: vault-stored signing secret per connection. Falls
 *     back to env-wide STRIPE_WEBHOOK_SECRET while onboarding.
 *
 * Signature format `Stripe-Signature: t=<timestamp>,v1=<hmac>` is verified
 * inline (no stripe SDK dep) — HMAC over `<timestamp>.<rawBody>`.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

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

async function deadLetter(payload: {
  reason: string;
  raw_body: string;
  stripe_account?: string | null;
  event_id?: string | null;
  signature?: string | null;
}) {
  try {
    await supabaseAdmin.from('tenant_sales_webhook_dead_letters').insert({
      provider: 'stripe',
      reason: payload.reason,
      raw_body: payload.raw_body,
      stripe_account: payload.stripe_account ?? null,
      event_id: payload.event_id ?? null,
      signature: payload.signature ?? null,
    });
  } catch {
    // Swallow; non-200 return below makes Stripe retry.
  }
}

export async function POST(req: NextRequest) {
  const sigHeader = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  if (!sigHeader) {
    await deadLetter({ reason: 'missing_signature_header', raw_body: rawBody, signature: null });
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  // Parse first to extract account + event_id, even if we can't verify yet.
  let event: { id?: string; type?: string; account?: string } = {};
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    await deadLetter({ reason: 'invalid_json', raw_body: rawBody, signature: sigHeader });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const stripeAccount = event.account;

  // Tenant resolution: Stripe Connect platform mode uses event.account
  // (acct_xxx) to identify the sub-account. We match against
  // tenant_sales_connections.shop_domain (reused as the account id column
  // for stripe rows). Single-tenant fallback: if only one active stripe
  // connection exists, route the event to it.
  const { data: conns } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('id, tenant_id, status, shop_domain, webhook_secret_id')
    .eq('provider', 'stripe')
    .eq('status', 'active');

  type StripeConn = { id: string; tenant_id: string; shop_domain: string | null; webhook_secret_id: string | null };
  let connection: StripeConn | null = null;
  if (stripeAccount && conns) {
    connection =
      ((conns as StripeConn[]).find((c) => c.shop_domain === stripeAccount) ?? null);
  }
  if (!connection && conns && conns.length === 1) {
    connection = conns[0] as StripeConn;
  }

  // Resolve signing secret: per-tenant first, env fallback.
  let secret: string | null = null;
  if (connection?.webhook_secret_id) {
    const { data: secretRow } = await supabaseAdmin.rpc(
      'tenant_sales_webhook_get_secret',
      { p_connection_id: connection.id }
    );
    if (typeof secretRow === 'string') secret = secretRow;
  }
  if (!secret) {
    secret = process.env.STRIPE_WEBHOOK_SECRET ?? null;
  }
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  if (!verifyStripeSignature(rawBody, sigHeader, secret)) {
    await deadLetter({
      reason: 'invalid_signature',
      raw_body: rawBody,
      stripe_account: stripeAccount,
      event_id: event.id ?? null,
      signature: sigHeader,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!connection) {
    await deadLetter({
      reason: 'no_matching_connection',
      raw_body: rawBody,
      stripe_account: stripeAccount,
      event_id: event.id ?? null,
      signature: sigHeader,
    });
    return NextResponse.json({ ok: true, ignored: 'no matching connection' });
  }

  // Idempotency: replay returns 200 OK so Stripe stops retrying.
  if (event.id) {
    const { error: insertErr } = await supabaseAdmin
      .from('tenant_sales_webhook_events')
      .insert({
        provider: 'stripe',
        event_id: event.id,
        topic: event.type ?? null,
        connection_id: connection.id,
        tenant_id: connection.tenant_id,
        status: 'queued',
      });
    if (insertErr) {
      const isDuplicate = (insertErr as { code?: string }).code === '23505';
      if (isDuplicate) {
        return NextResponse.json({ ok: true, ignored: 'duplicate', event_type: event.type });
      }
    }
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

  if (event.id) {
    await supabaseAdmin
      .from('tenant_sales_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', 'stripe')
      .eq('event_id', event.id);
  }

  return NextResponse.json({ ok: true, queued: true, event_type: event.type });
}
