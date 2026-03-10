import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ProductWorkspaceGate } from './ProductWorkspaceGate';
import type { CollectionPlan } from '@/types/planner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  const { data: plan, error } = await supabaseAdmin
    .from('collection_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !plan) notFound();

  return <ProductWorkspaceGate plan={plan as CollectionPlan} />;
}
