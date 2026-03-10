import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';

/**
 * Wizard step IDs — the 10 phases of collection creation.
 * "studio" is a virtual phase (not in the timeline type) mapped to digital milestones dg-3/dg-4/dg-5.
 */
export type WizardPhaseId =
  | 'aimily'
  | 'brand'
  | 'design'
  | 'prototyping'
  | 'sampling'
  | 'studio'
  | 'digital'
  | 'marketing'
  | 'production'
  | 'launch';

export interface WizardPhase {
  id: WizardPhaseId;
  name: string;
  nameEs: string;
  /** Route segment under /collection/[id]/ */
  path: string;
  /** Milestone IDs that belong to this wizard step */
  milestoneIds: string[];
  /** Which milestone IDs must be completed before this phase unlocks */
  unlockWhen: string[];
}

/**
 * The 10 wizard phases in order, with their milestone mappings
 * and dependency-based unlock conditions.
 *
 * Dependency graph:
 *   [Product] ──→ [Design] ──→ [Prototyping] ──→ [Sampling] ──→ [Production] ──→ [Launch]
 *   [Brand]   ──→ [Digital] ──→ [Marketing] ────────────────────────────────────↗
 *                  [Studio] ──↗
 *
 * Product & Brand are FREE (no dependencies).
 */
export const WIZARD_PHASES: WizardPhase[] = [
  {
    id: 'aimily',
    name: 'Product & Merchandising',
    nameEs: 'Producto y Merchandising',
    path: 'product',
    milestoneIds: ['ow-1', 'ow-2', 'ow-3', 'ow-4', 'ow-5'],
    unlockWhen: [], // FREE
  },
  {
    id: 'brand',
    name: 'Brand & Identity',
    nameEs: 'Marca e Identidad',
    path: 'brand',
    milestoneIds: ['br-1', 'br-2', 'br-3', 'br-4'],
    unlockWhen: [], // FREE
  },
  {
    id: 'design',
    name: 'Design & Development',
    nameEs: 'Diseño y Desarrollo',
    path: 'design',
    milestoneIds: ['ds-1', 'ds-2', 'ds-3', 'ds-4', 'ds-5'],
    unlockWhen: ['ow-4'], // Requires: Product finalized
  },
  {
    id: 'prototyping',
    name: 'Prototyping',
    nameEs: 'Prototipado',
    path: 'prototyping',
    milestoneIds: ['pt-1', 'pt-2', 'pt-3', 'pt-4'],
    unlockWhen: ['ds-5'], // Requires: Design approved
  },
  {
    id: 'sampling',
    name: 'Sampling',
    nameEs: 'Muestrario',
    path: 'sampling',
    milestoneIds: ['sm-1', 'sm-2', 'sm-3', 'sm-4'],
    unlockWhen: ['pt-4'], // Requires: Proto approved
  },
  {
    id: 'studio',
    name: 'AI Creative Studio',
    nameEs: 'Estudio Creativo IA',
    path: 'studio',
    milestoneIds: ['dg-3', 'dg-4', 'dg-5'],
    unlockWhen: ['sm-4'], // Requires: Sampling done (partial after Design)
  },
  {
    id: 'digital',
    name: 'Digital Presence',
    nameEs: 'Presencia Digital',
    path: 'digital',
    milestoneIds: ['dg-1', 'dg-2'],
    unlockWhen: ['br-4', 'dg-3'], // Requires: Brand done + Studio renders
  },
  {
    id: 'marketing',
    name: 'Marketing',
    nameEs: 'Marketing',
    path: 'marketing',
    milestoneIds: ['mk-1', 'mk-2', 'mk-3', 'mk-4', 'mk-5', 'mk-6'],
    unlockWhen: ['dg-1', 'br-4'], // Requires: Digital + Brand
  },
  {
    id: 'production',
    name: 'Production & Logistics',
    nameEs: 'Producción y Logística',
    path: 'production',
    milestoneIds: ['pd-1', 'pd-2', 'pd-3', 'pd-4'],
    unlockWhen: ['sm-4'], // Requires: Sampling approved
  },
  {
    id: 'launch',
    name: 'Launch',
    nameEs: 'Lanzamiento',
    path: 'launch',
    milestoneIds: ['ln-1', 'ln-2', 'ln-3', 'ln-4'],
    unlockWhen: ['pd-4', 'mk-6', 'dg-2'], // Requires: Production + Marketing + Digital
  },
];

export const WIZARD_PHASE_ORDER: WizardPhaseId[] = WIZARD_PHASES.map((p) => p.id);

/**
 * Given milestones, compute each wizard phase's state.
 */
export type WizardPhaseState = 'locked' | 'available' | 'in-progress' | 'completed';

export interface WizardPhaseStatus {
  phase: WizardPhase;
  state: WizardPhaseState;
  progress: number; // 0-100
  completedCount: number;
  totalCount: number;
}

export function computeWizardState(milestones: TimelineMilestone[]): WizardPhaseStatus[] {
  const milestoneMap = new Map<string, TimelineMilestone>();
  for (const m of milestones) {
    milestoneMap.set(m.id, m);
  }

  function isMilestoneCompleted(id: string): boolean {
    return milestoneMap.get(id)?.status === 'completed';
  }

  return WIZARD_PHASES.map((phase) => {
    const phaseMilestones = phase.milestoneIds
      .map((id) => milestoneMap.get(id))
      .filter(Boolean) as TimelineMilestone[];

    const totalCount = phaseMilestones.length;
    const completedCount = phaseMilestones.filter((m) => m.status === 'completed').length;
    const inProgressCount = phaseMilestones.filter((m) => m.status === 'in-progress').length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Check unlock conditions
    const isUnlocked =
      phase.unlockWhen.length === 0 ||
      phase.unlockWhen.every((id) => isMilestoneCompleted(id));

    let state: WizardPhaseState;
    if (!isUnlocked) {
      state = 'locked';
    } else if (completedCount === totalCount && totalCount > 0) {
      state = 'completed';
    } else if (inProgressCount > 0 || completedCount > 0) {
      state = 'in-progress';
    } else {
      state = 'available';
    }

    return { phase, state, progress, completedCount, totalCount };
  });
}
