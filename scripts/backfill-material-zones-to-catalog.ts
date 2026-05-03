/**
 * One-shot backfill: walk every SKU's tech-pack BOM lines and
 * collection_skus.material_zones, fuzzy-match free-text material
 * names to the materials_library catalog, and stamp `material_id`
 * back so downstream consumers (compliance, vendor portal, reports)
 * can dereference without fuzzy match again.
 *
 * Idempotent — re-running matches already-linked entries by id, then
 * tries to upgrade unlinked ones. Existing material_id values are
 * never overwritten.
 *
 * Match rule:
 *   - exact-name (case-insensitive, alphanumeric-only) → catalog hit
 *   - substring containment (>= 5 chars) → catalog hit
 *   - else: leave unlinked, log
 *
 * Run with: npx tsx scripts/backfill-material-zones-to-catalog.ts
 */

import { createClient } from '@supabase/supabase-js';
import { CATALOG } from '../src/lib/materials-library';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}
const supabase = createClient(url, key);

interface BomLine {
  type?: string;
  material?: string;
  qty?: string;
  unit?: string;
  supplier?: string;
  cost?: string;
  material_id?: string;
}
interface MaterialZone {
  name?: string;
  pantone?: string;
  supplier?: string;
  swatchUrl?: string;
  notes?: string;
  material_id?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

function matchInCatalog(name: string): string | null {
  if (!name) return null;
  const n = norm(name);
  if (!n) return null;
  // Exact normalised match first.
  for (const m of CATALOG) {
    if (norm(m.name) === n) return m.id;
  }
  // Substring match — both directions, longest-prefix first.
  let best: { id: string; len: number } | null = null;
  for (const m of CATALOG) {
    const mn = norm(m.name);
    if (mn.length < 5) continue;
    if (n.includes(mn) || mn.includes(n)) {
      if (!best || mn.length > best.len) best = { id: m.id, len: mn.length };
    }
  }
  return best?.id ?? null;
}

async function backfillBom() {
  console.log('Backfilling tech_pack_data.bom.lines …');
  const { data: rows } = await supabase
    .from('tech_pack_data')
    .select('id, sku_id, bom')
    .not('bom', 'is', null);
  let updated = 0;
  let matched = 0;
  let unmatched = 0;
  for (const row of rows ?? []) {
    const lines = ((row.bom as { lines?: BomLine[] } | null)?.lines ?? []) as BomLine[];
    if (lines.length === 0) continue;
    let dirty = false;
    const next = lines.map((l) => {
      if (l.material_id || !l.material) return l;
      const id = matchInCatalog(l.material);
      if (id) {
        matched += 1;
        dirty = true;
        return { ...l, material_id: id };
      }
      unmatched += 1;
      return l;
    });
    if (dirty) {
      await supabase.from('tech_pack_data').update({ bom: { ...(row.bom as object), lines: next } }).eq('id', row.id);
      updated += 1;
    }
  }
  console.log(`  rows updated: ${updated}, lines matched: ${matched}, unmatched: ${unmatched}`);
}

async function backfillMaterialZones() {
  console.log('Backfilling collection_skus.material_zones …');
  const { data: skus } = await supabase
    .from('collection_skus')
    .select('id, material_zones')
    .not('material_zones', 'is', null);
  let updated = 0;
  let matched = 0;
  let unmatched = 0;
  for (const sku of skus ?? []) {
    const mz = sku.material_zones;
    // Two shapes seen in production:
    //   - bare array: MaterialZone[]
    //   - wrapped:    { zones: MaterialZone[] }
    const isArray = Array.isArray(mz);
    const zones = (isArray ? mz : (mz as { zones?: MaterialZone[] } | null)?.zones ?? []) as MaterialZone[];
    if (!zones || zones.length === 0) continue;

    let dirty = false;
    const next = zones.map((z) => {
      if (z.material_id || !z.name) return z;
      const id = matchInCatalog(z.name);
      if (id) {
        matched += 1;
        dirty = true;
        return { ...z, material_id: id };
      }
      unmatched += 1;
      return z;
    });
    if (dirty) {
      const newValue = isArray ? next : { ...(mz as object), zones: next };
      await supabase.from('collection_skus').update({ material_zones: newValue }).eq('id', sku.id);
      updated += 1;
    }
  }
  console.log(`  SKUs updated: ${updated}, zones matched: ${matched}, unmatched: ${unmatched}`);
}

async function main() {
  await backfillBom();
  await backfillMaterialZones();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
