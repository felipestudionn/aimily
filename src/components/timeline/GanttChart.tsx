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
import { ChevronDown, ChevronRight, Check, Clock, Circle } from 'lucide-react';

const DAY_WIDTH = 4;
const ROW_HEIGHT = 36;
const PHASE_ROW_HEIGHT = 40;
const LEFT_PANEL_WIDTH = 320;

interface GanttChartProps {
  timeline: CollectionTimeline;
  onUpdateMilestone: (id: string, updates: Partial<TimelineMilestone>) => void;
  onUpdateTimeline: (updates: Partial<CollectionTimeline>) => void;
}

export function GanttChart({
  timeline,
  onUpdateMilestone,
  onUpdateTimeline,
}: GanttChartProps) {
  const [collapsedPhases, setCollapsedPhases] = useState<Set<TimelinePhase>>(
    new Set()
  );
  const [editingWeeks, setEditingWeeks] = useState<string | null>(null);
  const [editingStart, setEditingStart] = useState<string | null>(null);
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

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const target = Math.max(0, todayOffset - 200);
      scrollRef.current.scrollLeft = target;
    }
  }, [todayOffset]);

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
      AGENCY: 'bg-purple-100 text-purple-700',
      DIGITAL: 'bg-pink-100 text-pink-700',
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 border-b border-gray-100 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
          <span className="text-gray-500 font-medium">{stats.percent}%</span>
        </div>
        <span className="text-gray-400">|</span>
        <span className="text-green-600 font-medium">
          {stats.completed} completados
        </span>
        <span className="text-amber-500 font-medium">
          {stats.inProgress} en progreso
        </span>
        <span className="text-gray-400 font-medium">
          {stats.total - stats.completed - stats.inProgress} pendientes
        </span>
        <div className="ml-auto text-gray-500">
          {timeline.milestones.length} hitos &middot; ~40 semanas
        </div>
      </div>

      {/* Header row */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-20">
        {/* Left header */}
        <div
          className="flex-shrink-0 flex items-end px-4 py-2 border-r border-gray-200 bg-white"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Fase / Hito
          </span>
          <span className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Sem.
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
                className="absolute top-0 h-full flex items-end border-l border-gray-200"
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
                className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
                style={{ left: todayOffset }}
              >
                <div className="absolute -top-0 -left-3 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-b">
                  HOY
                </div>
              </div>
            )}
            {/* Launch marker in header */}
            <div
              className="absolute top-0 h-full w-0.5 bg-black z-10"
              style={{ left: launchOffset }}
            >
              <div className="absolute -top-0 -left-6 px-1.5 py-0.5 bg-black text-white text-[9px] font-bold rounded-b">
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
          className="flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white"
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
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex-1">
                    {phase.nameEs}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {phaseCompleted}/{milestones.length}
                  </span>
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
                        className="flex-shrink-0 hover:scale-110 transition-transform"
                        title="Cambiar estado"
                      >
                        <StatusIcon status={m.status} />
                      </button>
                      <span
                        className={`text-xs flex-1 truncate ${m.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}
                        title={m.nameEs}
                      >
                        {m.nameEs}
                      </span>
                      <ResponsibleBadge resp={m.responsible} />
                      {/* Editable weeks */}
                      {editingWeeks === m.id ? (
                        <input
                          type="number"
                          className="w-10 text-[10px] text-center border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          defaultValue={m.durationWeeks}
                          step={0.5}
                          min={0.15}
                          autoFocus
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val > 0 && val !== m.durationWeeks) {
                              onUpdateMilestone(m.id, {
                                durationWeeks: val,
                              });
                            }
                            setEditingWeeks(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                            if (e.key === 'Escape') setEditingWeeks(null);
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingWeeks(m.id)}
                          className="text-[10px] text-gray-400 font-mono w-10 text-center hover:text-blue-600 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
                          title="Editar duración (semanas)"
                        >
                          {m.durationWeeks}w
                        </button>
                      )}
                      {/* Editable start offset */}
                      {editingStart === m.id ? (
                        <input
                          type="number"
                          className="w-10 text-[10px] text-center border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          defaultValue={m.startWeeksBefore}
                          step={0.5}
                          autoFocus
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val !== m.startWeeksBefore) {
                              onUpdateMilestone(m.id, {
                                startWeeksBefore: val,
                              });
                            }
                            setEditingStart(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingStart(null);
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingStart(m.id)}
                          className="text-[10px] text-gray-400 font-mono w-8 text-center hover:text-green-600 hover:bg-green-50 rounded px-0.5 py-0.5 transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar inicio (semanas antes del launch)"
                        >
                          -{m.startWeeksBefore}
                        </button>
                      )}
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
          onScroll={handleScroll}
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
                className="absolute top-0 h-full w-0.5 bg-red-500/60 z-10"
                style={{ left: todayOffset }}
              />
            )}

            {/* Launch line */}
            <div
              className="absolute top-0 h-full w-0.5 bg-black/80 z-10"
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
                  const startDate = getMilestoneDate(
                    timeline.launchDate,
                    m.startWeeksBefore
                  );
                  const endDate = getMilestoneEndDate(
                    timeline.launchDate,
                    m.startWeeksBefore,
                    m.durationWeeks
                  );
                  const startDay = daysBetween(
                    bounds.earliestDate,
                    startDate
                  );
                  const duration = daysBetween(startDate, endDate);
                  const barLeft = startDay * DAY_WIDTH;
                  const barWidth = Math.max(duration * DAY_WIDTH, 6);
                  const barY = yOffset;
                  yOffset += ROW_HEIGHT;

                  const isCompleted = m.status === 'completed';
                  const isInProgress = m.status === 'in-progress';

                  return (
                    <div
                      key={m.id}
                      className="absolute group/bar"
                      style={{
                        left: barLeft,
                        width: barWidth,
                        top: barY + 8,
                        height: ROW_HEIGHT - 16,
                      }}
                    >
                      {/* Bar */}
                      <div
                        className={`w-full h-full rounded-md shadow-sm transition-all cursor-pointer hover:shadow-md hover:brightness-105 ${isCompleted ? 'opacity-50' : ''}`}
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
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover/bar:block z-30 pointer-events-none">
                        <div className="bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-md shadow-lg whitespace-nowrap">
                          <div className="font-semibold">{m.nameEs}</div>
                          <div className="text-gray-300 mt-0.5">
                            {formatDate(startDate)} → {formatDate(endDate)}
                          </div>
                          <div className="text-gray-400">
                            {m.durationWeeks} semanas &middot; {m.responsible}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
