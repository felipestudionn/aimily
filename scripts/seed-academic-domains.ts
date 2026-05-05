/**
 * Seed academic_domains table from whitelist JSON.
 *
 * Reads the whitelist produced by the StudioNN research agent and upserts
 * one row per (school × domain). Idempotent — re-running updates existing
 * rows by domain.
 *
 * Run:
 *   npx tsx scripts/seed-academic-domains.ts
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WHITELIST_PATH = resolve(
  process.cwd(),
  '../studionn-agency/clients/aimily-marketing/data/academic-domains-whitelist.json',
);

interface School {
  name: string;
  short_name?: string;
  country: string;
  city?: string;
  type?: string;
  fashion_programs: boolean;
  domains: string[];
  website?: string;
  notes?: string;
}

interface Whitelist {
  version: string;
  generated: string;
  total_schools: number;
  total_domains: number;
  schools: School[];
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');

  const supabase = createClient(url, key);

  const json = JSON.parse(readFileSync(WHITELIST_PATH, 'utf8')) as Whitelist;
  console.log(`Loaded whitelist v${json.version}: ${json.total_schools} schools, ${json.total_domains} domains`);

  const rows: Array<Record<string, unknown>> = [];
  for (const s of json.schools) {
    for (const d of s.domains) {
      rows.push({
        domain: d.toLowerCase().trim(),
        school_name: s.name,
        short_name: s.short_name ?? null,
        country: s.country,
        city: s.city ?? null,
        school_type: s.type ?? null,
        website: s.website ?? null,
        active: true,
        notes: s.notes ?? null,
      });
    }
  }

  console.log(`Upserting ${rows.length} domain rows…`);

  const { error, count } = await supabase
    .from('academic_domains')
    .upsert(rows, { onConflict: 'domain', count: 'exact' });

  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }

  console.log(`Done. Affected rows: ${count ?? rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
