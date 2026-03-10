import { supabaseAdmin } from '@/lib/supabase-admin';
import { DesignWorkspace } from '@/components/design/DesignWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function DesignPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <DesignWorkspace milestones={data?.milestones || []} />;
}
