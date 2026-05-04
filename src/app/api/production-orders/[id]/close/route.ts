/**
 * POST /api/production-orders/[id]/close
 *   Body: { actual_total_cost: number, notes?: string }
 *
 * Settles a PO with the real money paid. variance_total and
 * variance_pct are GENERATED columns, so the response shows them
 * computed automatically.
 *
 * Stamps closed_at + close_notes for the audit trail. Logs to
 * audit_log so the variance dashboard can filter "PO settled
 * within last N days".
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ReqBody {
  actual_total_cost: number;
  notes?: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Number.isFinite(body.actual_total_cost) || body.actual_total_cost < 0) {
    return NextResponse.json({ error: 'actual_total_cost must be a non-negative number' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('production_orders')
    .select('id, collection_plan_id, total_cost, status')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ownership = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'approve_production');
  if (!ownership.authorized) return ownership.error;

  const closedAt = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from('production_orders')
    .update({
      actual_total_cost: body.actual_total_cost,
      close_notes: body.notes ?? null,
      closed_at: closedAt,
      status: 'closed',
      updated_at: closedAt,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit({
    userId: user.id,
    collectionPlanId: existing.collection_plan_id,
    action: AUDIT_ACTIONS.PO_CLOSED_WITH_VARIANCE,
    entityType: 'production_order',
    entityId: id,
    metadata: {
      projected: existing.total_cost,
      actual: body.actual_total_cost,
      variance_total: updated.variance_total,
      variance_pct: updated.variance_pct,
    },
  });

  return NextResponse.json({ order: updated });
}
