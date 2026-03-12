import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { MarketingCreationScreen } from '@/components/marketing/MarketingCreationScreen';

interface PageProps { params: Promise<{ id: string }>; }

export default async function MarketingCreationPage({ params }: PageProps) {
  const { id } = await params;

  const { data: timeline } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);

  return (
    <MarketingCreationScreen
      collectionPlanId={id}
      milestones={milestones}
    />
  );
}
