/**
 * One-shot: fetch ECB FX rates and populate fx_rates immediately,
 * so the table isn't empty between deploy and the first cron fire.
 *   npx tsx scripts/seed-fx-rates-now.ts
 */

import { createClient } from '@supabase/supabase-js';
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
  const res = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
  if (!res.ok) {
    console.error('ECB fetch failed:', res.status);
    process.exit(1);
  }
  const xml = await res.text();
  const dateMatch = /<Cube[^>]*time=['"]([\d-]+)['"]/i.exec(xml);
  const rateDate = dateMatch?.[1];
  if (!rateDate) {
    console.error('Could not parse date');
    process.exit(1);
  }
  const re = /<Cube[^>]*currency=['"]([A-Z]{3})['"][^>]*rate=['"]([\d.]+)['"]/gi;
  const rows: Array<{ currency: string; eur_rate: number; rate_date: string }> = [
    { currency: 'EUR', eur_rate: 1, rate_date: rateDate },
  ];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    rows.push({ currency: m[1], eur_rate: parseFloat(m[2]), rate_date: rateDate });
  }
  console.log(`Fetched ${rows.length} rates for ${rateDate}.`);
  const { error } = await supabase.from('fx_rates').upsert(rows, { onConflict: 'currency' });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const { count } = await supabase.from('fx_rates').select('*', { count: 'exact', head: true });
  console.log(`Done. fx_rates has ${count} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
