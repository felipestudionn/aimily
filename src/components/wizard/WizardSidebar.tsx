'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Paintbrush,
  Pencil,
  Wrench,
  Scissors,
  Sparkles,
  Monitor,
  Megaphone,
  Factory,
  Rocket,
  CalendarDays,
  LayoutDashboard,
  Lock,
  Check,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import type { WizardPhaseId } from '@/lib/wizard-phases';

const PHASE_ICONS: Record<WizardPhaseId, React.ElementType> = {
  aimily: ShoppingBag,
  brand: Paintbrush,
  design: Pencil,
  prototyping: Wrench,
  sampling: Scissors,
  studio: Sparkles,
  digital: Monitor,
  marketing: Megaphone,
  production: Factory,
  launch: Rocket,
};

interface WizardSidebarProps {
  collectionId: string;
  collectionName: string;
  season?: string;
}

export function WizardSidebar({
  collectionId,
  collectionName,
  season,
}: WizardSidebarProps) {
  const pathname = usePathname();
  const { milestones, cycleMilestoneStatus, saving } = useTimeline();
  const { phases, overallProgress, activePhase } = useWizardState(milestones);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<WizardPhaseId>>(new Set());

  const basePath = `/collection/${collectionId}`;

  // Auto-expand the active phase
  useEffect(() => {
    if (activePhase) {
      setExpandedPhases((prev) => new Set(prev).add(activePhase.phase.id));
    }
  }, [activePhase]);

  // Auto-expand phase matching current route
  useEffect(() => {
    for (const ps of phases) {
      const fullPath = `${basePath}/${ps.phase.path}`;
      if (pathname?.startsWith(fullPath)) {
        setExpandedPhases((prev) => new Set(prev).add(ps.phase.id));
        break;
      }
    }
  }, [pathname, basePath, phases]);

  const toggleExpand = (id: WizardPhaseId) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getMilestonesByPhase = (milestoneIds: string[]) =>
    milestoneIds
      .map((id) => milestones.find((m) => m.id === id))
      .filter(Boolean) as typeof milestones;

  return (
    <aside
      className={`fixed left-0 top-24 bottom-0 bg-carbon z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[60px]' : 'w-72'
      }`}
    >
      {/* Collection Header */}
      {!collapsed && (
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-crema truncate text-sm tracking-wide uppercase">
              {collectionName}
            </h2>
            {saving && (
              <Loader2 className="h-3 w-3 text-crema/40 animate-spin flex-shrink-0" />
            )}
          </div>
          {season && (
            <p className="text-xs text-white/40 mt-0.5">{season}</p>
          )}
          {/* Overall Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
              <span>Overall Progress</span>
              <span className="text-crema font-medium">{overallProgress}%</span>
            </div>
            <div className="h-1 bg-white/10 overflow-hidden">
              <div
                className="h-full bg-crema transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          {/* Mini Phase Progress Dots */}
          <div className="flex items-center gap-1 mt-2.5">
            {phases.map((ps) => (
              <div
                key={ps.phase.id}
                className={`flex-1 h-1 transition-colors ${
                  ps.state === 'completed'
                    ? 'bg-green-400'
                    : ps.state === 'in-progress'
                    ? 'bg-crema/60'
                    : ps.state === 'available'
                    ? 'bg-white/20'
                    : 'bg-white/5'
                }`}
                title={`${ps.phase.name}: ${ps.progress}%`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {phases.map((ps) => {
          const Icon = PHASE_ICONS[ps.phase.id];
          const isLocked = ps.state === 'locked';
          const isCompleted = ps.state === 'completed';
          const isExpanded = expandedPhases.has(ps.phase.id);
          const phasePath = `${basePath}/${ps.phase.path}`;
          const isActive = pathname?.startsWith(phasePath);
          const phaseMilestones = getMilestonesByPhase(ps.phase.milestoneIds);

          return (
            <div key={ps.phase.id} className="mb-0.5">
              {/* Phase Header */}
              <div
                className={`group flex items-center gap-2.5 px-4 py-2.5 mx-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-crema'
                    : isLocked
                    ? 'text-white/25 cursor-not-allowed'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }`}
                onClick={() => {
                  if (!isLocked && !collapsed) toggleExpand(ps.phase.id);
                }}
              >
                {/* State indicator bar */}
                <div
                  className={`w-0.5 h-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-crema'
                      : isCompleted
                      ? 'bg-green-400'
                      : ps.state === 'in-progress'
                      ? 'bg-crema/60'
                      : isLocked
                      ? 'bg-white/10'
                      : 'bg-white/20'
                  }`}
                />

                {/* Icon */}
                <div className="flex-shrink-0">
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : isCompleted ? (
                    <div className="h-4 w-4 bg-green-400 flex items-center justify-center">
                      <Check className="h-3 w-3 text-carbon" strokeWidth={3} />
                    </div>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {!collapsed && (
                  <>
                    {/* Phase name + progress */}
                    <Link
                      href={isLocked ? '#' : phasePath}
                      onClick={(e) => {
                        if (isLocked) e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="flex-1 min-w-0"
                    >
                      <span className="text-xs font-medium tracking-wide uppercase truncate block">
                        {ps.phase.name}
                      </span>
                    </Link>

                    {/* Progress or lock */}
                    {isLocked ? (
                      <span className="text-[10px] text-white/20 flex-shrink-0">LOCKED</span>
                    ) : ps.progress > 0 ? (
                      <span className="text-[10px] text-white/40 flex-shrink-0 tabular-nums">
                        {ps.progress}%
                      </span>
                    ) : null}

                    {/* Expand chevron */}
                    {!isLocked && (
                      <div className="flex-shrink-0 text-white/30">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Sub-milestones (expanded) */}
              {!collapsed && isExpanded && !isLocked && phaseMilestones.length > 0 && (
                <div className="ml-9 mr-3 mb-2 mt-0.5 border-l border-white/10 pl-3 space-y-0.5 wizard-expand">
                  {phaseMilestones.map((m) => {
                    const isMilestoneCompleted = m.status === 'completed';
                    const isMilestoneInProgress = m.status === 'in-progress';

                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 py-1.5 px-2 text-xs group/ms cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => cycleMilestoneStatus(m.id)}
                        title="Click to change status"
                      >
                        {/* Status indicator (clickable) */}
                        <div className="flex-shrink-0">
                          {isMilestoneCompleted ? (
                            <div className="w-3.5 h-3.5 bg-green-400 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-carbon" strokeWidth={3} />
                            </div>
                          ) : isMilestoneInProgress ? (
                            <div className="w-3.5 h-3.5 border border-crema/60 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-crema/60" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 border border-white/20 group-hover/ms:border-white/40 transition-colors" />
                          )}
                        </div>

                        {/* Milestone name */}
                        <span
                          className={`flex-1 truncate ${
                            isMilestoneCompleted
                              ? 'text-white/30 line-through'
                              : isMilestoneInProgress
                              ? 'text-crema/80'
                              : 'text-white/45 group-hover/ms:text-white/60'
                          }`}
                        >
                          {m.name}
                        </span>

                        {/* Responsible tag */}
                        {m.responsible && (
                          <span className="text-[9px] text-white/20 flex-shrink-0 uppercase">
                            {m.responsible}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section: Calendar + Overview */}
      <div className="border-t border-white/10 py-2 px-2">
        {[
          { id: 'calendar', path: '/calendar', label: 'Calendar', Icon: CalendarDays },
          { id: 'overview', path: '', label: 'Overview', Icon: LayoutDashboard },
        ].map((item) => {
          const fullPath = `${basePath}${item.path}`;
          const isActive =
            item.path === ''
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname?.startsWith(fullPath);

          return (
            <Link
              key={item.id}
              href={fullPath}
              className={`flex items-center gap-2.5 px-4 py-2 transition-all text-xs font-medium tracking-wide uppercase ${
                isActive
                  ? 'text-crema bg-white/10'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-carbon border border-white/20 flex items-center justify-center text-white/40 hover:text-crema hover:border-crema/40 transition-colors"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3 w-3" />
        ) : (
          <PanelLeftClose className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
