import { supabaseAdmin } from '@/lib/supabase-admin';
import { MarketingWorkspace } from '@/components/marketing/MarketingWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function MarketingPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <MarketingWorkspace milestones={data?.milestones || []} />;
}
