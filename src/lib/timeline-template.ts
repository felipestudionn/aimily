import { TimelineMilestone, PhaseInfo, TimelinePhase, CollectionTimeline } from '@/types/timeline';

/* ═══════════════════════════════════════════════════════════
   4 CALENDAR BLOCKS (teams)
   ═══════════════════════════════════════════════════════════ */

export const PHASES: Record<TimelinePhase, PhaseInfo> = {
  creative: {
    id: 'creative',
    name: 'Creative & Brand',
    nameEs: 'Creativo y Marca',
    color: '#5A8A7A',
    bgColor: '#E8F0EE',
    icon: '✦',
  },
  planning: {
    id: 'planning',
    name: 'Range Planning & Strategy',
    nameEs: 'Planificación y Estrategia',
    color: '#9A7A60',
    bgColor: '#F0EAE4',
    icon: '📊',
  },
  development: {
    id: 'development',
    name: 'Design & Development',
    nameEs: 'Diseño y Desarrollo',
    color: '#7A6A9A',
    bgColor: '#EAE8F0',
    icon: '✏',
  },
  go_to_market: {
    id: 'go_to_market',
    name: 'Marketing & Digital',
    nameEs: 'Marketing y Digital',
    color: '#9A6070',
    bgColor: '#F0E8EA',
    icon: '🚀',
  },
};

export const PHASE_ORDER: TimelinePhase[] = [
  'creative',
  'planning',
  'development',
  'go_to_market',
];

/* ═══════════════════════════════════════════════════════════
   DEFAULT MILESTONES — organized by the 4 blocks
   ═══════════════════════════════════════════════════════════ */

type MilestoneTemplate = Omit<TimelineMilestone, 'status'>;

