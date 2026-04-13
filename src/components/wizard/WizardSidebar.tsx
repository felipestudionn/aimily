'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
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
   Route reality — every route maps to what the user SEES:

   /creative         → Creative Direction (consumer, vibe, moodboard, trends)
   /brand            → Brand Identity (profile, visual, packaging)
   /merchandising    → Range Planning (families, pricing, channels, budget)
   /product          → Collection Builder (SKU grid)
   /design           → Sketch & Color
   /prototyping      → Prototyping
   /sampling         → Selection & Catalog
   /production       → Production
   /marketing/creation     → Content & Strategy (sales, studio, comms, POS)
   /marketing/distribution → Distribution & Launch (GTM, calendar, paid, launch)
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
const EXPANDED_W = 260;

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
  const [collapsed, setCollapsed] = useState(false);

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

  const handleToggleCollapse = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapsedChange?.(next);
  }, [collapsed, onCollapsedChange]);

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
        style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        className={`fixed left-0 top-0 bottom-0 z-50 p-3 transition-[width] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="surface-card h-full flex flex-col overflow-hidden">

          <button
            onClick={onMobileClose}
            className="md:hidden absolute right-3 top-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-carbon/[0.04] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-carbon/50" />
          </button>

          {/* ══════════════════════════════════════════════
               Collection name — the biggest text element
               ══════════════════════════════════════════════ */}
          <div className={`shrink-0 ${collapsed ? 'px-0 pt-6 pb-5' : 'px-6 pt-6 pb-5'}`}>
            {collapsed ? (
              <Link href={basePath} className="flex items-center justify-center">
                <span className="text-[14px] font-bold text-carbon/50">
                  {collectionName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </Link>
            ) : (
              <>
                <Link href={basePath} className="block group">
                  <h2 className="font-display text-[20px] text-carbon leading-tight group-hover:text-carbon/70 transition-colors">
                    {displayName}
                  </h2>
                </Link>
                <div className="flex items-center gap-2 mt-2">
                  {season && (
                    <span className="text-[12px] text-carbon/40">{season}</span>
                  )}
                  {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                    <span className="text-[12px] text-carbon/30">
                      · {weeksLeft > 0 && <>{weeksLeft}w </>}{daysLeft}d
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ══════════════════════════════════════════════
               Navigation — blocks are BOLD, sub-items are medium
               ══════════════════════════════════════════════ */}
          <nav className="flex-1 overflow-y-auto scrollbar-subtle">
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}/${block.route}`;

              return (
                <div key={block.id} className="mb-1">
                  {collapsed ? (
                    <Link
                      href={allLocked ? '#' : blockHref}
                      onClick={(e) => { if (allLocked) e.preventDefault(); }}
                      className={`relative flex items-center justify-center h-12 mx-1 rounded-[12px] transition-all ${
                        allLocked ? 'cursor-not-allowed opacity-30'
                        : blockActive ? 'bg-carbon/[0.05]'
                        : 'hover:bg-carbon/[0.03]'
                      }`}
                      title={block.label}
                    >
                      <span className={`text-[13px] font-semibold truncate transition-colors ${
                        blockActive ? 'text-carbon' : 'text-carbon/40'
                      }`}>
                        {block.label.split(' ')[0].charAt(0)}
                      </span>
                      {allCompleted && (
                        <Check className="h-3 w-3 text-carbon/30 absolute bottom-1.5" strokeWidth={2.5} />
                      )}
                    </Link>
                  ) : (
                    <>
                      {/* ── BLOCK HEADER: the most prominent level ── */}
                      <Link
                        href={allLocked ? '#' : blockHref}
                        onClick={(e) => { if (allLocked) e.preventDefault(); }}
                        className={`flex items-center px-6 pt-5 pb-2 transition-colors ${
                          allLocked ? 'opacity-30 cursor-not-allowed' : 'group'
                        }`}
                      >
                        <span className={`text-[15px] font-semibold tracking-[-0.01em] truncate flex-1 transition-colors ${
                          allCompleted ? 'text-carbon/40'
                          : blockActive ? 'text-carbon'
                          : 'text-carbon/70 group-hover:text-carbon'
                        }`}>
                          {block.label}
                        </span>
                        {allCompleted ? (
                          <Check className="h-3.5 w-3.5 text-carbon/30 shrink-0" strokeWidth={2} />
                        ) : blockProgress > 0 ? (
                          <span className="text-[12px] font-normal tabular-nums text-carbon/25 shrink-0">
                            {blockProgress}
                          </span>
                        ) : null}
                      </Link>

                      {/* ── SUB-ITEMS: secondary level, clearly nested ── */}
                      <div className="flex flex-col gap-px px-3 pb-2">
                        {block.subItems.map((sub) => {
                          const state = getSubItemState(sub);
                          const subHref = `${basePath}/${sub.route}`;
                          const isLocked = state === 'locked';

                          return (
                            <Link
                              key={sub.id}
                              href={isLocked ? '#' : subHref}
                              onClick={(e) => { if (isLocked) e.preventDefault(); }}
                              className={`group/item flex flex-col px-3 py-2 rounded-[10px] transition-all ${
                                state === 'active'
                                  ? 'bg-carbon'
                                  : state === 'locked'
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-carbon/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-[14px] font-medium truncate flex-1 transition-colors ${
                                  state === 'active' ? 'text-white'
                                  : state === 'completed' ? 'text-carbon/50'
                                  : 'text-carbon/80 group-hover/item:text-carbon'
                                }`}>
                                  {sub.label}
                                </span>
                                {state === 'completed' && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-carbon/25" strokeWidth={2} />
                                )}
                              </div>
                              {sub.hint && (
                                <span className={`text-[12px] leading-tight mt-0.5 truncate ${
                                  state === 'active' ? 'text-white/50'
                                  : 'text-carbon/30'
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

          {/* ══════════════════════════════════════════════
               Utilities
               ══════════════════════════════════════════════ */}
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
                      collapsed ? 'justify-center h-10 mx-2 rounded-[10px]' : 'gap-3 mx-2 px-4 py-2 rounded-[10px]'
                    } transition-all ${
                      isActive
                        ? 'bg-carbon/[0.05] text-carbon'
                        : 'text-carbon/40 hover:text-carbon/70 hover:bg-carbon/[0.03]'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.Icon className={`${collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4'} shrink-0`} />
                    {!collapsed && (
                      <span className="text-[13px] font-medium">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={handleToggleCollapse}
              className="w-full shrink-0 py-3 text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/20 hover:text-carbon/40 transition-colors border-t border-carbon/[0.06] text-center"
            >
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
