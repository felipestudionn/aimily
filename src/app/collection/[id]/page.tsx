import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { migrateLegacyMilestones } from '@/lib/timeline-template';
import { CollectionOverview } from './CollectionOverview';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function syncMilestoneProgress(planId: string, timeline: Record<string, unknown>, skuCount: number) {
  if (!timeline?.milestones) return timeline;

  // Fetch all workspace data
  const { data: workspaces } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('workspace, data')
    .eq('collection_plan_id', planId);

  const wsMap: Record<string, Record<string, unknown>> = {};
  for (const ws of workspaces || []) {
    wsMap[ws.workspace] = ws.data as Record<string, unknown>;
  }

  // Check production orders
  const { count: orderCount } = await supabaseAdmin
    .from('production_orders')
    .select('id', { count: 'exact', head: true })
    .eq('collection_plan_id', planId);

  // Milestone → workspace data mapping
  const hasBlock = (ws: string, block: string) => {
    const d = wsMap[ws]?.blockData as Record<string, unknown> | undefined;
    if (!d?.[block]) return false;
    const b = d[block] as Record<string, unknown>;
    return Object.values(b).some(
      (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    );
  };

  const hasKey = (ws: string, key: string) => {
    const val = wsMap[ws]?.[key];
    if (val === null || val === undefined || val === '') return false;
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0) return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  };

  const checks: Record<string, () => boolean> = {
    'cr-1': () => hasBlock('creative', 'consumer'),
    'cr-2': () => hasBlock('creative', 'moodboard'),
    'br-1': () => hasBlock('creative', 'brand-dna'),
    'br-3': () => hasBlock('creative', 'vibe'),
    'rp-1': () => hasBlock('merchandising', 'families'),
    'rp-3': () => hasBlock('merchandising', 'budget'),
    'rp-2': () => hasBlock('merchandising', 'channels'),
    'rp-4': () => hasBlock('merchandising', 'pricing'),
    'rp-5': () => skuCount > 0,
    'dd-1': () => hasKey('design', 'sketches'),
    'dd-2': () => hasKey('design', 'lasts'),
    'dd-6': () => hasKey('design', 'colorways'),
    'dd-5': () => hasKey('design', 'patterns'),
    'dd-15': () => (orderCount || 0) > 0,
  };

  const milestones = (timeline.milestones as Array<{ id: string; status: string; [k: string]: unknown }>);
  let changed = false;

  const updated = milestones.map((m) => {
    if (m.status === 'completed') return m;
    const check = checks[m.id];
    if (check?.()) {
      changed = true;
      return { ...m, status: 'completed' };
    }
    return m;
  });

  if (changed) {
    await supabaseAdmin
      .from('collection_timelines')
      .update({ milestones: updated, updated_at: new Date().toISOString() })
      .eq('id', (timeline as { id: string }).id);
    return { ...timeline, milestones: updated };
  }

  return timeline;
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

  const skuCount = skusRes.data?.length || 0;

  // Sync milestone progress from workspace data
  let timeline = timelineRes.data;
  if (timeline) {
    timeline = await syncMilestoneProgress(id, timeline, skuCount);
    // Migrate legacy milestones
    timeline.milestones = migrateLegacyMilestones(timeline.milestones);
  }

  return {
    plan: planRes.data,
    timeline,
    skuCount,
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
