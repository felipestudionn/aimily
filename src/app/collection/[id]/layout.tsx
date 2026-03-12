import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { CollectionHubShell } from './CollectionHubShell';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function getCollectionWithTimeline(id: string) {
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

export default async function CollectionHubLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const data = await getCollectionWithTimeline(id);

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-crema">
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
