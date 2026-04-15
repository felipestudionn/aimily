import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CalendarSpine } from '@/components/timeline/CalendarSpine';

interface PageProps {
  params: Promise<{ id: string }>;
}

/* Calendar mode = the sidebar EXPANDED. CalendarSpine renders the full
   viewport as a single unified surface (label column + timeline tracks).
   The default WorkspaceShell sidebar is still rendered by the parent
   layout, but CalendarSpine overlays it with `fixed inset-0 z-50`. */

export default async function CalendarPage({ params }: PageProps) {
  const { id } = await params;

  const { data: plan, error } = await supabaseAdmin
    .from('collection_plans')
    .select('id, name, season')
    .eq('id', id)
    .single();

  if (error || !plan) notFound();

  // Launch date comes from the collection_timelines row; CalendarSpine uses
  // useCollectionTimeline hook which handles the fallback.
  return (
    <CalendarSpine
      collectionId={plan.id}
      collectionName={plan.name}
      season={plan.season || 'SS27'}
    />
  );
}
