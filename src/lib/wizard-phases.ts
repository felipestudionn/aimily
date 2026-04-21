import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';

/**
 * Workspace IDs — the 10 individual workspaces in a collection.
 * These map to routes under /collection/[id]/.
 * NOT the same as TimelinePhase (which has only 4 calendar blocks).
 */
export type WizardPhaseId =
  | 'product'
  | 'brand'
  | 'merchandising'
  | 'design'
  | 'prototyping'
  | 'sampling'
  | 'production'
  | 'marketing-creation'
  | 'marketing-distribution';

export interface WizardPhase {
  id: WizardPhaseId;
  name: string;
  nameEs: string;
  /** Route segment under /collection/[id]/ */
  path: string;
  /** Which of the 4 calendar blocks this workspace belongs to */
  block: TimelinePhase;
  /** Milestone IDs that belong to this wizard step */
  milestoneIds: string[];
  /** Which milestone IDs must be completed before this phase unlocks */
  unlockWhen: string[];
}

/**
 * The 10 wizard phases (workspaces) grouped under 4 blocks.
 *
 * Block dependency graph:
 *   [Creative & Brand] ──→ [Design & Development] ──→ (Production included)
 *   [Range Planning]   ──→ [Design & Development]
 *   [Range Planning]   ──→ [Marketing & Digital] (with placeholders OK)
 *   [Design & Dev]     ──→ [Marketing & Digital] (product for photos/lookbook)
 *
 * Workspace dependencies within blocks:
 *   Product & Brand are FREE (no dependencies).
 *   Design requires Range Planning done.
 *   Prototyping requires Design done.
 *   Sampling requires Prototyping done.
 *   Studio requires Sampling done (for renders).
 *   Digital requires Brand + Studio.
 *   Marketing requires Digital + Brand.
 *   Production requires Sampling done.
 *   Launch requires Production + Marketing + Digital.
 */
export const WIZARD_PHASES: WizardPhase[] = [
  // ── Block 1: Creative & Brand ──
  {
    id: 'product',
    name: 'Product & Creative',
    nameEs: 'Producto y Creativo',
    path: 'product',
    block: 'creative',
    milestoneIds: ['cr-1', 'cr-2'],
    unlockWhen: [], // FREE
  },
  {
    id: 'brand',
    name: 'Brand & Identity',
    nameEs: 'Marca e Identidad',
    path: 'brand',
    block: 'creative',
    milestoneIds: ['br-1', 'br-2', 'br-3', 'br-4'],
    unlockWhen: [], // FREE
  },

  // ── Block 2: Merchandising & Planning ──
  {
    id: 'merchandising',
    name: 'Merchandising & Planning',
    nameEs: 'Merchandising y Planificación',
    path: 'merchandising',
    block: 'planning',
    milestoneIds: ['rp-1', 'rp-2', 'rp-3', 'rp-4', 'rp-5', 'rp-6'],
    unlockWhen: [], // FREE — can start anytime
  },

  // ── Block 3: Design & Development ──
  {
    id: 'design',
    name: 'Sketch, Color & Materials',
    nameEs: 'Sketch, Color y Materiales',
    path: 'design',
    block: 'development',
    milestoneIds: ['dd-1', 'dd-2', 'dd-3', 'dd-4', 'dd-5', 'dd-6'],
    unlockWhen: ['rp-6'], // Requires: Range planning + GTM done
  },
  {
    id: 'prototyping',
    name: 'Prototyping',
    nameEs: 'Prototipado',
    path: 'prototyping',
    block: 'development',
    milestoneIds: ['dd-7', 'dd-8', 'dd-9', 'dd-10'],
    unlockWhen: ['dd-6'], // Requires: Design approved (colorways done)
  },
  {
    id: 'sampling',
    name: 'Selection & Catalog',
    nameEs: 'Selección y Catálogo',
    path: 'sampling',
    block: 'development',
    milestoneIds: ['dd-11', 'dd-12', 'dd-13', 'dd-14'],
    unlockWhen: ['dd-10'], // Requires: Proto approved (tech sheets done)
  },
  {
    id: 'production',
    name: 'Production & Logistics',
    nameEs: 'Producción y Logística',
    path: 'production',
    block: 'development',
    milestoneIds: ['dd-15', 'dd-16', 'dd-17', 'dd-18'],
    unlockWhen: ['dd-14'], // Requires: Collection completed (sampling done)
  },

  // ── Block 4: Marketing & Digital (2 screens) ──
  // Both screens unlock as soon as the range plan is done, in parallel with
  // Design. This is marketing STRATEGY territory: stories, pillars, voice,
  // product copy, social/email templates, SEO, GTM, content calendar, paid
  // plan and launch checklist can all start before the first render exists.
  //
  // The 2 cards that DO need a physical product image (Product Visuals and
  // Campaign & Video) guard themselves at the card level — they read
  // sku.render_urls['3d'] and show a "complete design phase first" hint
  // when no SKU has a 3D render yet. See ProductVisualsCard.handleGenerate
  // and CampaignVideoCard.handleEditorialGenerate/handleVideoGenerate.
  {
    id: 'marketing-creation',
    name: 'Creation',
    nameEs: 'Creación',
    path: 'marketing/creation',
    block: 'go_to_market',
    milestoneIds: ['gm-3', 'gm-4', 'gm-5'],
    unlockWhen: [], // Always accessible
  },
  {
    id: 'marketing-distribution',
    name: 'Distribution & Launch',
    nameEs: 'Distribución y Lanzamiento',
    path: 'marketing/distribution',
    block: 'go_to_market',
    milestoneIds: ['gm-1', 'gm-2', 'gm-6', 'gm-7', 'gm-8', 'gm-9', 'gm-10', 'gm-11', 'gm-12', 'gm-13', 'gm-14', 'gm-15'],
    unlockWhen: [], // Always accessible
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
