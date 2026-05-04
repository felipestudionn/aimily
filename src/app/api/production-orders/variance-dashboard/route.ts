/**
 * GET /api/production-orders/variance-dashboard?planId=X
 *
 * Returns all production orders for a collection ordered by close
 * date desc, with their variance fields. Powers the variance page
 * + collection-level KPIs.
 *
 * Open POs (no actual_total_cost yet) come back with variance NULL —
 * the UI separates them from settled rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const planId = req.nextUrl.searchParams.get('planId');
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

  const ownership = await verifyCollectionOwnership(user.id, planId);
  if (!ownership.authorized) return ownership.error;

  const { data, error } = await supabaseAdmin
    .from('production_orders')
    .select(
      'id, order_number, factory_name, status, order_date, estimated_delivery, actual_delivery, total_units, total_cost, currency, actual_total_cost, variance_total, variance_pct, closed_at, close_notes',
    )
    .eq('collection_plan_id', planId)
    .order('closed_at', { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = data ?? [];
  const settled = orders.filter((o) => o.actual_total_cost != null);
  const overrun = settled.filter((o) => Number(o.variance_pct ?? 0) > 0);
  const underrun = settled.filter((o) => Number(o.variance_pct ?? 0) < 0);
  const onTarget = settled.filter((o) => Number(o.variance_pct ?? 0) === 0);

  const avgVariancePct = settled.length
    ? settled.reduce((acc, o) => acc + Number(o.variance_pct ?? 0), 0) / settled.length
    : 0;
  const totalOverrunEur = overrun.reduce((acc, o) => acc + Number(o.variance_total ?? 0), 0);

  return NextResponse.json({
    orders,
    summary: {
      total: orders.length,
      settled: settled.length,
      open: orders.length - settled.length,
      overrun: overrun.length,
      underrun: underrun.length,
      on_target: onTarget.length,
      avg_variance_pct: Math.round(avgVariancePct * 100) / 100,
      total_overrun_eur: Math.round(totalOverrunEur * 100) / 100,
    },
  });
}
