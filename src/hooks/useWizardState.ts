import { useMemo } from 'react';
import type { TimelineMilestone } from '@/types/timeline';
import { computeWizardState, type WizardPhaseStatus } from '@/lib/wizard-phases';

/**
 * Hook that computes the wizard phase states from timeline milestones.
 * Returns lock/unlock status, progress, and helpers for each wizard step.
 */
export function useWizardState(milestones: TimelineMilestone[]) {
  const phases = useMemo(() => computeWizardState(milestones), [milestones]);

  const overallProgress = useMemo(() => {
    const total = phases.reduce((sum, p) => sum + p.totalCount, 0);
    const completed = phases.reduce((sum, p) => sum + p.completedCount, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [phases]);

  const activePhase = useMemo(() => {
    // First in-progress phase, or first available phase
    return (
      phases.find((p) => p.state === 'in-progress') ||
      phases.find((p) => p.state === 'available') ||
      null
    );
  }, [phases]);

  const isPhaseAccessible = (phaseId: string): boolean => {
    const phase = phases.find((p) => p.phase.id === phaseId);
    return phase ? phase.state !== 'locked' : false;
  };

  return {
    phases,
    overallProgress,
    activePhase,
    isPhaseAccessible,
  };
}
