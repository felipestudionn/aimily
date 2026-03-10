import { supabaseAdmin } from '@/lib/supabase-admin';
import { BrandWorkspaceGate } from '@/components/brand/BrandWorkspaceGate';

interface PageProps { params: Promise<{ id: string }>; }

export default async function BrandPage({ params }: PageProps) {
  const { id } = await params;

  const [{ data: timeline }, { data: plan }] = await Promise.all([
    supabaseAdmin
      .from('collection_timelines')
      .select('milestones')
      .eq('collection_plan_id', id)
      .single(),
    supabaseAdmin
      .from('collection_plans')
      .select('id, setup_data')
      .eq('id', id)
      .single(),
  ]);

  const isConfigured =
    (plan?.setup_data as any)?.workspace_config?.brand?.configured === true;

  return (
    <BrandWorkspaceGate
      planId={id}
      milestones={timeline?.milestones || []}
      isConfigured={isConfigured}
    />
  );
}
