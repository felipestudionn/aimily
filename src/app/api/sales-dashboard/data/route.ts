/**
 * GET /api/sales-dashboard/data?cpId=...
 *
 * Sprint C · Sales Dashboard motor data loader.
 *
 * Returns all data the SalesDashboardEngine needs in a single round-trip:
 *   - sales strategy (CIS marketing.sales_strategy.*)
 *   - SKU lineup with launch dates
 *   - Drops with mechanic + window
 *   - Production orders (Block 3 actuals)
 *   - Forecast aggregates + actuals
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { loadSalesDashboardData } from '@/lib/sales-strategy/dashboard-data';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const cpId = req.nextUrl.searchParams.get('cpId');
  if (!cpId) {
    return NextResponse.json(
      { error: 'cpId query param required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, cpId);
  if (!ownership.authorized) return ownership.error;

  try {
    const data = await loadSalesDashboardData(cpId);
    return NextResponse.json({ result: data });
  } catch (err) {
    console.error('[SalesDashboard data] failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load' },
      { status: 500 },
    );
  }
}
