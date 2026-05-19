/**
 * Seed test dataset basado en sample REAL de Shopify.
 *
 * Felipe 2026-05-19 · "no inventes, usa fichero real". Este script:
 *
 * 1) Descarga apparel.csv del repo OFICIAL Shopify Partners
 *    (United By Blue fashion DTC sample · 257 lines · multi-variant Size/Color)
 *    https://raw.githubusercontent.com/shopifypartners/shopify-product-csvs-and-images/master/csv-files/apparel.csv
 *
 * 2) Construye un XLSX bundle con 4 sheets:
 *    - Products  → headers Shopify legacy verbatim de apparel.csv (real)
 *    - Sales     → 21 días con MISMOS SKUs reales (Net items sold ilustrativos)
 *    - Inventory → multi-location con MISMOS SKUs reales
 *    - Returns   → return reasons reales de Shopify enum + MISMOS SKUs
 *
 * Los SKUs (`43MCHBL2`, `33WSLWHV1`, `33WWSNTC3`, `22WCDCHC4` etc.) y
 * las URLs de imagen (cdn.shopify.com/s/files/1/0803/6591/products/...)
 * son REALES y públicas desde 2014.
 *
 * Sólo los valores de ventas/stock/returns son ilustrativos — Shopify NO
 * publica sample de tenant-data porque es privado. Schema verbatim docs.
 *
 * Uso: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *      scripts/seed-shopify-real-apparel.ts
 */

import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseShopifyCsvOrXlsx } from '@/lib/strategy/parsers/shopify-csv';
import { persistParserResult } from '@/lib/strategy/etl/persist';

const APPAREL_CSV_PATH = '/tmp/shopify_apparel.csv';
const DEMO_TENANT_SLUG = 'shopify-demo';
const DEMO_TENANT_NAME = 'Shopify Demo · United By Blue';
const FELIPE_USER_ID = 'd70fcd1d-e480-4ac8-b75e-d37ab936ef84';

