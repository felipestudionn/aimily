import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CollectionCalendarClient } from '@/app/collection-calendar/[id]/CollectionCalendarClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CalendarPage({ params }: PageProps) {
  const { id } = await params;

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

  if (planRes.error || !planRes.data) notFound();

  return (
    <CollectionCalendarClient
      plan={planRes.data}
      skus={skusRes.data || []}
      drops={dropsRes.data || []}
      commercialActions={actionsRes.data || []}
      embedded
    />
  );
}
