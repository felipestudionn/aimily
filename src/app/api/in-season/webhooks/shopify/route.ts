/**
 * POST /api/in-season/webhooks/shopify
 *
 * Felipe 2026-05-19 Sprint 4 · realtime sales sync alternative to the cron.
 * Shopify Admin delivers events here (orders/create, orders/updated,
 * refunds/create, etc.). We verify HMAC, look up the tenant, idempotency-
 * lock the event, and bump `next_sync_at=now()` so the cron picks up this
 * tenant on its next tick. Inline parsing is intentionally deferred — webhook
 * handlers must return in <5s or Shopify retries the delivery.
 *
 * Production hardening (migration 070):
 *   - Idempotency: insert into `tenant_sales_webhook_events` with a unique
 *     (provider, event_id) constraint. A replay returns 200 `duplicate`
 *     without touching the connection.
 *   - DLQ: failures with a raw body but no resolvable tenant land in
 *     `tenant_sales_webhook_dead_letters` so we can replay manually.
 *   - Per-tenant secret: resolve via `tenant_sales_webhook_get_secret`
 *     when the connection has `webhook_secret_id`. Falls back to the
 *     env-wide SHOPIFY_WEBHOOK_SECRET while we onboard tenants.
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §4.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function verifyHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  if (digest.length !== hmacHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

async function deadLetter(payload: {
  reason: string;
  raw_body: string;
  shop_domain?: string | null;
  topic?: string | null;
  event_id?: string | null;
  signature?: string | null;
}) {
  try {
    await supabaseAdmin.from('tenant_sales_webhook_dead_letters').insert({
      provider: 'shopify',
      reason: payload.reason,
      raw_body: payload.raw_body,
      shop_domain: payload.shop_domain ?? null,
      topic: payload.topic ?? null,
      event_id: payload.event_id ?? null,
      signature: payload.signature ?? null,
    });
  } catch {
    // Last-resort: swallow. Without DLQ insert all we can do is return non-200 so Shopify retries.
  }
}

export async function POST(req: NextRequest) {
  const shopDomain = req.headers.get('x-shopify-shop-domain');
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  const topic = req.headers.get('x-shopify-topic');
  const webhookId = req.headers.get('x-shopify-webhook-id');

  const rawBody = await req.text();

  if (!shopDomain || !hmac) {
    await deadLetter({
      reason: 'missing_required_headers',
      raw_body: rawBody,
      shop_domain: shopDomain,
      topic,
      event_id: webhookId,
      signature: hmac,
    });
    return NextResponse.json({ error: 'Missing Shopify headers' }, { status: 400 });
  }

  const { data: conn } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('id, tenant_id, status, webhook_secret_id')
    .eq('provider', 'shopify')
    .eq('shop_domain', shopDomain)
    .eq('status', 'active')
    .maybeSingle();

  if (!conn) {
    await deadLetter({
      reason: 'shop_not_connected',
      raw_body: rawBody,
      shop_domain: shopDomain,
      topic,
      event_id: webhookId,
      signature: hmac,
    });
    return NextResponse.json({ error: 'Shop not connected' }, { status: 404 });
  }

  // Resolve the HMAC secret: per-tenant vault secret first, env-wide as transition fallback.
  let secret: string | null = null;
  const connTyped = conn as { id: string; tenant_id: string; webhook_secret_id: string | null };
  if (connTyped.webhook_secret_id) {
    const { data: secretRow } = await supabaseAdmin.rpc(
      'tenant_sales_webhook_get_secret',
      { p_connection_id: connTyped.id }
    );
    if (typeof secretRow === 'string') secret = secretRow;
  }
  if (!secret) {
    secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? null;
  }
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  if (!verifyHmac(rawBody, hmac, secret)) {
    await deadLetter({
      reason: 'invalid_hmac',
      raw_body: rawBody,
      shop_domain: shopDomain,
      topic,
      event_id: webhookId,
      signature: hmac,
    });
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  // Idempotency: insert with unique (provider, event_id). A replay collides
  // on the unique index → we return 200 OK so Shopify stops retrying.
  if (webhookId) {
    const { error: insertErr } = await supabaseAdmin
      .from('tenant_sales_webhook_events')
      .insert({
        provider: 'shopify',
        event_id: webhookId,
        topic,
        connection_id: connTyped.id,
        tenant_id: connTyped.tenant_id,
        status: 'queued',
      });
    if (insertErr) {
      const isDuplicate = (insertErr as { code?: string }).code === '23505';
      if (isDuplicate) {
        return NextResponse.json({ ok: true, ignored: 'duplicate', topic });
      }
      // Any other write error: continue but flag — we don't want to lose the event.
    }
  }

  await supabaseAdmin
    .from('tenant_sales_connections')
    .update({ next_sync_at: new Date().toISOString() })
    .eq('id', connTyped.id);

  await supabaseAdmin.from('tenant_sales_sync_runs').insert({
    connection_id: connTyped.id,
    tenant_id: connTyped.tenant_id,
    trigger: 'webhook',
    status: 'queued',
    error: webhookId ? `webhook_id:${webhookId} topic:${topic}` : null,
  });

  if (webhookId) {
    await supabaseAdmin
      .from('tenant_sales_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', 'shopify')
      .eq('event_id', webhookId);
  }

  return NextResponse.json({ ok: true, queued: true, topic });
}
