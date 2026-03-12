import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { PrototypingWorkspace } from '@/components/prototyping/PrototypingWorkspace';
import { PrototypingMiniWizard } from '@/components/prototyping/PrototypingMiniWizard';
import { WorkspaceGate } from '@/components/wizard/WorkspaceGate';

interface PageProps { params: Promise<{ id: string }>; }

export default async function PrototypingPage({ params }: PageProps) {
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

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);
  const isConfigured =
    (plan?.setup_data as any)?.workspace_config?.prototyping?.configured === true;

  return (
    <WorkspaceGate
      isConfigured={isConfigured}
      wizard={(onComplete) => (
        <PrototypingMiniWizard planId={id} onComplete={onComplete} />
      )}
      workspace={<PrototypingWorkspace milestones={milestones} />}
    />
  );
}
