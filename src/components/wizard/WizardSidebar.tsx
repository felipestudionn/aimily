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
  ChevronLeft,
  Sparkles,
  Palette,
  ShoppingBag,
  Grid3X3,
  PenTool,
  Box,
  Scissors,
  Factory,
  Megaphone,
  Rocket,
  Fingerprint,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelinePhase } from '@/types/timeline';

/* ══════════════════════════════════════════════════════════════ */

interface SidebarSubItem {
  id: string;
  label: string;
  route: string;
  icon: React.ElementType;
  phaseId?: WizardPhaseId;
}

interface SidebarBlock {
  id: TimelinePhase;
  label: string;
  route: string;
  phaseIds: WizardPhaseId[];
  subItems: SidebarSubItem[];
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'creative',
    label: 'Creative & Brand',
    route: 'creative',
    phaseIds: ['product', 'brand'],
    subItems: [
      { id: 'creative', label: 'Creative Direction', route: 'creative', icon: Sparkles, phaseId: 'product' },
      { id: 'brand', label: 'Brand Identity', route: 'brand', icon: Fingerprint, phaseId: 'brand' },
    ],
  },
  {
    id: 'planning',
    label: 'Merchandising',
    route: 'merchandising',
    phaseIds: ['merchandising'],
    subItems: [
      { id: 'merchandising', label: 'Range Planning', route: 'merchandising', icon: ShoppingBag, phaseId: 'merchandising' },
    ],
  },
  {
    id: 'development',
    label: 'Design & Dev',
    route: 'product',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    subItems: [
      { id: 'builder', label: 'Collection Builder', route: 'product', icon: Grid3X3 },
      { id: 'design', label: 'Sketch & Color', route: 'design', icon: PenTool, phaseId: 'design' },
      { id: 'prototyping', label: 'Prototyping', route: 'prototyping', icon: Box, phaseId: 'prototyping' },
      { id: 'sampling', label: 'Selection & Catalog', route: 'sampling', icon: Scissors, phaseId: 'sampling' },
      { id: 'production', label: 'Production', route: 'production', icon: Factory, phaseId: 'production' },
    ],
  },
  {
    id: 'go_to_market',
    label: 'Marketing',
    route: 'marketing/creation',
    phaseIds: ['marketing-creation', 'marketing-distribution'],
    subItems: [
      { id: 'mkt-creation', label: 'Content & Strategy', route: 'marketing/creation', icon: Megaphone, phaseId: 'marketing-creation' },
      { id: 'mkt-distribution', label: 'Distribution & Launch', route: 'marketing/distribution', icon: Rocket, phaseId: 'marketing-distribution' },
    ],
  },
];

