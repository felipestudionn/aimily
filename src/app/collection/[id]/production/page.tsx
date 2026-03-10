import { supabaseAdmin } from '@/lib/supabase-admin';
import { ProductionWorkspace } from '@/components/production/ProductionWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function ProductionPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <ProductionWorkspace milestones={data?.milestones || []} />;
}
