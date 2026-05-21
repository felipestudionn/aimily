/**
 * POST /api/in-season/sources/shopify-ingest
 *
 * Felipe sprint Shopify lane · 2026-05-19. Conecta una Shopify store via
 * GraphQL Admin API (Admin API Access Token) y ejecuta el parse + ETL
 * completo en un solo paso — sin upload de archivos.
 *
 * Body (JSON):
 *   tenant_slug:     string (requerido)
 *   shop_domain:     string (requerido, e.g. "ejemplo.myshopify.com")
 *   access_token:    string (requerido, Admin API access token)
 *   observation_date: string (YYYY-MM-DD, default = hoy)
 *   season_tag:      string (default = "current")
 *   max_products:    number (opcional, safety cap, default 5000)
 *
 * Returns:
 *   { source_id, records_count, coverage, warnings }
 *
 * Auth: requireStrategyAccess({ tenantSlug, minRole: 'analyst' }).
 *
 * NOTA seguridad: el access_token NO se persiste en la DB de aimily.
 * Lo usamos solo para el fetch y lo descartamos. Si el cliente quiere
 * steady-state ingestion (cron diario o webhooks), eso será un endpoint
 * separado con credentials encriptadas en `strategy_tenants.connector_*`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { parseShopifyGraphql } from '@/lib/in-season/parsers/shopify-graphql';
import { persistParserResult } from '@/lib/in-season/etl/persist';

export const maxDuration = 300;

type Body = {
  tenant_slug?: string;
  shop_domain?: string;
  access_token?: string;
  observation_date?: string;
  season_tag?: string;
  max_products?: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.tenant_slug || !body?.shop_domain || !body?.access_token) {
    return NextResponse.json(
      { error: 'tenant_slug, shop_domain, access_token required' },
      { status: 400 }
    );
  }

  // Sanity: shop_domain debe ser un host válido Shopify.
  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(body.shop_domain) &&
      !/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(body.shop_domain)) {
    return NextResponse.json(
      { error: 'shop_domain must be a valid host (e.g. ejemplo.myshopify.com)' },
      { status: 400 }
    );
  }

  const access = await requireStrategyAccess({ tenantSlug: body.tenant_slug, minRole: 'analyst' });
  if (!access.ok) return access.response;
  const { tenant, userId } = access;

  const observationDate = body.observation_date || new Date().toISOString().slice(0, 10);
  const seasonTag = body.season_tag || 'current';

  // 1) Create strategy_sources row (source_format = shopify_graphql_api).
  //    Storage_path empty — no file persisted. Source_type marker = 'api'.
  const { data: sourceRow, error: insertError } = await supabaseAdmin
    .from('strategy_sources')
    .insert({
      tenant_id: tenant.id,
      season: seasonTag,
      source_format: 'shopify_csv_bundle',  // reusa el enum existente; format real va en notes
      source_type: 'api',
      observation_date: observationDate,
      uploaded_by: userId,
      notes: `Shopify GraphQL ingest from ${body.shop_domain}`,
      coverage_dimensions: {},
      storage_path: '',
    })
    .select('id')
    .single();

  if (insertError || !sourceRow) {
    return NextResponse.json(
      { error: 'failed to create source row', detail: insertError?.message },
      { status: 500 }
    );
  }
  const sourceId = sourceRow.id;

  // 2) Run the GraphQL parser.
  let parseResult;
  try {
    parseResult = await parseShopifyGraphql({
      shop_domain: body.shop_domain,
      access_token: body.access_token,
      observation_date: observationDate,
      season_tag: seasonTag,
      max_products: body.max_products,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('strategy_sources')
      .update({ parser_warnings: [`GraphQL fetch failed: ${msg}`] })
      .eq('id', sourceId);
    return NextResponse.json({ error: 'Shopify fetch failed', detail: msg }, { status: 502 });
  }

  if (parseResult.records.length === 0) {
    return NextResponse.json(
      {
        error: 'No records extracted from Shopify',
        warnings: parseResult.parser_warnings,
      },
      { status: 422 }
    );
  }

  // 3) Persist via the standard ETL pipeline (same one Zara PDF uses).
  try {
    await persistParserResult(tenant.id, sourceId, observationDate, parseResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'ETL persist failed', detail: msg },
      { status: 500 }
    );
  }

  // 4) Update source row with coverage + warnings.
  await supabaseAdmin
    .from('strategy_sources')
    .update({
      coverage_dimensions: parseResult.coverage_dimensions,
      parser_warnings: parseResult.parser_warnings,
      processed_at: new Date().toISOString(),
    })
    .eq('id', sourceId);

  return NextResponse.json({
    source_id: sourceId,
    records_count: parseResult.records.length,
    coverage: parseResult.coverage_dimensions,
    warnings: parseResult.parser_warnings,
    parse_confidence: parseResult.parse_confidence,
  });
}
