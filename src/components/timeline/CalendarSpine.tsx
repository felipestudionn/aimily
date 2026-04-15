'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Presentation,
  Feather,
  ClipboardList,
  Ruler,
  Megaphone,
  Check,
  Clock,
  Circle,
  Trash2,
  Download,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import { useCollectionTimeline } from '@/hooks/useCollectionTimeline';
import {
  PHASES,
  MINI_BLOCK_ORDER,
  MILESTONE_TO_MINI_BLOCK,
  getTimelineBounds,
  getMonthColumns,
  getMilestoneDate,
  getMilestoneEndDate,
  formatDate,
  daysBetween,
} from '@/lib/timeline-template';
import type {
  CollectionTimeline,
  TimelineMilestone,
  TimelinePhase,
  MilestoneStatus,
} from '@/types/timeline';
import { useTranslation } from '@/i18n';

/* ═══════════════════════════════════════════════════════════════
   CalendarSpine — the sidebar EXPANDED.

   Single surface. Each row owns BOTH its label (sticky left) and
   its timeline track (scrolling right). Alignment is automatic —
   no separate calendar component, no pixel-matching hacks.

   When the user clicks Calendar in the sidebar, this component
   takes over the full viewport. Clicking Dashboard/Presentation
   in the utility bar navigates away.
   ═══════════════════════════════════════════════════════════════ */

const LABEL_WIDTH = 340;
const SUB_ITEM_HEIGHT = 37;
const BLOCK_HEADER_HEIGHT = 46;
const HEADER_AREA_HEIGHT = 152; // matches WizardSidebar logo+name area
const DAY_WIDTH = 4;
const DAYS_PER_WEEK = 7;
const SIDEBAR_BG = '#EBEAE6';

interface DragState {
  milestoneId: string;
  type: 'move' | 'resize-right' | 'resize-left';
  startX: number;
  originalStartWeeksBefore: number;
  originalDurationWeeks: number;
  currentDeltaDays: number;
}

interface CalendarSpineProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  launchDate?: string;
}

