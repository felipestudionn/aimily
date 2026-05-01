/**
 * Migrate every public Supabase Storage URL in the database to a long-lived
 * signed URL, in preparation for flipping the `collection-assets` bucket
 * from public to private.
 *
 * Why: today the bucket is public. Anyone with the URL — or a guess at
 * the slug structure — can pull a customer's moodboard or sketch off
 * the CDN. Pre-launch business-perfect: bucket goes private. But every
 * column that already holds a public URL would 404 after the flip. So
 * we re-sign each URL with a 1-year TTL and rewrite the DB before
 * touching the bucket.
 *
 * What it touches:
 *   - collection_assets.url            (text, ~176 rows)
 *   - aimily_models.headshot_url       (text, 28 rows — shared across users)
 *   - collection_skus.sketch_url       (text)
 *   - collection_skus.sketch_top_url   (text)
 *   - collection_skus.render_url       (text)
 *   - collection_skus.render_urls      (jsonb, deep walk)
 *   - collection_workspace_data.data   (jsonb, deep walk)
 *
 * Safe to re-run: idempotent because we only rewrite rows whose value
 * still matches the public-URL prefix; once it's a signed URL it gets
 * skipped on the next run.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/migrate-storage-to-private.ts
 *   # add --dry-run to see counts without writing
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'collection-assets';
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const TTL_SECONDS = 365 * 24 * 3600; // 1 year
const DRY_RUN = process.argv.includes('--dry-run');

const cache = new Map<string, string>();

async function signPath(path: string): Promise<string | null> {
  if (cache.has(path)) return cache.get(path)!;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error(`  ❌ sign(${path}): ${error?.message ?? 'no signedUrl returned'}`);
    return null;
  }
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

function extractPath(url: string): string | null {
  if (!url.startsWith(PUBLIC_PREFIX)) return null;
  // Strip query string if any (?download=…) so the storage path is clean.
  return url.slice(PUBLIC_PREFIX.length).split('?')[0];
}

async function migrateColumn(table: string, urlCol: string): Promise<{ scanned: number; updated: number }> {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${urlCol}`)
    .ilike(urlCol, `${PUBLIC_PREFIX}%`);
  if (error) {
    console.error(`  ❌ select ${table}.${urlCol}: ${error.message}`);
    return { scanned: 0, updated: 0 };
  }
  let updated = 0;
  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>;
    const url = r[urlCol] as string;
    const path = extractPath(url);
    if (!path) continue;
    const signed = await signPath(path);
    if (!signed) continue;
    if (DRY_RUN) { updated++; continue; }
    const { error: updErr } = await supabase.from(table).update({ [urlCol]: signed }).eq('id', r.id);
    if (updErr) console.error(`  ❌ update ${table}#${r.id}: ${updErr.message}`);
    else updated++;
  }
  return { scanned: rows?.length ?? 0, updated };
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function collectPaths(value: JsonValue, sink: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith(PUBLIC_PREFIX)) {
      const p = extractPath(value);
      if (p) sink.add(p);
    }
    return;
  }
  if (Array.isArray(value)) { for (const v of value) collectPaths(v, sink); return; }
  if (value && typeof value === 'object') { for (const v of Object.values(value)) collectPaths(v, sink); }
}

function rewriteUrls(value: JsonValue, map: Map<string, string>): { value: JsonValue; changed: boolean } {
  if (typeof value === 'string') {
    if (value.startsWith(PUBLIC_PREFIX)) {
      const p = extractPath(value);
      if (p && map.has(p)) return { value: map.get(p)!, changed: true };
    }
    return { value, changed: false };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const r = rewriteUrls(v, map);
      if (r.changed) changed = true;
      return r.value;
    });
    return { value: out, changed };
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const out: { [k: string]: JsonValue } = {};
    for (const [k, v] of Object.entries(value)) {
      const r = rewriteUrls(v, map);
      if (r.changed) changed = true;
      out[k] = r.value;
    }
    return { value: out, changed };
  }
  return { value, changed: false };
}

async function migrateJson(table: string, jsonCol: string): Promise<{ scanned: number; updated: number }> {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${jsonCol}`);
  if (error) {
    console.error(`  ❌ select ${table}.${jsonCol}: ${error.message}`);
    return { scanned: 0, updated: 0 };
  }
  let updated = 0;
  let scanned = 0;
  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>;
    const value = r[jsonCol] as JsonValue;
    if (!value) continue;
    if (!JSON.stringify(value).includes(PUBLIC_PREFIX)) continue;
    scanned++;
    const paths = new Set<string>();
    collectPaths(value, paths);
    const map = new Map<string, string>();
    for (const p of paths) {
      const s = await signPath(p);
      if (s) map.set(p, s);
    }
    const { value: rewritten, changed } = rewriteUrls(value, map);
    if (!changed) continue;
    if (DRY_RUN) { updated++; continue; }
    const { error: updErr } = await supabase.from(table).update({ [jsonCol]: rewritten }).eq('id', r.id);
    if (updErr) console.error(`  ❌ update ${table}#${r.id}: ${updErr.message}`);
    else updated++;
  }
  return { scanned, updated };
}

async function main() {
  console.log(`Migration ${DRY_RUN ? '[DRY RUN] ' : ''}starting against ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET}, TTL: ${TTL_SECONDS}s (${(TTL_SECONDS / 86400).toFixed(0)}d)\n`);

  const targets: Array<[string, string, 'text' | 'json']> = [
    ['collection_assets', 'url', 'text'],
    ['collection_assets', 'thumbnail_url', 'text'],
    ['aimily_models', 'headshot_url', 'text'],
    ['collection_skus', 'sketch_url', 'text'],
    ['collection_skus', 'sketch_top_url', 'text'],
    ['collection_skus', 'render_url', 'text'],
    ['collection_skus', 'reference_image_url', 'text'],
    ['collection_skus', 'production_sample_url', 'text'],
    ['collection_skus', 'render_urls', 'json'],
    ['sku_colorways', 'material_swatch_url', 'text'],
    ['tech_packs', 'sketch_front_image', 'text'],
    ['tech_packs', 'sketch_back_image', 'text'],
    ['tech_packs', 'reference_images', 'json'],
    ['brand_models', 'reference_image_url', 'text'],
    ['brand_models', 'preview_images', 'json'],
    ['reports', 'pdf_url', 'text'],
    ['rrss_post_assets', 'url', 'text'],
    ['sample_reviews', 'photos', 'json'],
    ['collection_workspace_data', 'data', 'json'],
    ['presentation_deck_overrides', 'field_overrides', 'json'],
    ['collection_decisions', 'value', 'json'],
    ['user_brands', 'brand_data', 'json'],
  ];

  let totalUpdated = 0;
  for (const [table, col, kind] of targets) {
    process.stdout.write(`${table}.${col} (${kind})... `);
    const { scanned, updated } = kind === 'text'
      ? await migrateColumn(table, col)
      : await migrateJson(table, col);
    console.log(`scanned=${scanned} updated=${updated}`);
    totalUpdated += updated;
  }

  console.log(`\nDone. Rows updated: ${totalUpdated}. Unique paths signed: ${cache.size}.`);
  if (DRY_RUN) console.log('(dry-run — no writes performed)');
}

main().catch((e) => { console.error(e); process.exit(1); });
