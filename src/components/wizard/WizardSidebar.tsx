'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Lock,
  Check,
  ChevronDown,
  Loader2,
  Palette,
  ShoppingBag,
  Grid3X3,
  Megaphone,
  Presentation,
  FolderOpen,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelinePhase } from '@/types/timeline';

/* ── Block definitions ── */
interface SidebarBlock {
  id: TimelinePhase;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  route: string;
  phaseIds: WizardPhaseId[];
  showSubItems: boolean;
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  { id: 'creative', label: 'Creative & Brand', shortLabel: 'Creative', icon: Palette, route: 'creative', phaseIds: ['product', 'brand'], showSubItems: false },
  { id: 'planning', label: 'Merchandising & Planning', shortLabel: 'Merch', icon: ShoppingBag, route: 'merchandising', phaseIds: ['merchandising'], showSubItems: false },
  { id: 'development', label: 'Collection Builder', shortLabel: 'Builder', icon: Grid3X3, route: 'product', phaseIds: ['design', 'prototyping', 'sampling', 'production'], showSubItems: false },
  { id: 'go_to_market', label: 'Marketing & Digital', shortLabel: 'Marketing', icon: Megaphone, route: 'marketing/creation', phaseIds: ['marketing-creation', 'marketing-distribution'], showSubItems: false },
];

