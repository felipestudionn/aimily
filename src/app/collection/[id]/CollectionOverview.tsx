'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
} from 'lucide-react';
import { PHASES, PHASE_ORDER, getMilestoneDate } from '@/lib/timeline-template';
import { PhaseIcon } from '@/lib/phase-icons';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';

/** Map each calendar block to its primary workspace route */
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

  // Get next milestone for this phase
  const nextMilestone = phaseMilestones
    .filter((m) => m.status !== 'completed')
    .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore)[0];

  return (
    <Link
      href={`/collection/${collectionId}/${path}`}
      className="group relative bg-white p-8 hover:shadow-lg transition-all duration-300 border-b-2 overflow-hidden"
      style={{ borderBottomColor: info.color }}
    >
      {/* Progress bar top */}
      <div
        className="absolute top-0 left-0 h-[3px] transition-all duration-700"
        style={{ width: `${progress}%`, backgroundColor: info.color }}
      />

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{ backgroundColor: info.bgColor }}
          >
            <PhaseIcon phase={phase} className="h-5 w-5" filled={false} />
          </div>
          <div>
            <h3 className="font-medium text-texto text-base tracking-tight">{info.name}</h3>
            <p className="text-[11px] text-neutral-400 uppercase tracking-widest mt-0.5">
              {info.nameEs}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-carbon group-hover:translate-x-1 transition-all" />
      </div>

      {/* Big progress number */}
      <div className="flex items-end gap-6 mb-5">
        <div>
          <span className="text-4xl font-light text-carbon tracking-tight">{progress}</span>
          <span className="text-lg font-light text-neutral-400">%</span>
        </div>
        <div className="flex gap-4 pb-1.5 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-carbon" />
            {completed}
          </span>
          {inProgress > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {inProgress}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Circle className="h-3 w-3" />
            {pending}
          </span>
        </div>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="pt-4 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Next</p>
          <p className="text-sm text-texto truncate">{nextMilestone.name}</p>
          {launchDate && (
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {getMilestoneDate(launchDate, nextMilestone.startWeeksBefore).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
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

  const upcomingMilestones = milestones
    .filter((m) => m.status !== 'completed')
    .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore)
    .slice(0, 6);

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
    <div className="min-h-screen bg-crema/40">
      {/* Hero Header */}
      <div className="bg-carbon text-white px-10 py-14">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-3">
            {plan.season || 'Collection'} Overview
          </p>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight lowercase">
            {plan.name}
          </h1>
          {plan.description && (
            <p className="text-white/60 mt-3 text-base font-light max-w-2xl">{plan.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-10 max-w-md">
            <div className="flex items-center justify-between text-[11px] mb-2 tracking-wider uppercase">
              <span className="text-white/40">Overall Progress</span>
              <span className="text-white font-medium">{overallProgress}%</span>
            </div>
            <div className="h-[2px] bg-white/10 overflow-hidden">
              <div
                className="h-full bg-crema transition-all duration-700"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Strip */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 divide-x divide-neutral-100">
          <div className="px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">Progress</p>
            <p className="text-3xl font-light text-carbon tracking-tight">
              {overallProgress}<span className="text-lg text-neutral-300">%</span>
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {completedMilestones} of {totalMilestones}
            </p>
          </div>

          <div className="px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">Launch</p>
            <p className="text-lg font-light text-carbon tracking-tight">{launchDate}</p>
            {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
              <p className="text-[11px] text-neutral-400 mt-1">{daysUntilLaunch} days</p>
            )}
          </div>

          <div className="px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">SKUs</p>
            <p className="text-3xl font-light text-carbon tracking-tight">{skuCount}</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {plan.setup_data?.productCategory || 'All categories'}
            </p>
          </div>

          <div className="px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">Active</p>
            <p className="text-3xl font-light text-carbon tracking-tight">{inProgressMilestones}</p>
            <p className="text-[11px] text-neutral-400 mt-1">milestones</p>
          </div>

          <div className="px-8 py-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">Target</p>
            <p className="text-xl font-light text-carbon tracking-tight">
              {plan.setup_data?.totalSalesTarget
                ? `€${plan.setup_data.totalSalesTarget.toLocaleString()}`
                : '—'}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {plan.setup_data?.targetMargin ? `${plan.setup_data.targetMargin}% margin` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Phase Grid */}
      <div className="max-w-5xl mx-auto px-10 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Team Blocks</h2>
          <div className="h-[1px] flex-1 bg-neutral-200 ml-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Upcoming Timeline */}
      {upcomingMilestones.length > 0 && (
        <div className="max-w-5xl mx-auto px-10 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Next Up</h2>
            <div className="h-[1px] flex-1 bg-neutral-200 ml-6" />
          </div>
          <div className="bg-white divide-y divide-neutral-50">
            {upcomingMilestones.map((m) => {
              const phaseInfo = PHASES[m.phase];
              const startDate = timeline?.launch_date
                ? getMilestoneDate(timeline.launch_date, m.startWeeksBefore)
                : null;

              return (
                <div key={m.id} className="flex items-center gap-6 px-8 py-5 group hover:bg-neutral-50/50 transition-colors">
                  <div
                    className="w-1 h-8 flex-shrink-0"
                    style={{ backgroundColor: phaseInfo.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-texto font-medium">{m.name}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{phaseInfo.name}</p>
                  </div>
                  {startDate && (
                    <p className="text-[11px] text-neutral-400 flex-shrink-0 tabular-nums">
                      {startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-widest px-3 py-1 flex-shrink-0 ${
                      m.status === 'in-progress'
                        ? 'bg-carbon text-white'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    {m.status === 'in-progress' ? 'Active' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
