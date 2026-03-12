'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  launchDate?: string | null;
  skuCount?: number;
  setupData?: Record<string, unknown> | null;
}

export function WizardSidebar({
  collectionId,
  collectionName,
  season,
  launchDate,
  skuCount = 0,
  setupData,
}: WizardSidebarProps) {
  const pathname = usePathname();
  const { milestones, cycleMilestoneStatus, saving } = useTimeline();
  const { phases, overallProgress, activePhase } = useWizardState(milestones);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<WizardPhaseId>>(new Set());

  const basePath = `/collection/${collectionId}`;

  // Compute metrics
  const inProgressCount = milestones.filter((m) => m.status === 'in-progress').length;
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

  const launchDateStr = launchDate
    ? new Date(launchDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const daysUntilLaunch = launchDate
    ? Math.ceil((new Date(launchDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const salesTarget = (setupData as Record<string, number | undefined>)?.totalSalesTarget;

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
      className={`fixed left-0 top-0 bottom-0 bg-carbon z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[52px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="px-5 h-14 flex items-center">
        <Link href="/my-collections" className="flex items-center">
          <Image
            src="/images/aimily-logo-white.png"
            alt="aimily"
            width={774}
            height={96}
            className="object-contain h-4 w-auto opacity-60 hover:opacity-90 transition-opacity"
            priority
            unoptimized
          />
        </Link>
        {saving && !collapsed && (
          <Loader2 className="h-3 w-3 text-crema/30 animate-spin ml-auto flex-shrink-0" />
        )}
      </div>

      {/* Collection Info + Metrics */}
      {!collapsed && (
        <div className="px-5 pb-4 border-b border-crema/[0.08]">
          <h2 className="font-semibold text-crema text-[14px] tracking-tight lowercase truncate">
            {collectionName}
          </h2>
          {season && (
            <p className="text-[11px] text-crema/50 mt-0.5 tracking-wide uppercase font-medium">{season}</p>
          )}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] mb-2 tracking-wide uppercase font-semibold">
              <span className="text-crema/40">Progress</span>
              <span className="text-crema/80">{overallProgress}%</span>
            </div>
            <div className="h-[2px] bg-crema/[0.12] overflow-hidden">
              <div
                className="h-full bg-crema transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-crema/35 mt-1.5 font-medium">
              {completedMilestones} of {totalMilestones} milestones
            </p>
          </div>

          {/* Metrics grid */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[9px] text-crema/35 uppercase tracking-wider font-semibold">Launch</p>
              <p className="text-[12px] text-crema/80 font-medium mt-0.5">{launchDateStr}</p>
              {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                <p className="text-[10px] text-crema/35 font-medium">{daysUntilLaunch}d</p>
              )}
            </div>
            <div>
              <p className="text-[9px] text-crema/35 uppercase tracking-wider font-semibold">SKUs</p>
              <p className="text-[12px] text-crema/80 font-medium mt-0.5">{skuCount}</p>
            </div>
            <div>
              <p className="text-[9px] text-crema/35 uppercase tracking-wider font-semibold">Active</p>
              <p className="text-[12px] text-crema/80 font-medium mt-0.5">{inProgressCount}</p>
            </div>
            <div>
              <p className="text-[9px] text-crema/35 uppercase tracking-wider font-semibold">Target</p>
              <p className="text-[12px] text-crema/80 font-medium mt-0.5">
                {salesTarget ? `€${salesTarget.toLocaleString()}` : '—'}
              </p>
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
                    ? 'bg-crema/[0.10] text-crema'
                    : isLocked
                    ? 'text-crema/30 cursor-not-allowed'
                    : 'text-crema/70 hover:bg-crema/[0.06] hover:text-crema/90'
                }`}
                onClick={() => {
                  if (!isLocked && !collapsed) toggleExpand(ps.phase.id);
                }}
              >
                <div className="flex-shrink-0">
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : isCompleted ? (
                    <div className="h-3.5 w-3.5 bg-crema flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-carbon" strokeWidth={3} />
                    </div>
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>

                {!collapsed && (
                  <>
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

                    {isLocked ? (
                      <span className="text-[9px] text-crema/25 flex-shrink-0 tracking-wider font-medium">LOCKED</span>
                    ) : ps.progress > 0 ? (
                      <span className="text-[9px] text-crema/50 flex-shrink-0 tabular-nums font-medium">
                        {ps.progress}%
                      </span>
                    ) : null}

                    {!isLocked && (
                      <div className="flex-shrink-0 text-crema/35">
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

              {/* Sub-milestones */}
              {!collapsed && isExpanded && !isLocked && phaseMilestones.length > 0 && (
                <div className="ml-[38px] mr-3 mb-1.5 mt-0.5 border-l border-crema/[0.10] pl-3 space-y-px">
                  {phaseMilestones.map((m) => {
                    const isMilestoneCompleted = m.status === 'completed';
                    const isMilestoneInProgress = m.status === 'in-progress';

                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 py-1.5 px-2 text-[11px] group/ms cursor-pointer hover:bg-crema/[0.04] transition-colors"
                        onClick={() => cycleMilestoneStatus(m.id)}
                        title="Click to change status"
                      >
                        <div className="flex-shrink-0">
                          {isMilestoneCompleted ? (
                            <div className="w-3 h-3 bg-crema flex items-center justify-center">
                              <Check className="h-2 w-2 text-carbon" strokeWidth={3} />
                            </div>
                          ) : isMilestoneInProgress ? (
                            <div className="w-3 h-3 border border-crema/50 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-crema/50" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 border border-crema/25 group-hover/ms:border-crema/50 transition-colors" />
                          )}
                        </div>

                        <span
                          className={`flex-1 truncate leading-tight ${
                            isMilestoneCompleted
                              ? 'text-crema/30 line-through'
                              : isMilestoneInProgress
                              ? 'text-crema/80'
                              : 'text-crema/50 group-hover/ms:text-crema/70'
                          }`}
                        >
                          {m.name}
                        </span>

                        {m.responsible && (
                          <span className="text-[8px] text-crema/25 flex-shrink-0 uppercase tracking-wider font-medium">
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

      {/* Bottom: Calendar + Overview */}
      <div className="border-t border-crema/[0.08] py-2 px-1.5">
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
                  ? 'text-crema bg-crema/[0.10]'
                  : 'text-crema/50 hover:text-crema/70 hover:bg-crema/[0.06]'
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
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-carbon border border-crema/10 flex items-center justify-center text-crema/30 hover:text-crema/60 hover:border-crema/20 transition-colors"
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
