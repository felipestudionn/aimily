import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { CollectionOverview } from './CollectionOverview';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCollectionData(id: string) {
  const [planRes, timelineRes, skusRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('collection_timelines')
      .select('*')
      .eq('collection_plan_id', id)
      .single(),
    supabaseAdmin
      .from('collection_skus')
      .select('id')
      .eq('collection_plan_id', id),
  ]);

  if (planRes.error || !planRes.data) return null;

  // Migrate legacy milestones to new 4-block system
  const timeline = timelineRes.data;
  if (timeline?.milestones) {
    timeline.milestones = migrateLegacyMilestones(timeline.milestones);
  }

  return {
    plan: planRes.data,
    timeline,
    skuCount: skusRes.data?.length || 0,
  };
}

export default async function CollectionOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getCollectionData(id);

  if (!data) notFound();

  return (
    <CollectionOverview
      plan={data.plan}
      timeline={data.timeline}
      skuCount={data.skuCount}
    />
  );
}
