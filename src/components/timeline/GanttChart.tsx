'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  CollectionTimeline,
  TimelineMilestone,
  TimelinePhase,
  MilestoneStatus,
} from '@/types/timeline';
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
import { Check, Clock, Circle, Trash2 } from 'lucide-react';

const DAY_WIDTH = 4;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 44;
const DAYS_PER_WEEK = 7;

function snapToWeek(days: number): number {
  return Math.round(days / DAYS_PER_WEEK) * DAYS_PER_WEEK;
}

interface DragState {
  milestoneId: string;
  type: 'move' | 'resize-right' | 'resize-left';
  startX: number;
  originalStartWeeksBefore: number;
  originalDurationWeeks: number;
  currentDeltaDays: number;
}

export type CalendarLang = 'en' | 'es';

interface GanttChartProps {
  timeline: CollectionTimeline;
  onUpdateMilestone: (id: string, updates: Partial<TimelineMilestone>) => void;
  onUpdateTimeline: (updates: Partial<CollectionTimeline>) => void;
  lang?: CalendarLang;
}

/* ─────────────────────────────────────────────────────────────
   Spine-aligned Gantt.

   The WizardSidebar is the label column — the 20 mini-block rows.
   This component renders ONLY the timeline canvas (month header +
   rows of bars). Each milestone lives on the row of its primary
   mini-block (see MILESTONE_TO_MINI_BLOCK).

   Rows without milestones (synthesis, market-research) render
   empty — the sidebar still shows them, they just have no
   time-scheduled tasks.
   ───────────────────────────────────────────────────────────── */

