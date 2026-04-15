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
  PHASE_ORDER,
  getTimelineBounds,
  getMonthColumns,
  getMilestoneDate,
  getMilestoneEndDate,
  formatDate,
  daysBetween,
} from '@/lib/timeline-template';
import { ChevronDown, ChevronRight, Check, Clock, Circle, Plus, Trash2 } from 'lucide-react';

const DAY_WIDTH = 4;
const ROW_HEIGHT = 40;
const PHASE_ROW_HEIGHT = 40;
const LEFT_PANEL_WIDTH = 340;
const DAYS_PER_WEEK = 7;

// Snap pixel distance to nearest week
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

export function GanttChart({
  timeline,
  onUpdateMilestone,
  onUpdateTimeline,
  lang = 'en',
}: GanttChartProps) {
  // Language helpers
  const mName = (m: TimelineMilestone) => lang === 'es' ? m.nameEs : m.name;
  const pName = (phase: TimelinePhase) => lang === 'es' ? PHASES[phase].nameEs : PHASES[phase].name;
  const t = (en: string, es: string) => lang === 'es' ? es : en;

  const [collapsedPhases, setCollapsedPhases] = useState<Set<TimelinePhase>>(
    new Set()
  );
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
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => getTimelineBounds(timeline), [timeline]);
  const months = useMemo(
    () => getMonthColumns(bounds.earliestDate, bounds.latestDate),
    [bounds]
  );
  const chartWidth = bounds.totalDays * DAY_WIDTH;

  const todayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = daysBetween(bounds.earliestDate, today);
    return diff * DAY_WIDTH;
  }, [bounds]);

  const launchOffset = useMemo(() => {
    const diff = daysBetween(bounds.earliestDate, bounds.launchDate);
    return diff * DAY_WIDTH;
  }, [bounds]);

  // Sync horizontal scroll between header and body
  const handleScroll = useCallback(() => {
    if (scrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, []);

  // Sync vertical scroll between left panel and body
  const handleBodyScroll = useCallback(() => {
    if (scrollRef.current && leftPanelRef.current) {
      leftPanelRef.current.scrollTop = scrollRef.current.scrollTop;
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
      }
    }
  }, []);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const target = Math.max(0, todayOffset - 200);
      scrollRef.current.scrollLeft = target;
    }
  }, [todayOffset]);

  // --- DRAG HANDLERS ---
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
        // Moving right means starting later → fewer weeks before launch
        const newStart = dragState.originalStartWeeksBefore - deltaWeeks;
        if (newStart !== dragState.originalStartWeeksBefore) {
          onUpdateMilestone(dragState.milestoneId, {
            startWeeksBefore: Math.round(newStart * 2) / 2, // snap to 0.5
          });
        }
      } else if (dragState.type === 'resize-right') {
        const newDuration = dragState.originalDurationWeeks + deltaWeeks;
        const clamped = Math.max(0.5, Math.round(newDuration * 2) / 2);
        if (clamped !== dragState.originalDurationWeeks) {
          onUpdateMilestone(dragState.milestoneId, {
            durationWeeks: clamped,
          });
        }
      } else if (dragState.type === 'resize-left') {
        // Resize from left: moving left increases duration and startWeeksBefore
        const newStart = dragState.originalStartWeeksBefore - deltaWeeks;
        const newDuration = dragState.originalDurationWeeks - deltaWeeks;
        const clampedDuration = Math.max(0.5, Math.round(newDuration * 2) / 2);
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

  const togglePhase = (phase: TimelinePhase) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  const cycleStatus = (id: string, current: MilestoneStatus) => {
    const next: MilestoneStatus =
      current === 'pending'
        ? 'in-progress'
        : current === 'in-progress'
          ? 'completed'
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

  const addMilestone = (phase: TimelinePhase) => {
    const phaseInfo = PHASES[phase];
    const phaseMilestones = timeline.milestones.filter((m) => m.phase === phase);
    // Place new milestone near existing ones in this phase, or at week 20
    const avgStart = phaseMilestones.length > 0
      ? Math.round(phaseMilestones.reduce((s, m) => s + m.startWeeksBefore, 0) / phaseMilestones.length)
      : 20;

    const newMilestone: TimelineMilestone = {
      id: crypto.randomUUID(),
      phase,
      name: 'New Milestone',
      nameEs: 'Nuevo hito',
      responsible: 'US',
      startWeeksBefore: avgStart,
      durationWeeks: 2,
      color: phaseInfo.color,
      status: 'pending',
    };

    onUpdateTimeline({
      milestones: [...timeline.milestones, newMilestone],
    });

    // Open editor immediately for the new milestone
    setTimeout(() => {
      setEditingMilestone(newMilestone.id);
      setEditValues({
        nameEs: newMilestone.nameEs,
        durationWeeks: newMilestone.durationWeeks,
        startWeeksBefore: newMilestone.startWeeksBefore,
        notes: '',
      });
    }, 50);
  };

  const deleteMilestone = (id: string) => {
    onUpdateTimeline({
      milestones: timeline.milestones.filter((m) => m.id !== id),
    });
    setEditingMilestone(null);
  };

  const StatusIcon = ({ status }: { status: MilestoneStatus }) => {
    switch (status) {
      case 'completed':
        return <Check className="w-3.5 h-3.5 text-moss" strokeWidth={2.5} />;
      case 'in-progress':
        return <Clock className="w-3.5 h-3.5 text-carbon/70" strokeWidth={2} />;
      default:
        return <Circle className="w-3.5 h-3.5 text-carbon/20" strokeWidth={1.5} />;
    }
  };

  const ResponsibleBadge = ({ resp }: { resp: string }) => {
    // Monochrome carbon palette — differentiation via opacity
    const opacity: Record<string, string> = {
      US: 'bg-carbon text-white',
      FACTORY: 'bg-carbon/[0.08] text-carbon/70',
      ALL: 'bg-carbon/[0.04] text-carbon/60',
      'AGENCY/US': 'bg-carbon/[0.12] text-carbon/80',
    };
    return (
      <span
        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.05em] ${opacity[resp] || 'bg-carbon/[0.04] text-carbon/50'}`}
      >
        {resp}
      </span>
    );
  };

  // Decide bar text color based on how dark the bar is.
  // Pale accents (sea-foam, citronella, linen) → carbon text.
  // Dark accents (moss, midnight, carbon) → white text.
  const getBarTextColor = (barColor: string): string => {
    const paleColors = ['#B6C8C7', '#FFF4CE', '#F1EFED', '#EDF1F0', '#FBF8EC'];
    return paleColors.some(c => barColor.toUpperCase() === c.toUpperCase()) ? 'text-carbon' : 'text-white';
  };

  // Group milestones by phase
  const groupedMilestones = useMemo(() => {
    const groups: Record<TimelinePhase, TimelineMilestone[]> = {} as Record<
      TimelinePhase,
      TimelineMilestone[]
    >;
    PHASE_ORDER.forEach((phase) => {
      groups[phase] = timeline.milestones
        .filter((m) => m.phase === phase)
        .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore);
    });
    return groups;
  }, [timeline.milestones]);

  // Progress stats
  const stats = useMemo(() => {
    const total = timeline.milestones.length;
    const completed = timeline.milestones.filter(
      (m) => m.status === 'completed'
    ).length;
    const inProgress = timeline.milestones.filter(
      (m) => m.status === 'in-progress'
    ).length;
    return { total, completed, inProgress, percent: Math.round((completed / total) * 100) };
  }, [timeline.milestones]);

  // Calculate bar position with drag preview
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

  return (
    <div className="flex flex-col h-full bg-white rounded-[20px] border border-carbon/[0.06] overflow-hidden">
      {/* Header row — simplified: just months on the right */}
      <div className="flex border-b border-carbon/[0.06] bg-white sticky top-0 z-20">
        {/* Left header */}
        <div
          className="flex-shrink-0 flex items-end px-4 py-2 border-r border-carbon/[0.06] bg-white"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">
            {t('Phase / Milestone', 'Fase / Hito')}
          </span>
          <span className="ml-auto text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/25 mr-1">
            {t('Wk.', 'Sem.')}
          </span>
        </div>
        {/* Right header - months */}
        <div
          ref={headerScrollRef}
          className="flex-1 overflow-hidden"
          style={{ pointerEvents: 'none' }}
        >
          <div className="relative" style={{ width: chartWidth, height: 44 }}>
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
            {/* Today marker in header */}
            {todayOffset > 0 && todayOffset < chartWidth && (
              <div
                className="absolute top-0 h-full w-px bg-moss z-10"
                style={{ left: todayOffset }}
              >
                <div className="absolute -top-0 -left-3 px-1.5 py-0.5 bg-moss text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">
                  HOY
                </div>
              </div>
            )}
            {/* Launch marker in header */}
            <div
              className="absolute top-0 h-full w-px bg-carbon z-10"
              style={{ left: launchOffset }}
            >
              <div className="absolute -top-0 -left-6 px-1.5 py-0.5 bg-carbon text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">
                LAUNCH
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - milestone names */}
        <div
          ref={leftPanelRef}
          className="flex-shrink-0 overflow-hidden border-r border-carbon/[0.06] bg-white"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {PHASE_ORDER.map((phaseKey) => {
            const phase = PHASES[phaseKey];
            const milestones = groupedMilestones[phaseKey];
            if (!milestones || milestones.length === 0) return null;
            const isCollapsed = collapsedPhases.has(phaseKey);
            const phaseCompleted = milestones.filter(
              (m) => m.status === 'completed'
            ).length;

            return (
              <div key={phaseKey}>
                {/* Phase header — tinted with accent bgColor */}
                <div
                  className="flex items-center gap-2 px-4 cursor-pointer select-none border-b border-carbon/[0.06] transition-colors"
                  style={{
                    height: PHASE_ROW_HEIGHT,
                    backgroundColor: phase.bgColor,
                  }}
                  onClick={() => togglePhase(phaseKey)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-carbon/40" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-carbon/40" />
                  )}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: phase.color }}
                  />
                  <span className="text-[11px] font-semibold tracking-[-0.01em] text-carbon flex-1 truncate">
                    {pName(phaseKey)}
                  </span>
                  <span className="text-[10px] text-carbon/40 font-medium mr-1 tabular-nums">
                    {phaseCompleted}/{milestones.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addMilestone(phaseKey);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/60 text-carbon/40 hover:text-carbon transition-colors"
                    title={t('Add milestone', 'Añadir hito')}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {/* Milestones */}
                {!isCollapsed &&
                  milestones.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-4 border-b border-carbon/[0.04] hover:bg-carbon/[0.02] transition-colors group"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <button
                        onClick={() => cycleStatus(m.id, m.status)}
                        className="flex-shrink-0 hover:scale-125 transition-transform"
                        title={t('Change status', 'Cambiar estado')}
                      >
                        <StatusIcon status={m.status} />
                      </button>
                      <button
                        onClick={() => openEditor(m)}
                        className={`text-[12px] text-left flex-1 leading-tight tracking-[-0.01em] transition-colors ${
                          m.status === 'completed'
                            ? 'line-through text-carbon/30'
                            : 'text-carbon/80 hover:text-carbon'
                        }`}
                        title={t('Click to edit', 'Click para editar')}
                      >
                        {mName(m)}
                      </button>
                      <ResponsibleBadge resp={m.responsible} />
                      <span className="text-[10px] text-carbon/35 font-mono w-8 text-right tabular-nums">
                        {m.durationWeeks}w
                      </span>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        {/* Right panel - Gantt bars */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleBodyScroll}
          style={{ cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'col-resize') : undefined }}
        >
          <div
            className="relative"
            style={{
              width: chartWidth,
              minHeight: '100%',
            }}
          >
            {/* Month gridlines */}
            {months.map((month, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-carbon/[0.06]"
                style={{ left: month.startDay * DAY_WIDTH }}
              />
            ))}

            {/* Week gridlines */}
            {Array.from({ length: Math.ceil(bounds.totalDays / 7) }).map(
              (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-carbon/[0.02]"
                  style={{ left: i * 7 * DAY_WIDTH }}
                />
              )
            )}

            {/* Today line */}
            {todayOffset > 0 && todayOffset < chartWidth && (
              <div
                className="absolute top-0 h-full w-px bg-moss/70 z-10"
                style={{ left: todayOffset }}
              />
            )}

            {/* Launch line */}
            <div
              className="absolute top-0 h-full w-px bg-carbon/80 z-10"
              style={{ left: launchOffset }}
            />

            {/* Milestone bars */}
            {(() => {
              let yOffset = 0;
              return PHASE_ORDER.map((phaseKey) => {
                const milestones = groupedMilestones[phaseKey];
                if (!milestones || milestones.length === 0) return null;
                const isCollapsed = collapsedPhases.has(phaseKey);
                const phase = PHASES[phaseKey];

                const phaseStartY = yOffset;
                yOffset += PHASE_ROW_HEIGHT;

                if (isCollapsed) {
                  // Show condensed bar for phase
                  const phaseMinStart = Math.min(
                    ...milestones.map((m) => {
                      const d = getMilestoneDate(
                        timeline.launchDate,
                        m.startWeeksBefore
                      );
                      return daysBetween(bounds.earliestDate, d);
                    })
                  );
                  const phaseMaxEnd = Math.max(
                    ...milestones.map((m) => {
                      const d = getMilestoneEndDate(
                        timeline.launchDate,
                        m.startWeeksBefore,
                        m.durationWeeks
                      );
                      return daysBetween(bounds.earliestDate, d);
                    })
                  );
                  return (
                    <div
                      key={phaseKey}
                      className="absolute rounded-full opacity-40"
                      style={{
                        left: phaseMinStart * DAY_WIDTH,
                        width: (phaseMaxEnd - phaseMinStart) * DAY_WIDTH,
                        top: phaseStartY + 12,
                        height: 16,
                        backgroundColor: phase.color,
                      }}
                    />
                  );
                }

                return milestones.map((m) => {
                  const pos = getBarPosition(m);
                  const barY = yOffset;
                  yOffset += ROW_HEIGHT;

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
                        top: barY + 6,
                        height: barHeight,
                        transition: isDragging ? 'none' : 'left 0.2s ease, width 0.2s ease',
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-10 group/left"
                        onMouseDown={(e) => handleDragStart(e, m.id, 'resize-left')}
                      >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-white/60 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                      </div>

                      {/* Main bar - draggable */}
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
                        {/* Text on bar when wide enough */}
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
                        className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10 group/right"
                        onMouseDown={(e) => handleDragStart(e, m.id, 'resize-right')}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-white/60 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                      </div>

                      {/* Tooltip on hover (not during drag) */}
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
                              <div className="text-citronella mt-1 text-[10px] max-w-[200px] break-words">
                                {m.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Drag preview tooltip */}
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
              });
            })()}
          </div>
        </div>
      </div>

      {/* Inline editor modal */}
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
              {/* Header with phase color tint */}
              <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: m.color + '1F' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/50">
                  {pName(m.phase)}
                </span>
                <ResponsibleBadge resp={m.responsible} />
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Name */}
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

                {/* Start & Duration */}
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

                {/* Date preview */}
                <div className="text-[12px] text-carbon/50 bg-carbon/[0.03] px-4 py-2.5 rounded-[12px] tracking-[-0.01em]">
                  {formatDate(startDate)} → {formatDate(endDate)}
                </div>

                {/* Notes */}
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

              {/* Actions */}
              <div className="px-6 py-4 flex items-center gap-2 border-t border-carbon/[0.06]">
                <button
                  onClick={() => {
                    if (confirm(t('Delete this milestone?', '¿Eliminar este hito?'))) {
                      deleteMilestone(editingMilestone!);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium text-error hover:bg-error/[0.06] transition-colors"
                  title={t('Delete milestone', 'Eliminar hito')}
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
