/**
 * One-shot seed: TS materials catalog → Supabase materials_library table.
 *
 * Idempotent — uses upsert on `id`. Run with:
 *   npx tsx scripts/seed-materials-library.ts
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { CATALOG, type Material } from '../src/lib/materials-library';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

interface Row {
  id: string;
  name: string;
  layer: string;
  parent_id: string | null;
  family: string;
  composition: string;
  weight_min: number | null;
  weight_max: number | null;
  weight_unit: string | null;
  default_finish: string | null;
  finish_options: string[];
  zones: string[];
  subtypes: string[];
  price_tier: string[];
  aesthetic_tags: string[];
  season_fit: string[];
  certifications: string[];
  rsl_flags: string[];
  vegan: boolean;
  cites_status: string | null;
  cogs_value: number | null;
  cogs_unit: string | null;
  cogs_currency: string | null;
  supplier_name: string | null;
  supplier_origin: string | null;
  supplier_url: string | null;
}

function toRow(m: Material): Row {
  return {
    id: m.id,
    name: m.name,
    layer: m.layer,
    parent_id: m.parentId ?? null,
    family: m.family,
    composition: m.composition,
    weight_min: m.weightRange?.min ?? null,
    weight_max: m.weightRange?.max ?? null,
    weight_unit: m.weightRange?.unit ?? null,
    default_finish: m.defaultFinish ?? null,
    finish_options: m.finishOptions ?? [],
    zones: m.zones ?? [],
    subtypes: m.subtypes ?? [],
    price_tier: m.priceTier ?? [],
    aesthetic_tags: m.aestheticTags ?? [],
    season_fit: m.seasonFit ?? [],
    certifications: (m.certifications ?? []) as string[],
    rsl_flags: m.rslFlags ?? [],
    vegan: m.vegan,
    cites_status: m.citesStatus ?? null,
    cogs_value: m.cogsHint?.value ?? null,
    cogs_unit: m.cogsHint?.unit ?? null,
    cogs_currency: m.cogsHint?.currency ?? null,
    supplier_name: m.supplier?.name ?? null,
    supplier_origin: m.supplier?.origin ?? null,
    supplier_url: m.supplier?.url ?? null,
  };
}

async function main() {
  // Deduplicate by id — the TS catalog has a handful of legitimate
  // collisions (supplier entries listed under multiple ramas). First
  // occurrence wins; the rest are dropped from the seed.
  const seen = new Set<string>();
  const unique = CATALOG.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  if (unique.length < CATALOG.length) {
    console.log(`Dropped ${CATALOG.length - unique.length} duplicate ids from seed.`);
  }
  const rows = unique.map(toRow);
  console.log(`Seeding ${rows.length} materials…`);

  // Bulk upsert in batches of 500 to stay under the request body cap.
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('materials_library').upsert(slice, { onConflict: 'id' });
    if (error) {
      console.error(`Batch ${i}-${i + slice.length} failed:`, error);
      process.exit(1);
    }
    console.log(`  ${i + slice.length}/${rows.length} ✓`);
  }

  const { count } = await supabase.from('materials_library').select('*', { count: 'exact', head: true });
  console.log(`Done. materials_library now has ${count} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
