'use client';

import { useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    timeline,
    loading,
    updateMilestone,
    updateTimeline,
  } = useCollectionTimeline(collectionId, collectionName, season, launchDate);

  // Trap wheel events inside the Gantt container so page doesn't scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Find the scrollable element inside GanttChart
      const scrollable = el.querySelector('[class*="overflow-auto"]') as HTMLElement;
      if (!scrollable) return;

      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = scrollable;
      const isVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);

      if (isVertical) {
        const atTop = scrollTop <= 0 && e.deltaY < 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
        // Only allow page scroll if at absolute edges
        if (!atTop && !atBottom) {
          e.preventDefault();
          e.stopPropagation();
          scrollable.scrollTop += e.deltaY;
        }
      } else {
        const atLeft = scrollLeft <= 0 && e.deltaX < 0;
        const atRight = scrollLeft + clientWidth >= scrollWidth - 1 && e.deltaX > 0;
        if (!atLeft && !atRight) {
          e.preventDefault();
          e.stopPropagation();
          scrollable.scrollLeft += e.deltaX;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [timeline]);

  if (loading) {
    return (
      <div className="px-8 md:px-12 lg:px-16 py-20 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/30" />
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="px-8 md:px-12 lg:px-16 py-20 text-center text-carbon/30 text-sm">
        No hay timeline configurado
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="px-4 sm:px-8 md:px-12 lg:px-16"
      style={{ height: 'calc(100vh - 220px)' }}
    >
      {/* Gantt wrapped by its own rounded surface — no double chrome. */}
      <GanttChart
        timeline={timeline}
        onUpdateMilestone={updateMilestone}
        onUpdateTimeline={updateTimeline}
        lang="es"
      />
    </div>
  );
}
