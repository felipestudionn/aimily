import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { phase, configured, config_data } = await req.json();

  if (!phase) {
    return NextResponse.json({ error: 'phase is required' }, { status: 400 });
  }

  // Get current setup_data
  const { data: plan, error: fetchErr } = await supabaseAdmin
    .from('collection_plans')
    .select('setup_data')
    .eq('id', id)
    .single();

  if (fetchErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const setupData = plan.setup_data || {};
  const workspaceConfig = setupData.workspace_config || {};

  workspaceConfig[phase] = {
    ...(workspaceConfig[phase] || {}),
    configured: configured ?? true,
    configured_at: new Date().toISOString(),
    ...(config_data ? { config_data } : {}),
  };

  const updatedSetupData = {
    ...setupData,
    workspace_config: workspaceConfig,
  };

  const { data, error } = await supabaseAdmin
    .from('collection_plans')
    .update({ setup_data: updatedSetupData })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
