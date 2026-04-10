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
    const platform = req.nextUrl.searchParams.get('platform');
    const status = req.nextUrl.searchParams.get('status');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Reads are allowed to anyone with view_all on the collection.
    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: planId,
      permission: 'view_all',
    });
    if (!perm.allowed) return perm.error!;

    let query = supabaseAdmin
      .from('paid_campaigns')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: true });

    if (platform) query = query.eq('platform', platform);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching paid_campaigns:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();

    if (!body.collection_plan_id || !body.name || !body.platform) {
      return NextResponse.json(
        { error: 'collection_plan_id, name, and platform are required' },
        { status: 400 }
      );
    }

    // Paid campaigns carry budgets → financial-grade permission.
    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId: body.collection_plan_id,
      permission: 'edit_paid_campaigns',
    });
    if (!perm.allowed) return perm.error!;

    const { data, error } = await supabaseAdmin
      .from('paid_campaigns')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    logAudit({
      userId: user!.id,
      collectionPlanId: body.collection_plan_id,
      action: AUDIT_ACTIONS.PAID_CAMPAIGN_CREATED,
      entityType: 'paid_campaign',
      entityId: data.id,
      metadata: {
        name: data.name,
        platform: data.platform,
        budget: data.budget,
        status: data.status,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating paid_campaign:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