export const DEFAULT_MILESTONES: MilestoneTemplate[] = [
  // ══════════════════════════════════════════════════════════
  // BLOCK 1: CREATIVE & BRAND (equipo creativo)
  // Brand identity + trend research + creative direction
  // ══════════════════════════════════════════════════════════
  { id: 'cr-1', phase: 'creative', name: 'Consumer & Target Definition', nameEs: 'Definición de consumidor y target', responsible: 'US', startWeeksBefore: 48, durationWeeks: 2, color: '#5A8A7A' },
  { id: 'cr-2', phase: 'creative', name: 'Trend Research & Moodboarding', nameEs: 'Investigación de tendencias y moodboarding', responsible: 'US', startWeeksBefore: 46, durationWeeks: 3, color: '#5A8A7A' },
  { id: 'br-1', phase: 'creative', name: 'Brand Naming & Strategy', nameEs: 'Naming y estrategia de marca', responsible: 'US', startWeeksBefore: 46, durationWeeks: 3, color: '#5A8A7A' },
  { id: 'br-2', phase: 'creative', name: 'Logo & Visual Identity', nameEs: 'Logo e identidad visual', responsible: 'AGENCY/US', startWeeksBefore: 43, durationWeeks: 4, color: '#5A8A7A' },
  { id: 'br-3', phase: 'creative', name: 'Brand Guidelines', nameEs: 'Manual de marca', responsible: 'AGENCY/US', startWeeksBefore: 39, durationWeeks: 2, color: '#5A8A7A' },
  { id: 'br-4', phase: 'creative', name: 'Packaging Design', nameEs: 'Diseño de packaging', responsible: 'AGENCY/US', startWeeksBefore: 37, durationWeeks: 3, color: '#5A8A7A' },

  // ══════════════════════════════════════════════════════════
  // BLOCK 2: RANGE PLANNING & STRATEGY (merchandising / planners)
  // Consumer → market → channel → budget → SKUs → GTM
  // ══════════════════════════════════════════════════════════
  { id: 'rp-1', phase: 'planning', name: 'Consumer & Market Analysis', nameEs: 'Análisis de consumidor y mercado', responsible: 'US', startWeeksBefore: 46, durationWeeks: 2, color: '#9A7A60' },
  { id: 'rp-2', phase: 'planning', name: 'Channel & Distribution Strategy', nameEs: 'Estrategia de canal y distribución', responsible: 'US', startWeeksBefore: 44, durationWeeks: 2, color: '#9A7A60' },
  { id: 'rp-3', phase: 'planning', name: 'Sales Budget & Financial Framework', nameEs: 'Presupuesto de ventas y marco financiero', responsible: 'US', startWeeksBefore: 42, durationWeeks: 2, color: '#9A7A60' },
  { id: 'rp-4', phase: 'planning', name: 'Range Strategy & Framework', nameEs: 'Estrategia y framework de colección', responsible: 'US', startWeeksBefore: 42, durationWeeks: 2, color: '#9A7A60' },
  { id: 'rp-5', phase: 'planning', name: 'Collection Planning & SKU Definition', nameEs: 'Planificación de colección y definición de SKUs', responsible: 'US', startWeeksBefore: 40, durationWeeks: 3, color: '#9A7A60' },
  { id: 'rp-6', phase: 'planning', name: 'Go-to-Market Strategy', nameEs: 'Estrategia Go-to-Market', responsible: 'US', startWeeksBefore: 37, durationWeeks: 1, color: '#9A7A60' },

  // ══════════════════════════════════════════════════════════
  // BLOCK 3: DESIGN & DEVELOPMENT (equipo técnico)
  // Sketches → design → prototyping → sampling → production
  // ══════════════════════════════════════════════════════════

  // — Design —
  { id: 'dd-1', phase: 'development', name: 'SketchFlow / Technical Sketches', nameEs: 'SketchFlow / Bocetos técnicos', responsible: 'US', startWeeksBefore: 38, durationWeeks: 3, color: '#7A6A9A' },
  { id: 'dd-2', phase: 'development', name: 'Launch Last / Define Forms', nameEs: 'Definición de hormas', responsible: 'US', startWeeksBefore: 35, durationWeeks: 4, color: '#7A6A9A' },
  { id: 'dd-3', phase: 'development', name: 'Design Shot 1', nameEs: 'Diseño ronda 1', responsible: 'US', startWeeksBefore: 31, durationWeeks: 2, color: '#7A6A9A' },
  { id: 'dd-4', phase: 'development', name: 'Design Shot 2', nameEs: 'Diseño ronda 2', responsible: 'US', startWeeksBefore: 29, durationWeeks: 1.5, color: '#7A6A9A' },
  { id: 'dd-5', phase: 'development', name: 'Paper Pattern Development', nameEs: 'Desarrollo de patronaje', responsible: 'US', startWeeksBefore: 29, durationWeeks: 1.5, color: '#7A6A9A' },
  { id: 'dd-6', phase: 'development', name: 'Colorways Development', nameEs: 'Desarrollo de colorways', responsible: 'US', startWeeksBefore: 27.5, durationWeeks: 2, color: '#7A6A9A' },

  // — Prototyping —
  { id: 'dd-7', phase: 'development', name: 'White Proto Development', nameEs: 'Desarrollo de proto blanco', responsible: 'FACTORY', startWeeksBefore: 28, durationWeeks: 7, color: '#7A6A9A' },
  { id: 'dd-8', phase: 'development', name: 'White Proto Delivery', nameEs: 'Entrega de proto blanco', responsible: 'FACTORY', startWeeksBefore: 21, durationWeeks: 1, color: '#7A6A9A' },
  { id: 'dd-9', phase: 'development', name: 'White Proto Rectification', nameEs: 'Rectificación de proto blanco', responsible: 'US', startWeeksBefore: 20, durationWeeks: 4, color: '#7A6A9A' },
  { id: 'dd-10', phase: 'development', name: 'Technical Sheets Completion', nameEs: 'Fichas técnicas completas', responsible: 'US', startWeeksBefore: 20, durationWeeks: 4, color: '#7A6A9A' },

  // — Sampling —
  { id: 'dd-11', phase: 'development', name: 'Color Samples Development', nameEs: 'Desarrollo de muestras de color', responsible: 'FACTORY', startWeeksBefore: 19, durationWeeks: 6, color: '#7A6A9A' },
  { id: 'dd-12', phase: 'development', name: 'Fitting Samples Development', nameEs: 'Desarrollo de muestras de fitting', responsible: 'FACTORY', startWeeksBefore: 14, durationWeeks: 3, color: '#7A6A9A' },
  { id: 'dd-13', phase: 'development', name: 'Fitting Samples Confirmation', nameEs: 'Confirmación de muestras de fitting', responsible: 'US', startWeeksBefore: 13, durationWeeks: 3, color: '#7A6A9A' },
  { id: 'dd-14', phase: 'development', name: 'Collection Completed', nameEs: 'Colección completada', responsible: 'ALL', startWeeksBefore: 10, durationWeeks: 0.5, color: '#7A6A9A' },

  // — Production —
  { id: 'dd-15', phase: 'development', name: 'Production Order', nameEs: 'Orden de producción', responsible: 'US', startWeeksBefore: 10, durationWeeks: 1, color: '#7A6A9A' },
  { id: 'dd-16', phase: 'development', name: 'Production Timeline', nameEs: 'Timeline de producción en fábrica', responsible: 'FACTORY', startWeeksBefore: 9, durationWeeks: 6, color: '#7A6A9A' },
  { id: 'dd-17', phase: 'development', name: 'Quality Control', nameEs: 'Control de calidad', responsible: 'FACTORY', startWeeksBefore: 3, durationWeeks: 1, color: '#7A6A9A' },
  { id: 'dd-18', phase: 'development', name: 'Production Delivery & Logistics', nameEs: 'Entrega de producción y logística', responsible: 'FACTORY', startWeeksBefore: 2, durationWeeks: 1, color: '#7A6A9A' },

  // ══════════════════════════════════════════════════════════
  // BLOCK 4: MARKETING & DIGITAL (equipo marketing)
  // Digital presence → marketing → launch
  // ══════════════════════════════════════════════════════════

  // — Digital Presence —
  { id: 'gm-1', phase: 'go_to_market', name: 'Website Design & Development', nameEs: 'Diseño y desarrollo web', responsible: 'AGENCY/US', startWeeksBefore: 30, durationWeeks: 8, color: '#9A6070' },
  { id: 'gm-2', phase: 'go_to_market', name: 'E-commerce Setup', nameEs: 'Setup de e-commerce', responsible: 'AGENCY/US', startWeeksBefore: 22, durationWeeks: 4, color: '#9A6070' },
  { id: 'gm-3', phase: 'go_to_market', name: 'Product Photography / AI Renders', nameEs: 'Fotografía de producto / Renders IA', responsible: 'AGENCY/US', startWeeksBefore: 17, durationWeeks: 3, color: '#9A6070' },
  { id: 'gm-4', phase: 'go_to_market', name: 'Copywriting & Brand Story', nameEs: 'Copywriting e historia de marca', responsible: 'US', startWeeksBefore: 17, durationWeeks: 3, color: '#9A6070' },
  { id: 'gm-5', phase: 'go_to_market', name: 'Lookbook / Campaign Creative', nameEs: 'Lookbook / Creatividad de campaña', responsible: 'AGENCY/US', startWeeksBefore: 14, durationWeeks: 4, color: '#9A6070' },

  // — Marketing Pre-launch —
  { id: 'gm-6', phase: 'go_to_market', name: 'Social Media Setup & Profiles', nameEs: 'Setup de redes sociales y perfiles', responsible: 'US', startWeeksBefore: 20, durationWeeks: 2, color: '#9A6070' },
  { id: 'gm-7', phase: 'go_to_market', name: 'Content Calendar & Production', nameEs: 'Calendario y producción de contenido', responsible: 'US', startWeeksBefore: 18, durationWeeks: 5, color: '#9A6070' },
  { id: 'gm-8', phase: 'go_to_market', name: 'Influencer & PR Outreach', nameEs: 'Outreach de influencers y PR', responsible: 'US', startWeeksBefore: 14, durationWeeks: 5, color: '#9A6070' },
  { id: 'gm-9', phase: 'go_to_market', name: 'Email List Building & Flows', nameEs: 'Captación de emails y flujos', responsible: 'AGENCY/US', startWeeksBefore: 14, durationWeeks: 8, color: '#9A6070' },
  { id: 'gm-10', phase: 'go_to_market', name: 'Paid Ads Setup & Creative', nameEs: 'Setup de paid ads y creatividad', responsible: 'AGENCY/US', startWeeksBefore: 10, durationWeeks: 4, color: '#9A6070' },
  { id: 'gm-11', phase: 'go_to_market', name: 'PR & Seeding Shipments', nameEs: 'Envíos de PR y seeding', responsible: 'US', startWeeksBefore: 8, durationWeeks: 4, color: '#9A6070' },

  // — Launch —
  { id: 'gm-12', phase: 'go_to_market', name: 'Pre-launch Teasing Campaign', nameEs: 'Campaña de teasing pre-lanzamiento', responsible: 'US', startWeeksBefore: 4, durationWeeks: 4, color: '#9A6070' },
  { id: 'gm-13', phase: 'go_to_market', name: 'Launch Day Execution', nameEs: 'Ejecución día de lanzamiento', responsible: 'ALL', startWeeksBefore: 0, durationWeeks: 0.15, color: '#9A6070' },
  { id: 'gm-14', phase: 'go_to_market', name: 'Launch Week Push', nameEs: 'Push semana de lanzamiento', responsible: 'ALL', startWeeksBefore: 0, durationWeeks: 1, color: '#9A6070' },
  { id: 'gm-15', phase: 'go_to_market', name: 'Post-launch Analysis & Optimization', nameEs: 'Análisis y optimización post-lanzamiento', responsible: 'US', startWeeksBefore: -1, durationWeeks: 3, color: '#9A6070' },
];

