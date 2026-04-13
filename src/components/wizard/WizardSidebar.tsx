'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Check,
  Presentation,
  X,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelinePhase } from '@/types/timeline';
import { useTranslation } from '@/i18n';

/* ══════════════════════════════════════════════════════════════
   Block definitions — 4 blocks, numbered 01-04
   ══════════════════════════════════════════════════════════════ */

interface SidebarBlock {
  id: TimelinePhase;
  number: string;
  label: string;
  route: string;
  phaseIds: WizardPhaseId[];
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  { id: 'creative',    number: '01', label: 'Creative & Brand',   route: 'creative',           phaseIds: ['product', 'brand'] },
  { id: 'planning',    number: '02', label: 'Merchandising',      route: 'merchandising',      phaseIds: ['merchandising'] },
  { id: 'development', number: '03', label: 'Design & Dev',       route: 'product',            phaseIds: ['design', 'prototyping', 'sampling', 'production'] },
  { id: 'go_to_market', number: '04', label: 'Marketing',         route: 'marketing/creation', phaseIds: ['marketing-creation', 'marketing-distribution'] },
];

const COLLAPSED_W = 72;
const EXPANDED_W = 256;

/* ══════════════════════════════════════════════════════════════ */

interface WizardSidebarProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  launchDate?: string | null;
  skuCount?: number;
  setupData?: Record<string, unknown> | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function WizardSidebar({
  collectionId,
  collectionName,
  season,
  launchDate,
  mobileOpen = false,
  onMobileClose,
  onCollapsedChange,
}: WizardSidebarProps) {
  const pathname = usePathname();
  const t = useTranslation();
  const { milestones } = useTimeline();
  const { phases } = useWizardState(milestones);
  const [pinned, setPinned] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collapsed = !pinned && !hoverExpanded;

  const basePath = `/collection/${collectionId}`;
  const phaseMap = new Map(phases.map((ps) => [ps.phase.id, ps]));

  // Time remaining
  const daysUntilLaunch = launchDate
    ? Math.ceil((new Date(launchDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const weeksLeft = daysUntilLaunch !== null && daysUntilLaunch > 0 ? Math.floor(daysUntilLaunch / 7) : 0;
  const daysLeft = daysUntilLaunch !== null && daysUntilLaunch > 0 ? daysUntilLaunch % 7 : 0;

  const displayName = collectionName
    ? collectionName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  /* ── Helpers ── */

  function getBlockProgress(block: SidebarBlock): number {
    const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
    if (blockPhases.length === 0) return 0;
    const total = blockPhases.reduce((s, p) => s + p.totalCount, 0);
    const completed = blockPhases.reduce((s, p) => s + p.completedCount, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  function isBlockActive(block: SidebarBlock): boolean {
    const blockPath = `${basePath}/${block.route}`;
    if (pathname?.startsWith(blockPath)) return true;
    return block.phaseIds.some((id) => {
      const ps = phaseMap.get(id);
      return ps ? pathname?.startsWith(`${basePath}/${ps.phase.path}`) : false;
    });
  }

  function getActiveBlock(): SidebarBlock | null {
    return SIDEBAR_BLOCKS.find(b => isBlockActive(b)) || null;
  }

  /* ── Hover expand ── */
  const handleMouseEnter = useCallback(() => {
    if (pinned) return;
    hoverTimer.current = setTimeout(() => setHoverExpanded(true), 300);
  }, [pinned]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoverExpanded(false);
  }, []);

  const handleTogglePin = useCallback(() => {
    const next = !pinned;
    setPinned(next);
    setHoverExpanded(false);
    onCollapsedChange?.(!next);
  }, [pinned, onCollapsedChange]);

  /* ── Get sub-phases for the active block ── */
  const activeBlock = getActiveBlock();
  const activeSubPhases = activeBlock
    ? activeBlock.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[]
    : [];

  /* ── Utility links ── */
  const utilityLinks = [
    { id: 'calendar', path: '/calendar', label: t.overview?.calendar || 'Calendar', Icon: CalendarDays },
    { id: 'presentation', path: '/presentation', label: (t.overview as Record<string, string>)?.presentation || 'Presentation', Icon: Presentation },
    { id: 'overview', path: '', label: 'Dashboard', Icon: LayoutDashboard },
  ];

  return (
    <>
      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onMobileClose} />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        className={`fixed left-0 top-0 bottom-0 z-50 p-3 transition-[width] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* ── The floating white card ── */}
        <div className="surface-card h-full flex flex-col overflow-hidden">

          {/* ── Mobile close ── */}
          <button
            onClick={onMobileClose}
            className="md:hidden absolute right-3 top-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-carbon/[0.04] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-carbon/40" />
          </button>

          {/* ── Collection info ── */}
          <div className={`shrink-0 ${collapsed ? 'px-0 pt-5 pb-4' : 'px-5 pt-5 pb-4'}`}>
            {collapsed ? (
              /* Collapsed: initials only */
              <Link href={basePath} className="flex items-center justify-center">
                <span className="type-label text-carbon/30">
                  {collectionName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </Link>
            ) : (
              /* Expanded: full info */
              <>
                <Link href={basePath} className="block group">
                  <h2 className="type-nav text-carbon truncate group-hover:text-carbon/70 transition-colors">
                    {displayName}
                  </h2>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {season && (
                    <span className="type-caption text-carbon/25">{season}</span>
                  )}
                  {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                    <span className="type-caption text-carbon/25">
                      {weeksLeft > 0 && <>{weeksLeft}w </>}{daysLeft}d
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Separator ── */}
          <div className={`shrink-0 ${collapsed ? 'mx-3' : 'mx-5'} border-t border-carbon/[0.06]`} />

          {/* ── Block Navigation ── */}
          <nav className="flex-1 overflow-y-auto py-4 scrollbar-subtle">
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}/${block.route}`;
              const showSubSteps = blockActive && activeSubPhases.length > 1;

              return (
                <div key={block.id} className="mb-1">
                  {collapsed ? (
                    /* ── Collapsed: number only ── */
                    <Link
                      href={allLocked ? '#' : blockHref}
                      onClick={(e) => { if (allLocked) e.preventDefault(); }}
                      className={`relative flex flex-col items-center justify-center h-12 mx-2 rounded-[10px] transition-all ${
                        allLocked ? 'cursor-not-allowed opacity-25'
                        : blockActive ? 'bg-carbon/[0.04]'
                        : 'hover:bg-carbon/[0.03]'
                      }`}
                      title={block.label}
                    >
                      <span className={`text-[11px] font-semibold tabular-nums transition-colors ${
                        allCompleted ? 'text-carbon/25'
                        : blockActive ? 'text-carbon'
                        : 'text-carbon/30'
                      }`}>
                        {block.number}
                      </span>
                      {allCompleted && (
                        <Check className="h-2.5 w-2.5 text-carbon/25 mt-0.5" strokeWidth={2.5} />
                      )}
                      {blockActive && !allCompleted && (
                        <div className="h-[3px] w-[3px] rounded-full bg-carbon mt-1" />
                      )}
                    </Link>
                  ) : (
                    /* ── Expanded: full block row + sub-steps ── */
                    <>
                      <Link
                        href={allLocked ? '#' : blockHref}
                        onClick={(e) => { if (allLocked) e.preventDefault(); }}
                        className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-[10px] transition-all ${
                          allLocked ? 'cursor-not-allowed opacity-25'
                          : blockActive ? 'bg-carbon/[0.04]'
                          : 'hover:bg-carbon/[0.03]'
                        }`}
                      >
                        {/* Number */}
                        <span className={`text-[11px] font-semibold tabular-nums w-5 shrink-0 ${
                          blockActive ? 'text-carbon/50' : 'text-carbon/20'
                        }`}>
                          {block.number}
                        </span>

                        {/* Label */}
                        <span className={`type-nav flex-1 truncate transition-colors ${
                          allLocked ? ''
                          : allCompleted ? 'text-carbon/40'
                          : blockActive ? 'text-carbon'
                          : 'text-carbon/50'
                        }`}>
                          {block.label}
                        </span>

                        {/* Status */}
                        {allCompleted ? (
                          <Check className="h-3.5 w-3.5 text-carbon/20 shrink-0" strokeWidth={2} />
                        ) : blockProgress > 0 ? (
                          <span className="text-[12px] font-normal tabular-nums text-carbon/15 shrink-0">
                            {blockProgress}
                          </span>
                        ) : null}
                      </Link>

                      {/* ── Sub-step pills (only for active block) ── */}
                      {showSubSteps && (
                        <div className="substeps-enter flex flex-col gap-1 mx-2 mt-1 mb-1 pl-8 pr-2">
                          {activeSubPhases.map((ps) => {
                            const isCompleted = ps.state === 'completed';
                            const phasePath = `${basePath}/${ps.phase.path}`;
                            const isActive = pathname?.startsWith(phasePath);

                            return (
                              <Link
                                key={ps.phase.id}
                                href={phasePath}
                                className={`pill ${
                                  isActive ? 'pill-active'
                                  : isCompleted ? 'pill-completed'
                                  : 'pill-default'
                                }`}
                              >
                                <span className="truncate">{ps.phase.name}</span>
                                {isCompleted && !isActive && (
                                  <Check className="h-3 w-3 shrink-0 opacity-50" strokeWidth={2} />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ── Separator ── */}
          <div className={`shrink-0 ${collapsed ? 'mx-3' : 'mx-5'} border-t border-carbon/[0.06]`} />

          {/* ── Utility links ── */}
          <div className="shrink-0 py-3">
            {utilityLinks.map((item) => {
              const fullPath = `${basePath}${item.path}`;
              const isActive = item.path === ''
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname?.startsWith(fullPath);

              return (
                <Link
                  key={item.id}
                  href={fullPath}
                  className={`flex items-center ${
                    collapsed ? 'justify-center h-10 mx-2 rounded-[10px]' : 'gap-3 mx-2 px-3 py-2 rounded-[10px]'
                  } transition-all ${
                    isActive
                      ? 'bg-carbon/[0.04] text-carbon'
                      : 'text-carbon/35 hover:text-carbon/60 hover:bg-carbon/[0.03]'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.Icon className={`${collapsed ? 'h-4 w-4' : 'h-[15px] w-[15px]'} shrink-0`} />
                  {!collapsed && (
                    <span className="type-caption font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Pin toggle (expanded only) ── */}
          {!collapsed && (
            <button
              onClick={handleTogglePin}
              className="shrink-0 py-3 type-section text-carbon/15 hover:text-carbon/35 transition-colors border-t border-carbon/[0.06] text-center"
            >
              {pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
