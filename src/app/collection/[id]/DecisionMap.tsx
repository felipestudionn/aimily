'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PHASES, PHASE_ORDER, DEFAULT_MILESTONES, getMilestoneDate, getMilestoneEndDate } from '@/lib/timeline-template';
import type { TimelineMilestone, TimelinePhase } from '@/types/timeline';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface DecisionMapProps {
  milestones: TimelineMilestone[];
  launchDate?: string;
  collectionId: string;
}

interface SubGroup {
  label: string;
  labelEs: string;
  ids: string[];
}

interface BlockDef {
  phase: TimelinePhase;
  name: string;
  nameEs: string;
  subGroups?: SubGroup[];
}

/* ═══════════════════════════════════════════════════════════
   BLOCK DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

const BLOCKS: BlockDef[] = [
  {
    phase: 'creative',
    name: 'Creative & Brand',
    nameEs: 'Creativo y Marca',
  },
  {
    phase: 'planning',
    name: 'Range Planning & Strategy',
    nameEs: 'Planificación y Estrategia',
  },
  {
    phase: 'development',
    name: 'Design & Development',
    nameEs: 'Diseño y Desarrollo',
    subGroups: [
      { label: 'Design', labelEs: 'Diseño', ids: ['dd-1', 'dd-2', 'dd-3', 'dd-4', 'dd-5', 'dd-6'] },
      { label: 'Prototyping', labelEs: 'Prototipado', ids: ['dd-7', 'dd-8', 'dd-9', 'dd-10'] },
      { label: 'Sampling', labelEs: 'Muestrario', ids: ['dd-11', 'dd-12', 'dd-13', 'dd-14'] },
      { label: 'Production', labelEs: 'Producción', ids: ['dd-15', 'dd-16', 'dd-17', 'dd-18'] },
    ],
  },
  {
    phase: 'go_to_market',
    name: 'Marketing & Digital',
    nameEs: 'Marketing y Digital',
    subGroups: [
      { label: 'Digital Presence', labelEs: 'Presencia Digital', ids: ['gm-1', 'gm-2', 'gm-3', 'gm-4', 'gm-5'] },
      { label: 'Marketing Pre-launch', labelEs: 'Marketing Pre-lanzamiento', ids: ['gm-6', 'gm-7', 'gm-8', 'gm-9', 'gm-10', 'gm-11'] },
      { label: 'Launch', labelEs: 'Lanzamiento', ids: ['gm-12', 'gm-13', 'gm-14', 'gm-15'] },
    ],
  },
];

/* Grid positions: [row, col] — 0-indexed
   Creative(0,0)   Planning(0,1)
   Marketing(1,0)  Development(1,1)
*/
const GRID_POS: Record<TimelinePhase, [number, number]> = {
  creative: [0, 0],
  planning: [0, 1],
  go_to_market: [1, 0],
  development: [1, 1],
};

/* ═══════════════════════════════════════════════════════════
   DEPENDENCY ARROWS
   ═══════════════════════════════════════════════════════════ */

interface Dependency {
  from: TimelinePhase;
  to: TimelinePhase;
  label: string;
}

