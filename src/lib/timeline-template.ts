import { TimelineMilestone, PhaseInfo, TimelinePhase, CollectionTimeline } from '@/types/timeline';

export const PHASES: Record<TimelinePhase, PhaseInfo> = {
  olawave: {
    id: 'olawave',
    name: 'OLA Wave Digital',
    nameEs: 'OLA Wave Digital',
    color: '#FF6B6B',
    bgColor: '#FFE8E8',
    icon: '🌊',
  },
  brand: {
    id: 'brand',
    name: 'Brand & Identity',
    nameEs: 'Marca e Identidad',
    color: '#4ECDC4',
    bgColor: '#E0F7F5',
    icon: '✦',
  },
  design: {
    id: 'design',
    name: 'Design & Development',
    nameEs: 'Diseño y Desarrollo',
    color: '#F5A623',
    bgColor: '#FFF3E0',
    icon: '✏',
  },
  prototyping: {
    id: 'prototyping',
    name: 'Prototyping',
    nameEs: 'Prototipado',
    color: '#7B68EE',
    bgColor: '#EDE7FF',
    icon: '🔧',
  },
  sampling: {
    id: 'sampling',
    name: 'Sampling',
    nameEs: 'Muestrario',
    color: '#E91E63',
    bgColor: '#FCE4EC',
    icon: '🧵',
  },
  digital: {
    id: 'digital',
    name: 'Digital Presence',
    nameEs: 'Presencia Digital',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    icon: '💻',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Pre-launch',
    nameEs: 'Marketing Pre-lanzamiento',
    color: '#FF9800',
    bgColor: '#FFF3E0',
    icon: '📣',
  },
  production: {
    id: 'production',
    name: 'Production',
    nameEs: 'Producción',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    icon: '🏭',
  },
  launch: {
    id: 'launch',
    name: 'Launch',
    nameEs: 'Lanzamiento',
    color: '#F44336',
    bgColor: '#FFEBEE',
    icon: '🚀',
  },
};

export const PHASE_ORDER: TimelinePhase[] = [
  'olawave',
  'brand',
  'design',
  'prototyping',
  'sampling',
  'digital',
  'marketing',
  'production',
  'launch',
];

type MilestoneTemplate = Omit<TimelineMilestone, 'status'>;

