import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { MarketingDistributionScreen } from '@/components/marketing/MarketingDistributionScreen';

interface PageProps { params: Promise<{ id: string }>; }

export default async function MarketingDistributionPage({ params }: PageProps) {
  const { id } = await params;

  const { data: timeline } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);

  return (
    <MarketingDistributionScreen
      collectionPlanId={id}
      milestones={milestones}
    />
  );
}