const DEPENDENCIES: Dependency[] = [
  { from: 'creative', to: 'planning', label: 'Brand identity informs product strategy' },
  { from: 'creative', to: 'go_to_market', label: 'Brand assets needed for marketing' },
  { from: 'planning', to: 'development', label: 'SKU definitions drive design' },
  { from: 'development', to: 'go_to_market', label: 'Products needed for photography' },
  { from: 'planning', to: 'go_to_market', label: 'GTM strategy drives marketing' },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getStatusIndicator(status: string) {
  if (status === 'completed') {
    return <div className="w-2.5 h-2.5 bg-carbon flex-shrink-0" />;
  }
  if (status === 'in-progress') {
    return (
      <div className="w-2.5 h-2.5 border border-carbon flex-shrink-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-carbon" />
      </div>
    );
  }
  return <div className="w-2.5 h-2.5 border border-carbon/20 flex-shrink-0" />;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function DecisionMap({ milestones, launchDate, collectionId }: DecisionMapProps) {
  const [hoveredBlock, setHoveredBlock] = useState<TimelinePhase | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [arrowPaths, setArrowPaths] = useState<{ d: string; dep: Dependency }[]>([]);

  // Build milestone lookup by ID
  const milestoneMap = useMemo(() => {
    const map: Record<string, TimelineMilestone> = {};
    for (const m of milestones) {
      map[m.id] = m;
    }
    return map;
  }, [milestones]);

  // Get milestones for a phase
  const phaseMilestones = useCallback((phase: TimelinePhase): TimelineMilestone[] => {
    return milestones.filter((m) => m.phase === phase);
  }, [milestones]);

  // Get milestones by IDs
  const milestonesByIds = useCallback((ids: string[]): TimelineMilestone[] => {
    return ids.map((id) => milestoneMap[id]).filter(Boolean);
  }, [milestoneMap]);

  // Compute date range for a set of milestones
  const dateRange = useCallback((ms: TimelineMilestone[]): { start: Date; end: Date } | null => {
    if (!launchDate || ms.length === 0) return null;
    let earliest = Infinity;
    let latest = -Infinity;
    for (const m of ms) {
      const s = getMilestoneDate(launchDate, m.startWeeksBefore).getTime();
      const e = getMilestoneEndDate(launchDate, m.startWeeksBefore, m.durationWeeks).getTime();
      if (s < earliest) earliest = s;
      if (e > latest) latest = e;
    }
    return { start: new Date(earliest), end: new Date(latest) };
  }, [launchDate]);

  // Compute progress for a set of milestones
  const computeProgress = useCallback((ms: TimelineMilestone[]): number => {
    if (ms.length === 0) return 0;
    let done = 0;
    for (const m of ms) {
      if (m.status === 'completed') done += 1;
      else if (m.status === 'in-progress') done += 0.5;
    }
    return Math.round((done / ms.length) * 100);
  }, []);

  // Compute SVG arrow paths
  const computeArrows = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    const paths: { d: string; dep: Dependency }[] = [];

    for (const dep of DEPENDENCIES) {
      const fromEl = blockRefs.current[dep.from];
      const toEl = blockRefs.current[dep.to];
      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      // Determine edge connection points
      const fromPos = GRID_POS[dep.from];
      const toPos = GRID_POS[dep.to];

      let x1: number, y1: number, x2: number, y2: number;

      if (fromPos[0] === toPos[0]) {
        // Same row — connect right edge to left edge
        if (fromPos[1] < toPos[1]) {
          x1 = fromRect.right - gridRect.left;
          y1 = fromRect.top + fromRect.height * 0.4 - gridRect.top;
          x2 = toRect.left - gridRect.left;
          y2 = toRect.top + toRect.height * 0.4 - gridRect.top;
        } else {
          x1 = fromRect.left - gridRect.left;
          y1 = fromRect.top + fromRect.height * 0.4 - gridRect.top;
          x2 = toRect.right - gridRect.left;
          y2 = toRect.top + toRect.height * 0.4 - gridRect.top;
        }
      } else if (fromPos[1] === toPos[1]) {
        // Same column — connect bottom to top
        if (fromPos[0] < toPos[0]) {
          x1 = fromRect.left + fromRect.width * 0.4 - gridRect.left;
          y1 = fromRect.bottom - gridRect.top;
          x2 = toRect.left + toRect.width * 0.4 - gridRect.left;
          y2 = toRect.top - gridRect.top;
        } else {
          x1 = fromRect.left + fromRect.width * 0.4 - gridRect.left;
          y1 = fromRect.top - gridRect.top;
          x2 = toRect.left + toRect.width * 0.4 - gridRect.left;
          y2 = toRect.bottom - gridRect.top;
        }
      } else {
        // Diagonal — creative→go_to_market, planning→development, planning→go_to_market, development→go_to_market
        if (dep.from === 'creative' && dep.to === 'go_to_market') {
          // Top-left → bottom-left: go down
          x1 = fromRect.left + fromRect.width * 0.3 - gridRect.left;
          y1 = fromRect.bottom - gridRect.top;
          x2 = toRect.left + toRect.width * 0.3 - gridRect.left;
          y2 = toRect.top - gridRect.top;
        } else if (dep.from === 'planning' && dep.to === 'development') {
          // Top-right → bottom-right: go down
          x1 = fromRect.left + fromRect.width * 0.6 - gridRect.left;
          y1 = fromRect.bottom - gridRect.top;
          x2 = toRect.left + toRect.width * 0.6 - gridRect.left;
          y2 = toRect.top - gridRect.top;
        } else if (dep.from === 'development' && dep.to === 'go_to_market') {
          // Bottom-right → bottom-left: go left
          x1 = toRect.right - gridRect.left;
          y1 = toRect.top + toRect.height * 0.6 - gridRect.top;
          x2 = fromRect.left - gridRect.left;
          y2 = fromRect.top + fromRect.height * 0.6 - gridRect.top;
          // Swap: from is development (right), to is marketing (left)
          const tmp = { x1, y1, x2, y2 };
          x1 = fromRect.left - gridRect.left;
          y1 = fromRect.top + fromRect.height * 0.6 - gridRect.top;
          x2 = toRect.right - gridRect.left;
          y2 = toRect.top + toRect.height * 0.6 - gridRect.top;
        } else if (dep.from === 'planning' && dep.to === 'go_to_market') {
          // Top-right → bottom-left: diagonal
          x1 = fromRect.left + fromRect.width * 0.2 - gridRect.left;
          y1 = fromRect.bottom - gridRect.top;
          x2 = toRect.right - gridRect.left;
          y2 = toRect.top + toRect.height * 0.3 - gridRect.top;
        } else {
          // Generic fallback
          x1 = fromRect.left + fromRect.width / 2 - gridRect.left;
          y1 = fromRect.bottom - gridRect.top;
          x2 = toRect.left + toRect.width / 2 - gridRect.left;
          y2 = toRect.top - gridRect.top;
        }
      }

      // Create a bezier curve
      const dx = x2 - x1;
      const dy = y2 - y1;
      const cx1 = x1 + dx * 0.4;
      const cy1 = y1 + dy * 0.1;
      const cx2 = x1 + dx * 0.6;
      const cy2 = y1 + dy * 0.9;

      const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      paths.push({ d, dep });
    }

    setArrowPaths(paths);
  }, []);

  useEffect(() => {
    computeArrows();
    window.addEventListener('resize', computeArrows);
    return () => window.removeEventListener('resize', computeArrows);
  }, [computeArrows, milestones]);

  // Recompute after layout paint
  useEffect(() => {
    const timer = setTimeout(computeArrows, 100);
    return () => clearTimeout(timer);
  }, [computeArrows]);

  // Render a sub-group section
  const renderSubGroup = (sg: SubGroup, ms: TimelineMilestone[]) => {
    const range = dateRange(ms);
    const progress = computeProgress(ms);

    return (
      <div key={sg.label} className="mb-5 last:mb-0">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
            {sg.labelEs}
          </span>
          <span className="text-[10px] text-carbon/20">{progress}%</span>
        </div>
        <div className="space-y-1.5">
          {ms.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5">
              {getStatusIndicator(m.status)}
              <span className="text-xs font-light text-carbon/60 leading-tight">{m.nameEs}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render a block card
  const renderBlock = (block: BlockDef) => {
    const ms = phaseMilestones(block.phase);
    const range = dateRange(ms);
    const progress = computeProgress(ms);
    const isHovered = hoveredBlock === block.phase;

    return (
      <div
        key={block.phase}
        ref={(el) => { blockRefs.current[block.phase] = el; }}
        className={`bg-white border p-8 transition-all duration-300 ${
          isHovered ? 'border-carbon/20' : 'border-carbon/[0.06]'
        }`}
        onMouseEnter={() => setHoveredBlock(block.phase)}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          {block.nameEs}
        </p>
        <h3 className="text-xl font-light text-carbon tracking-tight mb-4">
          {block.name}
        </h3>

        {range && (
          <p className="text-xs text-carbon/30 mb-6">
            {formatShortDate(range.start)} — {formatShortDate(range.end)}
          </p>
        )}

        {block.subGroups ? (
          <div className="space-y-0">
            {block.subGroups.map((sg) => {
              const sgMs = milestonesByIds(sg.ids);
              return renderSubGroup(sg, sgMs);
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {ms.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                {getStatusIndicator(m.status)}
                <span className="text-xs font-light text-carbon/60 leading-tight">{m.nameEs}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-carbon/[0.06]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-light text-carbon">{progress}</span>
            <span className="text-xs text-carbon/30">%</span>
          </div>
        </div>
      </div>
    );
  };

  // Determine which arrows to highlight
  const highlightedArrows = useMemo(() => {
    if (!hoveredBlock) return new Set<number>();
    const set = new Set<number>();
    arrowPaths.forEach((ap, i) => {
      if (ap.dep.from === hoveredBlock || ap.dep.to === hoveredBlock) {
        set.add(i);
      }
    });
    return set;
  }, [hoveredBlock, arrowPaths]);

  // Grid order: creative(0,0), planning(0,1), go_to_market(1,0), development(1,1)
  const gridOrder: TimelinePhase[] = ['creative', 'planning', 'go_to_market', 'development'];

  return (
    <div className="max-w-5xl mx-auto px-10 py-12">
      {/* Section header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Mapa de decisiones
        </p>
        <h2 className="text-2xl font-light text-carbon tracking-tight">
          How the 4 blocks connect
        </h2>
        <p className="text-sm font-light text-carbon/40 mt-2 max-w-xl leading-relaxed">
          Each block feeds into the next. Creative direction informs planning, planning drives
          development, and finished products enable marketing and launch.
        </p>
      </div>

      {/* Grid + SVG overlay */}
      <div className="relative" ref={gridRef}>
        {/* SVG arrows overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                className="fill-carbon/20"
              />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                className="fill-carbon/40"
              />
            </marker>
          </defs>
          {arrowPaths.map((ap, i) => {
            const isActive = highlightedArrows.has(i);
            return (
              <path
                key={i}
                d={ap.d}
                fill="none"
                className={`transition-all duration-300 ${
                  isActive ? 'stroke-carbon/40' : 'stroke-carbon/[0.12]'
                }`}
                strokeWidth={isActive ? 1.5 : 1}
                markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                strokeDasharray={isActive ? 'none' : '4 3'}
              />
            );
          })}
        </svg>

        {/* Block grid */}
        <div className="grid grid-cols-2 gap-6" style={{ position: 'relative', zIndex: 2 }}>
          {gridOrder.map((phase) => {
            const block = BLOCKS.find((b) => b.phase === phase)!;
            return renderBlock(block);
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-10 pt-6 border-t border-carbon/[0.06]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-carbon" />
            <span className="text-xs font-light text-carbon/40">Completado</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 border border-carbon flex items-center justify-center">
              <div className="w-1 h-1 bg-carbon" />
            </div>
            <span className="text-xs font-light text-carbon/40">En progreso</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 border border-carbon/20" />
            <span className="text-xs font-light text-carbon/40">Pendiente</span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <svg width="24" height="8" className="text-carbon/20">
              <line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
              <polygon points="18 1, 24 4, 18 7" fill="currentColor" />
            </svg>
            <span className="text-xs font-light text-carbon/40">Dependencia entre bloques</span>
          </div>
        </div>
      </div>
    </div>
  );
}