const DEFAULT_MILESTONES: MilestoneTemplate[] = [
  // ── OLA Wave Digital (wk 40 → 33) ──
  { id: 'ow-1', phase: 'olawave', name: 'Trend Research & Moodboarding', nameEs: 'Investigación de tendencias y moodboarding', responsible: 'US', startWeeksBefore: 40, durationWeeks: 2, color: '#FF6B6B' },
  { id: 'ow-2', phase: 'olawave', name: 'Range Strategy & Framework', nameEs: 'Estrategia y framework de colección', responsible: 'US', startWeeksBefore: 38, durationWeeks: 1, color: '#FF6B6B' },
  { id: 'ow-3', phase: 'olawave', name: 'Collection Planning & SKU Definition', nameEs: 'Planificación de colección y definición de SKUs', responsible: 'US', startWeeksBefore: 37, durationWeeks: 3, color: '#FF6B6B' },
  { id: 'ow-4', phase: 'olawave', name: 'Go-to-Market Strategy', nameEs: 'Estrategia Go-to-Market', responsible: 'US', startWeeksBefore: 34, durationWeeks: 1, color: '#FF6B6B' },
  { id: 'ow-5', phase: 'olawave', name: 'SketchFlow / Technical Sketches', nameEs: 'SketchFlow / Bocetos técnicos', responsible: 'US', startWeeksBefore: 36, durationWeeks: 2, color: '#FF6B6B' },

  // ── Brand & Identity (wk 38 → 29) ──
  { id: 'br-1', phase: 'brand', name: 'Brand Naming & Strategy', nameEs: 'Naming y estrategia de marca', responsible: 'US', startWeeksBefore: 38, durationWeeks: 2, color: '#4ECDC4' },
  { id: 'br-2', phase: 'brand', name: 'Logo & Visual Identity', nameEs: 'Logo e identidad visual', responsible: 'AGENCY', startWeeksBefore: 36, durationWeeks: 3, color: '#4ECDC4' },
  { id: 'br-3', phase: 'brand', name: 'Brand Guidelines', nameEs: 'Manual de marca', responsible: 'AGENCY', startWeeksBefore: 33, durationWeeks: 1, color: '#4ECDC4' },
  { id: 'br-4', phase: 'brand', name: 'Packaging Design', nameEs: 'Diseño de packaging', responsible: 'AGENCY', startWeeksBefore: 32, durationWeeks: 3, color: '#4ECDC4' },

  // ── Design & Development (wk 30 → 21) ──
  { id: 'ds-1', phase: 'design', name: 'Launch Last / Define Forms', nameEs: 'Definición de hormas', responsible: 'US', startWeeksBefore: 30, durationWeeks: 4, color: '#F5A623' },
  { id: 'ds-2', phase: 'design', name: 'Design Shot 1', nameEs: 'Diseño ronda 1', responsible: 'US', startWeeksBefore: 26, durationWeeks: 1.5, color: '#F5A623' },
  { id: 'ds-3', phase: 'design', name: 'Design Shot 2', nameEs: 'Diseño ronda 2', responsible: 'US', startWeeksBefore: 24.5, durationWeeks: 1, color: '#F5A623' },
  { id: 'ds-4', phase: 'design', name: 'Paper Pattern Development', nameEs: 'Desarrollo de patronaje', responsible: 'US', startWeeksBefore: 24.5, durationWeeks: 1, color: '#F5A623' },
  { id: 'ds-5', phase: 'design', name: 'Colorways Development', nameEs: 'Desarrollo de colorways', responsible: 'US', startWeeksBefore: 23.5, durationWeeks: 2, color: '#F5A623' },

  // ── Prototyping (wk 23 → 13) ──
  { id: 'pt-1', phase: 'prototyping', name: 'White Proto Development', nameEs: 'Desarrollo de proto blanco', responsible: 'FACTORY', startWeeksBefore: 23, durationWeeks: 6, color: '#7B68EE' },
  { id: 'pt-2', phase: 'prototyping', name: 'White Proto Delivery', nameEs: 'Entrega de proto blanco', responsible: 'FACTORY', startWeeksBefore: 17, durationWeeks: 1, color: '#7B68EE' },
  { id: 'pt-3', phase: 'prototyping', name: 'White Proto Rectification', nameEs: 'Rectificación de proto blanco', responsible: 'US', startWeeksBefore: 16, durationWeeks: 3, color: '#7B68EE' },
  { id: 'pt-4', phase: 'prototyping', name: 'Technical Sheets Completion', nameEs: 'Fichas técnicas completas', responsible: 'US', startWeeksBefore: 16, durationWeeks: 3, color: '#7B68EE' },

  // ── Sampling (wk 16 → 8) ──
  { id: 'sm-1', phase: 'sampling', name: 'Color Samples Development', nameEs: 'Desarrollo de muestras de color', responsible: 'FACTORY', startWeeksBefore: 16, durationWeeks: 6, color: '#E91E63' },
  { id: 'sm-2', phase: 'sampling', name: 'Fitting Samples Development', nameEs: 'Desarrollo de muestras de fitting', responsible: 'FACTORY', startWeeksBefore: 12, durationWeeks: 2.5, color: '#E91E63' },
  { id: 'sm-3', phase: 'sampling', name: 'Fitting Samples Confirmation', nameEs: 'Confirmación de muestras de fitting', responsible: 'US', startWeeksBefore: 11, durationWeeks: 3, color: '#E91E63' },
  { id: 'sm-4', phase: 'sampling', name: 'Collection Completed', nameEs: 'Colección completada', responsible: 'ALL', startWeeksBefore: 8, durationWeeks: 0.5, color: '#E91E63' },

  // ── Digital Presence (wk 24 → 8) ──
  { id: 'dg-1', phase: 'digital', name: 'Website Design & Development', nameEs: 'Diseño y desarrollo web', responsible: 'DIGITAL', startWeeksBefore: 24, durationWeeks: 6, color: '#9C27B0' },
  { id: 'dg-2', phase: 'digital', name: 'E-commerce Setup', nameEs: 'Setup de e-commerce', responsible: 'DIGITAL', startWeeksBefore: 18, durationWeeks: 3, color: '#9C27B0' },
  { id: 'dg-3', phase: 'digital', name: 'Product Photography / AI Renders', nameEs: 'Fotografía de producto / Renders IA', responsible: 'AGENCY', startWeeksBefore: 14, durationWeeks: 3, color: '#9C27B0' },
  { id: 'dg-4', phase: 'digital', name: 'Lookbook / Campaign Creative', nameEs: 'Lookbook / Creatividad de campaña', responsible: 'AGENCY', startWeeksBefore: 12, durationWeeks: 3, color: '#9C27B0' },
  { id: 'dg-5', phase: 'digital', name: 'Copywriting & Brand Story', nameEs: 'Copywriting e historia de marca', responsible: 'US', startWeeksBefore: 14, durationWeeks: 2, color: '#9C27B0' },

  // ── Marketing Pre-launch (wk 16 → 3) ──
  { id: 'mk-1', phase: 'marketing', name: 'Social Media Setup & Profiles', nameEs: 'Setup de redes sociales y perfiles', responsible: 'US', startWeeksBefore: 16, durationWeeks: 1, color: '#FF9800' },
  { id: 'mk-2', phase: 'marketing', name: 'Content Calendar & Production', nameEs: 'Calendario y producción de contenido', responsible: 'US', startWeeksBefore: 15, durationWeeks: 4, color: '#FF9800' },
  { id: 'mk-3', phase: 'marketing', name: 'Influencer & PR Outreach', nameEs: 'Outreach de influencers y PR', responsible: 'US', startWeeksBefore: 12, durationWeeks: 4, color: '#FF9800' },
  { id: 'mk-4', phase: 'marketing', name: 'Email List Building & Flows', nameEs: 'Captación de emails y flujos', responsible: 'DIGITAL', startWeeksBefore: 12, durationWeeks: 6, color: '#FF9800' },
  { id: 'mk-5', phase: 'marketing', name: 'Paid Ads Setup & Creative', nameEs: 'Setup de paid ads y creatividad', responsible: 'AGENCY', startWeeksBefore: 8, durationWeeks: 3, color: '#FF9800' },
  { id: 'mk-6', phase: 'marketing', name: 'PR & Seeding Shipments', nameEs: 'Envíos de PR y seeding', responsible: 'US', startWeeksBefore: 6, durationWeeks: 3, color: '#FF9800' },

  // ── Production (wk 8 → 1.5) ──
  { id: 'pd-1', phase: 'production', name: 'Production Order', nameEs: 'Orden de producción', responsible: 'US', startWeeksBefore: 8, durationWeeks: 0.5, color: '#2196F3' },
  { id: 'pd-2', phase: 'production', name: 'Production Timeline', nameEs: 'Timeline de producción en fábrica', responsible: 'FACTORY', startWeeksBefore: 7.5, durationWeeks: 5, color: '#2196F3' },
  { id: 'pd-3', phase: 'production', name: 'Quality Control', nameEs: 'Control de calidad', responsible: 'FACTORY', startWeeksBefore: 2.5, durationWeeks: 1, color: '#2196F3' },
  { id: 'pd-4', phase: 'production', name: 'Production Delivery & Logistics', nameEs: 'Entrega de producción y logística', responsible: 'FACTORY', startWeeksBefore: 1.5, durationWeeks: 1, color: '#2196F3' },

  // ── Launch (wk 3 → -3) ──
  { id: 'ln-1', phase: 'launch', name: 'Pre-launch Teasing Campaign', nameEs: 'Campaña de teasing pre-lanzamiento', responsible: 'US', startWeeksBefore: 3, durationWeeks: 3, color: '#F44336' },
  { id: 'ln-2', phase: 'launch', name: 'Launch Day Execution', nameEs: 'Ejecución día de lanzamiento', responsible: 'ALL', startWeeksBefore: 0, durationWeeks: 0.15, color: '#F44336' },
  { id: 'ln-3', phase: 'launch', name: 'Launch Week Push', nameEs: 'Push semana de lanzamiento', responsible: 'ALL', startWeeksBefore: 0, durationWeeks: 1, color: '#F44336' },
  { id: 'ln-4', phase: 'launch', name: 'Post-launch Analysis & Optimization', nameEs: 'Análisis y optimización post-lanzamiento', responsible: 'US', startWeeksBefore: -1, durationWeeks: 3, color: '#F44336' },
];

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