export function GanttChart({
  timeline,
  onUpdateMilestone,
  onUpdateTimeline,
  lang = 'en',
}: GanttChartProps) {
  const mName = (m: TimelineMilestone) => lang === 'es' ? m.nameEs : m.name;
  const t = (en: string, es: string) => lang === 'es' ? es : en;

  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    nameEs: string;
    durationWeeks: number;
    startWeeksBefore: number;
    notes: string;
  }>({ nameEs: '', durationWeeks: 0, startWeeksBefore: 0, notes: '' });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => getTimelineBounds(timeline), [timeline]);
  const months = useMemo(
    () => getMonthColumns(bounds.earliestDate, bounds.latestDate),
    [bounds]
  );
  const chartWidth = bounds.totalDays * DAY_WIDTH;

  const todayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return daysBetween(bounds.earliestDate, today) * DAY_WIDTH;
  }, [bounds]);

  const launchOffset = useMemo(() => {
    return daysBetween(bounds.earliestDate, bounds.launchDate) * DAY_WIDTH;
  }, [bounds]);

  /* Group milestones by mini-block id. */
  const milestonesByRow = useMemo(() => {
    const map: Record<string, TimelineMilestone[]> = {};
    for (const m of timeline.milestones) {
      const rowId = MILESTONE_TO_MINI_BLOCK[m.id];
      if (!rowId) continue;
      if (!map[rowId]) map[rowId] = [];
      map[rowId].push(m);
    }
    return map;
  }, [timeline.milestones]);

  /* Sync horizontal scroll between header and body. */
  const handleBodyScroll = useCallback(() => {
    if (scrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, []);

  /* Scroll to today on mount. */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [todayOffset]);

  /* ── Drag handlers ── */
  const handleDragStart = useCallback(
    (e: React.MouseEvent, milestoneId: string, type: DragState['type']) => {
      e.preventDefault();
      e.stopPropagation();
      const m = timeline.milestones.find((m) => m.id === milestoneId);
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
    [timeline.milestones]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startX;
      const deltaDays = deltaPx / DAY_WIDTH;
      setDragState((prev) => (prev ? { ...prev, currentDeltaDays: deltaDays } : null));
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      const snappedDays = snapToWeek(dragState.currentDeltaDays);
      const deltaWeeks = snappedDays / DAYS_PER_WEEK;

      if (dragState.type === 'move') {
        const newStart = dragState.originalStartWeeksBefore - deltaWeeks;
        if (newStart !== dragState.originalStartWeeksBefore) {
          onUpdateMilestone(dragState.milestoneId, {
            startWeeksBefore: Math.round(newStart * 2) / 2,
          });
        }
      } else if (dragState.type === 'resize-right') {
        const newDuration = dragState.originalDurationWeeks + deltaWeeks;
        const clamped = Math.max(0.5, Math.round(newDuration * 2) / 2);
        if (clamped !== dragState.originalDurationWeeks) {
          onUpdateMilestone(dragState.milestoneId, { durationWeeks: clamped });
        }
      } else if (dragState.type === 'resize-left') {
        const newDuration = Math.max(0.5, dragState.originalDurationWeeks - deltaWeeks);
        const clampedDuration = Math.round(newDuration * 2) / 2;
        const adjustedStart = Math.round(
          (dragState.originalStartWeeksBefore + (clampedDuration - dragState.originalDurationWeeks)) * 2
        ) / 2;
        if (clampedDuration !== dragState.originalDurationWeeks) {
          onUpdateMilestone(dragState.milestoneId, {
            startWeeksBefore: adjustedStart,
            durationWeeks: clampedDuration,
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
  }, [dragState, onUpdateMilestone]);

  const cycleStatus = (id: string, current: MilestoneStatus) => {
    const next: MilestoneStatus =
      current === 'pending' ? 'in-progress'
      : current === 'in-progress' ? 'completed'
      : 'pending';
    onUpdateMilestone(id, { status: next });
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
    onUpdateMilestone(editingMilestone, {
      nameEs: editValues.nameEs,
      durationWeeks: editValues.durationWeeks,
      startWeeksBefore: editValues.startWeeksBefore,
      notes: editValues.notes || undefined,
    });
    setEditingMilestone(null);
  };

  const deleteMilestone = (id: string) => {
    onUpdateTimeline({
      milestones: timeline.milestones.filter((m) => m.id !== id),
    });
    setEditingMilestone(null);
  };

  /* Pale accents → carbon text. Dark accents → white. */
  const getBarTextColor = (barColor: string): string => {
    const paleColors = ['#B6C8C7', '#FFF4CE', '#F1EFED', '#EDF1F0', '#FBF8EC'];
    return paleColors.some(c => barColor.toUpperCase() === c.toUpperCase()) ? 'text-carbon' : 'text-white';
  };

  const StatusIcon = ({ status }: { status: MilestoneStatus }) => {
    switch (status) {
      case 'completed':
        return <Check className="w-3 h-3 text-moss" strokeWidth={3} />;
      case 'in-progress':
        return <Clock className="w-3 h-3 text-carbon/70" strokeWidth={2.5} />;
      default:
        return <Circle className="w-3 h-3 text-carbon/25" strokeWidth={2} />;
    }
  };

  /* Bar position with drag preview. */
  const getBarPosition = (m: TimelineMilestone) => {
    let startWeeksBefore = m.startWeeksBefore;
    let durationWeeks = m.durationWeeks;

    if (dragState && dragState.milestoneId === m.id) {
      const deltaDays = dragState.currentDeltaDays;
      if (dragState.type === 'move') {
        startWeeksBefore = dragState.originalStartWeeksBefore - deltaDays / DAYS_PER_WEEK;
      } else if (dragState.type === 'resize-right') {
        durationWeeks = Math.max(0.5, dragState.originalDurationWeeks + deltaDays / DAYS_PER_WEEK);
      } else if (dragState.type === 'resize-left') {
        const newDuration = Math.max(0.5, dragState.originalDurationWeeks - deltaDays / DAYS_PER_WEEK);
        startWeeksBefore = dragState.originalStartWeeksBefore + (newDuration - dragState.originalDurationWeeks);
        durationWeeks = newDuration;
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

  /* ── Render ── */
  const totalBodyHeight = MINI_BLOCK_ORDER.length * ROW_HEIGHT;

  return (
    <div className="flex flex-col h-full bg-white rounded-[20px] border border-carbon/[0.06] overflow-hidden">
      {/* Month header */}
      <div
        ref={headerScrollRef}
        className="flex-shrink-0 overflow-hidden border-b border-carbon/[0.06] bg-white"
        style={{ height: HEADER_HEIGHT, pointerEvents: 'none' }}
      >
        <div className="relative h-full" style={{ width: chartWidth }}>
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

      {/* Rows body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleBodyScroll}
        style={{ cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'col-resize') : undefined }}
      >
        <div className="relative" style={{ width: chartWidth, height: totalBodyHeight }}>
          {/* Month gridlines */}
          {months.map((month, i) => (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-carbon/[0.06]"
              style={{ left: month.startDay * DAY_WIDTH }}
            />
          ))}
          {/* Week gridlines */}
          {Array.from({ length: Math.ceil(bounds.totalDays / 7) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-carbon/[0.02]"
              style={{ left: i * 7 * DAY_WIDTH }}
            />
          ))}
          {/* Today line */}
          {todayOffset > 0 && todayOffset < chartWidth && (
            <div className="absolute top-0 h-full w-px bg-moss/70 z-10" style={{ left: todayOffset }} />
          )}
          {/* Launch line */}
          <div className="absolute top-0 h-full w-px bg-carbon/80 z-10" style={{ left: launchOffset }} />

          {/* Row backgrounds (tinted per phase) + block dividers */}
          {MINI_BLOCK_ORDER.map((row, idx) => {
            const phase = PHASES[row.phase];
            const isBlockStart = idx > 0 && MINI_BLOCK_ORDER[idx - 1].phase !== row.phase;
            return (
              <div
                key={row.id}
                className="absolute left-0 right-0"
                style={{
                  top: idx * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                  backgroundColor: idx % 2 === 0 ? phase.bgColor + '66' : 'transparent',
                  borderTop: isBlockStart ? '1px solid rgba(0,0,0,0.08)' : undefined,
                }}
              />
            );
          })}

          {/* Bars */}
          {MINI_BLOCK_ORDER.map((row, rowIdx) => {
            const milestones = milestonesByRow[row.id] || [];
            return milestones.map((m) => {
              const pos = getBarPosition(m);
              const isCompleted = m.status === 'completed';
              const isInProgress = m.status === 'in-progress';
              const isDragging = dragState?.milestoneId === m.id;
              const barHeight = ROW_HEIGHT - 12;

              return (
                <div
                  key={m.id}
                  className={`absolute group/bar ${isDragging ? 'z-20' : 'z-[5]'}`}
                  style={{
                    left: pos.left,
                    width: pos.width,
                    top: rowIdx * ROW_HEIGHT + 6,
                    height: barHeight,
                    transition: isDragging ? 'none' : 'left 0.2s ease, width 0.2s ease',
                  }}
                >
                  {/* Status dot toggle — only when wide enough */}
                  {pos.width > 80 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleStatus(m.id, m.status); }}
                      className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 hover:scale-125 transition-transform"
                      title={t('Change status', 'Cambiar estado')}
                    >
                      <StatusIcon status={m.status} />
                    </button>
                  )}

                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-10"
                    onMouseDown={(e) => handleDragStart(e, m.id, 'resize-left')}
                  />

                  {/* Main bar */}
                  <div
                    className={`w-full h-full rounded-full transition-shadow cursor-grab active:cursor-grabbing hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
                      isCompleted ? 'opacity-50' : ''
                    } ${isDragging ? 'shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-2 ring-carbon/30' : ''}`}
                    style={{
                      backgroundColor: m.color,
                      backgroundImage: isInProgress
                        ? `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 4px,
                            rgba(255,255,255,0.25) 4px,
                            rgba(255,255,255,0.25) 8px
                          )`
                        : undefined,
                    }}
                    onMouseDown={(e) => handleDragStart(e, m.id, 'move')}
                    onDoubleClick={() => openEditor(m)}
                  >
                    {pos.width > 60 && (
                      <div className="absolute inset-0 flex items-center px-3 overflow-hidden pointer-events-none">
                        <span className={`text-[10px] font-semibold truncate tracking-[-0.01em] ${getBarTextColor(m.color)}`}>
                          {mName(m)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right resize handle */}
                  <div
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10"
                    onMouseDown={(e) => handleDragStart(e, m.id, 'resize-right')}
                  />

                  {/* Tooltip */}
                  {!isDragging && (
                    <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/bar:block z-30 pointer-events-none">
                      <div className="bg-carbon text-white text-[11px] px-3 py-2 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] whitespace-nowrap">
                        <div className="font-semibold text-[12px] tracking-[-0.01em]">{mName(m)}</div>
                        <div className="text-white/60 mt-1">
                          {formatDate(pos.startDate)} → {formatDate(pos.endDate)}
                        </div>
                        <div className="text-white/50 mt-0.5">
                          {pos.durationWeeks.toFixed(1)} {t('weeks', 'semanas')} &middot; {m.responsible}
                        </div>
                        {m.notes && (
                          <div className="text-citronella mt-1 text-[10px] max-w-[240px] break-words whitespace-normal">
                            {m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Drag preview */}
                  {isDragging && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <div className="bg-carbon text-white text-[10px] px-2.5 py-1 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] whitespace-nowrap font-mono">
                        {dragState.type === 'move'
                          ? `${formatDate(pos.startDate)} → ${formatDate(pos.endDate)}`
                          : `${pos.durationWeeks.toFixed(1)}w`}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Editor modal */}
      {editingMilestone && (() => {
        const m = timeline.milestones.find((m) => m.id === editingMilestone);
        if (!m) return null;
        const startDate = getMilestoneDate(timeline.launchDate, editValues.startWeeksBefore);
        const endDate = getMilestoneEndDate(timeline.launchDate, editValues.startWeeksBefore, editValues.durationWeeks);

        return (
          <div className="fixed inset-0 bg-carbon/40 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setEditingMilestone(null)}>
            <div
              className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: m.color + '1F' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/50">
                  {lang === 'es' ? PHASES[m.phase as TimelinePhase].nameEs : PHASES[m.phase as TimelinePhase].name}
                </span>
                <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.05em] bg-carbon/[0.04] text-carbon/60">
                  {m.responsible}
                </span>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{t('Name', 'Nombre')}</label>
                  <input
                    type="text"
                    value={editValues.nameEs}
                    onChange={(e) => setEditValues((v) => ({ ...v, nameEs: e.target.value }))}
                    className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">
                      {t('Start (wk. before launch)', 'Inicio (sem. antes)')}
                    </label>
                    <input
                      type="number"
                      value={editValues.startWeeksBefore}
                      onChange={(e) =>
                        setEditValues((v) => ({ ...v, startWeeksBefore: parseFloat(e.target.value) || 0 }))
                      }
                      step={0.5}
                      className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">
                      {t('Duration (weeks)', 'Duración (sem.)')}
                    </label>
                    <input
                      type="number"
                      value={editValues.durationWeeks}
                      onChange={(e) =>
                        setEditValues((v) => ({ ...v, durationWeeks: parseFloat(e.target.value) || 0.5 }))
                      }
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
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{t('Notes', 'Notas')}</label>
                  <textarea
                    value={editValues.notes}
                    onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
                    rows={2}
                    className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 resize-none leading-relaxed"
                    placeholder={t('Add notes...', 'Añadir notas...')}
                  />
                </div>
              </div>

              <div className="px-6 py-4 flex items-center gap-2 border-t border-carbon/[0.06]">
                <button
                  onClick={() => {
                    if (confirm(t('Delete this milestone?', '¿Eliminar este hito?'))) {
                      deleteMilestone(editingMilestone!);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium text-error hover:bg-error/[0.06] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('Delete', 'Eliminar')}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="inline-flex items-center px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
                >
                  {t('Cancel', 'Cancelar')}
                </button>
                <button
                  onClick={saveEditor}
                  className="inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
                >
                  {t('Save', 'Guardar')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
