import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { BrandWorkspace } from '@/components/brand/BrandWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function BrandPage({ params }: PageProps) {
  const { id } = await params;

  const { data: timeline } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  const milestones = migrateLegacyMilestones(timeline?.milestones || []);

  return <BrandWorkspace milestones={milestones} />;
}
