'use client';

import { Loader2 } from 'lucide-react';
import { useCollectionTimeline } from '@/hooks/useCollectionTimeline';
import { GanttChart } from '@/components/timeline/GanttChart';

interface InlineTimelineProps {
  collectionId: string;
  collectionName: string;
  season: string;
  launchDate?: string;
}

export default function InlineTimeline({ collectionId, collectionName, season, launchDate }: InlineTimelineProps) {
  const {
    timeline,
    loading,
    updateMilestone,
    updateTimeline,
  } = useCollectionTimeline(collectionId, collectionName, season, launchDate);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-10 py-20 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/30" />
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="max-w-6xl mx-auto px-10 py-20 text-center text-carbon/30 text-sm">
        No hay timeline configurado
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-10 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Vista calendario
        </p>
        <h2 className="text-2xl font-light text-carbon tracking-tight">
          Collection <span className="italic">Timeline</span>
        </h2>
      </div>

      {/* Full interactive Gantt */}
      <div className="bg-white border border-carbon/[0.06] overflow-hidden" style={{ height: 'calc(100vh - 320px)' }}>
        <GanttChart
          timeline={timeline}
          onUpdateMilestone={updateMilestone}
          onUpdateTimeline={updateTimeline}
          lang="es"
        />
      </div>
    </div>
  );
}
