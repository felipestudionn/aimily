import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import { FactoryDirectory } from '@/components/tech-pack/FactoryDirectory';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ id: string }> }

export default async function FactoriesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, user_id')
    .eq('id', id)
    .maybeSingle();
  if (!plan || plan.user_id !== user.id) notFound();

  return <FactoryDirectory collectionId={id} collectionName={plan.name || 'Collection'} />;
}
