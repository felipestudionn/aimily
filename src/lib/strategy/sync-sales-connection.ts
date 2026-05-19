/**
 * Sync a single tenant_sales_connection · Felipe 2026-05-19 Sprint 4.
 *
 * Pulls products + orders + inventory from the connected source (Shopify
 * for now) via the existing parser + persist pipeline, then logs the
 * outcome in tenant_sales_sync_runs.
 *
 * Reusable from:
 *   - Manual trigger endpoint POST /api/in-season/sales-connections/[id]/sync
 *   - Cron endpoint GET /api/cron/strategy/sales-sync (iterates all due)
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §4 + Sprint 4
 * (this commit).
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseShopifyGraphql } from '@/lib/strategy/parsers/shopify-graphql';
import { parseStripeApi } from '@/lib/strategy/parsers/stripe-api';
import { persistParserResult } from '@/lib/strategy/etl/persist';

export type SyncTrigger = 'cron' | 'manual' | 'webhook';

export interface SyncOutcome {
  ok: boolean;
  connection_id: string;
  source_id?: string;
  records_count?: number;
  duration_ms: number;
  error?: string;
}

export async function syncSalesConnection(
  connectionId: string,
  trigger: SyncTrigger
): Promise<SyncOutcome> {
  const startMs = Date.now();

  // 1) Load connection + tenant
  const { data: conn, error: connErr } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('id, tenant_id, provider, shop_domain, access_token, access_token_secret_id, status')
    .eq('id', connectionId)
    .single();

  if (connErr || !conn) {
    return { ok: false, connection_id: connectionId, duration_ms: Date.now() - startMs, error: 'connection not found' };
  }
  if (conn.status !== 'active') {
    return { ok: false, connection_id: connectionId, duration_ms: Date.now() - startMs, error: `connection status=${conn.status}` };
  }
  if (conn.provider !== 'shopify' && conn.provider !== 'stripe') {
    return { ok: false, connection_id: connectionId, duration_ms: Date.now() - startMs, error: `provider ${conn.provider} not yet supported by sync helper` };
  }
  // Resolve access token: prefer vault-decrypted secret, fall back to plaintext
  // column for legacy rows. Migration 067 added the vault wiring.
  let accessToken: string | null = null;
  if ((conn as { access_token_secret_id?: string | null }).access_token_secret_id) {
    const { data: tokenRow } = await supabaseAdmin.rpc(
      'tenant_sales_connections_get_token',
      { p_connection_id: conn.id }
    );
    accessToken = typeof tokenRow === 'string' ? tokenRow : null;
  }
  if (!accessToken && conn.access_token) {
    accessToken = conn.access_token;
  }
  if (conn.provider === 'shopify' && !conn.shop_domain) {
    return {
      ok: false,
      connection_id: connectionId,
      duration_ms: Date.now() - startMs,
      error: 'shopify connection missing shop_domain',
    };
  }
  if (!accessToken) {
    return {
      ok: false,
      connection_id: connectionId,
      duration_ms: Date.now() - startMs,
      error: 'missing access_token (vault + plaintext both empty)',
    };
  }

  // 2) Open audit row
  const { data: runRow } = await supabaseAdmin
    .from('tenant_sales_sync_runs')
    .insert({
      connection_id: conn.id,
      tenant_id: conn.tenant_id,
      trigger,
      status: 'running',
    })
    .select('id')
    .single();
  const auditId = (runRow as { id?: string } | null)?.id ?? null;

  const observationDate = new Date().toISOString().slice(0, 10);

  try {
    // 3) Create source row
    const sourceLabel =
      conn.provider === 'shopify'
        ? `Cron sync from ${conn.shop_domain} (connection ${conn.id})`
        : `Cron sync from Stripe (connection ${conn.id})`;
    const { data: srcRow, error: srcErr } = await supabaseAdmin
      .from('strategy_sources')
      .insert({
        tenant_id: conn.tenant_id,
        season: 'current',
        source_format: 'shopify_csv_bundle', // existing enum; real shape goes in notes
        source_type: 'api',
        observation_date: observationDate,
        uploaded_by: null,
        notes: sourceLabel,
        coverage_dimensions: {},
        storage_path: '',
      })
      .select('id')
      .single();
    if (srcErr || !srcRow) throw new Error(`create source: ${srcErr?.message}`);
    const sourceId = (srcRow as { id: string }).id;

    // 4) Parse: dispatch al adapter por provider. Ambos producen ParsedResult
    // del mismo shape → mismo pipeline downstream.
    const parseResult =
      conn.provider === 'shopify'
        ? await parseShopifyGraphql({
            shop_domain: conn.shop_domain!,
            access_token: accessToken,
            observation_date: observationDate,
            season_tag: 'current',
          })
        : await parseStripeApi({
            api_key: accessToken,
            observation_date: observationDate,
            season_tag: 'current',
          });
    if (parseResult.records.length === 0) {
      throw new Error('parser returned 0 records');
    }

    // 5) Persist ETL
    await persistParserResult(conn.tenant_id, sourceId, observationDate, parseResult);

    // 6) Update source row
    await supabaseAdmin
      .from('strategy_sources')
      .update({
        coverage_dimensions: parseResult.coverage_dimensions,
        parser_warnings: parseResult.parser_warnings,
        processed_at: new Date().toISOString(),
      })
      .eq('id', sourceId);

    // 7) Mark connection synced
    const nextSyncAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await supabaseAdmin
      .from('tenant_sales_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_source_id: sourceId,
        last_sync_records_count: parseResult.records.length,
        last_sync_error: null,
        next_sync_at: nextSyncAt,
      })
      .eq('id', conn.id);

    const durationMs = Date.now() - startMs;

    // 8) Close audit row
    if (auditId) {
      await supabaseAdmin
        .from('tenant_sales_sync_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'success',
          source_id: sourceId,
          records_count: parseResult.records.length,
          duration_ms: durationMs,
        })
        .eq('id', auditId);
    }

    return {
      ok: true,
      connection_id: conn.id,
      source_id: sourceId,
      records_count: parseResult.records.length,
      duration_ms: durationMs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startMs;

    if (auditId) {
      await supabaseAdmin
        .from('tenant_sales_sync_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'error',
          error: msg.slice(0, 1000),
          duration_ms: durationMs,
        })
        .eq('id', auditId);
    }
    await supabaseAdmin
      .from('tenant_sales_connections')
      .update({
        last_sync_error: msg.slice(0, 1000),
        last_sync_at: new Date().toISOString(),
        // Schedule next attempt sooner on transient failure (1h instead of 24h)
        next_sync_at: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
      })
      .eq('id', conn.id);

    return { ok: false, connection_id: conn.id, duration_ms: durationMs, error: msg };
  }
}