/* ═══════════════════════════════════════════════════════════
   LEGACY ID MAPPING — maps old milestone IDs (ow-*, ds-*, etc.)
   to new IDs (cr-*, rp-*, dd-*, gm-*) for backward compatibility
   with existing timelines stored in Supabase.
   ═══════════════════════════════════════════════════════════ */

export const LEGACY_MILESTONE_MAP: Record<string, string> = {
  // Old Product & Merchandising → Creative / Planning / Development
  'ow-1': 'cr-2',  // Trend Research → Creative
  'ow-2': 'rp-4',  // Range Strategy → Planning
  'ow-3': 'rp-5',  // Collection Planning → Planning
  'ow-4': 'rp-6',  // Go-to-Market → Planning
  'ow-5': 'dd-1',  // SketchFlow → Development
  // Old Brand → Creative (IDs kept: br-1, br-2, br-3, br-4)
  // Old Design → Development
  'ds-1': 'dd-2',
  'ds-2': 'dd-3',
  'ds-3': 'dd-4',
  'ds-4': 'dd-5',
  'ds-5': 'dd-6',
  // Old Prototyping → Development
  'pt-1': 'dd-7',
  'pt-2': 'dd-8',
  'pt-3': 'dd-9',
  'pt-4': 'dd-10',
  // Old Sampling → Development
  'sm-1': 'dd-11',
  'sm-2': 'dd-12',
  'sm-3': 'dd-13',
  'sm-4': 'dd-14',
  // Old Digital → Go to Market
  'dg-1': 'gm-1',
  'dg-2': 'gm-2',
  'dg-3': 'gm-3',
  'dg-4': 'gm-5',
  'dg-5': 'gm-4',
  // Old Marketing → Go to Market
  'mk-1': 'gm-6',
  'mk-2': 'gm-7',
  'mk-3': 'gm-8',
  'mk-4': 'gm-9',
  'mk-5': 'gm-10',
  'mk-6': 'gm-11',
  // Old Production → Development
  'pd-1': 'dd-15',
  'pd-2': 'dd-16',
  'pd-3': 'dd-17',
  'pd-4': 'dd-18',
  // Old Launch → Go to Market
  'ln-1': 'gm-12',
  'ln-2': 'gm-13',
  'ln-3': 'gm-14',
  'ln-4': 'gm-15',
};

