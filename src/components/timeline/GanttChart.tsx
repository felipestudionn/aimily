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
        return <Check className="w-3.5 h-3.5 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-gray-300" />;
    }
  };

  const ResponsibleBadge = ({ resp }: { resp: string }) => {
    const colors: Record<string, string> = {
      US: 'bg-blue-100 text-blue-700',
      FACTORY: 'bg-yellow-100 text-yellow-700',
      ALL: 'bg-green-100 text-green-700',
      'AGENCY/US': 'bg-purple-100 text-purple-700',
    };
    return (
      <span
        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors[resp] || 'bg-gray-100 text-gray-600'}`}
      >
        {resp}
      </span>
    );
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
    <div className="flex flex-col h-full bg-white shadow-sm border border-gris overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-crema/40 border-b border-gris text-sm">
        <div className="flex items-center gap-2">
          <div className="w-28 h-2.5 bg-gris rounded-full overflow-hidden">
            <div
              className="h-full bg-carbon rounded-full transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
          <span className="text-gray-600 font-bold">{stats.percent}%</span>
        </div>
        <span className="text-gray-300">|</span>
        <span className="text-green-600 font-medium">
          {stats.completed} {t('completed', 'completados')}
        </span>
        <span className="text-amber-500 font-medium">
          {stats.inProgress} {t('in progress', 'en progreso')}
        </span>
        <span className="text-gray-400 font-medium">
          {stats.total - stats.completed - stats.inProgress} {t('pending', 'pendientes')}
        </span>
        <div className="ml-auto text-gray-500">
          {timeline.milestones.length} {t('milestones', 'hitos')} &middot; ~{Math.round(
            (Math.max(...timeline.milestones.map(m => m.startWeeksBefore)) +
             Math.max(...timeline.milestones.map(m => m.startWeeksBefore === Math.max(...timeline.milestones.map(mm => mm.startWeeksBefore)) ? m.durationWeeks : 0)))
          )} {t('weeks', 'semanas')}
        </div>
      </div>

      {/* Header row */}
      <div className="flex border-b border-gris bg-white sticky top-0 z-20">
        {/* Left header */}
        <div
          className="flex-shrink-0 flex items-end px-4 py-2 border-r border-gris bg-white"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('Phase / Milestone', 'Fase / Hito')}
          </span>
          <span className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
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
                className="absolute top-0 h-full flex items-end border-l border-gris"
                style={{
                  left: month.startDay * DAY_WIDTH,
                  width: month.days * DAY_WIDTH,
                }}
              >
                <span className="px-2 pb-2 text-xs font-bold text-gray-600 whitespace-nowrap">
                  {month.name} {month.year}
                </span>
              </div>
            ))}
            {/* Today marker in header */}
            {todayOffset > 0 && todayOffset < chartWidth && (
              <div
                className="absolute top-0 h-full w-0.5 bg-error z-10"
                style={{ left: todayOffset }}
              >
                <div className="absolute -top-0 -left-3 px-1.5 py-0.5 bg-error text-white text-[9px] font-bold rounded-b">
                  HOY
                </div>
              </div>
            )}
            {/* Launch marker in header */}
            <div
              className="absolute top-0 h-full w-0.5 bg-carbon z-10"
              style={{ left: launchOffset }}
            >
              <div className="absolute -top-0 -left-6 px-1.5 py-0.5 bg-carbon text-white text-[9px] font-bold rounded-b">
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
          className="flex-shrink-0 overflow-hidden border-r border-gris bg-white"
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
                {/* Phase header */}
                <div
                  className="flex items-center gap-2 px-3 cursor-pointer select-none border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  style={{
                    height: PHASE_ROW_HEIGHT,
                    backgroundColor: phase.bgColor + '80',
                  }}
                  onClick={() => togglePhase(phaseKey)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: phase.color }}
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex-1">
                    {pName(phaseKey)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mr-1">
                    {phaseCompleted}/{milestones.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addMilestone(phaseKey);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/60 text-gray-400 hover:text-gray-700 transition-colors"
                    title={t('Add milestone', 'Añadir hito')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Milestones */}
                {!isCollapsed &&
                  milestones.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-3 border-b border-gray-50 hover:bg-amber-50/30 transition-colors group"
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
                        className={`text-xs text-left flex-1 leading-tight hover:text-blue-600 transition-colors ${
                          m.status === 'completed'
                            ? 'line-through text-gray-400'
                            : 'text-gray-700'
                        }`}
                        title={t('Click to edit', 'Click para editar')}
                      >
                        {mName(m)}
                      </button>
                      <ResponsibleBadge resp={m.responsible} />
                      <span className="text-[10px] text-gray-400 font-mono w-8 text-right tabular-nums">
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
                className="absolute top-0 h-full border-l border-gray-100"
                style={{ left: month.startDay * DAY_WIDTH }}
              />
            ))}

            {/* Week gridlines */}
            {Array.from({ length: Math.ceil(bounds.totalDays / 7) }).map(
              (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-gray-50"
                  style={{ left: i * 7 * DAY_WIDTH }}
                />
              )
            )}

            {/* Today line */}
            {todayOffset > 0 && todayOffset < chartWidth && (
              <div
                className="absolute top-0 h-full w-0.5 bg-error/60 z-10"
                style={{ left: todayOffset }}
              />
            )}

            {/* Launch line */}
            <div
              className="absolute top-0 h-full w-0.5 bg-carbon/80 z-10"
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
                        className={`w-full h-full rounded-lg shadow-sm transition-shadow cursor-grab active:cursor-grabbing hover:shadow-lg ${
                          isCompleted ? 'opacity-50' : ''
                        } ${isDragging ? 'shadow-xl ring-2 ring-blue-400/50' : ''}`}
                        style={{
                          backgroundColor: m.color,
                          backgroundImage: isInProgress
                            ? `repeating-linear-gradient(
                                -45deg,
                                transparent,
                                transparent 4px,
                                rgba(255,255,255,0.2) 4px,
                                rgba(255,255,255,0.2) 8px
                              )`
                            : undefined,
                        }}
                        onMouseDown={(e) => handleDragStart(e, m.id, 'move')}
                        onDoubleClick={() => openEditor(m)}
                      >
                        {/* Text on bar when wide enough */}
                        {pos.width > 60 && (
                          <div className="absolute inset-0 flex items-center px-2 overflow-hidden pointer-events-none">
                            <span className="text-[10px] font-semibold text-white truncate drop-shadow-sm">
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
                          <div className="bg-carbon text-white text-[11px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                            <div className="font-bold text-[12px]">{mName(m)}</div>
                            <div className="text-gray-300 mt-1">
                              {formatDate(pos.startDate)} → {formatDate(pos.endDate)}
                            </div>
                            <div className="text-gray-400 mt-0.5">
                              {pos.durationWeeks.toFixed(1)} {t('weeks', 'semanas')} &middot; {m.responsible}
                            </div>
                            {m.notes && (
                              <div className="text-yellow-300 mt-1 text-[10px] max-w-[200px] break-words">
                                {m.notes}
                              </div>
                            )}
                            <div className="text-gray-500 mt-1 text-[9px]">
                              {t('Drag to move · Edges to resize · Double click to edit', 'Arrastra para mover · Bordes para redimensionar · Doble click para editar')}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Drag preview tooltip */}
                      {isDragging && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                          <div className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap font-mono">
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
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setEditingMilestone(null)}>
            <div
              className="bg-white shadow-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with phase color */}
              <div className="px-5 py-3 flex items-center gap-3" style={{ backgroundColor: m.color + '20' }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {pName(m.phase)}
                </span>
                <ResponsibleBadge resp={m.responsible} />
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Name', 'Nombre')}</label>
                  <input
                    type="text"
                    value={editValues.nameEs}
                    onChange={(e) => setEditValues((v) => ({ ...v, nameEs: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400"
                    autoFocus
                  />
                </div>

                {/* Start & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      {t('Start (wk. before launch)', 'Inicio (sem. antes del launch)')}
                    </label>
                    <input
                      type="number"
                      value={editValues.startWeeksBefore}
                      onChange={(e) =>
                        setEditValues((v) => ({ ...v, startWeeksBefore: parseFloat(e.target.value) || 0 }))
                      }
                      step={0.5}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      {t('Duration (weeks)', 'Duración (semanas)')}
                    </label>
                    <input
                      type="number"
                      value={editValues.durationWeeks}
                      onChange={(e) =>
                        setEditValues((v) => ({ ...v, durationWeeks: parseFloat(e.target.value) || 0.5 }))
                      }
                      step={0.5}
                      min={0.15}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 font-mono"
                    />
                  </div>
                </div>

                {/* Date preview */}
                <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  {formatDate(startDate)} → {formatDate(endDate)}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Notes', 'Notas')}</label>
                  <textarea
                    value={editValues.notes}
                    onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
                    rows={2}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 resize-none"
                    placeholder={t('Add notes...', 'Añadir notas...')}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 flex items-center gap-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    if (confirm(t('Delete this milestone?', '¿Eliminar este hito?'))) {
                      deleteMilestone(editingMilestone!);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('Delete milestone', 'Eliminar hito')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('Delete', 'Eliminar')}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('Cancel', 'Cancelar')}
                </button>
                <button
                  onClick={saveEditor}
                  className="px-4 py-2 text-sm font-semibold bg-carbon text-white rounded-lg hover:bg-carbon/80 transition-colors"
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
