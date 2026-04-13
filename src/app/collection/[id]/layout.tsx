import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { CollectionHubShell } from './CollectionHubShell';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function _getCollectionWithTimeline(id: string) {
  const [planRes, timelineRes, skusRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('collection_timelines')
      .select('milestones, launch_date')
      .eq('collection_plan_id', id)
      .single(),
    supabaseAdmin
      .from('collection_skus')
      .select('id')
      .eq('collection_plan_id', id),
  ]);

  if (planRes.error || !planRes.data) return null;

  const rawMilestones = timelineRes.data?.milestones || [];
  return {
    plan: planRes.data,
    milestones: migrateLegacyMilestones(rawMilestones),
    launchDate: timelineRes.data?.launch_date || null,
    skuCount: skusRes.data?.length || 0,
  };
}

/* Cache layout queries for 30s — avoids re-fetching on every sub-page navigation */
const getCollectionWithTimeline = (id: string) =>
  unstable_cache(_getCollectionWithTimeline, [`collection-layout-${id}`], {
    revalidate: 30,
    tags: [`collection-${id}`],
  })(id);

export default async function CollectionHubLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const data = await getCollectionWithTimeline(id);

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-shade">
      <CollectionHubShell
        collectionId={id}
        collectionName={data.plan.name}
        season={data.plan.season}
        milestones={data.milestones}
        launchDate={data.launchDate}
        skuCount={data.skuCount}
        setupData={data.plan.setup_data}
      >
        {children}
      </CollectionHubShell>
    </div>
  );
}
