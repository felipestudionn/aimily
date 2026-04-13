'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Check,
  ArrowRight,
  Presentation,
  X,
  ChevronLeft,
  ChevronDown,
  Feather,
  ClipboardList,
  Ruler,
  Megaphone,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import { useSkus } from '@/hooks/useSkus';
import { useWorkspaceNavigationOptional } from '@/components/workspace/workspace-context';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelinePhase } from '@/types/timeline';

/* ══════════════════════════════════════════════════════════════
   Sidebar data model

   Every sub-item maps to a REAL existing route.
   Items sharing a route = they live on the same page.
   phaseId = milestone tracking from wizard-phases.ts.
   ══════════════════════════════════════════════════════════════ */

interface SidebarSubItem {
  id: string;
  label: string;
  route: string;
  phaseId?: WizardPhaseId;
  isOutput?: boolean;      // true = consolidation step (shows → instead of ✓)
}

interface SidebarBlock {
  id: TimelinePhase;
  label: string;
  icon: React.ElementType;  // shown only in collapsed state
  route: string;
  phaseIds: WizardPhaseId[];
  subItems: SidebarSubItem[];
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'creative',
    label: 'Creative Direction',
    icon: Feather,
    route: 'creative',
    phaseIds: ['product', 'brand'],
    subItems: [
      { id: 'consumer', label: 'Consumer', route: 'creative?block=consumer', phaseId: 'product' },
      { id: 'moodboard-research', label: 'Moodboard & Research', route: 'creative?block=moodboard', phaseId: 'product' },
      { id: 'brand-identity', label: 'Brand Identity', route: 'brand', phaseId: 'brand' },
      { id: 'creative-overview', label: 'Creative Overview', route: 'creative', isOutput: true },
    ],
  },
  {
    id: 'planning',
    label: 'Merchandising & Planning',
    icon: ClipboardList,
    route: 'merchandising',
    phaseIds: ['merchandising'],
    subItems: [
      { id: 'families-pricing', label: 'Families & Pricing', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'channels', label: 'Channels & Markets', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'budget', label: 'Budget & Financials', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'builder-merch', label: 'Collection Builder', route: 'product', isOutput: true },
    ],
  },
  {
    id: 'development',
    label: 'Design & Development',
    icon: Ruler,
    route: 'product',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    subItems: [
      { id: 'sketch', label: 'Sketch & Color', route: 'product?phase=sketch', phaseId: 'design' },
      { id: 'prototyping', label: 'Prototyping', route: 'product?phase=prototyping', phaseId: 'prototyping' },
      { id: 'production', label: 'Production', route: 'product?phase=production', phaseId: 'production' },
      { id: 'final-selection', label: 'Final Selection', route: 'product?phase=selection', phaseId: 'sampling' },
    ],
  },
  {
    id: 'go_to_market',
    label: 'Marketing & Sales',
    icon: Megaphone,
    route: 'marketing/creation',
    phaseIds: ['marketing-creation', 'marketing-distribution'],
    subItems: [
      { id: 'sales', label: 'Sales Dashboard', route: 'marketing/creation', phaseId: 'marketing-creation' },
      { id: 'content-studio', label: 'Content Studio', route: 'marketing/creation', phaseId: 'marketing-creation' },
      { id: 'communications', label: 'Communications', route: 'marketing/creation', phaseId: 'marketing-creation' },
      { id: 'pos', label: 'Point of Sale', route: 'marketing/creation', phaseId: 'marketing-creation' },
    ],
  },
];

