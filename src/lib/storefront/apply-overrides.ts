/* ═══════════════════════════════════════════════════════════════════
   apply-overrides · merges storefront_overrides into StorefrontData

   Pattern: each storefront_overrides row has page_id + field_overrides
   (JSONB map of "dot.path" → string). For each override, we set the
   target path on the data object. Non-string values are not supported
   in MVP — only copy edits.

   Path examples:
     "hero.title"               → data.brand.tagline (heuristic mapping)
     "about.body"               → data.brand.manifesto
     "sku.<uuid>.description"   → data.skus[?id===uuid].description
     "contact.email"            → data.brand.contact.email
   ═══════════════════════════════════════════════════════════════════ */

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { StorefrontData } from './types';

interface FieldOverridesRow {
  page_id: string;
  field_overrides: Record<string, string>;
}

const FIELD_HANDLERS: Array<{
  match: RegExp;
  apply: (data: StorefrontData, value: string, captures: string[]) => void;
}> = [
  // Brand-level fields
  { match: /^brand\.tagline$/,        apply: (d, v) => { d.brand.tagline = v; } },
  { match: /^brand\.manifesto$/,      apply: (d, v) => { d.brand.manifesto = v; } },
  { match: /^brand\.name$/,           apply: (d, v) => { d.brand.name = v; } },

  // Hero (home page) — semantic alias for tagline
  { match: /^hero\.title$/,           apply: (d, v) => { d.brand.tagline = v; } },

  // Collection
  { match: /^collection\.name$/,      apply: (d, v) => { d.collection.name = v; } },
  { match: /^collection\.narrative$/, apply: (d, v) => { d.collection.narrative = v; } },

  // Contact
  { match: /^contact\.email$/,        apply: (d, v) => { d.brand.contact.email = v; } },
  { match: /^contact\.instagram$/,    apply: (d, v) => { d.brand.contact.instagram = v; } },
  { match: /^contact\.address$/,      apply: (d, v) => { d.brand.contact.address = v; } },

  // Per-SKU overrides — sku.<id>.description / .name / .storyHook
  {
    match: /^sku\.([a-f0-9-]+)\.(name|description|storyHook)$/,
    apply: (d, v, caps) => {
      const [, id, field] = caps;
      const sku = d.skus.find((s) => s.id === id);
      if (sku && (field === 'name' || field === 'description' || field === 'storyHook')) {
        sku[field] = v;
      }
    },
  },
];

export function applyOverridesToData(
  data: StorefrontData,
  overrides: FieldOverridesRow[],
): StorefrontData {
  // Mutate a deep-ish clone to keep input pure
  const out: StorefrontData = JSON.parse(JSON.stringify(data));

  for (const row of overrides) {
    for (const [path, value] of Object.entries(row.field_overrides ?? {})) {
      if (typeof value !== 'string') continue;
      for (const handler of FIELD_HANDLERS) {
        const m = path.match(handler.match);
        if (m) {
          handler.apply(out, value, m as unknown as string[]);
          break;
        }
      }
    }
  }

  return out;
}

export async function loadAndApplyOverrides(
  storefrontId: string,
  data: StorefrontData,
): Promise<StorefrontData> {
  const { data: rows, error } = await supabaseAdmin
    .from('storefront_overrides')
    .select('page_id, field_overrides')
    .eq('storefront_id', storefrontId);

  if (error || !rows || rows.length === 0) return data;

  return applyOverridesToData(data, rows as FieldOverridesRow[]);
}