/** Map old 9-phase names to new 4-block names */
export const LEGACY_PHASE_MAP: Record<string, TimelinePhase> = {
  'aimily': 'creative',
  'brand': 'creative',
  'design': 'development',
  'prototyping': 'development',
  'sampling': 'development',
  'digital': 'go_to_market',
  'marketing': 'go_to_market',
  'production': 'development',
  'launch': 'go_to_market',
};

/** Resolve a milestone ID (legacy or new) to a new ID */
export function resolveNewMilestoneId(id: string): string {
  return LEGACY_MILESTONE_MAP[id] || id;
}

/** Get the phase for a milestone ID (handles legacy IDs) */
export function getPhaseForMilestone(id: string): TimelinePhase | undefined {
  const newId = resolveNewMilestoneId(id);
  const milestone = DEFAULT_MILESTONES.find((m) => m.id === newId);
  return milestone?.phase;
}

/**
 * Migrate legacy milestones from Supabase to the new 4-block system.
 * - Remaps old IDs (ow-*, ds-*, etc.) to new IDs (cr-*, dd-*, etc.)
 * - Remaps old phase names (brand, design, etc.) to new block names (creative, development, etc.)
 * - Fills in missing fields from the default template
 */
export function migrateLegacyMilestones(milestones: TimelineMilestone[]): TimelineMilestone[] {
  return milestones.map((m) => {
    const newId = resolveNewMilestoneId(m.id);
    const template = DEFAULT_MILESTONES.find((t) => t.id === newId);

    // Resolve the phase: use template phase if available, else map legacy phase name
    const newPhase = template?.phase
      ?? LEGACY_PHASE_MAP[m.phase]
      ?? (PHASES[m.phase as TimelinePhase] ? m.phase as TimelinePhase : 'creative');

    return {
      ...m,
      id: newId,
      phase: newPhase,
      name: template?.name ?? m.name,
      nameEs: template?.nameEs ?? m.nameEs,
      responsible: template?.responsible ?? m.responsible,
      startWeeksBefore: template?.startWeeksBefore ?? m.startWeeksBefore,
      durationWeeks: template?.durationWeeks ?? m.durationWeeks,
      color: template?.color ?? m.color,
    };
  });
}

