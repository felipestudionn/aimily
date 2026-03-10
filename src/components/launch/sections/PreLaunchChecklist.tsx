'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Minus,
} from 'lucide-react';
import { PHASES, PHASE_ORDER } from '@/lib/timeline-template';
import { PhaseIcon } from '@/lib/phase-icons';
import type { TimelineMilestone, TimelinePhase } from '@/types/timeline';
import type { PhaseGoNoGo, PhaseReadiness } from '@/types/launch';

interface PreLaunchChecklistProps {
  milestones: TimelineMilestone[];
}

function getReadiness(progress: number, inProgress: number, total: number): PhaseReadiness {
  if (total === 0) return 'not_started';
  if (progress === 100) return 'ready';
  if (progress >= 50 || inProgress > 0) return 'at_risk';
  return 'blocked';
}

const READINESS_CONFIG: Record<PhaseReadiness, { label: string; color: string; bgColor: string; Icon: React.ElementType }> = {
  ready: { label: 'GO', color: '#10B981', bgColor: '#D1FAE5', Icon: ShieldCheck },
  at_risk: { label: 'AT RISK', color: '#F59E0B', bgColor: '#FEF3C7', Icon: ShieldAlert },
  blocked: { label: 'NO-GO', color: '#EF4444', bgColor: '#FEE2E2', Icon: ShieldX },
  not_started: { label: 'N/A', color: '#94A3B8', bgColor: '#F1F5F9', Icon: Minus },
};

export function PreLaunchChecklist({ milestones }: PreLaunchChecklistProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Build Go/No-Go status for each phase
  const phases: PhaseGoNoGo[] = PHASE_ORDER.map((phaseId) => {
    const info = PHASES[phaseId];
    const phaseMilestones = milestones.filter((m) => m.phase === phaseId);
    const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
    const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
    const total = phaseMilestones.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      phase: phaseId,
      label: info.name,
      labelEs: info.nameEs,
      icon: info.icon,
      color: info.color,
      totalMilestones: total,
      completedMilestones: completed,
      inProgressMilestones: inProgress,
      progress,
      readiness: getReadiness(progress, inProgress, total),
    };
  });

  // Summary counts
  const goCount = phases.filter((p) => p.readiness === 'ready').length;
  const atRiskCount = phases.filter((p) => p.readiness === 'at_risk').length;
  const noGoCount = phases.filter((p) => p.readiness === 'blocked').length;

  // Critical path: incomplete milestones sorted by phase order
  const pendingMilestones = milestones.filter((m) => m.status !== 'completed');

  // Overall readiness
  const overallReady = noGoCount === 0 && atRiskCount === 0;
  const overallAtRisk = noGoCount === 0 && atRiskCount > 0;

  return (
    <div className="space-y-6">
      {/* Go/No-Go Summary */}
      <div className={`rounded-2xl border-2 p-6 ${
        overallReady ? 'border-green-200 bg-green-50' :
        overallAtRisk ? 'border-amber-200 bg-amber-50' :
        'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Launch Readiness</h3>
            <p className="text-sm text-gray-500">Preparacion para el Lanzamiento</p>
          </div>
          <div className={`px-4 py-2 font-bold text-sm ${
            overallReady ? 'bg-green-500 text-white' :
            overallAtRisk ? 'bg-carbon text-white' :
            'bg-red-500 text-white'
          }`}>
            {overallReady ? 'READY TO LAUNCH' : overallAtRisk ? 'PROCEED WITH CAUTION' : 'NOT READY'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/60 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{goCount}</p>
            <p className="text-xs text-gray-500 mt-1">Phases GO</p>
          </div>
          <div className="bg-white/60 p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{atRiskCount}</p>
            <p className="text-xs text-gray-500 mt-1">At Risk</p>
          </div>
          <div className="bg-white/60 p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{noGoCount}</p>
            <p className="text-xs text-gray-500 mt-1">NO-GO</p>
          </div>
        </div>
      </div>

      {/* Phase-by-Phase Go/No-Go */}
      <div className="bg-white border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Phase Readiness</h3>
        <div className="space-y-2">
          {phases.map((phase) => {
            const config = READINESS_CONFIG[phase.readiness];
            const ReadinessIcon = config.Icon;
            const isExpanded = expandedPhase === phase.phase;
            const phaseMilestones = milestones.filter((m) => m.phase === phase.phase);

            return (
              <div key={phase.phase}>
                <button
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.phase)}
                  className="w-full flex items-center gap-3 py-3 px-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-6 h-6 flex items-center justify-center text-carbon">
                    <PhaseIcon phase={phase.phase} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">{phase.label}</p>
                    <p className="text-xs text-gray-400">{phase.labelEs}</p>
                  </div>
                  {/* Progress bar mini */}
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${phase.progress}%`, backgroundColor: phase.color }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{phase.progress}%</span>
                  {/* Readiness badge */}
                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: config.bgColor, color: config.color }}
                  >
                    <ReadinessIcon className="h-3 w-3" />
                    {config.label}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {/* Expanded milestones */}
                {isExpanded && (
                  <div className="ml-10 mr-4 mb-2 space-y-1">
                    {phaseMilestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm">
                        {m.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : m.status === 'in-progress' ? (
                          <Clock className="h-4 w-4 text-texto/60 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`flex-1 ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {m.name}
                        </span>
                        <span className="text-xs text-gray-400">{m.responsible}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Path — Pending Items */}
      {pendingMilestones.length > 0 && (
        <div className="bg-white border border-red-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Critical Path — {pendingMilestones.length} Items Remaining</h3>
          </div>
          <div className="space-y-2">
            {pendingMilestones.map((m) => {
              const phaseInfo = PHASES[m.phase as TimelinePhase];
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {m.status === 'in-progress' ? (
                    <Clock className="h-4 w-4 text-texto/60 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: phaseInfo?.bgColor, color: phaseInfo?.color }}
                  >
                    {phaseInfo?.name || m.phase}
                  </span>
                  <span className="text-sm text-gray-700 flex-1">{m.name}</span>
                  <span className="text-xs text-gray-400">{m.responsible}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
