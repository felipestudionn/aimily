import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DigitalWorkspace } from '@/components/digital/DigitalWorkspace';

interface PageProps { params: Promise<{ id: string }>; }

export default async function DigitalPage({ params }: PageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('collection_timelines')
    .select('milestones')
    .eq('collection_plan_id', id)
    .single();

  return (
    <div className="space-y-4">
      {/* Studio Link Banner */}
      <Link
        href={`/collection/${id}/studio`}
        className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 hover:from-purple-100 hover:to-purple-200 transition-all group"
      >
        <div className="w-10 h-10 bg-purple-600 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-purple-900">AI Creative Studio</p>
          <p className="text-xs text-purple-600">Generate product renders, lookbooks, campaign creatives & videos with AI</p>
        </div>
        <span className="text-purple-400 group-hover:translate-x-1 transition-transform">&rarr;</span>
      </Link>

      <DigitalWorkspace milestones={data?.milestones || []} />
    </div>
  );
}