const COLLAPSED_W = 72;
const EXPANDED_W = 272;

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
        <div className="surface-card h-full flex flex-col overflow-hidden relative">

          {/* ── Collapse toggle — clean circle chevron ── */}
          <button
            onClick={handleToggleCollapse}
            className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] flex items-center justify-center hover:shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-shadow z-10 hidden md:flex"
          >
            <ChevronLeft className={`h-3.5 w-3.5 text-carbon/50 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* ── Mobile close ── */}
          <button
            onClick={onMobileClose}
            className="md:hidden absolute right-4 top-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-carbon/[0.04] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-carbon/50" />
          </button>

          {/* ═══════════════════════════════════════════
               Collection header
               ═══════════════════════════════════════════ */}
          <div className={`shrink-0 ${collapsed ? 'px-0 pt-7 pb-6' : 'px-6 pt-7 pb-6'}`}>
            {collapsed ? (
              <Link href={basePath} className="flex items-center justify-center">
                <span className="text-[15px] font-bold text-carbon">
                  {collectionName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </Link>
            ) : (
              <>
                <Link href={basePath} className="block group">
                  <h2 className="text-[16px] font-semibold text-carbon leading-snug group-hover:text-carbon/70 transition-colors tracking-tight">
                    {displayName}
                  </h2>
                </Link>
                <p className="text-[13px] text-carbon/35 mt-1.5">
                  {season}
                  {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                    <> · {weeksLeft > 0 && <>{weeksLeft}w </>}{daysLeft}d</>
                  )}
                </p>
              </>
            )}
          </div>

          {/* ═══════════════════════════════════════════
               Block navigation
               ═══════════════════════════════════════════ */}
          <nav className="flex-1 overflow-y-auto scrollbar-subtle px-3">
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}/${block.route}`;

              return (
                <div key={block.id} className="mb-6">
                  {collapsed ? (
                    /* ── Collapsed: first sub-item icon ── */
                    <div className="flex flex-col items-center gap-2">
                      {block.subItems.slice(0, 2).map((sub) => {
                        const state = getSubItemState(sub);
                        const Icon = sub.icon;
                        return (
                          <Link
                            key={sub.id}
                            href={`${basePath}/${sub.route}`}
                            className={`w-10 h-10 flex items-center justify-center rounded-[10px] transition-all ${
                              state === 'active' ? 'bg-carbon/[0.06]'
                              : 'hover:bg-carbon/[0.04]'
                            }`}
                            title={sub.label}
                          >
                            <Icon className={`h-[18px] w-[18px] ${
                              state === 'active' ? 'text-carbon'
                              : state === 'completed' ? 'text-carbon/30'
                              : 'text-carbon/40'
                            }`} strokeWidth={1.5} />
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {/* ── Section header ── */}
                      <p className={`text-[11px] font-semibold tracking-[0.06em] uppercase px-3 mb-3 flex items-center ${
                        allLocked ? 'text-carbon/15' : 'text-carbon/30'
                      }`}>
                        <span className="truncate">{block.label}</span>
                        {allCompleted && (
                          <Check className="h-3 w-3 text-carbon/25 ml-auto shrink-0" strokeWidth={2.5} />
                        )}
                        {!allCompleted && blockProgress > 0 && (
                          <span className="text-[10px] font-normal text-carbon/20 ml-auto">{blockProgress}%</span>
                        )}
                      </p>

                      {/* ── Nav items ── */}
                      <div className="flex flex-col gap-0.5">
                        {block.subItems.map((sub) => {
                          const state = getSubItemState(sub);
                          const subHref = `${basePath}/${sub.route}`;
                          const isLocked = state === 'locked';
                          const Icon = sub.icon;

                          return (
                            <Link
                              key={sub.id}
                              href={isLocked ? '#' : subHref}
                              onClick={(e) => { if (isLocked) e.preventDefault(); }}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all ${
                                state === 'active'
                                  ? 'bg-carbon/[0.06]'
                                  : state === 'locked'
                                  ? 'opacity-25 cursor-not-allowed'
                                  : 'hover:bg-carbon/[0.04]'
                              }`}
                            >
                              <Icon className={`h-[18px] w-[18px] shrink-0 ${
                                state === 'active' ? 'text-carbon'
                                : state === 'completed' ? 'text-carbon/35'
                                : 'text-carbon/40'
                              }`} strokeWidth={1.5} />

                              <span className={`text-[14px] truncate transition-colors ${
                                state === 'active' ? 'font-semibold text-carbon'
                                : state === 'completed' ? 'font-normal text-carbon/40'
                                : 'font-medium text-carbon/70'
                              }`}>
                                {sub.label}
                              </span>

                              {state === 'completed' && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-carbon/25 ml-auto" strokeWidth={2} />
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

          {/* ═══════════════════════════════════════════
               Utilities
               ═══════════════════════════════════════════ */}
          <div className="shrink-0 px-3 pb-4">
            <div className="border-t border-carbon/[0.06] pt-3">
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
                      collapsed ? 'justify-center h-10 rounded-[10px]' : 'gap-3 px-3 py-2.5 rounded-[10px]'
                    } transition-all ${
                      isActive
                        ? 'bg-carbon/[0.06] text-carbon'
                        : 'text-carbon/40 hover:text-carbon/70 hover:bg-carbon/[0.04]'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.Icon className={`h-[18px] w-[18px] shrink-0`} strokeWidth={1.5} />
                    {!collapsed && (
                      <span className={`text-[14px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
