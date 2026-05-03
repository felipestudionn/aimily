/**
 * One-shot ingestor: full Pantone TCX (Fashion, Home & Interiors)
 * catalog → Supabase pantone_colors table.
 *
 * Source dataset: https://github.com/Margaret2/pantone-colors
 * (community-maintained, 2,310 entries from the Fashion+Home+Interiors
 * collection; archived November 2022). Hex values are public per the
 * dataset's README — Pantone publishes them on the brand site.
 *
 * Each entry is converted hex → RGB → CIE-Lab (D65) at ingest time so
 * the closest-match algorithm in PantonePicker can run pure in-DB.
 *
 * Idempotent: upsert on `code`. Run with:
 *   npx tsx scripts/ingest-pantone-tcx-full.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}
const supabase = createClient(url, key);

interface NumbersEntry {
  name: string;
  hex: string;
}

// ─── Color math (sRGB → XYZ → Lab D65) — mirrors src/lib/pantone-library/color-math.ts.

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  // sRGB D65 → XYZ
  let X = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  let Y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  let Z = lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041;
  // Reference white D65
  X /= 0.95047;
  Y /= 1.0;
  Z /= 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function titleCase(slug: string): string {
  // "snow-white" → "Snow White"
  return slug
    .split('-')
    .map((w) => (w.length === 0 ? '' : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

// Family is inferred from Lab. Coarse but useful for the picker's
// "browse by family" tab and a sane index in BD.
function inferFamily(L: number, a: number, b: number): string {
  // Neutral (low chroma)
  const chroma = Math.sqrt(a * a + b * b);
  if (chroma < 8) {
    if (L > 88) return 'White';
    if (L < 18) return 'Black';
    if (L < 45) return 'Gray';
    return 'Neutral';
  }
  // Hue angle in degrees
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  if (h < 12 || h >= 340) return 'Red';
  if (h < 36) return 'Orange';
  if (h < 70) return 'Yellow';
  if (h < 100) return 'Yellow-Green';
  if (h < 165) return 'Green';
  if (h < 200) return 'Teal';
  if (h < 240) return 'Blue';
  if (h < 290) return 'Purple';
  if (h < 340) return 'Pink';
  return 'Red';
}

async function main() {
  const raw = readFileSync('/tmp/pantone-numbers.json', 'utf8');
  const map = JSON.parse(raw) as Record<string, NumbersEntry>;
  const codes = Object.keys(map);
  console.log(`Loaded ${codes.length} TCX entries from local cache.`);

  const rows = codes.map((code) => {
    const entry = map[code];
    const hex = entry.hex.startsWith('#') ? entry.hex.toLowerCase() : `#${entry.hex.toLowerCase()}`;
    const { r, g, b } = hexToRgb(hex);
    const lab = rgbToLab(r, g, b);
    return {
      code: `${code} TCX`,
      name: titleCase(entry.name),
      series: 'TCX' as const,
      family: inferFamily(lab.l, lab.a, lab.b),
      hex,
      rgb_r: r,
      rgb_g: g,
      rgb_b: b,
      lab_l: Number(lab.l.toFixed(2)),
      lab_a: Number(lab.a.toFixed(2)),
      lab_b: Number(lab.b.toFixed(2)),
    };
  });

  console.log(`Upserting ${rows.length} rows in batches of 500…`);
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('pantone_colors').upsert(slice, { onConflict: 'code' });
    if (error) {
      console.error(`Batch ${i}-${i + slice.length} failed:`, error);
      process.exit(1);
    }
    console.log(`  ${i + slice.length}/${rows.length} ✓`);
  }

  const { count } = await supabase.from('pantone_colors').select('*', { count: 'exact', head: true });
  console.log(`Done. pantone_colors now has ${count} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
