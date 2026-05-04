/**
 * Daily cron — refresh ECB Euro FX reference rates.
 *
 * ECB publishes daily around 16:00 CET. Schedule the Vercel cron at
 * 17:00 CET (16:00 UTC in winter, 15:00 UTC in summer — settle on
 * 16:00 UTC for consistency).
 *
 * Auth: Bearer CRON_SECRET.
 *
 * Source: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 * Format:
 *   <Cube time='YYYY-MM-DD'>
 *     <Cube currency='USD' rate='1.0732'/>
 *     ...
 *   </Cube>
 *
 * Adds an EUR=1.0 anchor row so consumers can treat EUR symmetrically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

function verifyCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

interface ParsedRate {
  currency: string;
  rate: number;
}

function parseEcbXml(xml: string): { rateDate: string | null; rates: ParsedRate[] } {
  const dateMatch = /<Cube[^>]*time=['"]([\d-]+)['"]/i.exec(xml);
  const rateDate = dateMatch?.[1] ?? null;

  const rates: ParsedRate[] = [];
  const re = /<Cube[^>]*currency=['"]([A-Z]{3})['"][^>]*rate=['"]([\d.]+)['"]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const r = parseFloat(m[2]);
    if (Number.isFinite(r) && r > 0) rates.push({ currency: m[1], rate: r });
  }
  return { rateDate, rates };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let xml: string;
  try {
    const res = await fetch(ECB_URL, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `ECB ${res.status}` }, { status: 502 });
    }
    xml = await res.text();
  } catch (err) {
    console.error('[fx-rates] ECB fetch failed:', err);
    return NextResponse.json({ error: 'ECB fetch failed' }, { status: 502 });
  }

  const { rateDate, rates } = parseEcbXml(xml);
  if (!rateDate || rates.length === 0) {
    return NextResponse.json({ error: 'ECB XML parse produced no rates' }, { status: 502 });
  }

  // Anchor row for EUR — consumers can convert via the same lookup.
  const rows = [
    { currency: 'EUR', eur_rate: 1, rate_date: rateDate },
    ...rates.map((r) => ({ currency: r.currency, eur_rate: r.rate, rate_date: rateDate })),
  ];

  const { error } = await supabaseAdmin
    .from('fx_rates')
    .upsert(rows, { onConflict: 'currency' });
  if (error) {
    console.error('[fx-rates] upsert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, date: rateDate, count: rows.length });
}