/** Parse el CSV real respetando comas dentro de quoted fields. */
function parseRealAppparelCsv(): Array<Record<string, string>> {
  const raw = readFileSync(APPAREL_CSV_PATH, 'utf-8');
  // Use xlsx para parsear el CSV (maneja quotes + escapes bien)
  const wb = XLSX.read(raw, { type: 'string', raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
}

interface RealSku {
  sku: string;
  product_title: string;
  variant_title: string;
  vendor: string;
  product_type: string;
  image_src: string;
  variant_image: string;
  price: number;
  compare_at_price: number | null;
  inventory_qty: number;
}

/** Extrae SKUs con su variant + propaga el master product (title, vendor,
 *  type, image_src) a las filas variant que vienen vacías (la convención
 *  Shopify es: 1ª row de cada Handle tiene metadata + master image,
 *  rows siguientes solo tienen Variant SKU + Option values). */
function extractSkusFromCsv(rows: Array<Record<string, string>>): RealSku[] {
  let currentHandle = '';
  let currentTitle = '';
  let currentVendor = '';
  let currentType = '';
  let currentImage = '';

  const result: RealSku[] = [];
  for (const row of rows) {
    const handle = row['Handle']?.trim() || '';
    if (handle && handle !== currentHandle) {
      currentHandle = handle;
      currentTitle = row['Title']?.trim() || currentHandle;
      currentVendor = row['Vendor']?.trim() || 'Unknown';
      currentType = row['Type']?.trim() || 'Unknown';
      // Image Src del primer row del Handle = master image
      currentImage = row['Image Src']?.trim() || '';
    }
    const sku = row['Variant SKU']?.trim();
    if (!sku) continue;
    const opt1 = row['Option1 Value']?.trim() || '';
    const opt2 = row['Option2 Value']?.trim() || '';
    const opt3 = row['Option3 Value']?.trim() || '';
    const variantTitle = [opt1, opt2, opt3].filter(Boolean).join(' / ');
    const priceRaw = row['Variant Price']?.trim();
    const price = priceRaw ? parseFloat(priceRaw) : 0;
    const compareRaw = row['Variant Compare At Price']?.trim();
    const compare = compareRaw ? parseFloat(compareRaw) : null;
    const invQty = parseInt(row['Variant Inventory Qty']?.trim() || '0', 10) || 0;
    const variantImage = row['Variant Image']?.trim() || '';
    result.push({
      sku,
      product_title: currentTitle,
      variant_title: variantTitle || 'Default Title',
      vendor: currentVendor,
      product_type: currentType,
      image_src: currentImage,
      variant_image: variantImage,
      price,
      compare_at_price: compare,
      inventory_qty: invQty,
    });
  }
  return result;
}

function buildXlsxBundle(skus: RealSku[]): Buffer {
  const wb = XLSX.utils.book_new();

  // 1) Products sheet — headers normalizados a Shopify legacy + nuestro parser
  const productsRows = skus.map((s) => ({
    'Product Title': s.product_title,
    'Variant SKU': s.sku,
    'Variant Title': s.variant_title,
    Vendor: s.vendor,
    'Product Type': s.product_type,
    'Image Src': s.image_src,
    'Variant Image': s.variant_image,
    'Cost per item': Math.round(s.price * 0.32 * 100) / 100,  // typical COGS 32% de price
    'Variant Price': s.price,
    'Compare At Price': s.compare_at_price || '',
    Published: '2025-09-15',  // Sept 2025 collection drop
    Status: 'active',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsRows), 'Products');

  // 2) Sales by variant — 21 days time series con MISMOS SKUs reales
  const today = new Date();
  const salesRows: Array<Record<string, unknown>> = [];

  // Velocity profile por handle (deterministic, basado en Inventory Qty
  // del apparel.csv real — más stock = más vendido históricamente)
  const velocityFactor: Record<string, number> = {};
  for (const s of skus) {
    // Algunos SKUs vendieron mucho (Whitney Pullover M = 10 unidades stock);
    // otros poco (Ayers Chambray M = 0). Usamos inventory_qty como proxy
    // de velocidad: stock alto = SKU comprado mucho, vendiendo mucho → seller.
    velocityFactor[s.sku] = Math.max(0.5, Math.min(8, s.inventory_qty / 5));
  }

  for (let dayOffset = 21; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dayStr = date.toISOString().slice(0, 10);
    for (const s of skus) {
      const baseVel = velocityFactor[s.sku];
      const units = Math.max(0, Math.round(baseVel * (0.7 + Math.random() * 0.6)));
      if (units === 0 && Math.random() < 0.5) continue;
      const grossSales = Math.round(units * s.price * 100) / 100;
      // Algunos return días esparcidos
      const unitsReturned = Math.random() < 0.04 ? Math.max(1, Math.floor(units * 0.15)) : 0;
      salesRows.push({
        Day: dayStr,
        'Variant SKU': s.sku,
        'Product Title': s.product_title,
        'Variant Title': s.variant_title,
        'Net Items Sold': units,
        'Gross Sales': grossSales,
        'Net Sales': grossSales,
        'Units Returned': unitsReturned,
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), 'Sales by variant');

  // 3) Inventory levels — 2 locations típicas DTC (warehouse + flagship)
  const inventoryRows: Array<Record<string, unknown>> = [];
  for (const s of skus) {
    const base = Math.max(5, s.inventory_qty * 3);  // amplificamos para tener stock vivo
    const warehouse = Math.round(base * 0.7);
    const flagship = Math.round(base * 0.3);
    inventoryRows.push({
      'Variant SKU': s.sku,
      Location: 'Warehouse — Philadelphia',
      Available: warehouse,
      'On Hand': warehouse,
      Incoming: Math.round(base * 0.15),
      Committed: Math.round(base * 0.05),
    });
    inventoryRows.push({
      'Variant SKU': s.sku,
      Location: 'Flagship — NYC',
      Available: flagship,
      'On Hand': flagship,
      Incoming: 0,
      Committed: 0,
    });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), 'Inventory levels');

  // 4) Returns by variant con razones del enum oficial Shopify ReturnReason
  // (DEFECTIVE / WRONG_ITEM / SIZE_TOO_SMALL / SIZE_TOO_LARGE / STYLE /
  //  COLOR / NOT_AS_DESCRIBED / UNWANTED / OTHER)
  const returnsRows: Array<Record<string, unknown>> = [];
  const reasonsPool = ['SIZE_TOO_SMALL', 'SIZE_TOO_LARGE', 'STYLE', 'COLOR', 'NOT_AS_DESCRIBED'];
  for (const s of skus.slice(0, Math.floor(skus.length * 0.3))) {
    const reason = reasonsPool[Math.floor(Math.random() * reasonsPool.length)];
    const units = 1 + Math.floor(Math.random() * 3);
    const daysAgo = 1 + Math.floor(Math.random() * 14);
    const retDate = new Date(today);
    retDate.setDate(retDate.getDate() - daysAgo);
    returnsRows.push({
      'Variant SKU': s.sku,
      'Return Reason': reason,
      Units: units,
      'Return Date': retDate.toISOString().slice(0, 10),
    });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returnsRows), 'Returns by variant');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

async function ensureTenant(): Promise<{ id: string; slug: string }> {
  const { data: existing } = await supabaseAdmin
    .from('strategy_tenants')
    .select('id, slug')
    .eq('slug', DEMO_TENANT_SLUG)
    .maybeSingle();
  if (existing) return existing as { id: string; slug: string };

  const { data: created, error } = await supabaseAdmin
    .from('strategy_tenants')
    .insert({
      slug: DEMO_TENANT_SLUG,
      display_name: DEMO_TENANT_NAME,
      tier: 'tier2_mid',
      isolation_mode: 'shared_rls',
      default_currency: 'USD',
    })
    .select('id, slug')
    .single();
  if (error || !created) throw new Error(`tenant create failed: ${error?.message}`);

  await supabaseAdmin.from('strategy_tenant_members').insert({
    tenant_id: created.id,
    user_id: FELIPE_USER_ID,
    role: 'owner',
  });
  console.log(`Created tenant ${DEMO_TENANT_SLUG} (${created.id}) + owner membership`);
  return created as { id: string; slug: string };
}

async function main() {
  console.log('1) Loading REAL Shopify apparel.csv (shopifypartners official sample)…');
  const rows = parseRealAppparelCsv();
  console.log(`   ${rows.length} CSV rows`);
  const skus = extractSkusFromCsv(rows);
  console.log(`   ${skus.length} real SKUs extracted (with real cdn.shopify.com image URLs)`);
  console.log(`   Sample: ${skus[0].sku} · ${skus[0].product_title} · ${skus[0].image_src.slice(0, 70)}…`);

  // Limit to first 20 SKUs for a tractable demo
  const demoSkus = skus.slice(0, 20);
  console.log(`   Using first ${demoSkus.length} SKUs for the demo`);

  console.log('2) Building XLSX bundle (Products + Sales + Inventory + Returns sheets)…');
  const xlsxBytes = buildXlsxBundle(demoSkus);
  console.log(`   ${(xlsxBytes.byteLength / 1024).toFixed(1)} KB`);

  console.log('3) Ensuring demo tenant…');
  const tenant = await ensureTenant();
  console.log(`   tenant: ${tenant.slug} (${tenant.id})`);

  console.log('4) Parsing XLSX with shopify-csv parser (same flow as upload UI)…');
  const result = parseShopifyCsvOrXlsx(new Uint8Array(xlsxBytes), {
    observation_date: new Date().toISOString().slice(0, 10),
    season_tag: 'FW25',
  });
  console.log(`   records: ${result.records.length}, parse_confidence: ${result.parse_confidence}`);
  console.log(`   coverage: identity=${result.coverage_dimensions.identity}, pricing=${result.coverage_dimensions.pricing}, inventory=${result.coverage_dimensions.inventory}, velocity_7d=${result.coverage_dimensions.velocity_7d}`);
  if (result.parser_warnings.length > 0) {
    console.log(`   warnings:`);
    result.parser_warnings.forEach((w) => console.log(`     - ${w}`));
  }
  // Verify a sample record has product_image_url populated
  const sampleRec = result.records[0];
  console.log(`   sample record: ${sampleRec.model_ref} pvp=${sampleRec.pvp} cost=${sampleRec.cost_estimate} margin_pct=${sampleRec.margin_pct_list} product_image_url=${sampleRec.product_image_url?.slice(0, 60)}…`);

  console.log('5) Uploading XLSX bundle to strategy-uploads/<tenant>/…');
  const path = `${tenant.id}/shopify-real-apparel-${Date.now()}.xlsx`;
  const { error: upErr } = await supabaseAdmin.storage
    .from('strategy-uploads')
    .upload(path, xlsxBytes, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

  console.log('6) Creating strategy_sources row…');
  const { data: srcRow, error: srcErr } = await supabaseAdmin
    .from('strategy_sources')
    .insert({
      tenant_id: tenant.id,
      season: 'FW25',
      source_format: 'shopify_csv_bundle',
      source_type: 'xlsx',
      observation_date: new Date().toISOString().slice(0, 10),
      uploaded_by: FELIPE_USER_ID,
      notes: 'Shopify real apparel.csv (United By Blue · shopifypartners official sample) + synthetic sales/inventory/returns with same real SKUs',
      coverage_dimensions: result.coverage_dimensions,
      storage_path: path,
    })
    .select('id')
    .single();
  if (srcErr || !srcRow) throw new Error(`source insert: ${srcErr?.message}`);

  console.log('7) Persisting to product_facts + inventory + sales_windows + efficiency…');
  const persist = await persistParserResult(
    tenant.id,
    srcRow.id,
    new Date().toISOString().slice(0, 10),
    result
  );
  console.log(`   product_facts:    ${persist.product_fact_count}`);
  console.log(`   inventory_facts:  ${persist.inventory_fact_count}`);
  console.log(`   sales_windows:    ${persist.sales_window_count}`);
  console.log(`   efficiency_facts: ${persist.efficiency_fact_count}`);

  console.log('\n──────────────────────────────────────────────────────────────────');
  console.log('Demo Shopify ingested · navigate to:');
  console.log(`   https://aimily.app/strategy/${tenant.slug}`);
  console.log(`   source_id: ${srcRow.id}`);
  console.log(`   Tenant ID: ${tenant.id}`);
  console.log(`\nNext: create a run via /strategy/${tenant.slug}/runs/new`);
  console.log('──────────────────────────────────────────────────────────────────');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
