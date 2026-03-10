import { supabaseAdmin } from '@/lib/supabase-admin';
import { LookbookBuilder } from '@/components/studio/LookbookBuilder';

interface PageProps { params: Promise<{ id: string }>; }

export default async function LookbookPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season')
    .eq('id', id)
    .single();

  return (
    <LookbookBuilder
      collectionName={data?.name || 'Collection'}
      season={data?.season || ''}
    />
  );
}
