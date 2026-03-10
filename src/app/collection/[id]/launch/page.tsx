import { supabaseAdmin } from '@/lib/supabase-admin';
import { LaunchWorkspace } from '@/components/launch/LaunchWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function LaunchPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <LaunchWorkspace milestones={data?.milestones || []} />;
}
