import { supabaseAdmin } from '@/lib/supabase-admin';
import { BrandWorkspace } from '@/components/brand/BrandWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function BrandPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return <BrandWorkspace milestones={data?.milestones || []} />;
}