/* ═══════════════════════════════════════════════════════════
   TIMELINE FACTORY & DATE HELPERS
   ═══════════════════════════════════════════════════════════ */

export function createDefaultTimeline(
  collectionName: string,
  season: string,
  launchDate: string
): CollectionTimeline {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    collectionName,
    season,
    launchDate,
    milestones: DEFAULT_MILESTONES.map((m) => ({
      ...m,
      status: 'pending' as const,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function getMilestoneDate(
  launchDate: string,
  weeksBefore: number
): Date {
  const launch = new Date(launchDate);
  const d = new Date(launch);
  d.setDate(d.getDate() - weeksBefore * 7);
  return d;
}

export function getMilestoneEndDate(
  launchDate: string,
  startWeeksBefore: number,
  durationWeeks: number
): Date {
  const start = getMilestoneDate(launchDate, startWeeksBefore);
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7);
  return end;
}

export function getTimelineBounds(timeline: CollectionTimeline) {
  const launchDate = new Date(timeline.launchDate);

  let earliestDate = new Date(launchDate);
  let latestDate = new Date(launchDate);

  timeline.milestones.forEach((m) => {
    const start = getMilestoneDate(timeline.launchDate, m.startWeeksBefore);
    const end = getMilestoneEndDate(
      timeline.launchDate,
      m.startWeeksBefore,
      m.durationWeeks
    );
    if (start < earliestDate) earliestDate = new Date(start);
    if (end > latestDate) latestDate = new Date(end);
  });

  // Add buffer
  earliestDate.setDate(earliestDate.getDate() - 7);
  earliestDate.setDate(1); // Start of month
  latestDate.setDate(latestDate.getDate() + 14);
  latestDate.setMonth(latestDate.getMonth() + 1, 0); // End of month

  const totalDays = Math.ceil(
    (latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { earliestDate, latestDate, totalDays, launchDate };
}

export function getMonthColumns(startDate: Date, endDate: Date) {
  const months: {
    name: string;
    year: number;
    startDay: number;
    days: number;
  }[] = [];

  const MONTH_NAMES_ES = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ];

  const current = new Date(startDate);
  while (current <= endDate) {
    const monthStart = Math.max(
      0,
      Math.ceil(
        (current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const daysInMonth = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      0
    ).getDate();
    const remainingDaysInView = Math.ceil(
      (endDate.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
    );
    const visibleDays = Math.min(daysInMonth, remainingDaysInView + 1);

    months.push({
      name: MONTH_NAMES_ES[current.getMonth()],
      year: current.getFullYear(),
      startDay: monthStart,
      days: visibleDays,
    });
    current.setMonth(current.getMonth() + 1, 1);
  }

  return months;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
