'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  ShoppingBag,
  Euro,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { PHASES, PHASE_ORDER } from '@/lib/timeline-template';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';

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
}: {
  phase: TimelinePhase;
  milestones: TimelineMilestone[];
  collectionId: string;
}) {
  const info = PHASES[phase];
  const phaseMilestones = milestones.filter((m) => m.phase === phase);
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const total = phaseMilestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const path = phase === 'olawave' ? 'product' : phase;

  return (
    <Link
      href={`/collection/${collectionId}/${path}`}
      className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <h3 className="font-semibold text-gray-900 text-sm">{info.name}</h3>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>

      {/* Progress Ring */}
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-100"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              stroke={info.color}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
            {progress}%
          </span>
        </div>
        <div className="flex-1 text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>{completed} completed</span>
          </div>
          {inProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>{inProgress} in progress</span>
            </div>
          )}
          {total - completed - inProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 text-gray-300" />
              <span>{total - completed - inProgress} pending</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CollectionOverview({ plan, timeline, skuCount }: CollectionOverviewProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const milestones = timeline?.milestones || [];

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Find next upcoming milestones (not completed, sorted by startWeeksBefore descending = earliest first)
  const upcomingMilestones = milestones
    .filter((m) => m.status !== 'completed')
    .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore)
    .slice(0, 5);

  const launchDate = timeline?.launch_date
    ? new Date(timeline.launch_date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not set';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
        {plan.description && (
          <p className="text-gray-600 mt-1">{plan.description}</p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <TrendingUp className="h-4 w-4" />
            <span>Progress</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {completedMilestones}/{totalMilestones} milestones
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CalendarDays className="h-4 w-4" />
            <span>Launch Date</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{launchDate}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <ShoppingBag className="h-4 w-4" />
            <span>SKUs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{skuCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            {plan.setup_data?.productCategory || 'All categories'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Euro className="h-4 w-4" />
            <span>Sales Target</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {plan.setup_data?.totalSalesTarget
              ? `€${plan.setup_data.totalSalesTarget.toLocaleString()}`
              : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {plan.setup_data?.targetMargin ? `${plan.setup_data.targetMargin}% margin` : ''}
          </p>
        </div>
      </div>

      {/* Phase Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Phases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PHASE_ORDER.map((phase) => (
            <PhaseCard
              key={phase}
              phase={phase}
              milestones={milestones}
              collectionId={collectionId}
            />
          ))}
        </div>
      </div>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Up</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {upcomingMilestones.map((m) => {
              const phaseInfo = PHASES[m.phase];
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: phaseInfo.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">{phaseInfo.name}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === 'in-progress'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {m.status === 'in-progress' ? 'In Progress' : 'Pending'}
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
