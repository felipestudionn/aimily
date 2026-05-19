/**
 * Daily inventory + price snapshot cron.
 *
 * Felipe sprint Shopify lane sprint 3 · 2026-05-19.
 *
 * Triggered diariamente via Vercel cron (vercel.json) o manualmente vía
 * POST con `shop_domain` + `access_token` + `tenant_slug`. Para cada
 * tenant con connector Shopify activo, hace fetch de productos +
 * inventory + price y persiste snapshot en strategy_inventory_snapshots.
 *
 * Después de 7-28 días de ejecución diaria, los classifiers leen el
 * history y calculan rotation/emptying nativo (vs synthetic baseline).
 *
 * Modes:
 *   - GET (Vercel cron): recorre todos los tenants con conectores
 *     activos en strategy_tenants.connector_config (futuro — sprint
 *     siguiente cuando persistamos credentials encryptadas).
 *   - POST (manual): cliente pasa shop_domain + access_token. Útil
 *     para piloto / demo sin connector persistido.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { parseShopifyGraphql } from '@/lib/strategy/parsers/shopify-graphql';
import { persistDailySnapshots } from '@/lib/strategy/snapshots';

export const maxDuration = 300;

type Body = {
  tenant_slug?: string;
  shop_domain?: string;
  access_token?: string;
  snapshot_date?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.tenant_slug || !body?.shop_domain || !body?.access_token) {
    return NextResponse.json(
      { error: 'tenant_slug, shop_domain, access_token required' },
      { status: 400 }
    );
  }

  const access = await requireStrategyAccess({ tenantSlug: body.tenant_slug, minRole: 'analyst' });
  if (!access.ok) return access.response;
  const { tenant } = access;

  const snapshotDate = body.snapshot_date || new Date().toISOString().slice(0, 10);

  // 1) Fetch desde Shopify
  let parseResult;
  try {
    parseResult = await parseShopifyGraphql({
      shop_domain: body.shop_domain,
      access_token: body.access_token,
      observation_date: snapshotDate,
      season_tag: 'snapshot',
      max_products: 10000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Shopify fetch failed', detail: msg }, { status: 502 });
  }

  if (parseResult.records.length === 0) {
    return NextResponse.json({ inserted: 0, message: 'No SKUs returned' });
  }

  // 2) Necesitamos product_fact_id por model_ref. Los SKUs ya existen en
  //    strategy_product_facts (creados via un ingest previo). Si NO existen,
  //    el snapshot se ignora — el cliente debe correr ingest first.
  const modelRefs = parseResult.records.map((r) => r.model_ref);
  const { data: pfRows } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, model_ref')
    .eq('tenant_id', tenant.id)
    .in('model_ref', modelRefs);

  const productFactIdByModelRef = new Map<string, string>();
  for (const row of (pfRows || []) as Array<{ id: string; model_ref: string }>) {
    productFactIdByModelRef.set(row.model_ref, row.id);
  }

  if (productFactIdByModelRef.size === 0) {
    return NextResponse.json(
      {
        error: 'No matching product_facts found for this tenant',
        hint: 'Run /api/strategy/sources/shopify-ingest first to create product_facts',
        skus_fetched: parseResult.records.length,
      },
      { status: 422 }
    );
  }

  // 3) Persist snapshots
  let result;
  try {
    result = await persistDailySnapshots({
      tenantId: tenant.id,
      snapshotDate,
      connectorType: 'shopify_graphql',
      productFactIdByModelRef,
      records: parseResult.records,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'snapshot persist failed', detail: msg }, { status: 500 });
  }

  return NextResponse.json({
    tenant_slug: tenant.slug,
    snapshot_date: snapshotDate,
    skus_fetched: parseResult.records.length,
    skus_matched: productFactIdByModelRef.size,
    snapshots_persisted: result.inserted,
    coverage: parseResult.coverage_dimensions,
    warnings: parseResult.parser_warnings,
  });
}

/** Vercel cron entrypoint. Cuando tengamos connectors persistidos
 *  en strategy_tenants.connector_config, esto recorrerá todos los
 *  tenants activos. Por ahora retorna noop (los snapshots se disparan
 *  manualmente vía POST). */
export async function GET(req: NextRequest) {
  // Vercel cron auth: header `Authorization: Bearer ${CRON_SECRET}`
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    status: 'noop',
    message: 'Tenant connector loop not yet implemented. Use POST with explicit credentials.',
  });
}
