/**
 * Apply the Shopify canonical color taxonomy (19 values) to a tenant.
 *
 * Context (2026-05-18):
 *   - Shopify maintains an open-source product taxonomy at
 *     github.com/Shopify/product-taxonomy. The standard Color attribute
 *     has 19 flat canonical values (Beige, Black, Blue, Bronze, Brown,
 *     Clear, Gold, Gray, Green, Multicolor, Navy, Orange, Pink, Purple,
 *     Red, Rose gold, Silver, White, Yellow).
 *   - Latest stable: v2026-02. Main branch: 2026-05-unstable.
 *   - The 19 values are identified by stable GIDs
 *     (gid://shopify/TaxonomyValue/N) + URL-safe handles (color__<slug>).
 *   - Hex codes are NOT part of the standard. The hex_aimily_editorial
 *     in the JSON below are aimily-supplied defaults for UI rendering,
 *     not authoritative.
 *
 * Important caveat: at the Shopify variant level, merchants store color
 * as free text in Option1 Value. Most apparel merchants type "Forest
 * Green" or "Off-white" rather than picking from the canonical 19. So
 * this taxonomy is the ANCHOR — a fuzzy-matcher (TODO) will map free-
 * text variant strings to the canonical handles at ingest time.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/apply-shopify-color-taxonomy.ts <tenant_slug>
 *
 * Example:
 *   npx tsx --env-file=.env.local scripts/apply-shopify-color-taxonomy.ts shopify-demo
 *
 * The tenant must already exist in strategy_tenants. The script:
 *   1. Looks up the tenant by slug.
 *   2. Deactivates any existing color taxonomy row for that tenant.
 *   3. Inserts a new v2026-02-shopify-canonical row with the 19-color
 *      mapping in the same shape as the engine expects (code_to_name +
 *      code_to_hex + code_provenance + shopify_gid for traceability).
 *   4. Marks the new row is_active=true.
 *
 * The `code` we use as the lookup key for the engine is the Shopify GID
 * suffix (the numeric id, e.g., "1" for Black, "2" for Blue). Future:
 * if Shopify ingest layer normalizes free-text → GID, the engine looks
 * up the GID directly.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RAW_JSON_PATH = path.resolve(__dirname, '..', 'memory', 'shopify-colors-raw.json');

interface ShopifyColorValue {
  id: number;
  gid: string;
  handle: string;
  name: string;
  hex_aimily_editorial: string;
}

interface ShopifyTaxonomyRaw {
  taxonomy_version_stable: string;
  attribute: { id: string; name: string };
  values: ShopifyColorValue[];
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: npx tsx --env-file=.env.local scripts/apply-shopify-color-taxonomy.ts <tenant_slug>');
    console.error('Example: npx tsx --env-file=.env.local scripts/apply-shopify-color-taxonomy.ts shopify-demo');
    process.exit(1);
  }

  console.log('\n=== Apply Shopify canonical color taxonomy ===\n');
  console.log(`Tenant slug: ${slug}\n`);

  // 1) Load the Shopify color list.
  const raw = await readFile(RAW_JSON_PATH, 'utf-8');
  const shopify = JSON.parse(raw) as ShopifyTaxonomyRaw;
  console.log(`Loaded Shopify taxonomy ${shopify.taxonomy_version_stable}`);
  console.log(`  ${shopify.values.length} canonical color values\n`);

  // 2) Look up the tenant by slug.
  const { data: tenant } = await supabaseAdmin
    .from('strategy_tenants')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant) {
    console.error(`Tenant with slug "${slug}" not found in strategy_tenants.`);
    console.error('Create the tenant first via the normal onboarding flow, then re-run this script.');
    process.exit(1);
  }
  const tenantRow = tenant as { id: string; slug: string; name: string };
  console.log(`Tenant: ${tenantRow.name} (${tenantRow.id})\n`);

  // 3) Snapshot current state.
  const { data: existing } = await supabaseAdmin
    .from('strategy_taxonomies')
    .select('version, is_active')
    .eq('tenant_id', tenantRow.id)
    .eq('taxonomy_kind', 'color')
    .order('created_at', { ascending: false });
  console.log(`Existing color taxonomy rows: ${existing?.length ?? 0}`);
  for (const row of (existing ?? []) as Array<{ version: string; is_active: boolean }>) {
    console.log(`  v${row.version} · is_active=${row.is_active}`);
  }
  console.log();

  // 4) Build the mapping in the shape the engine expects.
  // The "code" for Shopify tenants is the GID numeric suffix (the stable
  // taxonomy_value id). Engine looks up colors by this code. The handle
  // and GID are preserved in mapping for downstream reference.
  const codeToName: Record<string, string> = {};
  const codeToHex: Record<string, string> = {};
  const codeToGid: Record<string, string> = {};
  const codeToHandle: Record<string, string> = {};
  for (const v of shopify.values) {
    const code = String(v.id);
    codeToName[code] = v.name.toLowerCase().replace(/\s+/g, '_'); // e.g., "rose_gold"
    codeToHex[code] = v.hex_aimily_editorial;
    codeToGid[code] = v.gid;
    codeToHandle[code] = v.handle;
  }

  const mapping = {
    code_to_name: codeToName,
    code_to_hex: codeToHex,
    code_to_gid: codeToGid,
    code_to_handle: codeToHandle,
    // Per-code provenance — Shopify canonical = authoritative source for
    // structure, hex is aimily editorial.
    code_provenance: Object.fromEntries(
      shopify.values.map((v) => [
        String(v.id),
        {
          source: 'shopify_canonical',
          shopify_gid: v.gid,
          shopify_handle: v.handle,
          hex_source: 'aimily_editorial',
        },
      ])
    ),
  };

  const newVersion = `${shopify.taxonomy_version_stable}-shopify-canonical`;
  const reviewerNotes =
    `Shopify canonical color taxonomy (${shopify.taxonomy_version_stable}) — the 19 standard ` +
    `values from gid://shopify/TaxonomyAttribute/1 (Color). Source: ` +
    `github.com/Shopify/product-taxonomy. Hex codes are aimily editorial defaults (Shopify ` +
    `does NOT publish hex in the taxonomy — it's a per-merchant theme/metaobject concern). ` +
    `IMPORTANT: at the Shopify variant level, merchants store color as free text in ` +
    `Option1 Value. A fuzzy-matcher (TODO) will normalize free text to the canonical handles ` +
    `at ingest time. This taxonomy is the ANCHOR; ingest path needs to map "forest green" → ` +
    `handle "color__green" → code "8" (etc.) before reaching the engine.`;

  // 5) Deactivate prior color taxonomies for this tenant.
  console.log('Deactivating prior color taxonomy versions...');
  const { error: deactErr } = await supabaseAdmin
    .from('strategy_taxonomies')
    .update({ is_active: false })
    .eq('tenant_id', tenantRow.id)
    .eq('taxonomy_kind', 'color');
  if (deactErr) {
    console.error('Deactivate failed:', deactErr.message);
    process.exit(1);
  }
  console.log('Done.\n');

  // 6) Insert the new row.
  console.log(`Inserting v${newVersion} with ${Object.keys(codeToName).length} canonical codes...`);
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('strategy_taxonomies')
    .insert({
      tenant_id: tenantRow.id,
      taxonomy_kind: 'color',
      version: newVersion,
      mapping,
      is_active: true,
      reviewer_notes: reviewerNotes,
    })
    .select('id, version, is_active')
    .single();
  if (insErr) {
    console.error('Insert failed:', insErr.message);
    process.exit(1);
  }
  console.log(`Inserted: ${(inserted as { id: string }).id}\n`);

  // 7) Verify final state.
  console.log(`Color taxonomy state for tenant ${tenantRow.slug}:`);
  const { data: after } = await supabaseAdmin
    .from('strategy_taxonomies')
    .select('version, is_active')
    .eq('tenant_id', tenantRow.id)
    .eq('taxonomy_kind', 'color')
    .order('created_at', { ascending: false });
  for (const row of (after ?? []) as Array<{ version: string; is_active: boolean }>) {
    console.log(`  v${row.version} · is_active=${row.is_active}`);
  }

  console.log(`\nSample mappings:`);
  console.log(`  1 → ${codeToName['1']} · ${codeToHex['1']} · ${codeToHandle['1']}`);
  console.log(`  6 → ${codeToName['6']} · ${codeToHex['6']} · ${codeToHandle['6']}`);
  console.log(`  17 → ${codeToName['17']} · ${codeToHex['17']} · ${codeToHandle['17']}`);

  console.log('\n=== Done ===\n');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
