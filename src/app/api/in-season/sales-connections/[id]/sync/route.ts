/**
 * POST /api/in-season/sales-connections/[id]/sync · Felipe 2026-05-19 Sprint 4.
 *
 * Manual sync trigger for a single connection. Tenant member with analyst+
 * role can fire this to pull fresh data without waiting for the daily cron.
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §4.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncSalesConnection } from '@/lib/strategy/sync-sales-connection';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const { data: conn } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select('tenant_id')
    .eq('id', id)
    .single();
  if (!conn) return NextResponse.json({ error: 'connection not found' }, { status: 404 });

  const access = await requireStrategyAccess({
    tenantId: (conn as { tenant_id: string }).tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;

  const outcome = await syncSalesConnection(id, 'manual');
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 502 });
}
