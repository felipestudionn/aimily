'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PHASES, PHASE_ORDER, getMilestoneDate } from '@/lib/timeline-template';
import { PhaseIcon } from '@/lib/phase-icons';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
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
    <div className="min-h-screen -mt-14">
      {/* ── Full-bleed carbon hero (covers navbar) ── */}
      <div className="bg-carbon relative z-[51]">
        {/* Own dark navbar */}
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/my-collections" className="flex items-center">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-5 w-auto opacity-50 hover:opacity-80 transition-opacity"
              priority
              unoptimized
            />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user && (
              <Link
                href="/account"
                className="w-7 h-7 bg-crema/15 flex items-center justify-center text-crema text-[11px] font-medium hover:bg-crema/25 transition-colors"
                title="Account"
              >
                {user.email?.charAt(0).toUpperCase()}
              </Link>
            )}
          </div>
        </div>

        {/* Hero content */}
        <div className="px-10 pt-6 pb-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-[12px] uppercase tracking-[0.25em] text-crema/30 font-semibold mb-3">
              {plan.season || 'Collection'}
            </p>
            <h1 className="text-5xl md:text-6xl font-semibold text-crema tracking-tight lowercase">
              {plan.name}
            </h1>
            {plan.description && (
              <p className="text-crema/45 mt-3 text-base max-w-2xl">{plan.description}</p>
            )}

            {/* Progress bar */}
            <div className="mt-8 max-w-sm">
              <div className="flex items-center justify-between text-[11px] mb-2.5 tracking-[0.15em] uppercase font-semibold">
                <span className="text-crema/25">Progress</span>
                <span className="text-crema/60">{overallProgress}%</span>
              </div>
              <div className="h-[2px] bg-crema/[0.08] overflow-hidden">
                <div
                  className="h-full bg-crema transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics strip — inside carbon */}
        <div className="border-t border-crema/[0.06]">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 divide-x divide-crema/[0.06]">
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-crema/25 mb-1.5 font-semibold">Progress</p>
              <p className="text-2xl font-semibold text-crema tracking-tight">
                {overallProgress}<span className="text-sm text-crema/25 ml-0.5">%</span>
              </p>
              <p className="text-[12px] text-crema/30 mt-0.5 font-medium">
                {completedMilestones} of {totalMilestones}
              </p>
            </div>
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-crema/25 mb-1.5 font-semibold">Launch</p>
              <p className="text-[15px] font-semibold text-crema tracking-tight">{launchDate}</p>
              {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                <p className="text-[12px] text-crema/30 mt-0.5 font-medium">{daysUntilLaunch}d</p>
              )}
            </div>
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-crema/25 mb-1.5 font-semibold">SKUs</p>
              <p className="text-2xl font-semibold text-crema tracking-tight">{skuCount}</p>
              <p className="text-[12px] text-crema/30 mt-0.5 font-medium">
                {plan.setup_data?.productCategory || 'all categories'}
              </p>
            </div>
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-crema/25 mb-1.5 font-semibold">Active</p>
              <p className="text-2xl font-semibold text-crema tracking-tight">{inProgressMilestones}</p>
              <p className="text-[12px] text-crema/30 mt-0.5 font-medium">milestones</p>
            </div>
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-crema/25 mb-1.5 font-semibold">Target</p>
              <p className="text-lg font-semibold text-crema tracking-tight">
                {plan.setup_data?.totalSalesTarget
                  ? `€${plan.setup_data.totalSalesTarget.toLocaleString()}`
                  : '—'}
              </p>
              <p className="text-[12px] text-crema/30 mt-0.5 font-medium">
                {plan.setup_data?.targetMargin ? `${plan.setup_data.targetMargin}% margin` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Crema workspace area ── */}
      <div className="bg-crema min-h-[60vh]">
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
    </div>
  );
}