const COLLAPSED_W = 52;
const EXPANDED_W = 200;

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
  const { milestones, saving } = useTimeline();
  const { phases } = useWizardState(milestones);
  const [pinned, setPinned] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collapsed = !pinned && !hoverExpanded;

  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

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

  function toggleBlock(blockId: TimelinePhase) {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }

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

  return (
    <>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onMobileClose} />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        className={`fixed left-0 top-0 bottom-0 bg-carbon z-50 transition-[width,transform] duration-200 ease-out flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* ── Logo ── */}
        <div className="shrink-0 flex items-center justify-center overflow-hidden" style={{ height: collapsed ? 120 : 56 }}>
          <Link href="/my-collections" className="flex items-center justify-center hover:opacity-70 transition-opacity">
            {collapsed ? (
              /* Logo rotated -90° (reads bottom-to-top) */
              <img
                src="/images/aimily-logo-white.png"
                alt="aimily"
                className="h-5 w-auto -rotate-90"
              />
            ) : (
              <div className="flex items-center gap-3 px-5 w-full">
                <img src="/images/aimily-logo-white.png" alt="aimily" className="h-5 w-auto" />
                {saving && <Loader2 className="h-2.5 w-2.5 text-white/30 animate-spin ml-auto" />}
              </div>
            )}
          </Link>

          <button onClick={onMobileClose} className="md:hidden absolute right-2 top-4 w-6 h-6 flex items-center justify-center text-white/60 hover:text-white" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Collection header (expanded only) ── */}
        {!collapsed && (
          <div className="px-5 pb-4 shrink-0">
            <h2 className="text-[11px] font-medium text-white/80 tracking-tight leading-tight truncate">
              {displayName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {season && (
                <span className="text-[10px] text-white/25 tracking-[0.1em] uppercase">{season}</span>
              )}
              {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                <span className="text-[10px] text-white/20">
                  {weeksLeft > 0 && <>{weeksLeft}w </>}{daysLeft}d
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Separator ── */}
        <div className="mx-3 border-t border-white/[0.06] shrink-0" />

        {/* ── Block Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {SIDEBAR_BLOCKS.map((block) => {
            const blockActive = isBlockActive(block);
            const blockProgress = getBlockProgress(block);
            const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
            // Builder is never locked from sidebar — the page itself handles empty state
            const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
            const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
            const blockHref = `${basePath}/${block.route}`;
            const Icon = block.icon;
            const isExpanded = expandedBlocks.has(block.id);

            return (
              <div key={block.id} className="mb-0.5">
                {collapsed ? (
                  /* ── Collapsed: icon only ── */
                  <Link
                    href={allLocked ? '#' : blockHref}
                    onClick={(e) => { if (allLocked) e.preventDefault(); }}
                    className={`relative flex items-center justify-center h-10 transition-all ${
                      allLocked ? 'cursor-not-allowed' : 'group'
                    }`}
                    title={block.shortLabel}
                  >
                    {/* Active indicator — thin left bar */}
                    {blockActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-white/80 rounded-r-full" />
                    )}

                    <Icon className={`h-[17px] w-[17px] transition-colors ${
                      allLocked ? 'text-white/30'
                        : allCompleted ? 'text-white/70'
                        : blockActive ? 'text-white'
                        : 'text-white/50 group-hover:text-white/75'
                    }`} />
                  </Link>
                ) : (
                  /* ── Expanded: full row ── */
                  <>
                    <div className={`relative flex items-center gap-3 px-5 py-2 transition-all ${
                      blockActive ? 'text-white' : allLocked ? 'text-white/25' : 'text-white/55 hover:text-white/75'
                    }`}>
                      {blockActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-white/80 rounded-r-full" />
                      )}

                      <Icon className={`h-[15px] w-[15px] shrink-0 ${
                        allLocked ? 'text-white/20'
                          : allCompleted ? 'text-white/60'
                          : blockActive ? 'text-white' : ''
                      }`} />

                      <Link
                        href={allLocked ? '#' : blockHref}
                        onClick={(e) => { if (allLocked) e.preventDefault(); }}
                        className="text-[11px] font-medium tracking-[0.04em] uppercase flex-1 truncate hover:text-white transition-colors"
                      >
                        {block.shortLabel}
                      </Link>

                      {!allLocked && blockProgress > 0 && (
                        <span className="text-[9px] text-white/20 tabular-nums">{blockProgress}%</span>
                      )}

                      {allCompleted && (
                        <Check className="h-3 w-3 text-white/40" strokeWidth={2} />
                      )}

                      {block.showSubItems && !allCompleted && (
                        <button onClick={() => toggleBlock(block.id)} className="p-0.5 hover:bg-white/[0.05] rounded transition-colors">
                          <ChevronDown className={`h-2.5 w-2.5 text-white/15 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </button>
                      )}
                    </div>

                    {/* Sub-items */}
                    {block.showSubItems && isExpanded && (
                      <div className="pb-0.5">
                        {blockPhases.map((ps) => {
                          const isLocked = ps.state === 'locked';
                          const isCompleted = ps.state === 'completed';
                          const phasePath = `${basePath}/${ps.phase.path}`;
                          const isActive = pathname?.startsWith(phasePath);

                          return (
                            <Link
                              key={ps.phase.id}
                              href={isLocked ? '#' : phasePath}
                              onClick={(e) => { if (isLocked) e.preventDefault(); }}
                              className={`flex items-center gap-2 pl-[52px] pr-5 py-1.5 transition-all text-[10px] tracking-wide ${
                                isActive ? 'text-white/80' : isLocked ? 'text-white/20' : 'text-white/40 hover:text-white/60'
                              }`}
                            >
                              <div className="flex-shrink-0 w-2 flex justify-center">
                                {isLocked ? (
                                  <Lock className="h-2 w-2" />
                                ) : isCompleted ? (
                                  <Check className="h-2.5 w-2.5" strokeWidth={2} />
                                ) : (
                                  <div className={`h-[3px] w-[3px] rounded-full ${isActive ? 'bg-white/80' : 'bg-current'}`} />
                                )}
                              </div>
                              <span className="truncate">{ps.phase.name}</span>
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

        {/* ── Bottom: Calendar + Overview ── */}
        <div className="shrink-0">
          <div className="mx-3 border-t border-white/[0.06]" />
          <div className="py-2">
            {[
              { id: 'presentation', path: '/presentation', label: 'Presentation', Icon: Presentation },
              { id: 'calendar', path: '/calendar', label: 'Calendar', Icon: CalendarDays },
              { id: 'overview', path: '', label: 'Overview', Icon: LayoutDashboard },
            ].map((item) => {
              const fullPath = `${basePath}${item.path}`;
              const isActive = item.path === '' ? pathname === basePath || pathname === `${basePath}/` : pathname?.startsWith(fullPath);
              return (
                <Link key={item.id} href={fullPath}
                  className={`relative flex items-center ${collapsed ? 'justify-center h-10' : 'gap-3 px-5 py-2'} transition-all text-[11px] tracking-wide ${
                    isActive ? 'text-white/80' : 'text-white/40 hover:text-white/60'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-white/80 rounded-r-full" />
                  )}
                  <item.Icon className={`${collapsed ? 'h-[17px] w-[17px]' : 'h-[15px] w-[15px]'} shrink-0`} />
                  {!collapsed && <span className="font-medium tracking-[0.04em] uppercase">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── My Collections link ── */}
        <div className="shrink-0">
          <div className="mx-3 border-t border-white/[0.06]" />
          <Link
            href="/my-collections"
            className={`relative flex items-center ${collapsed ? 'justify-center h-10' : 'gap-3 px-5 py-2.5'} transition-all text-[11px] tracking-wide text-white/30 hover:text-white/55`}
            title={collapsed ? 'My Collections' : undefined}
          >
            <FolderOpen className={`${collapsed ? 'h-[17px] w-[17px]' : 'h-[15px] w-[15px]'} shrink-0`} />
            {!collapsed && <span className="font-medium tracking-[0.04em] uppercase">Collections</span>}
          </Link>
        </div>

        {/* ── Pin toggle (expanded only) ── */}
        {!collapsed && (
          <button
            onClick={handleTogglePin}
            className="shrink-0 py-3 text-[9px] text-white/15 hover:text-white/35 tracking-[0.12em] uppercase transition-colors border-t border-white/[0.04]"
          >
            {pinned ? 'Unpin' : 'Pin'}
          </button>
        )}
      </aside>
    </>
  );
}