const COLLAPSED_W = 72;
const EXPANDED_W = 340;

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
  mobileOpen = false,
  onMobileClose,
  onCollapsedChange,
}: WizardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { milestones } = useTimeline();
  const { phases } = useWizardState(milestones);
  const workspaceNav = useWorkspaceNavigationOptional();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

  const basePath = `/collection/${collectionId}`;

  /* ── SKU phase counts for Design badges ── */
  const { skus } = useSkus(collectionId);
  const skuPhaseCounts = useMemo(() => {
    const counts: Record<string, number> = { sketch: 0, prototyping: 0, production: 0, 'final-selection': 0 };
    for (const sku of skus) {
      const phase = sku.design_phase || 'range_plan';
      if (phase === 'range_plan' || phase === 'sketch') counts.sketch++;
      if (phase === 'prototyping') counts.prototyping++;
      if (phase === 'production') counts.production++;
      if (phase === 'production' || phase === 'completed') counts['final-selection']++;
    }
    return counts;
  }, [skus]);
  const phaseMap = new Map(phases.map((ps) => [ps.phase.id, ps]));

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

  /* Route matching helpers — handle routes with query params (e.g. product?phase=sketch) */
  function getRoutePath(route: string): string {
    return route.split('?')[0];
  }
  function getRouteParam(route: string, key: string): string | null {
    const qIdx = route.indexOf('?');
    if (qIdx < 0) return null;
    const params = new URLSearchParams(route.slice(qIdx));
    return params.get(key);
  }

  function isBlockActive(block: SidebarBlock): boolean {
    const blockPath = getRoutePath(block.route);
    if (pathname?.startsWith(`${basePath}/${blockPath}`)) return true;
    return block.subItems.some(sub => {
      const subPath = `${basePath}/${getRoutePath(sub.route)}`;
      return pathname === subPath || pathname?.startsWith(`${subPath}/`);
    });
  }

  function isSubItemActive(sub: SidebarSubItem, block: SidebarBlock): boolean {
    const subRoutePath = getRoutePath(sub.route);
    const subPath = `${basePath}/${subRoutePath}`;
    const onThisRoute = pathname === subPath || pathname?.startsWith(`${subPath}/`) || false;
    if (!onThisRoute) return false;

    // Check query param match for routes like product?phase=sketch
    const expectedPhase = getRouteParam(sub.route, 'phase');
    if (expectedPhase) {
      return searchParams?.get('phase') === expectedPhase;
    }

    // If no query param, only highlight if no other sub-item with query param matches
    const currentPhase = searchParams?.get('phase');
    if (currentPhase) {
      // A phase param is set but this sub-item doesn't have one — not active
      return false;
    }

    // No phase param on URL and no phase param on sub-item — first match wins
    const firstWithSameRoute = block.subItems.find(s => getRoutePath(s.route) === subRoutePath && !getRouteParam(s.route, 'phase'));
    return firstWithSameRoute?.id === sub.id;
  }

  function getSubItemState(sub: SidebarSubItem, block: SidebarBlock): 'active' | 'completed' | 'locked' | 'available' {
    if (isSubItemActive(sub, block)) return 'active';

    // Design phase filters (with ?phase=) are never locked — they're just Builder views
    const hasPhaseParam = getRouteParam(sub.route, 'phase');
    if (hasPhaseParam) return 'available';

    if (!sub.phaseId) return 'available';
    const ps = phaseMap.get(sub.phaseId);
    if (!ps) return 'available';
    if (ps.state === 'completed') return 'completed';
    if (ps.state === 'locked') return 'locked';
    return 'available';
  }

  function toggleBlock(blockId: TimelinePhase) {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
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
        {/* ── Collapse button — bottom edge, not confused with "back" ── */}
        <button
          onClick={handleToggleCollapse}
          className="absolute -right-1 bottom-8 w-8 h-8 rounded-full bg-carbon flex items-center justify-center hover:bg-carbon/85 transition-colors z-[51] hidden md:flex shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        >
          <ChevronLeft className={`h-4 w-4 text-white transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="surface-card h-full flex flex-col overflow-hidden relative">

          {/* ── Mobile close ── */}
          <button
            onClick={onMobileClose}
            className="md:hidden absolute right-4 top-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-carbon/[0.04] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-carbon/50" />
          </button>

          {/* ═══════════════════════════════════════════
               Header: aimily logo + collection name
               ═══════════════════════════════════════════ */}
          <div className={`shrink-0 ${collapsed ? 'px-0 pt-7 pb-5' : 'px-5 pt-7 pb-6'}`}>
            {collapsed ? (
              <Link href="/my-collections" className="flex items-center justify-center">
                <Image
                  src="/images/aimily-logo-black.png"
                  alt="aimily"
                  width={774}
                  height={96}
                  className="opacity-60"
                  style={{ width: 'auto', height: '14px', transform: 'rotate(-90deg)' }}
                  unoptimized
                />
              </Link>
            ) : (
              <>
                <Link href="/my-collections" className="block mb-5">
                  <Image
                    src="/images/aimily-logo-black.png"
                    alt="aimily"
                    width={774}
                    height={96}
                    className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity"
                    unoptimized
                  />
                </Link>
                <Link href={basePath} className="block group">
                  <p className="text-[13px] font-medium text-carbon transition-colors truncate">
                    {displayName}
                  </p>
                </Link>
              </>
            )}
          </div>

          {/* ── Separator ── */}
          <div className={`${collapsed ? 'mx-3' : 'mx-5'} border-t border-carbon/[0.12] shrink-0`} />

          {/* ═══════════════════════════════════════════
               Block navigation — Hioline style
               Bold headers, no icons, generous space
               ═══════════════════════════════════════════ */}
          <nav className={`flex-1 overflow-y-auto scrollbar-subtle pt-6 ${collapsed ? 'px-2 flex flex-col items-center' : 'px-6'}`}>
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}?block=${block.id}`;
              const isExpanded = expandedBlocks.has(block.id);

              const handleBlockNav = (e: React.MouseEvent) => {
                if (allLocked) { e.preventDefault(); return; }
                if (workspaceNav) {
                  e.preventDefault();
                  workspaceNav.navigateToSubDashboard(block.id);
                }
              };

              return (
                <div key={block.id} className="mb-5">
                  {collapsed ? (
                    <Link
                      href={allLocked ? '#' : blockHref}
                      onClick={handleBlockNav}
                      className={`w-10 h-10 flex items-center justify-center rounded-[10px] transition-all ${
                        allLocked ? 'opacity-25 cursor-not-allowed'
                        : blockActive ? 'bg-carbon/[0.08]'
                        : 'hover:bg-carbon/[0.04]'
                      }`}
                      title={block.label}
                    >
                      <block.icon className={`h-[18px] w-[18px] ${
                        blockActive ? 'text-carbon' : 'text-carbon/50'
                      }`} strokeWidth={1.5} />
                    </Link>
                  ) : (
                    <>
                      {/* ── Block header: label navigates, chevron toggles ── */}
                      <div className={`flex items-center justify-between px-4 py-2.5 rounded-full mb-3 transition-colors ${
                        allLocked ? 'opacity-25'
                        : 'bg-carbon/[0.04]'
                      }`}>
                        <Link
                          href={allLocked ? '#' : blockHref}
                          onClick={handleBlockNav}
                          className={`text-[15px] font-bold tracking-[-0.01em] flex-1 truncate transition-colors ${
                            allLocked ? 'text-carbon/30 cursor-not-allowed'
                            : 'text-carbon'
                          }`}
                        >
                          {block.label}
                        </Link>

                        <button
                          onClick={() => !allLocked && toggleBlock(block.id)}
                          className={`ml-2 p-1 rounded-full transition-colors shrink-0 ${
                            allLocked ? 'cursor-not-allowed' : 'hover:bg-carbon/[0.06]'
                          }`}
                        >
                          <ChevronDown className={`h-4 w-4 text-carbon/60 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`} />
                        </button>
                      </div>

                      {/* ── Sub-items with connector line ── */}
                      {isExpanded && (
                        <div className="ml-1 pl-5 border-l border-carbon/[0.15] flex flex-col">
                          {block.subItems.map((sub) => {
                            const state = getSubItemState(sub, block);
                            const subHref = `${basePath}/${sub.route}`;
                            const isLocked = state === 'locked';

                            const handleSubNav = (e: React.MouseEvent) => {
                              if (isLocked) { e.preventDefault(); return; }
                              if (workspaceNav) {
                                e.preventDefault();
                                const routeBase = sub.route.split('?')[0];
                                workspaceNav.navigateToWorkspace(routeBase, sub.route);
                              }
                            };

                            return (
                              <Link
                                key={sub.id}
                                href={isLocked ? '#' : subHref}
                                onClick={handleSubNav}
                                className={`flex items-center justify-between py-2 px-3 -mx-3 rounded-[10px] transition-all ${
                                  state === 'active'
                                    ? 'bg-carbon text-white'
                                    : state === 'locked'
                                    ? 'text-carbon/25 cursor-not-allowed'
                                    : 'text-carbon hover:bg-carbon/[0.04]'
                                }`}
                              >
                                <span className={`text-[14px] ${
                                  state === 'active' ? 'font-semibold text-white' : 'font-normal'
                                }`}>
                                  {sub.label}
                                </span>

                                {/* Output items → arrow */}
                                {sub.isOutput && (
                                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${state === 'active' ? 'text-white/60' : 'text-carbon/40'}`} strokeWidth={2} />
                                )}

                                {/* SKU count badge */}
                                {!sub.isOutput && skuPhaseCounts[sub.id] > 0 && (
                                  <span className={`text-[12px] font-normal tabular-nums ${state === 'active' ? 'text-white/60' : 'text-carbon/40'}`}>
                                    {skuPhaseCounts[sub.id]}
                                  </span>
                                )}

                                {/* Check for completed */}
                                {!sub.isOutput && state === 'completed' && !skuPhaseCounts[sub.id] && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-carbon" strokeWidth={2} />
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

          {/* ═══════════════════════════════════════════
               Utilities
               ═══════════════════════════════════════════ */}
          <div className={`shrink-0 ${collapsed ? 'px-2' : 'px-3'} pb-4`}>
            <div className={`border-t border-carbon/[0.12] pt-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
              {utilityLinks.map((item) => {
                const fullPath = `${basePath}${item.path}`;
                const isActive = item.path === ''
                  ? pathname === basePath || pathname === `${basePath}/`
                  : pathname?.startsWith(fullPath);

                const handleUtilityNav = (e: React.MouseEvent) => {
                  // Dashboard link uses workspace navigation to go back to page mode
                  if (item.id === 'overview' && workspaceNav) {
                    e.preventDefault();
                    workspaceNav.navigateToDashboard();
                  }
                };

                return (
                  <Link
                    key={item.id}
                    href={fullPath}
                    onClick={handleUtilityNav}
                    className={`flex items-center ${
                      collapsed ? 'justify-center h-10 rounded-[10px]' : 'gap-3 px-3 py-2.5 rounded-[10px]'
                    } transition-all ${
                      isActive
                        ? 'bg-carbon/[0.06] text-carbon'
                        : 'text-carbon hover:bg-carbon/[0.04]'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
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
