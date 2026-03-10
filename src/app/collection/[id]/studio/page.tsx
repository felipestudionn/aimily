import { supabaseAdmin } from '@/lib/supabase-admin';
import { StudioWorkspace } from '@/components/studio/StudioWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function StudioPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <StudioWorkspace milestones={data?.milestones || []} />;
}
