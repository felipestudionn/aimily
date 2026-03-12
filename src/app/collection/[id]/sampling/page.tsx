import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { SamplingWorkspace } from '@/components/sampling/SamplingWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function SamplingPage({ params }: PageProps) {
  const { id } = await params;

  const { data: timeline } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);

  return <SamplingWorkspace milestones={milestones} />;
}
