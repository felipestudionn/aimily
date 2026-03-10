import { supabaseAdmin } from '@/lib/supabase-admin';
import { PhasePlaceholder } from '@/components/collection/PhasePlaceholder';

interface PageProps { params: Promise<{ id: string }>; }

export default async function DesignPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <PhasePlaceholder phase="design" milestones={data?.milestones || []} />;
}
