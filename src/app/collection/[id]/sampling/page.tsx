import { supabaseAdmin } from '@/lib/supabase-admin';
import { SamplingWorkspace } from '@/components/sampling/SamplingWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function SamplingPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <SamplingWorkspace milestones={data?.milestones || []} />;
}
