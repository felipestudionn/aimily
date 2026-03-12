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
      className="group relative bg-white border border-carbon/[0.08] p-7 hover:bg-carbon hover:border-carbon transition-all duration-300 overflow-hidden"
    >
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
        <div
          className="h-full bg-carbon group-hover:bg-crema transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <PhaseIcon phase={phase} className="h-5 w-5 text-carbon group-hover:text-crema transition-colors" filled={false} />
          <div>
            <h3 className="font-semibold text-texto group-hover:text-crema text-[15px] tracking-tight transition-colors">
              {info.name}
            </h3>
            <p className="text-[10px] text-texto/40 group-hover:text-crema/50 uppercase tracking-[0.15em] mt-0.5 transition-colors">
              {info.nameEs}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-carbon/20 group-hover:text-crema/60 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Progress + counts */}
      <div className="flex items-end gap-5 mb-5">
        <div>
          <span className="text-[42px] leading-none font-semibold text-carbon group-hover:text-crema tracking-tight transition-colors">
            {progress}
          </span>
          <span className="text-base text-carbon/30 group-hover:text-crema/40 transition-colors">%</span>
        </div>
        <div className="flex gap-3 pb-2 text-[11px] font-medium text-texto/40 group-hover:text-crema/50 transition-colors">
          <span>{completed} done</span>
          <span className="text-carbon/15 group-hover:text-crema/20">/</span>
          {inProgress > 0 && (
            <>
              <span>{inProgress} active</span>
              <span className="text-carbon/15 group-hover:text-crema/20">/</span>
            </>
          )}
          <span>{pending} pending</span>
        </div>
      </div>

      {/* Next milestones list */}
      {nextMilestones.length > 0 && (
        <div className="pt-4 border-t border-carbon/[0.06] group-hover:border-crema/10 transition-colors space-y-2.5">
          <p className="text-[10px] text-texto/35 group-hover:text-crema/40 uppercase tracking-[0.2em] font-semibold transition-colors">
            Next
          </p>
          {nextMilestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <p className="text-[13px] text-texto/70 group-hover:text-crema/80 truncate pr-4 transition-colors">
                {m.name}
              </p>
              {launchDate && (
                <p className="text-[11px] text-texto/30 group-hover:text-crema/40 flex-shrink-0 tabular-nums transition-colors">
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

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const inProgressMilestones = milestones.filter((m) => m.status === 'in-progress').length;
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const launchDate = timeline?.launch_date
    ? new Date(timeline.launch_date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not set';

  const daysUntilLaunch = timeline?.launch_date
    ? Math.ceil((new Date(timeline.launch_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen">
      {/* Hero Header — dark */}
      <div className="bg-carbon px-10 pt-12 pb-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.25em] text-crema/30 font-medium mb-3">
            {plan.season || 'Collection'}
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-crema tracking-tight lowercase">
            {plan.name}
          </h1>
          {plan.description && (
            <p className="text-crema/50 mt-3 text-base max-w-2xl">{plan.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-8 max-w-md">
            <div className="flex items-center justify-between text-[11px] mb-2.5 tracking-[0.15em] uppercase font-medium">
              <span className="text-crema/30">Progress</span>
              <span className="text-crema/70">{overallProgress}%</span>
            </div>
            <div className="h-[2px] bg-crema/10 overflow-hidden">
              <div
                className="h-full bg-crema transition-all duration-700"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Strip — crema bg */}
      <div className="bg-crema border-b border-carbon/[0.08]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 divide-x divide-carbon/[0.08]">
          <div className="px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-texto/35 mb-2 font-semibold">Progress</p>
            <p className="text-2xl font-semibold text-carbon tracking-tight">
              {overallProgress}<span className="text-sm text-carbon/30 ml-0.5">%</span>
            </p>
            <p className="text-[11px] text-texto/40 mt-1 font-medium">
              {completedMilestones} of {totalMilestones}
            </p>
          </div>

          <div className="px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-texto/35 mb-2 font-semibold">Launch</p>
            <p className="text-[15px] font-semibold text-carbon tracking-tight">{launchDate}</p>
            {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
              <p className="text-[11px] text-texto/40 mt-1 font-medium">{daysUntilLaunch} days</p>
            )}
          </div>

          <div className="px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-texto/35 mb-2 font-semibold">SKUs</p>
            <p className="text-2xl font-semibold text-carbon tracking-tight">{skuCount}</p>
            <p className="text-[11px] text-texto/40 mt-1 font-medium">
              {plan.setup_data?.productCategory || 'All categories'}
            </p>
          </div>

          <div className="px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-texto/35 mb-2 font-semibold">Active</p>
            <p className="text-2xl font-semibold text-carbon tracking-tight">{inProgressMilestones}</p>
            <p className="text-[11px] text-texto/40 mt-1 font-medium">milestones</p>
          </div>

          <div className="px-8 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-texto/35 mb-2 font-semibold">Target</p>
            <p className="text-lg font-semibold text-carbon tracking-tight">
              {plan.setup_data?.totalSalesTarget
                ? `€${plan.setup_data.totalSalesTarget.toLocaleString()}`
                : '—'}
            </p>
            <p className="text-[11px] text-texto/40 mt-1 font-medium">
              {plan.setup_data?.targetMargin ? `${plan.setup_data.targetMargin}% margin` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Team Blocks Grid — crema bg */}
      <div className="bg-crema min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-10 py-10">
          <div className="flex items-center mb-8">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-texto/30 font-semibold">Team Blocks</h2>
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
    </div>
  );
}
