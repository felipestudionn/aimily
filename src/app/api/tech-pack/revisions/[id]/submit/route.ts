/* ═══════════════════════════════════════════════════════════════════
   POST /api/tech-pack/revisions/[id]/submit
     → Submits a draft revision for design_review. Caller must have
     edit_design permission on the underlying collection.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { submitForReview } from '@/lib/tech-pack/revisions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { sendApprovalNotification } from '@/lib/approval-emails';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: rev } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('id, sku_id, collection_plan_id, version')
    .eq('id', id)
    .maybeSingle();
  if (!rev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ownership = await verifyCollectionOwnership(user!.id, rev.collection_plan_id, 'edit_design');
  if (!ownership.authorized) return ownership.error;

  const updated = await submitForReview(
    id,
    user!.id,
    user!.user_metadata?.full_name ?? user!.email ?? null,
  );
  if (!updated) {
    return NextResponse.json({ error: 'Could not submit revision' }, { status: 500 });
  }

  logAudit({
    userId: user!.id,
    collectionPlanId: rev.collection_plan_id,
    action: AUDIT_ACTIONS.TECH_PACK_REVISION_SUBMITTED,
    entityType: 'tech_pack_revision',
    entityId: id,
    metadata: { skuId: rev.sku_id, version: rev.version },
  });

  // Notify reviewers — best-effort, never block the response.
  void sendApprovalNotification({
    collectionPlanId: rev.collection_plan_id,
    skuId: rev.sku_id,
    revisionId: id,
    version: updated.version,
    stage: 'design_review',
    triggeredBy: user!.id,
    triggeredByName: user!.user_metadata?.full_name ?? user!.email ?? null,
  });

  return NextResponse.json({ revision: updated });
}
