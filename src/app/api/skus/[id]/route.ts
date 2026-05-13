import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/skus/[id] - Get a single SKU
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('collection_skus')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching SKU:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 });
    }

    // Verify ownership via the SKU's collection_plan_id
    if (data.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, data.collection_plan_id);
      if (!authorized) return ownerError;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET SKU error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/skus/[id] - Update a SKU
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    // Fetch existing SKU to verify ownership + diff CIS-tracked fields.
    const { data: existing } = await supabaseAdmin
      .from('collection_skus')
      .select('collection_plan_id, design_phase, name, production_origin')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id);
      if (!authorized) return ownerError;
    }

    const body = await req.json();

    // Remove fields that shouldn't be updated directly
    const { id: _, created_at, updated_at, ...updates } = body;

    const { data, error } = await supabaseAdmin
      .from('collection_skus')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating SKU:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit sensitive actions (fire-and-forget)
    if (updates.production_approved) {
      logAudit({ userId: user.id, collectionPlanId: existing?.collection_plan_id, action: AUDIT_ACTIONS.PRODUCTION_APPROVED, entityType: 'sku', entityId: id, metadata: { skuName: data?.name } });
    }
    if (updates.design_phase && updates.design_phase !== existing?.design_phase) {
      logAudit({ userId: user.id, collectionPlanId: existing?.collection_plan_id, action: AUDIT_ACTIONS.DESIGN_PHASE_ADVANCED, entityType: 'sku', entityId: id, metadata: { from: existing?.design_phase, to: updates.design_phase } });
    }
    if (updates.production_data?.factory_name || updates.production_data?.factory_contact) {
      logAudit({ userId: user.id, collectionPlanId: existing?.collection_plan_id, action: AUDIT_ACTIONS.FACTORY_DETAILS_UPDATED, entityType: 'sku', entityId: id });
    }

    /* CIS: capture production origin so downstream AI / dashboards /
     * the production calendar see the same source of truth. We resolve
     * the lead time inside the recordDecision call so consumers don't
     * have to import landed-cost helpers just to use it. Awaited (not
     * fire-and-forget) for the same Fluid Compute / lambda-recycle
     * reason as the other CIS writes in this codebase. */
    if (updates.production_origin && updates.production_origin !== existing?.production_origin && existing?.collection_plan_id) {
      try {
        const { recordDecisions } = await import('@/lib/collection-intelligence');
        const { DEFAULT_LEAD_TIME_WEEKS_BY_ORIGIN } = await import('@/lib/costing/landed-cost');
        const lead = DEFAULT_LEAD_TIME_WEEKS_BY_ORIGIN[updates.production_origin] ?? DEFAULT_LEAD_TIME_WEEKS_BY_ORIGIN.default;
        await recordDecisions([
          {
            collectionPlanId: existing.collection_plan_id,
            sourcePhase: 'design',
            sourceComponent: 'OriginSelector',
            userId: user.id,
            domain: 'production',
            subdomain: 'origin',
            key: 'country',
            value: updates.production_origin,
            tags: ['affects_production', 'affects_pricing'],
          },
          {
            collectionPlanId: existing.collection_plan_id,
            sourcePhase: 'design',
            sourceComponent: 'OriginSelector',
            userId: user.id,
            domain: 'production',
            subdomain: 'origin',
            key: 'lead_time_weeks',
            value: { production: lead.production, transit: lead.transit, total: lead.production + lead.transit },
            tags: ['affects_production'],
          },
        ]);
      } catch (err) {
        console.error('[CIS] production_origin capture failed:', err);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH SKU error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/skus/[id] - Delete a SKU
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    // Fetch existing SKU to verify ownership
    const { data: existing } = await supabaseAdmin
      .from('collection_skus')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id);
      if (!authorized) return ownerError;
    }

    const { error } = await supabaseAdmin
      .from('collection_skus')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting SKU:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit SKU deletion
    logAudit({ userId: user.id, collectionPlanId: existing?.collection_plan_id, action: AUDIT_ACTIONS.SKU_DELETED, entityType: 'sku', entityId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE SKU error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
