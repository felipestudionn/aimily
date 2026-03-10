import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CollectionCalendarClient } from './CollectionCalendarClient';

interface Props {
  params: Promise<{ id: string }>;
}

async function getCollectionData(id: string) {
  const [planRes, skusRes, dropsRes, actionsRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('collection_skus')
      .select('id, name, family, type, category, drop_number, launch_date, pvp, cost')
      .eq('collection_plan_id', id)
      .order('drop_number', { ascending: true }),
    supabaseAdmin
      .from('drops')
      .select('*')
      .eq('collection_plan_id', id)
      .order('position', { ascending: true }),
    supabaseAdmin
      .from('commercial_actions')
      .select('*')
      .eq('collection_plan_id', id)
      .order('start_date', { ascending: true }),
  ]);

  if (planRes.error || !planRes.data) return null;

  return {
    plan: planRes.data,
    skus: skusRes.data || [],
    drops: dropsRes.data || [],
    actions: actionsRes.data || [],
  };
}

export default async function CollectionCalendarPage({ params }: Props) {
  const { id } = await params;
  const data = await getCollectionData(id);

  if (!data) notFound();

  return (
    <CollectionCalendarClient
      plan={data.plan}
      skus={data.skus}
      drops={data.drops}
      commercialActions={data.actions}
    />
  );
}
