import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('content_calendar')
      .select('collection_plan_id, status, title')
      .eq('id', id)
      .single();

    if (!existing?.collection_plan_id) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await req.json();

    // Transitioning to 'published' requires publish_content; any other edit
    // requires edit_marketing.
    const isPublishing = body.status === 'published' && existing.status !== 'published';
    const requiredPermission = isPublishing ? 'publish_content' : 'edit_marketing';

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: existing.collection_plan_id,
      permission: requiredPermission,
    });
    if (!perm.allowed) return perm.error!;

    const { data, error } = await supabaseAdmin
      .from('content_calendar')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (isPublishing) {
      logAudit({
        userId: user!.id,
        collectionPlanId: existing.collection_plan_id,
        action: AUDIT_ACTIONS.CONTENT_PUBLISHED,
        entityType: 'content_calendar',
        entityId: id,
        metadata: { title: existing.title, platform: data.platform },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating content_calendar:', error);
    const message = error instanceof Error ? error.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('content_calendar')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    const { error } = await supabaseAdmin
      .from('content_calendar')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content_calendar:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
