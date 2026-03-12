import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { MarketingCreationScreen } from '@/components/marketing/MarketingCreationScreen';
import { MarketingBlockWizard } from '@/components/marketing/MarketingBlockWizard';
import { WorkspaceGate } from '@/components/wizard/WorkspaceGate';

interface PageProps { params: Promise<{ id: string }>; }

export default async function MarketingCreationPage({ params }: PageProps) {
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
  const setupData = plan?.setup_data as Record<string, unknown> | null;
  const marketingConfig = (setupData?.workspace_config as Record<string, unknown>)?.marketing_block as Record<string, unknown> | undefined;
  const isConfigured = marketingConfig?.configured === true;

  return (
    <WorkspaceGate
      isConfigured={isConfigured}
      wizard={(onComplete) => (
        <MarketingBlockWizard planId={id} onComplete={onComplete} />
      )}
      workspace={
        <MarketingCreationScreen
          collectionPlanId={id}
          milestones={milestones}
        />
      }
    />
  );
}
