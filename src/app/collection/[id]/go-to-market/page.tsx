import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoToMarketDashboard } from '@/components/gtm/GoToMarketDashboard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GoToMarketPage({ params }: PageProps) {
  const { id } = await params;

  const [planRes, skusRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('collection_skus')
      .select('*')
      .eq('collection_plan_id', id)
      .order('drop_number', { ascending: true }),
  ]);

  if (planRes.error || !planRes.data) notFound();

  return (
    <GoToMarketDashboard
      plan={planRes.data}
      initialSkus={skusRes.data || []}
    />
  );
}