/* Group mini-blocks by phase so we render block headers between groups. */
const BLOCKS_GROUPED = (() => {
  const groups: { phase: TimelinePhase; rows: typeof MINI_BLOCK_ORDER }[] = [];
  for (const row of MINI_BLOCK_ORDER) {
    let group = groups.find(g => g.phase === row.phase);
    if (!group) {
      group = { phase: row.phase, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
})();

const BLOCK_ICONS: Record<TimelinePhase, React.ElementType> = {
  creative: Feather,
  planning: ClipboardList,
  development: Ruler,
  go_to_market: Megaphone,
};

const BLOCK_LABEL_KEYS: Record<TimelinePhase, string> = {
  creative: 'creativeDirection',
  planning: 'merchandisingPlanning',
  development: 'designDevelopment',
  go_to_market: 'marketingSales',
};

function snapToWeek(days: number): number {
  return Math.round(days / DAYS_PER_WEEK) * DAYS_PER_WEEK;
}

function getBarTextColor(color: string): string {
  const pale = ['#B6C8C7', '#FFF4CE', '#F1EFED', '#EDF1F0', '#FBF8EC'];
  return pale.some(c => color.toUpperCase() === c.toUpperCase()) ? 'text-carbon' : 'text-white';
}

function StatusIcon({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case 'completed': return <Check className="w-3 h-3 text-moss" strokeWidth={3} />;
    case 'in-progress': return <Clock className="w-3 h-3 text-carbon/70" strokeWidth={2.5} />;
    default: return <Circle className="w-3 h-3 text-carbon/25" strokeWidth={2} />;
  }
}

export function CalendarSpine({ collectionId, collectionName, season, launchDate }: CalendarSpineProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const t = useTranslation();
  const sidebarT = (t.sidebar as Record<string, string>) || {};
  const labelOf = (key: string) => sidebarT[key] || key;
  const {
    timeline,
    loading,
    saving,
    updateMilestone,
    updateTimeline,
    resetToDefaults,
  } = useCollectionTimeline(collectionId, collectionName, season || 'SS27', launchDate || '2027-02-01');

  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    nameEs: string;
    durationWeeks: number;
    startWeeksBefore: number;
    notes: string;
  }>({ nameEs: '', durationWeeks: 0, startWeeksBefore: 0, notes: '' });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => timeline ? getTimelineBounds(timeline) : null, [timeline]);
  const months = useMemo(() => bounds ? getMonthColumns(bounds.earliestDate, bounds.latestDate) : [], [bounds]);
  const chartWidth = bounds ? bounds.totalDays * DAY_WIDTH : 0;

  const todayOffset = useMemo(() => {
    if (!bounds) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return daysBetween(bounds.earliestDate, today) * DAY_WIDTH;
  }, [bounds]);

  const launchOffset = useMemo(() => {
    if (!bounds || !timeline) return 0;
    return daysBetween(bounds.earliestDate, bounds.launchDate) * DAY_WIDTH;
  }, [bounds, timeline]);

  const milestonesByRow = useMemo(() => {
    const map: Record<string, TimelineMilestone[]> = {};
    if (!timeline) return map;
    for (const m of timeline.milestones) {
      const rowId = MILESTONE_TO_MINI_BLOCK[m.id];
      if (!rowId) continue;
      if (!map[rowId]) map[rowId] = [];
      map[rowId].push(m);
    }
    return map;
  }, [timeline]);

  /* Scroll to today on mount. */
  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [todayOffset]);

  /* ── Drag handlers ── */
  const handleDragStart = useCallback(
    (e: React.MouseEvent, milestoneId: string, type: DragState['type']) => {
      e.preventDefault();
      e.stopPropagation();
      if (!timeline) return;
      const m = timeline.milestones.find(m => m.id === milestoneId);
      if (!m) return;
      setDragState({
        milestoneId,
        type,
        startX: e.clientX,
        originalStartWeeksBefore: m.startWeeksBefore,
        originalDurationWeeks: m.durationWeeks,
        currentDeltaDays: 0,
      });
    },
    [timeline]
  );

  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaDays = (e.clientX - dragState.startX) / DAY_WIDTH;
      setDragState(prev => prev ? { ...prev, currentDeltaDays: deltaDays } : null);
    };
    const handleMouseUp = () => {
      if (!dragState) return;
      const snapped = snapToWeek(dragState.currentDeltaDays);
      const deltaWeeks = snapped / DAYS_PER_WEEK;

      if (dragState.type === 'move') {
        const newStart = dragState.originalStartWeeksBefore - deltaWeeks;
        if (newStart !== dragState.originalStartWeeksBefore) {
          updateMilestone(dragState.milestoneId, { startWeeksBefore: Math.round(newStart * 2) / 2 });
        }
      } else if (dragState.type === 'resize-right') {
        const newDur = Math.max(0.5, Math.round((dragState.originalDurationWeeks + deltaWeeks) * 2) / 2);
        if (newDur !== dragState.originalDurationWeeks) {
          updateMilestone(dragState.milestoneId, { durationWeeks: newDur });
        }
      } else if (dragState.type === 'resize-left') {
        const newDur = Math.max(0.5, dragState.originalDurationWeeks - deltaWeeks);
        const clamped = Math.round(newDur * 2) / 2;
        const adjustedStart = Math.round(
          (dragState.originalStartWeeksBefore + (clamped - dragState.originalDurationWeeks)) * 2
        ) / 2;
        if (clamped !== dragState.originalDurationWeeks) {
          updateMilestone(dragState.milestoneId, {
            startWeeksBefore: adjustedStart,
            durationWeeks: clamped,
          });
        }
      }
      setDragState(null);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, updateMilestone]);

  const cycleStatus = (id: string, current: MilestoneStatus) => {
    const next: MilestoneStatus =
      current === 'pending' ? 'in-progress'
      : current === 'in-progress' ? 'completed'
      : 'pending';
    updateMilestone(id, { status: next });
  };

  const openEditor = (m: TimelineMilestone) => {
    setEditingMilestone(m.id);
    setEditValues({
      nameEs: m.nameEs,
      durationWeeks: m.durationWeeks,
      startWeeksBefore: m.startWeeksBefore,
      notes: m.notes || '',
    });
  };

  const saveEditor = () => {
    if (!editingMilestone) return;
    updateMilestone(editingMilestone, {
      nameEs: editValues.nameEs,
      durationWeeks: editValues.durationWeeks,
      startWeeksBefore: editValues.startWeeksBefore,
      notes: editValues.notes || undefined,
    });
    setEditingMilestone(null);
  };

  const deleteMilestone = (id: string) => {
    if (!timeline) return;
    updateTimeline({ milestones: timeline.milestones.filter(m => m.id !== id) });
    setEditingMilestone(null);
  };

  const getBarPosition = (m: TimelineMilestone) => {
    if (!bounds || !timeline) return { left: 0, width: 0, startDate: new Date(), endDate: new Date(), durationWeeks: 0 };
    let startWeeksBefore = m.startWeeksBefore;
    let durationWeeks = m.durationWeeks;
    if (dragState && dragState.milestoneId === m.id) {
      const dd = dragState.currentDeltaDays;
      if (dragState.type === 'move') {
        startWeeksBefore = dragState.originalStartWeeksBefore - dd / DAYS_PER_WEEK;
      } else if (dragState.type === 'resize-right') {
        durationWeeks = Math.max(0.5, dragState.originalDurationWeeks + dd / DAYS_PER_WEEK);
      } else if (dragState.type === 'resize-left') {
        const newDur = Math.max(0.5, dragState.originalDurationWeeks - dd / DAYS_PER_WEEK);
        startWeeksBefore = dragState.originalStartWeeksBefore + (newDur - dragState.originalDurationWeeks);
        durationWeeks = newDur;
      }
    }
    const startDate = getMilestoneDate(timeline.launchDate, startWeeksBefore);
    const endDate = getMilestoneEndDate(timeline.launchDate, startWeeksBefore, durationWeeks);
    const startDay = daysBetween(bounds.earliestDate, startDate);
    const duration = daysBetween(startDate, endDate);
    return {
      left: startDay * DAY_WIDTH,
      width: Math.max(duration * DAY_WIDTH, 8),
      startDate,
      endDate,
      durationWeeks,
    };
  };

  if (!mounted) return null;

  if (loading || !timeline) {
    return createPortal(
      <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] bg-shade flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
        <div className="animate-spin w-6 h-6 border-2 border-carbon/30 border-t-carbon rounded-full" />
      </div>,
      document.body
    );
  }

  const displayName = collectionName
    ? collectionName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';
  const basePath = `/collection/${collectionId}`;

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] p-3" style={{ background: '#F3F2F0', width: '100vw', height: '100vh' }}>
      <div
        className="flex flex-col overflow-hidden rounded-[16px]"
        style={{ background: SIDEBAR_BG, height: 'calc(100vh - 24px)' }}
      >
        {/* Single scroll zone — horizontal + vertical — so labels (sticky) and tracks scroll together */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto scrollbar-subtle"
          style={{ cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'col-resize') : undefined }}
        >
          <div style={{ minWidth: LABEL_WIDTH + chartWidth }}>

            {/* ─── Header row: logo + collection name | month header ─── */}
            <div className="flex items-end" style={{ height: HEADER_AREA_HEIGHT }}>
              <div
                className="sticky left-0 z-30 h-full flex flex-col justify-end px-5 pb-6"
                style={{ width: LABEL_WIDTH, background: SIDEBAR_BG }}
              >
                <Link href="/my-collections" className="block mb-5">
                  <Image
                    src="/images/aimily-logo-black.png"
                    alt="aimily"
                    width={774}
                    height={96}
                    className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity"
                    unoptimized
                  />
                </Link>
                <Link href={basePath} className="block group">
                  <p className="text-[13px] font-medium text-carbon transition-colors truncate">
                    {displayName}
                  </p>
                </Link>
              </div>
              {/* Month header — starts at y=HEADER_AREA_HEIGHT-46 so it hugs the separator */}
              <div className="relative flex items-end h-full" style={{ width: chartWidth }}>
                <div className="relative w-full" style={{ height: 46 }}>
                  {months.map((month, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex items-end border-l border-carbon/[0.06]"
                      style={{
                        left: month.startDay * DAY_WIDTH,
                        width: month.days * DAY_WIDTH,
                      }}
                    >
                      <span className="px-2 pb-2 text-[11px] font-medium text-carbon/50 tracking-[-0.01em] whitespace-nowrap">
                        {month.name} {month.year}
                      </span>
                    </div>
                  ))}
                  {todayOffset > 0 && todayOffset < chartWidth && (
                    <div className="absolute top-0 h-full w-px bg-moss z-10" style={{ left: todayOffset }}>
                      <div className="absolute top-0 -left-3 px-1.5 py-0.5 bg-moss text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">
                        HOY
                      </div>
                    </div>
                  )}
                  <div className="absolute top-0 h-full w-px bg-carbon z-10" style={{ left: launchOffset }}>
                    <div className="absolute top-0 -left-6 px-1.5 py-0.5 bg-carbon text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">
                      LAUNCH
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Separator ─── */}
            <div className="sticky left-0 h-px bg-carbon/[0.12]" style={{ minWidth: LABEL_WIDTH + chartWidth }} />

            {/* ─── Nav: blocks + sub-items, each row = label + track ─── */}
            <div className="pt-6 pb-4 flex flex-col">
              {BLOCKS_GROUPED.map((group, groupIdx) => {
                const phase = PHASES[group.phase];
                const BlockIcon = BLOCK_ICONS[group.phase];
                return (
                  <div key={group.phase} className="mb-5">
                    {/* Block header row */}
                    <div className="flex" style={{ height: BLOCK_HEADER_HEIGHT }}>
                      <div
                        className="sticky left-0 z-20 flex items-center px-6"
                        style={{ width: LABEL_WIDTH, background: SIDEBAR_BG }}
                      >
                        <div className="w-full px-4 py-2.5 rounded-full flex items-center gap-2 bg-carbon/[0.04]">
                          <BlockIcon className="h-[14px] w-[14px] text-carbon/50" strokeWidth={1.5} />
                          <span className="text-[15px] font-bold tracking-[-0.01em] text-carbon truncate">
                            {labelOf(BLOCK_LABEL_KEYS[group.phase])}
                          </span>
                        </div>
                      </div>
                      {/* Phase-tinted band across the track */}
                      <div className="relative" style={{ width: chartWidth, background: phase.bgColor + '55' }}>
                        {todayOffset > 0 && todayOffset < chartWidth && (
                          <div className="absolute top-0 bottom-0 w-px bg-moss/30" style={{ left: todayOffset }} />
                        )}
                        <div className="absolute top-0 bottom-0 w-px bg-carbon/30" style={{ left: launchOffset }} />
                      </div>
                    </div>

                    {/* Sub-item rows with tracks */}
                    <div className="flex flex-col">
                      {group.rows.map((row) => {
                        const rowMilestones = milestonesByRow[row.id] || [];
                        return (
                          <div key={row.id} className="flex" style={{ height: SUB_ITEM_HEIGHT }}>
                            <div
                              className="sticky left-0 z-10 flex items-center px-6"
                              style={{ width: LABEL_WIDTH, background: SIDEBAR_BG }}
                            >
                              <div className="ml-1 pl-5 border-l border-carbon/[0.15] flex-1 py-2">
                                <span className="text-[14px] text-carbon">
                                  {labelOf(row.labelKey)}
                                </span>
                              </div>
                            </div>
                            {/* Track with bars */}
                            <div
                              className="relative border-b border-carbon/[0.04]"
                              style={{ width: chartWidth, background: phase.bgColor + '15' }}
                            >
                              {/* Month/week gridlines */}
                              {months.map((m, i) => (
                                <div
                                  key={i}
                                  className="absolute top-0 h-full border-l border-carbon/[0.04]"
                                  style={{ left: m.startDay * DAY_WIDTH }}
                                />
                              ))}
                              {/* Today line */}
                              {todayOffset > 0 && todayOffset < chartWidth && (
                                <div className="absolute top-0 h-full w-px bg-moss/40" style={{ left: todayOffset }} />
                              )}
                              {/* Launch line */}
                              <div className="absolute top-0 h-full w-px bg-carbon/40" style={{ left: launchOffset }} />

                              {/* Bars */}
                              {rowMilestones.map((m) => {
                                const pos = getBarPosition(m);
                                const isCompleted = m.status === 'completed';
                                const isInProgress = m.status === 'in-progress';
                                const isDragging = dragState?.milestoneId === m.id;
                                const barHeight = SUB_ITEM_HEIGHT - 12;
                                return (
                                  <div
                                    key={m.id}
                                    className={`absolute group/bar ${isDragging ? 'z-20' : 'z-[5]'}`}
                                    style={{
                                      left: pos.left,
                                      width: pos.width,
                                      top: 6,
                                      height: barHeight,
                                      transition: isDragging ? 'none' : 'left 0.2s ease, width 0.2s ease',
                                    }}
                                  >
                                    {pos.width > 80 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); cycleStatus(m.id, m.status); }}
                                        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 hover:scale-125 transition-transform"
                                      >
                                        <StatusIcon status={m.status} />
                                      </button>
                                    )}
                                    <div
                                      className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-10"
                                      onMouseDown={(e) => handleDragStart(e, m.id, 'resize-left')}
                                    />
                                    <div
                                      className={`w-full h-full rounded-full transition-shadow cursor-grab active:cursor-grabbing hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
                                        isCompleted ? 'opacity-50' : ''
                                      } ${isDragging ? 'shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-2 ring-carbon/30' : ''}`}
                                      style={{
                                        backgroundColor: m.color,
                                        backgroundImage: isInProgress
                                          ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)'
                                          : undefined,
                                      }}
                                      onMouseDown={(e) => handleDragStart(e, m.id, 'move')}
                                      onDoubleClick={() => openEditor(m)}
                                    >
                                      {pos.width > 60 && (
                                        <div className="absolute inset-0 flex items-center px-3 overflow-hidden pointer-events-none">
                                          <span className={`text-[10px] font-semibold truncate tracking-[-0.01em] ${getBarTextColor(m.color)}`}>
                                            {m.nameEs}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10"
                                      onMouseDown={(e) => handleDragStart(e, m.id, 'resize-right')}
                                    />
                                    {!isDragging && (
                                      <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/bar:block z-30 pointer-events-none">
                                        <div className="bg-carbon text-white text-[11px] px-3 py-2 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] whitespace-nowrap">
                                          <div className="font-semibold text-[12px] tracking-[-0.01em]">{m.nameEs}</div>
                                          <div className="text-white/60 mt-1">
                                            {formatDate(pos.startDate)} → {formatDate(pos.endDate)}
                                          </div>
                                          <div className="text-white/50 mt-0.5">
                                            {pos.durationWeeks.toFixed(1)} semanas · {m.responsible}
                                          </div>
                                          {m.notes && (
                                            <div className="text-citronella mt-1 text-[10px] max-w-[240px] break-words whitespace-normal">
                                              {m.notes}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Utility bar — fixed bottom strip with links (stays in viewport) */}
        <div className="flex-shrink-0 border-t border-carbon/[0.12] px-5 py-3 flex items-center gap-3" style={{ background: SIDEBAR_BG }}>
          <Link href={basePath} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium text-carbon hover:bg-carbon/[0.04] transition-colors">
            <LayoutDashboard className="h-[16px] w-[16px]" strokeWidth={1.5} />
            {labelOf('dashboard')}
          </Link>
          <Link href={`${basePath}/presentation`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium text-carbon/60 hover:text-carbon hover:bg-carbon/[0.04] transition-colors">
            <Presentation className="h-[16px] w-[16px]" strokeWidth={1.5} />
            {labelOf('presentation')}
          </Link>
          <div className="flex-1" />
          <button
            onClick={async () => {
              if (!timeline) return;
              const { exportTimelineToExcel } = await import('@/lib/export-timeline-excel');
              await exportTimelineToExcel(timeline, 'es');
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
            title="Export"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {saving && (
            <span className="inline-flex items-center gap-1 text-[11px] text-carbon/50">
              <Cloud className="w-3 h-3" />
              Saving
            </span>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {editingMilestone && (() => {
        const m = timeline.milestones.find(m => m.id === editingMilestone);
        if (!m) return null;
        const startDate = getMilestoneDate(timeline.launchDate, editValues.startWeeksBefore);
        const endDate = getMilestoneEndDate(timeline.launchDate, editValues.startWeeksBefore, editValues.durationWeeks);

        return (
          <div className="fixed inset-0 bg-carbon/40 z-[60] flex items-center justify-center backdrop-blur-sm" onClick={() => setEditingMilestone(null)}>
            <div
              className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: m.color + '1F' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/50">
                  {PHASES[m.phase as TimelinePhase].nameEs}
                </span>
                <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.05em] bg-carbon/[0.04] text-carbon/60">
                  {m.responsible}
                </span>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Nombre</label>
                  <input
                    type="text"
                    value={editValues.nameEs}
                    onChange={(e) => setEditValues((v) => ({ ...v, nameEs: e.target.value }))}
                    className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Inicio (sem. antes)</label>
                    <input
                      type="number"
                      value={editValues.startWeeksBefore}
                      onChange={(e) => setEditValues((v) => ({ ...v, startWeeksBefore: parseFloat(e.target.value) || 0 }))}
                      step={0.5}
                      className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Duración (sem.)</label>
                    <input
                      type="number"
                      value={editValues.durationWeeks}
                      onChange={(e) => setEditValues((v) => ({ ...v, durationWeeks: parseFloat(e.target.value) || 0.5 }))}
                      step={0.5}
                      min={0.15}
                      className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
                <div className="text-[12px] text-carbon/50 bg-carbon/[0.03] px-4 py-2.5 rounded-[12px] tracking-[-0.01em]">
                  {formatDate(startDate)} → {formatDate(endDate)}
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Notas</label>
                  <textarea
                    value={editValues.notes}
                    onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
                    rows={2}
                    className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed"
                    placeholder="Añadir notas..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex items-center gap-2 border-t border-carbon/[0.06]">
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar este hito?')) deleteMilestone(editingMilestone!);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium text-error hover:bg-error/[0.06] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="inline-flex items-center px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEditor}
                  className="inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>,
    document.body
  );
}
