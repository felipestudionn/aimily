/**
 * GET /api/cron/strategy/sales-sync · Felipe 2026-05-19 Sprint 4.
 *
 * Daily cron (registered in vercel.json) that iterates every active
 * tenant_sales_connections row whose next_sync_at <= now() and triggers
 * the sync helper. Closes the In-Season feedback loop for aimily_360
 * tenants: sales data flows from Shopify → strategy_* tables → engine.
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §4.
 *
 * Auth: Vercel cron header (`Authorization: Bearer ${CRON_SECRET}`) OR open
 * for now (the operation is idempotent and rate-limited by Shopify itself).
 * Production should wire CRON_SECRET env.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncSalesConnection } from '@/lib/strategy/sync-sales-connection';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Soft auth: when CRON_SECRET is configured, require it.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.endsWith(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('id, tenant_id, provider, shop_domain, next_sync_at')
    .eq('status', 'active')
    .lte('next_sync_at', nowIso)
    .order('next_sync_at', { ascending: true })
    .limit(50); // Safety cap per cron tick

  if (error) {
    return NextResponse.json({ error: 'list connections failed', detail: error.message }, { status: 500 });
  }

  const dueList = (due as Array<{ id: string; tenant_id: string; provider: string }> | null) ?? [];
  if (dueList.length === 0) {
    return NextResponse.json({ ran_at: nowIso, due: 0, results: [] });
  }

  const results = [];
  for (const conn of dueList) {
    const outcome = await syncSalesConnection(conn.id, 'cron');
    results.push({
      connection_id: conn.id,
      tenant_id: conn.tenant_id,
      provider: conn.provider,
      ok: outcome.ok,
      records_count: outcome.records_count ?? null,
      source_id: outcome.source_id ?? null,
      error: outcome.error ?? null,
      duration_ms: outcome.duration_ms,
    });
  }

  return NextResponse.json({
    ran_at: nowIso,
    due: dueList.length,
    results,
  });
}
