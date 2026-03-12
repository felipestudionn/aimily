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
  product: ShoppingBag,
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

  useEffect(() => {
    if (activePhase) {
      setExpandedPhases((prev) => new Set(prev).add(activePhase.phase.id));
    }
  }, [activePhase]);

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
      className={`fixed left-0 top-14 bottom-0 bg-[#FAFAFA] border-r border-neutral-200 z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[52px]' : 'w-64'
      }`}
    >
      {/* Collection Header */}
      {!collapsed && (
        <div className="px-5 pt-5 pb-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-texto text-[13px] tracking-wide uppercase truncate">
              {collectionName}
            </h2>
            {saving && (
              <Loader2 className="h-3 w-3 text-neutral-400 animate-spin flex-shrink-0" />
            )}
          </div>
          {season && (
            <p className="text-[11px] text-neutral-400 mt-0.5 tracking-wide">{season}</p>
          )}
          {/* Overall Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] mb-2 tracking-wide uppercase">
              <span className="text-neutral-400">Progress</span>
              <span className="text-texto font-semibold">{overallProgress}%</span>
            </div>
            <div className="h-[2px] bg-neutral-200 overflow-hidden">
              <div
                className="h-full bg-carbon transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Phase Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {phases.map((ps) => {
          const Icon = PHASE_ICONS[ps.phase.id];
          const isLocked = ps.state === 'locked';
          const isCompleted = ps.state === 'completed';
          const isExpanded = expandedPhases.has(ps.phase.id);
          const phasePath = `${basePath}/${ps.phase.path}`;
          const isActive = pathname?.startsWith(phasePath);
          const phaseMilestones = getMilestonesByPhase(ps.phase.milestoneIds);

          return (
            <div key={ps.phase.id} className="mb-px">
              {/* Phase Header */}
              <div
                className={`group flex items-center gap-2.5 px-4 py-2.5 mx-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-texto shadow-sm border border-neutral-200'
                    : isLocked
                    ? 'text-neutral-300 cursor-not-allowed'
                    : 'text-neutral-500 hover:bg-white/60 hover:text-texto'
                }`}
                onClick={() => {
                  if (!isLocked && !collapsed) toggleExpand(ps.phase.id);
                }}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : isCompleted ? (
                    <div className="h-3.5 w-3.5 bg-carbon flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>

                {!collapsed && (
                  <>
                    {/* Phase name */}
                    <Link
                      href={isLocked ? '#' : phasePath}
                      onClick={(e) => {
                        if (isLocked) e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="flex-1 min-w-0"
                    >
                      <span className="text-[11px] font-medium tracking-[0.08em] uppercase truncate block">
                        {ps.phase.name}
                      </span>
                    </Link>

                    {/* Progress or lock */}
                    {isLocked ? (
                      <span className="text-[9px] text-neutral-300 flex-shrink-0 tracking-wider">LOCKED</span>
                    ) : ps.progress > 0 ? (
                      <span className="text-[9px] text-neutral-400 flex-shrink-0 tabular-nums">
                        {ps.progress}%
                      </span>
                    ) : null}

                    {/* Expand chevron */}
                    {!isLocked && (
                      <div className="flex-shrink-0 text-neutral-300">
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
                <div className="ml-[38px] mr-3 mb-1.5 mt-0.5 border-l border-neutral-200 pl-3 space-y-px">
                  {phaseMilestones.map((m) => {
                    const isMilestoneCompleted = m.status === 'completed';
                    const isMilestoneInProgress = m.status === 'in-progress';

                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 py-1.5 px-2 text-[11px] group/ms cursor-pointer hover:bg-white/80 transition-colors"
                        onClick={() => cycleMilestoneStatus(m.id)}
                        title="Click to change status"
                      >
                        {/* Status indicator */}
                        <div className="flex-shrink-0">
                          {isMilestoneCompleted ? (
                            <div className="w-3 h-3 bg-carbon flex items-center justify-center">
                              <Check className="h-2 w-2 text-white" strokeWidth={3} />
                            </div>
                          ) : isMilestoneInProgress ? (
                            <div className="w-3 h-3 border border-carbon/40 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-carbon/40" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 border border-neutral-300 group-hover/ms:border-neutral-400 transition-colors" />
                          )}
                        </div>

                        {/* Milestone name */}
                        <span
                          className={`flex-1 truncate leading-tight ${
                            isMilestoneCompleted
                              ? 'text-neutral-300 line-through'
                              : isMilestoneInProgress
                              ? 'text-texto/80'
                              : 'text-neutral-400 group-hover/ms:text-neutral-600'
                          }`}
                        >
                          {m.name}
                        </span>

                        {/* Responsible tag */}
                        {m.responsible && (
                          <span className="text-[8px] text-neutral-300 flex-shrink-0 uppercase tracking-wider">
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
      <div className="border-t border-neutral-200 py-2 px-1.5">
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
              className={`flex items-center gap-2.5 px-4 py-2 transition-all text-[11px] font-medium tracking-[0.08em] uppercase ${
                isActive
                  ? 'text-texto bg-white shadow-sm border border-neutral-200'
                  : 'text-neutral-400 hover:text-neutral-600 hover:bg-white/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 transition-colors shadow-sm"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-2.5 w-2.5" />
        ) : (
          <PanelLeftClose className="h-2.5 w-2.5" />
        )}
      </button>
    </aside>
  );
}
