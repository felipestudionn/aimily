import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    const type = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // PR contacts hold PII → require the dedicated permission even for reads.
    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: planId,
      permission: 'manage_pr_contacts',
    });
    if (!perm.allowed) return perm.error!;

    let query = supabaseAdmin
      .from('pr_contacts')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching pr_contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();

    if (!body.collection_plan_id || !body.name || !body.type) {
      return NextResponse.json(
        { error: 'collection_plan_id, name, and type are required' },
        { status: 400 }
      );
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: body.collection_plan_id,
      permission: 'manage_pr_contacts',
    });
    if (!perm.allowed) return perm.error!;

    const { data, error } = await supabaseAdmin
      .from('pr_contacts')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    logAudit({
      userId: user!.id,
      collectionPlanId: body.collection_plan_id,
      action: AUDIT_ACTIONS.PR_CONTACT_CREATED,
      entityType: 'pr_contact',
      entityId: data.id,
      metadata: { name: data.name, type: data.type, has_email: !!data.email },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating pr_contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
