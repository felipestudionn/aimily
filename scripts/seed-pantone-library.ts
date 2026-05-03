/**
 * One-shot seed: TS Pantone catalog → Supabase pantone_colors table.
 * Idempotent (upsert on code).
 *   npx tsx scripts/seed-pantone-library.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PANTONE_CATALOG } from '../src/lib/pantone-library/catalog';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}
const supabase = createClient(url, key);

async function main() {
  const rows = PANTONE_CATALOG.map((c) => ({
    code: c.code,
    name: c.name,
    series: c.series,
    family: c.family,
    hex: c.hex,
    rgb_r: c.rgb.r,
    rgb_g: c.rgb.g,
    rgb_b: c.rgb.b,
    lab_l: c.lab.l,
    lab_a: c.lab.a,
    lab_b: c.lab.b,
  }));
  console.log(`Seeding ${rows.length} Pantone colors…`);
  const { error } = await supabase.from('pantone_colors').upsert(rows, { onConflict: 'code' });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const { count } = await supabase.from('pantone_colors').select('*', { count: 'exact', head: true });
  console.log(`Done. pantone_colors now has ${count} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
