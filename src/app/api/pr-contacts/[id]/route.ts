import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';
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
      .from('pr_contacts')
      .select('collection_plan_id, name')
      .eq('id', id)
      .single();

    if (!existing?.collection_plan_id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: existing.collection_plan_id,
      permission: 'manage_pr_contacts',
    });
    if (!perm.allowed) return perm.error!;

    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('pr_contacts')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logAudit({
      userId: user!.id,
      collectionPlanId: existing.collection_plan_id,
      action: AUDIT_ACTIONS.PR_CONTACT_UPDATED,
      entityType: 'pr_contact',
      entityId: id,
      metadata: { updated_fields: Object.keys(body) },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating pr_contacts:', error);
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
      .from('pr_contacts')
      .select('collection_plan_id, name')
      .eq('id', id)
      .single();

    if (!existing?.collection_plan_id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: existing.collection_plan_id,
      permission: 'manage_pr_contacts',
    });
    if (!perm.allowed) return perm.error!;

    const { error } = await supabaseAdmin
      .from('pr_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logAudit({
      userId: user!.id,
      collectionPlanId: existing.collection_plan_id,
      action: AUDIT_ACTIONS.PR_CONTACT_DELETED,
      entityType: 'pr_contact',
      entityId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pr_contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
