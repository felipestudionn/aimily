/* ═══════════════════════════════════════════════════════════════════
   POST /api/tech-pack/revisions/[id]/decide
     Body: { decision: 'approved' | 'rejected', notes?, signature_image_url? }
     → Reviewer decision on a revision currently in design_review,
     merch_review, or production_review. Approval advances to the
     next stage; rejection sends it back to draft.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { transitionApproval } from '@/lib/tech-pack/revisions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { sendApprovalNotification } from '@/lib/approval-emails';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ReqBody {
  decision: 'approved' | 'rejected';
  notes?: string;
  signature_image_url?: string;
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
  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be approved | rejected' }, { status: 400 });
  }

  const { data: rev } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('id, sku_id, collection_plan_id, version, approval_status')
    .eq('id', id)
    .maybeSingle();
  if (!rev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Reviewers need approval permission. We map every review stage to
  // the same `approve_production` permission for now — when we add
  // stage-specific reviewer policies (Phase 3.5b), this becomes a
  // mapping table. Owners always pass.
  const ownership = await verifyCollectionOwnership(user!.id, rev.collection_plan_id, 'approve_production');
  if (!ownership.authorized) return ownership.error;

  if (
    rev.approval_status !== 'design_review' &&
    rev.approval_status !== 'merch_review' &&
    rev.approval_status !== 'production_review'
  ) {
    return NextResponse.json(
      { error: `Revision is in '${rev.approval_status}', no decision pending` },
      { status: 409 },
    );
  }

  const updated = await transitionApproval({
    revisionId: id,
    reviewerId: user!.id,
    reviewerName: user!.user_metadata?.full_name ?? user!.email ?? null,
    decision: body.decision,
    notes: body.notes ?? null,
    signatureImageUrl: body.signature_image_url ?? null,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Could not record decision' }, { status: 500 });
  }

  logAudit({
    userId: user!.id,
    collectionPlanId: rev.collection_plan_id,
    action:
      body.decision === 'approved'
        ? AUDIT_ACTIONS.TECH_PACK_REVISION_APPROVED
        : AUDIT_ACTIONS.TECH_PACK_REVISION_REJECTED,
    entityType: 'tech_pack_revision',
    entityId: id,
    metadata: {
      skuId: rev.sku_id,
      version: updated.version,
      from: rev.approval_status,
      to: updated.approval_status,
      notes: body.notes,
    },
  });

  // Notify the next-stage reviewer (or the designer if rejected /
  // fully approved). Best-effort, never block.
  void sendApprovalNotification({
    collectionPlanId: rev.collection_plan_id,
    skuId: rev.sku_id,
    revisionId: id,
    version: updated.version,
    stage: updated.approval_status,
    notes: body.notes ?? null,
    triggeredBy: user!.id,
    triggeredByName: user!.user_metadata?.full_name ?? user!.email ?? null,
  });

  return NextResponse.json({ revision: updated });
}
