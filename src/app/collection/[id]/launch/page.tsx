import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { LaunchWorkspace } from '@/components/launch/LaunchWorkspace';
import { LaunchMiniWizard } from '@/components/launch/LaunchMiniWizard';
import { WorkspaceGate } from '@/components/wizard/WorkspaceGate';

interface PageProps { params: Promise<{ id: string }>; }

export default async function LaunchPage({ params }: PageProps) {
  const { id } = await params;

  const [{ data: timeline }, { data: plan }, { data: skus }] = await Promise.all([
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
    supabaseAdmin
      .from('collection_skus')
      .select('id, name, buy_units, pvp, family, category')
      .eq('collection_plan_id', id)
      .order('name'),
  ]);

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);
  const isConfigured =
    (plan?.setup_data as any)?.workspace_config?.launch?.configured === true;

  return (
    <WorkspaceGate
      isConfigured={isConfigured}
      wizard={(onComplete) => (
        <LaunchMiniWizard planId={id} onComplete={onComplete} />
      )}
      workspace={<LaunchWorkspace milestones={milestones} skus={skus || []} />}
    />
  );
}
