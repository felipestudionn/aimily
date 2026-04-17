import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecision } from '@/lib/collection-intelligence';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/collection-plans/[id]/lock-selection
 *
 * Locks the Final Selection lineup. All approved SKUs (production_approved=true)
 * in phases production|completed get their design_phase bumped to 'completed'.
 * A CIS decision is recorded so downstream views and AI prompts know the
 * selection is frozen.
 *
 * Body (optional): { note?: string } — free-form rationale from the user.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { id } = await params;
  const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, id);
  if (!authorized) return ownerError;

  const body = await req.json().catch(() => ({}));
  const note: string | undefined = typeof body?.note === 'string' ? body.note : undefined;

  const { data: approvedSkus, error: loadErr } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, family, buy_units, expected_sales, drop_number, type, design_phase, production_approved')
    .eq('collection_plan_id', id)
    .eq('production_approved', true);

  if (loadErr) {
    console.error('[lock-selection] load error', loadErr);
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }

  const approvedIds = (approvedSkus || []).map(s => s.id);

  if (approvedIds.length === 0) {
    return NextResponse.json({ error: 'Approve at least one SKU before locking the selection.' }, { status: 400 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from('collection_skus')
    .update({ design_phase: 'completed' })
    .in('id', approvedIds);

  if (updateErr) {
    console.error('[lock-selection] update error', updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const totalRevenue = (approvedSkus || []).reduce((sum, s) => sum + Number(s.expected_sales || 0), 0);
  const totalUnits = (approvedSkus || []).reduce((sum, s) => sum + Number(s.buy_units || 0), 0);
  const families = Array.from(new Set((approvedSkus || []).map(s => s.family).filter(Boolean)));
  const lockedAt = new Date().toISOString();

  await recordDecision({
    collectionPlanId: id,
    domain: 'merchandising',
    subdomain: 'final_selection',
    key: 'locked_at',
    value: {
      locked_at: lockedAt,
      sku_count: approvedIds.length,
      total_revenue: totalRevenue,
      total_units: totalUnits,
      families,
      note: note || null,
    },
    valueType: 'object',
    rationale: note,
    confidence: 'confirmed',
    source: 'user_input',
    sourcePhase: 'design_development',
    sourceComponent: 'FinalSelectionWorkspace',
    tags: ['final_selection', 'locked'],
    userId: user.id,
  });

  logAudit({
    userId: user.id,
    collectionPlanId: id,
    action: AUDIT_ACTIONS.SELECTION_LOCKED,
    entityType: 'collection',
    entityId: id,
    metadata: { sku_count: approvedIds.length, total_revenue: totalRevenue, total_units: totalUnits },
  });

  return NextResponse.json({
    locked_at: lockedAt,
    sku_count: approvedIds.length,
    total_revenue: totalRevenue,
    total_units: totalUnits,
    families,
  });
}
