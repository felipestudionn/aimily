'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PHASES, DEFAULT_MILESTONES, getMilestoneDate, getMilestoneEndDate } from '@/lib/timeline-template';
import type { TimelineMilestone, TimelinePhase } from '@/types/timeline';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface DecisionMapProps {
  milestones: TimelineMilestone[];
  launchDate?: string;
  collectionId: string;
}

interface MiniBlock {
  id: string;
  label: string;
  labelEs: string;
  parentBlock: TimelinePhase;
  milestoneIds: string[];
}

interface MiniBlockDep {
  from: string; // mini-block id
  to: string;   // mini-block id
  label: string;
}

/* ═══════════════════════════════════════════════════════════
   MINI-BLOCK DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

const MINI_BLOCKS: MiniBlock[] = [
  // Creative & Brand
  { id: 'research', label: 'Research & Target', labelEs: 'Investigación y Target', parentBlock: 'creative', milestoneIds: ['cr-1', 'cr-2'] },
  { id: 'brand-identity', label: 'Brand Identity', labelEs: 'Identidad de Marca', parentBlock: 'creative', milestoneIds: ['br-1', 'br-2', 'br-3', 'br-4'] },

  // Range Planning
  { id: 'market-analysis', label: 'Market Analysis', labelEs: 'Análisis de Mercado', parentBlock: 'planning', milestoneIds: ['rp-1', 'rp-2'] },
  { id: 'budget-range', label: 'Budget & Range', labelEs: 'Presupuesto y Colección', parentBlock: 'planning', milestoneIds: ['rp-3', 'rp-4', 'rp-5'] },
  { id: 'gtm-strategy', label: 'GTM Strategy', labelEs: 'Estrategia GTM', parentBlock: 'planning', milestoneIds: ['rp-6'] },

  // Design & Development
  { id: 'design', label: 'Design', labelEs: 'Diseño', parentBlock: 'development', milestoneIds: ['dd-1', 'dd-2', 'dd-3', 'dd-4', 'dd-5', 'dd-6'] },
  { id: 'prototyping', label: 'Prototyping', labelEs: 'Prototipado', parentBlock: 'development', milestoneIds: ['dd-7', 'dd-8', 'dd-9', 'dd-10'] },
  { id: 'sampling', label: 'Sampling', labelEs: 'Muestrario', parentBlock: 'development', milestoneIds: ['dd-11', 'dd-12', 'dd-13', 'dd-14'] },
  { id: 'production', label: 'Production', labelEs: 'Producción', parentBlock: 'development', milestoneIds: ['dd-15', 'dd-16', 'dd-17', 'dd-18'] },

  // Marketing & Digital
  { id: 'digital-presence', label: 'Digital Presence', labelEs: 'Presencia Digital', parentBlock: 'go_to_market', milestoneIds: ['gm-1', 'gm-2', 'gm-3', 'gm-4', 'gm-5'] },
  { id: 'marketing-prelaunch', label: 'Marketing Pre-launch', labelEs: 'Marketing Pre-lanzamiento', parentBlock: 'go_to_market', milestoneIds: ['gm-6', 'gm-7', 'gm-8', 'gm-9', 'gm-10', 'gm-11'] },
  { id: 'launch', label: 'Launch', labelEs: 'Lanzamiento', parentBlock: 'go_to_market', milestoneIds: ['gm-12', 'gm-13', 'gm-14', 'gm-15'] },
];

/* ═══════════════════════════════════════════════════════════
   CROSS-BLOCK DEPENDENCIES (mini-block to mini-block)
   ═══════════════════════════════════════════════════════════ */

