'use client';

import { useMemo } from 'react';
import { PHASES, PHASE_ORDER, getMilestoneDate, getMilestoneEndDate } from '@/lib/timeline-template';
import type { TimelineMilestone, TimelinePhase } from '@/types/timeline';

interface InlineTimelineProps {
  milestones: TimelineMilestone[];
  launchDate?: string;
}

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function InlineTimeline({ milestones, launchDate }: InlineTimelineProps) {
  // Compute timeline bounds
  const bounds = useMemo(() => {
    if (!launchDate || milestones.length === 0) return null;

    let earliest = Infinity;
    let latest = -Infinity;

    for (const m of milestones) {
      const s = getMilestoneDate(launchDate, m.startWeeksBefore).getTime();
      const e = getMilestoneEndDate(launchDate, m.startWeeksBefore, m.durationWeeks).getTime();
      if (s < earliest) earliest = s;
      if (e > latest) latest = e;
    }

    // Add 1 week buffer on each side
    const start = new Date(earliest - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(latest + 7 * 24 * 60 * 60 * 1000);
    const totalMs = end.getTime() - start.getTime();

    return { start, end, totalMs };
  }, [milestones, launchDate]);

  // Generate month markers
  const months = useMemo(() => {
    if (!bounds) return [];
    const result: { label: string; left: number; width: number }[] = [];
    const cursor = new Date(bounds.start);
    cursor.setDate(1);
    if (cursor < bounds.start) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= bounds.end) {
      const nextMonth = new Date(cursor);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthStart = Math.max(cursor.getTime(), bounds.start.getTime());
      const monthEnd = Math.min(nextMonth.getTime(), bounds.end.getTime());

      const left = ((monthStart - bounds.start.getTime()) / bounds.totalMs) * 100;
      const width = ((monthEnd - monthStart) / bounds.totalMs) * 100;

      result.push({
        label: `${MONTH_NAMES_ES[cursor.getMonth()]} ${cursor.getFullYear().toString().slice(2)}`,
        left,
        width,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [bounds]);

  // Group milestones by phase
  const phaseGroups = useMemo(() => {
    return PHASE_ORDER.map((phase) => ({
      phase,
      info: PHASES[phase],
      milestones: milestones
        .filter((m) => m.phase === phase)
        .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore),
    }));
  }, [milestones]);

  if (!bounds || !launchDate) {
    return (
      <div className="max-w-5xl mx-auto px-10 py-12 text-center text-carbon/30 text-sm">
        No hay fecha de lanzamiento configurada
      </div>
    );
  }

  const getBarPosition = (m: TimelineMilestone) => {
    const start = getMilestoneDate(launchDate, m.startWeeksBefore);
    const end = getMilestoneEndDate(launchDate, m.startWeeksBefore, m.durationWeeks);
    const left = ((start.getTime() - bounds.start.getTime()) / bounds.totalMs) * 100;
    const width = ((end.getTime() - start.getTime()) / bounds.totalMs) * 100;
    return { left: Math.max(0, left), width: Math.max(0.3, width) };
  };

  // Launch date marker position
  const launchPos = ((new Date(launchDate).getTime() - bounds.start.getTime()) / bounds.totalMs) * 100;

  return (
    <div className="max-w-6xl mx-auto px-10 py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Vista calendario
        </p>
        <h2 className="text-2xl font-light text-carbon tracking-tight">
          Collection <span className="italic">Timeline</span>
        </h2>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-carbon/[0.06] overflow-hidden">
        {/* Month header */}
        <div className="relative h-8 border-b border-carbon/[0.06] bg-carbon/[0.02]">
          {months.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 h-full flex items-center border-l border-carbon/[0.06] px-2"
              style={{ left: `${m.left}%`, width: `${m.width}%` }}
            >
              <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 whitespace-nowrap">
                {m.label}
              </span>
            </div>
          ))}

          {/* Launch date marker */}
          <div
            className="absolute top-0 h-full w-px bg-carbon/30"
            style={{ left: `${launchPos}%` }}
          >
            <div className="absolute -top-0 left-1 text-[9px] font-medium text-carbon/50 whitespace-nowrap">
              Launch
            </div>
          </div>
        </div>

        {/* Phase rows */}
        {phaseGroups.map((group) => (
          <div key={group.phase}>
            {/* Phase header row */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-carbon/[0.04]" style={{ backgroundColor: group.info.bgColor + '60' }}>
              <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: group.info.color }} />
              <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/50">
                {group.info.nameEs}
              </span>
              <span className="text-[10px] text-carbon/25 ml-auto">
                {group.milestones.filter((m) => m.status === 'completed').length}/{group.milestones.length}
              </span>
            </div>

            {/* Milestone bars */}
            {group.milestones.map((m) => {
              const pos = getBarPosition(m);
              const isCompleted = m.status === 'completed';
              const isInProgress = m.status === 'in-progress';

              return (
                <div key={m.id} className="relative h-7 border-b border-carbon/[0.03] group hover:bg-carbon/[0.02] transition-colors">
                  {/* Month grid lines */}
                  {months.map((month, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-carbon/[0.04]"
                      style={{ left: `${month.left}%` }}
                    />
                  ))}

                  {/* Launch line */}
                  <div
                    className="absolute top-0 h-full w-px bg-carbon/10"
                    style={{ left: `${launchPos}%` }}
                  />

                  {/* Bar */}
                  <div
                    className="absolute top-1 h-5 flex items-center px-1.5 transition-all duration-300 group-hover:shadow-sm"
                    style={{
                      left: `${pos.left}%`,
                      width: `${pos.width}%`,
                      backgroundColor: isCompleted
                        ? group.info.color
                        : isInProgress
                        ? group.info.color + 'AA'
                        : group.info.color + '35',
                    }}
                  >
                    <span className={`text-[9px] font-medium truncate whitespace-nowrap ${
                      isCompleted || isInProgress ? 'text-white' : 'text-carbon/50'
                    }`}>
                      {m.nameEs}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        {PHASE_ORDER.map((phase) => (
          <div key={phase} className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: PHASES[phase].color }} />
            <span className="text-xs font-light text-carbon/40">{PHASES[phase].nameEs}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-4 h-px bg-carbon/30" />
          <span className="text-xs font-light text-carbon/40">Fecha de lanzamiento</span>
        </div>
      </div>
    </div>
  );
}
