import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { PrototypingWorkspace } from '@/components/prototyping/PrototypingWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function PrototypingPage({ params }: PageProps) {
  const { id } = await params;

  const { data: timeline } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);

  return <PrototypingWorkspace milestones={milestones} />;
}
