'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PHASES, PHASE_ORDER, getMilestoneDate } from '@/lib/timeline-template';
import { PhaseIcon } from '@/lib/phase-icons';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';

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
    .slice(0, 3);

  return (
    <Link
      href={`/collection/${collectionId}/${path}`}
      className="group relative bg-carbon p-8 hover:bg-carbon/90 transition-all duration-300 overflow-hidden"
    >
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 h-[2px] bg-crema/[0.06] w-full">
        <div
          className="h-full bg-crema transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <PhaseIcon phase={phase} className="h-5 w-5 text-crema/60" filled={false} />
          <div>
            <h3 className="font-semibold text-crema text-base tracking-tight">
              {info.name}
            </h3>
            <p className="text-[11px] text-crema/35 uppercase tracking-[0.15em] mt-0.5 font-medium">
              {info.nameEs}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-crema/20 group-hover:text-crema/50 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Progress + counts */}
      <div className="flex items-end gap-5 mb-6">
        <div>
          <span className="text-5xl leading-none font-semibold text-crema tracking-tight">
            {progress}
          </span>
          <span className="text-lg text-crema/30 ml-0.5">%</span>
        </div>
        <div className="flex gap-3 pb-2 text-[12px] font-medium text-crema/40">
          <span>{completed} done</span>
          <span className="text-crema/15">/</span>
          {inProgress > 0 && (
            <>
              <span>{inProgress} active</span>
              <span className="text-crema/15">/</span>
            </>
          )}
          <span>{pending} pending</span>
        </div>
      </div>

      {/* Next milestones list */}
      {nextMilestones.length > 0 && (
        <div className="pt-5 border-t border-crema/[0.08] space-y-3">
          <p className="text-[10px] text-crema/30 uppercase tracking-[0.2em] font-semibold">
            Next
          </p>
          {nextMilestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <p className="text-[14px] text-crema/70 truncate pr-4">
                {m.name}
              </p>
              {launchDate && (
                <p className="text-[12px] text-crema/30 flex-shrink-0 tabular-nums font-medium">
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
    </Link>
  );
}

export function CollectionOverview({ plan, timeline, skuCount }: CollectionOverviewProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const milestones = timeline?.milestones || [];

  return (
    <div className="min-h-[80vh]">
      <div className="max-w-5xl mx-auto px-10 py-10">
        <div className="flex items-center mb-8">
          <h2 className="text-[12px] uppercase tracking-[0.25em] text-texto/30 font-semibold">Team Blocks</h2>
          <div className="h-[1px] flex-1 bg-carbon/[0.08] ml-5" />
        </div>
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
      </div>
    </div>
  );
}
