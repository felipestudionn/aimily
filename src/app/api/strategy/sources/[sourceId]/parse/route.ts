/**
 * POST /api/strategy/sources/[sourceId]/parse
 *
 * Triggers parsing + ETL for a previously-uploaded source. Synchronous in
 * v1 (max 5 minutes for a 100MB PDF); v2 will move to a background queue.
 *
 * Steps:
 *   1. Verify tenant membership (analyst+)
 *   2. Fetch source row + download file from `strategy-uploads` bucket
 *   3. Dispatch to the appropriate parser by `source_format`
 *   4. Persist via ETL pipeline
 *   5. Build/refresh identity graph (lineage detection)
 *
 * Response: { source_id, persist_result, identity_graph_summary }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseZaraRnkPdf } from '@/lib/strategy/parsers/zara-rnk-pdf';
import { parseShopifyCsvOrXlsx } from '@/lib/strategy/parsers/shopify-csv';
import { persistParserResult } from '@/lib/strategy/etl/persist';
import { buildIdentityGraphForTenant } from '@/lib/strategy/identity-graph';
import type { ParserResult } from '@/lib/strategy/parsers/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ sourceId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { sourceId } = await params;

  // First fetch the source row (no tenant check yet, but we need tenant_id).
  const { data: source, error: srcErr } = await supabaseAdmin
    .from('strategy_sources')
    .select('id, tenant_id, source_format, storage_path, observation_date, season')
    .eq('id', sourceId)
    .single();

  if (srcErr || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  const access = await requireStrategyAccess({
    tenantId: source.tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;

  if (!source.storage_path) {
    return NextResponse.json({ error: 'Source has no storage_path' }, { status: 400 });
  }

  // Download file from bucket.
  const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
    .from('strategy-uploads')
    .download(source.storage_path);

  if (dlErr || !fileBlob) {
    return NextResponse.json(
      { error: 'Failed to download source file', detail: dlErr?.message },
      { status: 500 }
    );
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());

  let result: ParserResult;
  try {
    switch (source.source_format) {
      case 'zara_rnk_pdf':
        result = await parseZaraRnkPdf(bytes);
        break;
      case 'shopify_csv':
      case 'shopify_csv_bundle':
        result = parseShopifyCsvOrXlsx(bytes, {
          observation_date: source.observation_date,
          season_tag: source.season,
        });
        break;
      case 'manual_upload':
      case 'erp_custom_csv':
        // Fallback to Shopify-style parser for raw CSV/XLSX.
        result = parseShopifyCsvOrXlsx(bytes, {
          observation_date: source.observation_date,
          season_tag: source.season,
        });
        break;
      default:
        return NextResponse.json(
          { error: `Parser for ${source.source_format} not yet implemented` },
          { status: 501 }
        );
    }
  } catch (err: any) {
    await supabaseAdmin
      .from('strategy_sources')
      .update({
        parser_warnings: [`Parse failed: ${err?.message || String(err)}`],
        processed_at: null,
      })
      .eq('id', sourceId);
    return NextResponse.json(
      { error: 'Parse failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  let persistResult;
  try {
    persistResult = await persistParserResult(
      source.tenant_id,
      sourceId,
      source.observation_date,
      result
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ETL failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  // Refresh identity graph for the tenant (lineage detection across all
  // sources for this tenant; idempotent, safe to call after every parse).
  let identitySummary;
  try {
    identitySummary = await buildIdentityGraphForTenant(source.tenant_id);
  } catch (err: any) {
    identitySummary = { error: err?.message || String(err) };
  }

  return NextResponse.json({
    source_id: sourceId,
    persist: persistResult,
    identity_graph: identitySummary,
  });
}
