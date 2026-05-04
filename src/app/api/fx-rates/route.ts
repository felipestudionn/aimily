/**
 * GET /api/fx-rates
 *
 * Returns the latest ECB Euro FX reference rates from the fx_rates
 * table. Cached 6h on the client — rates only change once a day.
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  void user;

  const { data, error } = await supabaseAdmin
    .from('fx_rates')
    .select('currency, eur_rate, rate_date')
    .order('currency', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      rates: data ?? [],
      base: 'EUR',
    },
    { headers: { 'Cache-Control': 'private, max-age=21600' } },
  );
}
