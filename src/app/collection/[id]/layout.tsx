import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { Navbar } from '@/components/layout/navbar';
import { CollectionHubShell } from './CollectionHubShell';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function getCollectionWithTimeline(id: string) {
  const [planRes, timelineRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('collection_timelines')
      .select('milestones')
      .eq('collection_plan_id', id)
      .single(),
  ]);

  if (planRes.error || !planRes.data) return null;

  const rawMilestones = timelineRes.data?.milestones || [];
  return {
    plan: planRes.data,
    milestones: migrateLegacyMilestones(rawMilestones),
  };
}

export default async function CollectionHubLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const data = await getCollectionWithTimeline(id);

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="workspace" />
      <CollectionHubShell
        collectionId={id}
        collectionName={data.plan.name}
        season={data.plan.season}
        milestones={data.milestones}
      >
        {children}
      </CollectionHubShell>
    </div>
  );
}
