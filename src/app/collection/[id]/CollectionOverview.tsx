'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, LayoutGrid, CalendarDays, GitBranch } from 'lucide-react';
import { PHASES, PHASE_ORDER, getMilestoneDate } from '@/lib/timeline-template';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
import DecisionMap from './DecisionMap';
import InlineTimeline from './InlineTimeline';

type ViewMode = 'blocks' | 'calendar' | 'map';

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: 'blocks', label: 'Bloques', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'map', label: 'Mapa', icon: GitBranch },
];

const BLOCK_ROUTES: Record<TimelinePhase, string> = {
  creative: 'product',
  planning: 'product',
  development: 'design',
  go_to_market: 'digital',
};

interface CollectionOverviewProps {
  plan: CollectionPlan;
  timeline: {
    id: string;
    collection_plan_id: string;
    launch_date: string;
    milestones: TimelineMilestone[];
  } | null;
  skuCount: number;
}

function PhaseCard({
  phase,
  milestones,
  collectionId,
  launchDate,
}: {
  phase: TimelinePhase;
  milestones: TimelineMilestone[];
  collectionId: string;
  launchDate?: string;
}) {
  const info = PHASES[phase];
  const phaseMilestones = milestones.filter((m) => m.phase === phase);
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const total = phaseMilestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pending = total - completed - inProgress;
  const path = BLOCK_ROUTES[phase];

  const nextMilestones = phaseMilestones
    .filter((m) => m.status !== 'completed')
    .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore)
    .slice(0, 5);

  return (
    <Link
      href={`/collection/${collectionId}/${path}`}
      className="group relative bg-white p-10 lg:p-12 hover:shadow-lg transition-all duration-300 overflow-hidden border border-carbon/[0.06] flex flex-col aspect-square md:aspect-auto md:min-h-[420px]"
    >
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
        <div
          className="h-full bg-carbon transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Title + circular progress */}
      <div className="flex items-start justify-between mb-8">
        <h3 className="text-2xl md:text-3xl font-light text-carbon tracking-tight leading-[1.15]">
          {info.name}
        </h3>

        {/* Circular progress */}
        <div className="relative flex-shrink-0 w-14 h-14">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="currentColor"
              className="text-carbon/[0.06]"
              strokeWidth="2.5"
            />
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="currentColor"
              className="text-carbon transition-all duration-700"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-light text-carbon/50 rotate-0">
            {progress}%
          </span>
        </div>
      </div>

      {/* Next milestones list */}
      {nextMilestones.length > 0 && (
        <div className="pt-6 border-t border-carbon/[0.06] space-y-3 flex-1">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
            Next
          </p>
          {nextMilestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <p className="text-sm text-carbon/55 font-light truncate pr-4">
                {m.name}
              </p>
              {launchDate && (
                <p className="text-xs text-carbon/25 flex-shrink-0 tabular-nums font-medium">
                  {getMilestoneDate(launchDate, m.startWeeksBefore).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA bar */}
      <div className="mt-auto pt-8 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
        Continue <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

export function CollectionOverview({ plan, timeline, skuCount }: CollectionOverviewProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const milestones = timeline?.milestones || [];
  const [view, setView] = useState<ViewMode>('blocks');

  return (
    <div className="min-h-[80vh]">
      <div className="px-8 md:px-12 lg:px-16 py-12">
        {/* Header + View Toggle */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
              Your workspace
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
              Team <span className="italic">Blocks</span>
            </h2>
          </div>

          {/* View Toggle */}
          <div className="flex border border-carbon/[0.06]">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                    isActive
                      ? 'bg-carbon text-crema'
                      : 'bg-white text-carbon/40 hover:text-carbon/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Content */}
        {view === 'blocks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PHASE_ORDER.map((phase) => (
              <PhaseCard
                key={phase}
                phase={phase}
                milestones={milestones}
                collectionId={collectionId}
                launchDate={timeline?.launch_date}
              />
            ))}
          </div>
        )}
      </div>

      {view === 'calendar' && (
        <InlineTimeline
          collectionId={collectionId}
          collectionName={plan.name}
          season={plan.season || ''}
          launchDate={timeline?.launch_date}
        />
      )}

      {view === 'map' && (
        <DecisionMap
          milestones={milestones}
          launchDate={timeline?.launch_date}
          collectionId={collectionId}
        />
      )}
    </div>
  );
}
