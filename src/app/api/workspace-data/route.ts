import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/workspace-data?planId=xxx&workspace=creative
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    const workspace = searchParams.get('workspace');

    if (!planId || !workspace) {
      return NextResponse.json({ error: 'planId and workspace are required' }, { status: 400 });
    }

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
    const body = await req.json();
    const { planId, workspace, data } = body;

    if (!planId || !workspace || data === undefined) {
      return NextResponse.json({ error: 'planId, workspace, and data are required' }, { status: 400 });
    }

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

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST workspace data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
