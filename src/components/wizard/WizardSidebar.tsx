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

/* ══════════════════════════════════════════════════════════════
   Sidebar data model — maps to REAL page content

   Every subItem.route matches an existing Next.js route.
   subItem.hint describes what the user will find on that page.
   phaseId links to wizard-phases.ts for milestone tracking.
   ══════════════════════════════════════════════════════════════ */

interface SidebarSubItem {
  id: string;
  label: string;
  route: string;
  phaseId?: WizardPhaseId;
  hint?: string;
}

interface SidebarBlock {
  id: TimelinePhase;
  number: string;
  label: string;
  route: string;
  phaseIds: WizardPhaseId[];
  subItems: SidebarSubItem[];
}

/*
  Route reality:
  /creative         → 3-step flow: Vision (consumer, vibe, moodboard, brand-dna),
                      Research (trends, competitors), Synthesis
  /brand            → Brand workspace: Profile (naming, story, voice, audience),
                      Visual Identity (colors, typography), Packaging
  /merchandising    → 4 cards: Families, Pricing, Channels, Budget
  /product          → Collection Builder (SKU grid + range plan hub)
  /design           → Sketch & Color workspace
  /prototyping      → Prototyping workspace
  /sampling         → Selection & Catalog workspace
  /production       → Production & Logistics workspace
  /marketing/creation     → 4 cards: Sales Dashboard, Content Studio, Comms, POS
  /marketing/distribution → 4 cards: GTM plan, Content Calendar, Paid Growth, Launch
*/

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'creative',
    number: '01',
    label: 'Creative & Brand',
    route: 'creative',
    phaseIds: ['product', 'brand'],
    subItems: [
      { id: 'creative', label: 'Creative Direction', route: 'creative', phaseId: 'product', hint: 'Consumer · Vibe · Moodboard · Trends' },
      { id: 'brand', label: 'Brand Identity', route: 'brand', phaseId: 'brand', hint: 'Profile · Visual · Packaging' },
    ],
  },
  {
    id: 'planning',
    number: '02',
    label: 'Merchandising',
    route: 'merchandising',
    phaseIds: ['merchandising'],
    subItems: [
      { id: 'merchandising', label: 'Range Planning', route: 'merchandising', phaseId: 'merchandising', hint: 'Families · Pricing · Channels · Budget' },
    ],
  },
  {
    id: 'development',
    number: '03',
    label: 'Design & Dev',
    route: 'product',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    subItems: [
      { id: 'builder', label: 'Collection Builder', route: 'product', hint: 'SKU grid · Range plan' },
      { id: 'design', label: 'Sketch & Color', route: 'design', phaseId: 'design' },
      { id: 'prototyping', label: 'Prototyping', route: 'prototyping', phaseId: 'prototyping' },
      { id: 'sampling', label: 'Selection & Catalog', route: 'sampling', phaseId: 'sampling' },
      { id: 'production', label: 'Production', route: 'production', phaseId: 'production' },
    ],
  },
  {
    id: 'go_to_market',
    number: '04',
    label: 'Marketing',
    route: 'marketing/creation',
    phaseIds: ['marketing-creation', 'marketing-distribution'],
    subItems: [
      { id: 'mkt-creation', label: 'Content & Strategy', route: 'marketing/creation', phaseId: 'marketing-creation', hint: 'Sales · Studio · Comms · POS' },
      { id: 'mkt-distribution', label: 'Distribution & Launch', route: 'marketing/distribution', phaseId: 'marketing-distribution', hint: 'GTM · Calendar · Paid · Launch' },
    ],
  },
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
  const { milestones } = useTimeline();
  const { phases } = useWizardState(milestones);
  const [pinned, setPinned] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collapsed = !pinned && !hoverExpanded;

  const basePath = `/collection/${collectionId}`;
  const phaseMap = new Map(phases.map((ps) => [ps.phase.id, ps]));

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
    if (pathname?.startsWith(`${basePath}/${block.route}`)) return true;
    return block.subItems.some(sub => {
      const subPath = `${basePath}/${sub.route}`;
      return pathname === subPath || pathname?.startsWith(`${subPath}/`);
    });
  }

  function isSubItemActive(sub: SidebarSubItem): boolean {
    const subPath = `${basePath}/${sub.route}`;
    return pathname === subPath || pathname?.startsWith(`${subPath}/`) || false;
  }

  function getSubItemState(sub: SidebarSubItem): 'active' | 'completed' | 'locked' | 'available' {
    if (isSubItemActive(sub)) return 'active';
    if (!sub.phaseId) return 'available';
    const ps = phaseMap.get(sub.phaseId);
    if (!ps) return 'available';
    if (ps.state === 'completed') return 'completed';
    if (ps.state === 'locked') return 'locked';
    return 'available';
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

  /* ── Utility links ── */
  const utilityLinks = [
    { id: 'calendar', path: '/calendar', label: 'Calendar', Icon: CalendarDays },
    { id: 'presentation', path: '/presentation', label: 'Presentation', Icon: Presentation },
    { id: 'overview', path: '', label: 'Dashboard', Icon: LayoutDashboard },
  ];

  return (
    <>
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
          <div className={`shrink-0 ${collapsed ? 'px-0 pt-5 pb-4' : 'px-5 pt-6 pb-5'}`}>
            {collapsed ? (
              <Link href={basePath} className="flex items-center justify-center">
                <span className="type-label text-carbon/30">
                  {collectionName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </Link>
            ) : (
              <>
                <Link href={basePath} className="block group">
                  <h2 className="font-display text-[18px] text-carbon truncate group-hover:text-carbon/70 transition-colors leading-tight">
                    {displayName}
                  </h2>
                </Link>
                <div className="flex items-center gap-2 mt-1.5">
                  {season && (
                    <span className="type-caption text-carbon/25">{season}</span>
                  )}
                  {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                    <span className="type-caption text-carbon/20">
                      {weeksLeft > 0 && <>{weeksLeft}w </>}{daysLeft}d
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Block Navigation ── */}
          <nav className="flex-1 overflow-y-auto scrollbar-subtle">
            {SIDEBAR_BLOCKS.map((block, blockIdx) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}/${block.route}`;

              return (
                <div key={block.id}>
                  {/* ── Block separator (between blocks, not before first) ── */}
                  {blockIdx > 0 && (
                    <div className={`${collapsed ? 'mx-3' : 'mx-5'} border-t border-carbon/[0.05] my-2`} />
                  )}

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
                      <span className={`text-[12px] font-bold tabular-nums transition-colors ${
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
                    /* ── Expanded: block header + sub-items ── */
                    <>
                      {/* ── Block header: SECTION level ── */}
                      <div className={`flex items-center gap-2.5 px-5 pt-3 pb-1.5 ${
                        allLocked ? 'opacity-25' : ''
                      }`}>
                        <span className={`text-[11px] font-bold tabular-nums shrink-0 ${
                          blockActive ? 'text-carbon/40' : 'text-carbon/15'
                        }`}>
                          {block.number}
                        </span>

                        <Link
                          href={allLocked ? '#' : blockHref}
                          onClick={(e) => { if (allLocked) e.preventDefault(); }}
                          className={`type-section flex-1 truncate transition-colors ${
                            allLocked ? '!text-carbon/15'
                            : blockActive ? '!text-carbon/50'
                            : '!text-carbon/25 hover:!text-carbon/40'
                          }`}
                        >
                          {block.label}
                        </Link>

                        {allCompleted ? (
                          <Check className="h-3 w-3 text-carbon/20 shrink-0" strokeWidth={2} />
                        ) : blockProgress > 0 ? (
                          <span className="text-[11px] font-normal tabular-nums text-carbon/15 shrink-0">
                            {blockProgress}
                          </span>
                        ) : null}
                      </div>

                      {/* ── Sub-items ── */}
                      <div className="flex flex-col gap-0.5 mx-2 mb-1">
                        {block.subItems.map((sub) => {
                          const state = getSubItemState(sub);
                          const subHref = `${basePath}/${sub.route}`;
                          const isLocked = state === 'locked';

                          return (
                            <Link
                              key={sub.id}
                              href={isLocked ? '#' : subHref}
                              onClick={(e) => { if (isLocked) e.preventDefault(); }}
                              className={`group flex flex-col px-3 py-2 rounded-[8px] transition-all ${
                                state === 'active'
                                  ? 'bg-carbon text-white'
                                  : state === 'completed'
                                  ? 'text-carbon/40 hover:bg-carbon/[0.03] hover:text-carbon/55'
                                  : state === 'locked'
                                  ? 'text-carbon/20 cursor-not-allowed'
                                  : 'text-carbon/60 hover:bg-carbon/[0.03] hover:text-carbon/75'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-[13px] font-medium truncate flex-1 leading-snug ${
                                  state === 'active' ? 'text-white' : ''
                                }`}>
                                  {sub.label}
                                </span>
                                {state === 'completed' && (
                                  <Check className="h-3 w-3 shrink-0 text-carbon/20" strokeWidth={2} />
                                )}
                              </div>
                              {sub.hint && (
                                <span className={`text-[11px] font-normal leading-tight mt-0.5 truncate ${
                                  state === 'active' ? 'text-white/40' : 'text-carbon/20'
                                }`}>
                                  {sub.hint}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ── Bottom: utilities ── */}
          <div className="shrink-0">
            <div className={`${collapsed ? 'mx-3' : 'mx-5'} border-t border-carbon/[0.06]`} />
            <div className="py-3">
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

            {/* Pin toggle */}
            {!collapsed && (
              <button
                onClick={handleTogglePin}
                className="w-full shrink-0 py-3 type-section text-carbon/15 hover:text-carbon/35 transition-colors border-t border-carbon/[0.06] text-center"
              >
                {pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