const MINI_BLOCK_DEPS: MiniBlockDep[] = [
  // Creative → Planning
  { from: 'research', to: 'market-analysis', label: 'Target informa análisis de mercado' },
  { from: 'brand-identity', to: 'budget-range', label: 'Identidad define estrategia de colección' },

  // Planning → Development
  { from: 'budget-range', to: 'design', label: 'Plan de SKUs activa diseño' },

  // Creative → Marketing
  { from: 'brand-identity', to: 'digital-presence', label: 'Identidad visual para web y contenido' },
  { from: 'brand-identity', to: 'marketing-prelaunch', label: 'Brand assets para RRSS y campañas' },

  // Planning → Marketing
  { from: 'gtm-strategy', to: 'marketing-prelaunch', label: 'Estrategia GTM dirige marketing' },

  // Development → Marketing
  { from: 'design', to: 'digital-presence', label: 'Diseños para lookbook y contenido' },
  { from: 'sampling', to: 'digital-presence', label: 'Producto para fotografía' },
  { from: 'production', to: 'launch', label: 'Producto entregado habilita lanzamiento' },
];

/* Within-block sequential deps */
const INTRA_BLOCK_DEPS: MiniBlockDep[] = [
  // Creative
  { from: 'research', to: 'brand-identity', label: 'Research informa branding' },
  // Planning
  { from: 'market-analysis', to: 'budget-range', label: 'Análisis informa presupuesto' },
  { from: 'budget-range', to: 'gtm-strategy', label: 'Colección define GTM' },
  // Development
  { from: 'design', to: 'prototyping', label: 'Diseño → prototipo' },
  { from: 'prototyping', to: 'sampling', label: 'Prototipo → muestrario' },
  { from: 'sampling', to: 'production', label: 'Muestrario → producción' },
  // Marketing
  { from: 'digital-presence', to: 'marketing-prelaunch', label: 'Presencia digital → marketing' },
  { from: 'marketing-prelaunch', to: 'launch', label: 'Marketing → lanzamiento' },
];

/* ═══════════════════════════════════════════════════════════
   BLOCK COLORS (muted, editorial palette)
   ═══════════════════════════════════════════════════════════ */

const BLOCK_COLORS: Record<TimelinePhase, { bg: string; border: string; text: string; dot: string }> = {
  creative:     { bg: 'bg-[#E8F0EE]', border: 'border-[#B8CFC9]', text: 'text-[#3A5A50]', dot: 'bg-[#5A8A7A]' },
  planning:     { bg: 'bg-[#F0EAE4]', border: 'border-[#D4C4B4]', text: 'text-[#6B5240]', dot: 'bg-[#9A7A60]' },
  development:  { bg: 'bg-[#EAE8F0]', border: 'border-[#C4BED4]', text: 'text-[#4A4060]', dot: 'bg-[#7A6A9A]' },
  go_to_market: { bg: 'bg-[#F0E8EA]', border: 'border-[#D4B8C0]', text: 'text-[#6B4050]', dot: 'bg-[#9A6070]' },
};

/* ═══════════════════════════════════════════════════════════
   LAYOUT — column positions for each block
   ═══════════════════════════════════════════════════════════ */

