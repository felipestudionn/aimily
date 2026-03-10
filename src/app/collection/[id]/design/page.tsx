import { supabaseAdmin } from '@/lib/supabase-admin';
import { DesignWorkspace } from '@/components/design/DesignWorkspace';
import { DesignMiniWizard } from '@/components/design/DesignMiniWizard';
import { WorkspaceGate } from '@/components/wizard/WorkspaceGate';

interface PageProps { params: Promise<{ id: string }>; }

export default async function DesignPage({ params }: PageProps) {
  const { id } = await params;

  const [{ data: timeline }, { data: plan }] = await Promise.all([
    supabaseAdmin
      .from('collection_timelines')
      .select('milestones')
      .eq('collection_plan_id', id)
      .single(),
    supabaseAdmin
      .from('collection_plans')
      .select('id, setup_data')
      .eq('id', id)
      .single(),
  ]);

  const setupData = plan?.setup_data as any;
  const isConfigured = setupData?.workspace_config?.design?.configured === true;
  const category = setupData?.productCategory || 'clothing';

  return (
    <WorkspaceGate
      isConfigured={isConfigured}
      wizard={(onComplete) => (
        <DesignMiniWizard planId={id} category={category} onComplete={onComplete} />
      )}
      workspace={<DesignWorkspace milestones={timeline?.milestones || []} />}
    />
  );
}
