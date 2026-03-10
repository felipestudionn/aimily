'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertCircle, CalendarDays } from 'lucide-react';
import { PHASES } from '@/lib/timeline-template';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';

interface PhasePlaceholderProps {
  phase: TimelinePhase;
  milestones: TimelineMilestone[];
}

export function PhasePlaceholder({ phase, milestones }: PhasePlaceholderProps) {
  const { id } = useParams();
  const info = PHASES[phase];
  const phaseMilestones = milestones.filter((m) => m.phase === phase);
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress = phaseMilestones.length > 0
    ? Math.round((completed / phaseMilestones.length) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Phase Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: info.bgColor }}
        >
          {info.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{info.name}</h1>
          <p className="text-sm text-gray-500">{info.nameEs}</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Phase Progress</h2>
          <span className="text-2xl font-bold" style={{ color: info.color }}>
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: info.color }}
          />
        </div>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-gray-600">{completed} completed</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-gray-600">{inProgress} in progress</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-300" />
            <span className="text-gray-600">{pending} pending</span>
          </div>
        </div>
      </div>

      {/* Milestones Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Milestones</h2>
        <div className="space-y-3">
          {phaseMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : m.status === 'in-progress'
                    ? 'border-amber-500'
                    : 'border-gray-200'
                }`}
              >
                {m.status === 'completed' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {m.status === 'in-progress' && (
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {m.name}
                </p>
                <p className="text-xs text-gray-400">{m.nameEs}</p>
              </div>
              <span className="text-xs text-gray-400">{m.responsible}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div
        className="rounded-2xl border-2 border-dashed p-8 text-center"
        style={{ borderColor: info.color + '40' }}
      >
        <p className="text-lg font-semibold text-gray-700 mb-2">
          Phase tools coming soon
        </p>
        <p className="text-sm text-gray-500 mb-4">
          This module will include specialized tools for the {info.name.toLowerCase()} phase.
          Track milestone progress from the{' '}
          <Link href={`/collection/${id}/calendar`} className="text-blue-600 hover:underline">
            Calendar
          </Link>.
        </p>
        <CalendarDays className="h-8 w-8 mx-auto text-gray-300" />
      </div>
    </div>
  );
}