// 4 columns, each block gets a column, nodes flow top-to-bottom
const BLOCK_COLUMNS: TimelinePhase[] = ['creative', 'planning', 'development', 'go_to_market'];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function DecisionMap({ milestones, launchDate, collectionId }: DecisionMapProps) {
  const [hoveredMiniBlock, setHoveredMiniBlock] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [arrows, setArrows] = useState<{ d: string; dep: MiniBlockDep; isCross: boolean }[]>([]);

  // Build milestone lookup
  const milestoneMap = useMemo(() => {
    const map: Record<string, TimelineMilestone> = {};
    for (const m of milestones) map[m.id] = m;
    return map;
  }, [milestones]);

  // Compute progress for a mini-block
  const getProgress = useCallback((mb: MiniBlock): number => {
    const ms = mb.milestoneIds.map((id) => milestoneMap[id]).filter(Boolean);
    if (ms.length === 0) return 0;
    let score = 0;
    for (const m of ms) {
      if (m.status === 'completed') score += 1;
      else if (m.status === 'in-progress') score += 0.5;
    }
    return Math.round((score / ms.length) * 100);
  }, [milestoneMap]);

  // Compute date range for a mini-block
  const getDateRange = useCallback((mb: MiniBlock): { start: Date; end: Date } | null => {
    if (!launchDate) return null;
    const ms = mb.milestoneIds.map((id) => milestoneMap[id]).filter(Boolean);
    if (ms.length === 0) return null;
    let earliest = Infinity;
    let latest = -Infinity;
    for (const m of ms) {
      const s = getMilestoneDate(launchDate, m.startWeeksBefore).getTime();
      const e = getMilestoneEndDate(launchDate, m.startWeeksBefore, m.durationWeeks).getTime();
      if (s < earliest) earliest = s;
      if (e > latest) latest = e;
    }
    return { start: new Date(earliest), end: new Date(latest) };
  }, [launchDate, milestoneMap]);

  // Get overall status
  const getStatus = useCallback((mb: MiniBlock): 'completed' | 'in-progress' | 'pending' => {
    const ms = mb.milestoneIds.map((id) => milestoneMap[id]).filter(Boolean);
    if (ms.length === 0) return 'pending';
    if (ms.every((m) => m.status === 'completed')) return 'completed';
    if (ms.some((m) => m.status === 'in-progress' || m.status === 'completed')) return 'in-progress';
    return 'pending';
  }, [milestoneMap]);

  // Compute SVG arrows
  const computeArrows = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const paths: { d: string; dep: MiniBlockDep; isCross: boolean }[] = [];

    const allDeps = [
      ...INTRA_BLOCK_DEPS.map((d) => ({ ...d, isCross: false })),
      ...MINI_BLOCK_DEPS.map((d) => ({ ...d, isCross: true })),
    ];

    for (const { isCross, ...dep } of allDeps) {
      const fromEl = nodeRefs.current[dep.from];
      const toEl = nodeRefs.current[dep.to];
      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const fromMb = MINI_BLOCKS.find((mb) => mb.id === dep.from)!;
      const toMb = MINI_BLOCKS.find((mb) => mb.id === dep.to)!;
      const fromCol = BLOCK_COLUMNS.indexOf(fromMb.parentBlock);
      const toCol = BLOCK_COLUMNS.indexOf(toMb.parentBlock);

      let x1: number, y1: number, x2: number, y2: number;

      if (fromCol === toCol) {
        // Same column — connect bottom center to top center
        x1 = fromRect.left + fromRect.width / 2 - cRect.left;
        y1 = fromRect.bottom - cRect.top;
        x2 = toRect.left + toRect.width / 2 - cRect.left;
        y2 = toRect.top - cRect.top;
      } else if (fromCol < toCol) {
        // Left to right — right edge to left edge
        x1 = fromRect.right - cRect.left;
        y1 = fromRect.top + fromRect.height / 2 - cRect.top;
        x2 = toRect.left - cRect.left;
        y2 = toRect.top + toRect.height / 2 - cRect.top;
      } else {
        // Right to left
        x1 = fromRect.left - cRect.left;
        y1 = fromRect.top + fromRect.height / 2 - cRect.top;
        x2 = toRect.right - cRect.left;
        y2 = toRect.top + toRect.height / 2 - cRect.top;
      }

      const dx = x2 - x1;
      const dy = y2 - y1;

      let d: string;
      if (fromCol === toCol) {
        // Vertical — gentle S curve
        const cy1 = y1 + dy * 0.4;
        const cy2 = y1 + dy * 0.6;
        d = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
      } else {
        // Horizontal/diagonal — bezier
        const cx1 = x1 + dx * 0.35;
        const cx2 = x1 + dx * 0.65;
        d = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
      }

      paths.push({ d, dep, isCross });
    }

    setArrows(paths);
  }, []);

  useEffect(() => {
    computeArrows();
    window.addEventListener('resize', computeArrows);
    return () => window.removeEventListener('resize', computeArrows);
  }, [computeArrows, milestones]);

  useEffect(() => {
    const timer = setTimeout(computeArrows, 150);
    return () => clearTimeout(timer);
  }, [computeArrows]);

  // Which arrows to highlight on hover
  const { highlightedArrows, connectedNodes } = useMemo(() => {
    const arrowSet = new Set<number>();
    const nodeSet = new Set<string>();
    if (!hoveredMiniBlock) return { highlightedArrows: arrowSet, connectedNodes: nodeSet };

    nodeSet.add(hoveredMiniBlock);
    arrows.forEach((a, i) => {
      if (a.dep.from === hoveredMiniBlock || a.dep.to === hoveredMiniBlock) {
        arrowSet.add(i);
        nodeSet.add(a.dep.from);
        nodeSet.add(a.dep.to);
      }
    });
    return { highlightedArrows: arrowSet, connectedNodes: nodeSet };
  }, [hoveredMiniBlock, arrows]);

  // Group mini-blocks by column
  const columns = BLOCK_COLUMNS.map((phase) => ({
    phase,
    info: PHASES[phase],
    colors: BLOCK_COLORS[phase],
    miniBlocks: MINI_BLOCKS.filter((mb) => mb.parentBlock === phase),
  }));

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Mapa de decisiones
        </p>
        <h2 className="text-2xl font-light text-carbon tracking-tight">
          Decision <span className="italic">Network</span>
        </h2>
        <p className="text-sm font-light text-carbon/40 mt-2 max-w-2xl leading-relaxed">
          Cada mini-bloque alimenta a otros. Las flechas muestran el flujo real de información
          entre equipos y fases — hover sobre cualquier nodo para ver sus conexiones.
        </p>
      </div>

      {/* Network Grid + SVG */}
      <div className="relative" ref={containerRef}>
        {/* SVG arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <marker id="arrow-cross" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" className="fill-carbon/25" />
            </marker>
            <marker id="arrow-cross-active" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" className="fill-carbon/60" />
            </marker>
            <marker id="arrow-intra" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" className="fill-carbon/15" />
            </marker>
            <marker id="arrow-intra-active" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" className="fill-carbon/50" />
            </marker>
          </defs>
          {arrows.map((a, i) => {
            const isActive = highlightedArrows.has(i);
            const isCross = a.isCross;
            return (
              <g key={i}>
                <path
                  d={a.d}
                  fill="none"
                  className={`transition-all duration-300 ${
                    isActive
                      ? isCross ? 'stroke-carbon/50' : 'stroke-carbon/40'
                      : isCross ? 'stroke-carbon/[0.15]' : 'stroke-carbon/[0.08]'
                  }`}
                  strokeWidth={isActive ? (isCross ? 2 : 1.5) : (isCross ? 1.5 : 1)}
                  markerEnd={
                    isActive
                      ? isCross ? 'url(#arrow-cross-active)' : 'url(#arrow-intra-active)'
                      : isCross ? 'url(#arrow-cross)' : 'url(#arrow-intra)'
                  }
                  strokeDasharray={isCross ? 'none' : '3 2'}
                />
              </g>
            );
          })}
        </svg>

        {/* Column Grid */}
        <div className="grid grid-cols-4 gap-5" style={{ position: 'relative', zIndex: 2 }}>
          {columns.map((col) => (
            <div key={col.phase} className="space-y-3">
              {/* Block header */}
              <div className={`px-4 py-3 ${col.colors.bg} border ${col.colors.border}`}>
                <p className={`text-[10px] font-medium tracking-[0.2em] uppercase ${col.colors.text} opacity-60`}>
                  {col.info.nameEs}
                </p>
                <p className={`text-sm font-medium ${col.colors.text} mt-0.5`}>
                  {col.info.name}
                </p>
              </div>

              {/* Mini-block nodes */}
              {col.miniBlocks.map((mb) => {
                const progress = getProgress(mb);
                const status = getStatus(mb);
                const range = getDateRange(mb);
                const isHovered = hoveredMiniBlock === mb.id;
                const isConnected = connectedNodes.has(mb.id);
                const isDimmed = hoveredMiniBlock !== null && !isConnected;

                return (
                  <div
                    key={mb.id}
                    ref={(el) => { nodeRefs.current[mb.id] = el; }}
                    className={`relative bg-white border p-4 transition-all duration-300 cursor-default ${
                      isHovered
                        ? `border-carbon/30 shadow-md`
                        : isConnected
                        ? 'border-carbon/20 shadow-sm'
                        : isDimmed
                        ? 'border-carbon/[0.04] opacity-40'
                        : 'border-carbon/[0.08]'
                    }`}
                    onMouseEnter={() => setHoveredMiniBlock(mb.id)}
                    onMouseLeave={() => setHoveredMiniBlock(null)}
                  >
                    {/* Progress bar top */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-carbon/[0.06]">
                      <div
                        className={`h-full transition-all duration-500 ${col.colors.dot}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Status dot + name */}
                    <div className="flex items-start gap-2.5 mt-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {status === 'completed' ? (
                          <div className={`w-3 h-3 ${col.colors.dot} flex items-center justify-center`}>
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : status === 'in-progress' ? (
                          <div className={`w-3 h-3 border ${col.colors.border} flex items-center justify-center`}>
                            <div className={`w-1.5 h-1.5 ${col.colors.dot}`} />
                          </div>
                        ) : (
                          <div className="w-3 h-3 border border-carbon/15" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-carbon leading-tight">{mb.labelEs}</p>
                        <p className="text-[10px] text-carbon/35 mt-0.5">{mb.label}</p>
                      </div>
                    </div>

                    {/* Date range + progress */}
                    <div className="flex items-center justify-between mt-3">
                      {range && (
                        <p className="text-[10px] text-carbon/30">
                          {formatShortDate(range.start)} — {formatShortDate(range.end)}
                        </p>
                      )}
                      <p className={`text-xs font-medium ${col.colors.text}`}>{progress}%</p>
                    </div>

                    {/* Tooltip on hover showing dependency label */}
                    {isHovered && (
                      <div className="absolute left-0 right-0 -bottom-1 translate-y-full z-30 pointer-events-none">
                        <div className="mx-2 bg-carbon text-white text-[10px] leading-relaxed px-3 py-2 shadow-lg">
                          <p className="font-medium mb-1">{mb.labelEs}</p>
                          {[...MINI_BLOCK_DEPS, ...INTRA_BLOCK_DEPS]
                            .filter((d) => d.from === mb.id || d.to === mb.id)
                            .map((d, i) => (
                              <p key={i} className="text-white/70">
                                {d.from === mb.id ? '→ ' : '← '}
                                {d.label}
                              </p>
                            ))}
                          {mb.milestoneIds.length > 0 && (
                            <p className="text-white/40 mt-1">{mb.milestoneIds.length} milestones</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-10 pt-6 border-t border-carbon/[0.06]">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="8">
              <line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="1.5" className="text-carbon/25" />
              <polygon points="20 1, 26 4, 20 7" className="fill-carbon/25" />
            </svg>
            <span className="text-xs font-light text-carbon/40">Dependencia cross-block</span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg width="28" height="8">
              <line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" className="text-carbon/15" />
              <polygon points="20 1.5, 25 4, 20 6.5" className="fill-carbon/15" />
            </svg>
            <span className="text-xs font-light text-carbon/40">Secuencia intra-block</span>
          </div>
          {BLOCK_COLUMNS.map((phase) => (
            <div key={phase} className="flex items-center gap-2">
              <div className={`w-3 h-3 ${BLOCK_COLORS[phase].dot}`} />
              <span className="text-xs font-light text-carbon/40">{PHASES[phase].nameEs}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
