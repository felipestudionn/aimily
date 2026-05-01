import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { mapWorkspaceToCIS } from '@/lib/ai/workspace-to-cis';

// GET /api/workspace-data?planId=xxx&workspace=creative
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    const workspace = searchParams.get('workspace');

    if (!planId || !workspace) {
      return NextResponse.json({ error: 'planId and workspace are required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('data, updated_at')
      .eq('collection_plan_id', planId)
      .eq('workspace', workspace)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found — return empty
      return NextResponse.json({ data: null });
    }

    if (error) {
      console.error('Error fetching workspace data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET workspace data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/workspace-data — Upsert workspace data
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const { planId, workspace, data } = body;

    if (!planId || !workspace || data === undefined) {
      return NextResponse.json({ error: 'planId, workspace, and data are required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data: result, error } = await supabaseAdmin
      .from('collection_workspace_data')
      .upsert(
        {
          collection_plan_id: planId,
          workspace,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'collection_plan_id,workspace' }
      )
      .select('data, updated_at')
      .single();

    if (error) {
      console.error('Error saving workspace data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* CIS write-through. Maps the saved blockData into collection_decisions
       so the prompt context is always fresh, even for users who never reach
       the downstream APIs (brand-profiles, voice-config, drops, stories…).
       recordDecisions handles version history + dedup internally.

       AWAITED, not fire-and-forget: Vercel Functions terminate the runtime
       once the response is sent, so a dangling promise can be killed before
       it reaches Postgres. The cost is small (writes are batched + parallel
       inside recordDecisions) and the data integrity guarantee is worth it
       for a save flow that already debounces 1s on the client. */
    if (workspace === 'creative' || workspace === 'merchandising' || workspace === 'design') {
      const decisions = mapWorkspaceToCIS({ collectionPlanId: planId, userId: user.id }, workspace, data);
      if (decisions.length) {
        const { recordDecisions } = await import('@/lib/collection-intelligence');
        try {
          await recordDecisions(decisions);
        } catch (err) {
          console.error('[CIS] workspace-data write-through failed:', err);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST workspace data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
