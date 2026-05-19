/**
 * POST /api/in-season/webhooks/shopify
 *
 * Felipe 2026-05-19 noche · realtime sales sync alternativa al cron diario.
 * Shopify Admin envía webhook a este endpoint cuando ocurre un evento
 * suscrito (orders/create, orders/updated, refunds/create, etc.).
 *
 * MVP scope:
 *   - Verifica HMAC del header X-Shopify-Hmac-Sha256 contra el shared
 *     secret almacenado en tenant_sales_connections.scopes (campo libre,
 *     uso temporal hasta que migremos a vault). Production hardening
 *     mueve el secret a una columna dedicada.
 *   - Identifica el tenant via X-Shopify-Shop-Domain → tenant_sales_connections.
 *   - Setea next_sync_at = now() para que la próxima ejecución del cron
 *     /api/cron/strategy/sales-sync (o el siguiente tick que sea) procese
 *     este tenant inmediatamente. No hacemos el sync inline porque sería
 *     bloqueante y Shopify retry-loops fácilmente.
 *
 * Production-ready needs:
 *   - Idempotency keys (X-Shopify-Webhook-Id)
 *   - Dead-letter queue para retries
 *   - Per-event-type routing (orders/create vs refunds/create vs etc.)
 *   - Webhook secret rotation
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §4.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function verifyHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  // Constant-time compare
  if (digest.length !== hmacHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

export async function POST(req: NextRequest) {
  const shopDomain = req.headers.get('x-shopify-shop-domain');
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  const topic = req.headers.get('x-shopify-topic');
  const webhookId = req.headers.get('x-shopify-webhook-id');

  if (!shopDomain || !hmac) {
    return NextResponse.json({ error: 'Missing Shopify headers' }, { status: 400 });
  }

  // Look up the connection by shop_domain. We trust the domain header at
  // initial lookup; the HMAC verification below confirms the secret matches.
  const { data: conn } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('id, tenant_id, status, scopes')
    .eq('provider', 'shopify')
    .eq('shop_domain', shopDomain)
    .eq('status', 'active')
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ error: 'Shop not connected' }, { status: 404 });
  }

  // MVP: the webhook shared secret lives in env (SHOPIFY_WEBHOOK_SECRET).
  // Per-tenant secrets land in a future migration that adds
  // tenant_sales_connections.webhook_secret_id (vault-wired).
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  // Read raw body for HMAC computation
  const rawBody = await req.text();
  if (!verifyHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  // Schedule immediate sync — the cron picks up active connections with
  // next_sync_at <= now() at every tick. Bumping next_sync_at forward to
  // "now" means the next tick (or a manual sync) processes this tenant.
  await supabaseAdmin
    .from('tenant_sales_connections')
    .update({ next_sync_at: new Date().toISOString() })
    .eq('id', (conn as { id: string }).id);

  // Audit row · keeps Felipe's existing tenant_sales_sync_runs table for
  // observability. trigger='webhook' is a new value alongside cron/manual.
  await supabaseAdmin.from('tenant_sales_sync_runs').insert({
    connection_id: (conn as { id: string }).id,
    tenant_id: (conn as { tenant_id: string }).tenant_id,
    trigger: 'webhook',
    status: 'queued',
    error: webhookId ? `webhook_id:${webhookId} topic:${topic}` : null,
  });

  return NextResponse.json({ ok: true, queued: true, topic });
}
