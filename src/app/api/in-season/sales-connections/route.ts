/**
 * Sales connections registry — Felipe 2026-05-19 Sprint 4.
 *
 * GET /api/in-season/sales-connections?tenant_slug=…
 *   → list connections for the tenant
 *
 * POST /api/in-season/sales-connections
 *   { tenant_slug, provider, shop_domain, access_token, scopes? }
 *   → create or replace a connection (unique by tenant+provider).
 *
 * MVP: token paste-in by an admin. Real OAuth flow is a sprint follow-up.
 * Architecture: memory/architecture_in-season-feedback-loop.md §4.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const tenantSlug = new URL(req.url).searchParams.get('tenant_slug');
  if (!tenantSlug) return NextResponse.json({ error: 'tenant_slug required' }, { status: 400 });

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const { data, error } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select(
      'id, provider, shop_domain, scopes, status, last_sync_at, last_sync_source_id, ' +
        'last_sync_records_count, last_sync_error, next_sync_at, sync_cadence_hours, ' +
        'created_at, updated_at'
    )
    .eq('tenant_id', access.tenant.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });

  const tenantSlug = body.tenant_slug as string | undefined;
  const provider = body.provider as string | undefined;
  const shopDomain = body.shop_domain as string | undefined;
  const accessToken = body.access_token as string | undefined;
  const scopes = (body.scopes as string[] | undefined) ?? [];

  if (!tenantSlug || !provider || !accessToken) {
    return NextResponse.json({ error: 'tenant_slug, provider, access_token required' }, { status: 400 });
  }
  if (provider !== 'shopify' && provider !== 'stripe') {
    return NextResponse.json({ error: 'provider must be shopify or stripe' }, { status: 400 });
  }
  if (provider === 'shopify' && !shopDomain) {
    return NextResponse.json({ error: 'shop_domain required for shopify provider' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // Replace existing connection for this (tenant, provider) — unique constraint
  // means the prior row must be deleted first to upsert by composite key.
  await supabaseAdmin
    .from('tenant_sales_connections')
    .delete()
    .eq('tenant_id', access.tenant.id)
    .eq('provider', provider);

  // Migration 069 dropped the plaintext access_token column. Tokens live
  // only in vault via tenant_sales_connections_store_token below.
  const { data, error } = await supabaseAdmin
    .from('tenant_sales_connections')
    .insert({
      tenant_id: access.tenant.id,
      provider,
      shop_domain: shopDomain ?? null,
      scopes,
      status: 'active',
      next_sync_at: new Date().toISOString(),
      created_by: access.userId,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }
  const newConnectionId = (data as { id: string }).id;

  // Store token in vault via SECURITY DEFINER helper. Returns the secret id
  // and as a side effect updates the row's access_token_secret_id + nulls
  // out the plaintext column.
  try {
    await supabaseAdmin.rpc('tenant_sales_connections_store_token', {
      p_connection_id: newConnectionId,
      p_token: accessToken,
    });
  } catch (e) {
    // If vault store fails, roll back the connection row so we don't leave
    // a half-configured record. Keep error surface user-friendly.
    await supabaseAdmin.from('tenant_sales_connections').delete().eq('id', newConnectionId);
    return NextResponse.json(
      { error: 'failed to securely store token', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  return NextResponse.json({ connection_id: newConnectionId, status: 'active' });
}
