import { supabaseAdmin } from '@/lib/supabase-admin';
import { PrototypingWorkspace } from '@/components/prototyping/PrototypingWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function PrototypingPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <PrototypingWorkspace milestones={data?.milestones || []} />;
}
