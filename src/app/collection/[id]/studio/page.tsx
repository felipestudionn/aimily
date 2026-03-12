import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { StudioWorkspace } from '@/components/studio/StudioWorkspace';
import { StudioMiniWizard } from '@/components/studio/StudioMiniWizard';
import { WorkspaceGate } from '@/components/wizard/WorkspaceGate';

interface PageProps { params: Promise<{ id: string }>; }

export default async function StudioPage({ params }: PageProps) {
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
    (plan?.setup_data as any)?.workspace_config?.studio?.configured === true;

  return (
    <WorkspaceGate
      isConfigured={isConfigured}
      wizard={(onComplete) => (
        <StudioMiniWizard planId={id} onComplete={onComplete} />
      )}
      workspace={<StudioWorkspace milestones={milestones} />}
    />
  );
}
