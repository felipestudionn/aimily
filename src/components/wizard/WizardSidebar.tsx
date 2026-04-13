'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Check,
  Presentation,
  X,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
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
  route: string;           // route segment after /collection/[id]/
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
      { id: 'creative-direction', label: 'Creative Direction', route: 'creative', phaseId: 'product' },
      { id: 'brand-identity', label: 'Brand Identity', route: 'brand', phaseId: 'brand' },
      { id: 'creative-synthesis', label: 'Creative Synthesis', route: 'creative' },
    ],
  },
  {
    id: 'planning',
    label: 'Merchandising & Planning',
    route: 'merchandising',
    phaseIds: ['merchandising'],
    subItems: [
      { id: 'families', label: 'Product Families', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'pricing', label: 'Pricing', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'channels', label: 'Channels & Markets', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'budget', label: 'Budget & Financials', route: 'merchandising', phaseId: 'merchandising' },
      { id: 'builder-merch', label: 'Collection Builder', route: 'product' },
    ],
  },
  {
    id: 'development',
    label: 'Design & Development',
    route: 'product',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    subItems: [
      { id: 'builder-design', label: 'Collection Builder', route: 'product' },
      { id: 'sketch', label: 'Sketch & Color', route: 'design', phaseId: 'design' },
      { id: 'prototyping', label: 'Prototyping', route: 'prototyping', phaseId: 'prototyping' },
      { id: 'selection', label: 'Selection & Catalog', route: 'sampling', phaseId: 'sampling' },
      { id: 'production', label: 'Production', route: 'production', phaseId: 'production' },
    ],
  },
  {
    id: 'go_to_market',
    label: 'Marketing & Sales',
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
const EXPANDED_W = 300;

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
  const { milestones } = useTimeline();
  const { phases } = useWizardState(milestones);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

  const basePath = `/collection/${collectionId}`;
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

  function isBlockActive(block: SidebarBlock): boolean {
    if (pathname?.startsWith(`${basePath}/${block.route}`)) return true;
    return block.subItems.some(sub => {
      const subPath = `${basePath}/${sub.route}`;
      return pathname === subPath || pathname?.startsWith(`${subPath}/`);
    });
  }

  function isSubItemActive(sub: SidebarSubItem, block: SidebarBlock): boolean {
    const subPath = `${basePath}/${sub.route}`;
    const onThisRoute = pathname === subPath || pathname?.startsWith(`${subPath}/`) || false;
    if (!onThisRoute) return false;

    // If multiple sub-items share a route, only highlight the first one
    const firstWithSameRoute = block.subItems.find(s => s.route === sub.route);
    return firstWithSameRoute?.id === sub.id;
  }

  function getSubItemState(sub: SidebarSubItem, block: SidebarBlock): 'active' | 'completed' | 'locked' | 'available' {
    if (isSubItemActive(sub, block)) return 'active';
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
        <div className="surface-card h-full flex flex-col overflow-hidden relative">

          {/* ── Collapse chevron ── */}
          <button
            onClick={handleToggleCollapse}
            className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] flex items-center justify-center hover:shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-shadow z-10 hidden md:flex"
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
                  className="h-5 w-auto opacity-60"
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
                  <p className="text-[13px] font-medium text-carbon/80 group-hover:text-carbon transition-colors truncate">
                    {displayName}
                  </p>
                </Link>
              </>
            )}
          </div>

          {/* ── Separator ── */}
          <div className={`${collapsed ? 'mx-3' : 'mx-5'} border-t border-carbon/[0.06] shrink-0`} />

          {/* ═══════════════════════════════════════════
               Block navigation — Hioline style
               Bold headers, no icons, generous space
               ═══════════════════════════════════════════ */}
          <nav className="flex-1 overflow-y-auto scrollbar-subtle pt-6 px-6">
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}/${block.route}`;
              const isExpanded = expandedBlocks.has(block.id);

              return (
                <div key={block.id} className="mb-7">
                  {collapsed ? (
                    <Link
                      href={allLocked ? '#' : blockHref}
                      onClick={(e) => { if (allLocked) e.preventDefault(); }}
                      className={`w-10 h-10 mx-auto flex items-center justify-center rounded-[10px] transition-all ${
                        allLocked ? 'opacity-25 cursor-not-allowed'
                        : blockActive ? 'bg-carbon/[0.06]'
                        : 'hover:bg-carbon/[0.04]'
                      }`}
                      title={block.label}
                    >
                      <span className={`text-[14px] font-bold ${
                        blockActive ? 'text-carbon' : 'text-carbon/35'
                      }`}>
                        {block.label.charAt(0)}
                      </span>
                    </Link>
                  ) : (
                    <>
                      {/* ── Block header: bold text + chevron ── */}
                      <button
                        onClick={() => !allLocked && toggleBlock(block.id)}
                        className={`w-full flex items-center justify-between mb-3 text-left ${
                          allLocked ? 'opacity-25 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className={`text-[16px] font-bold tracking-[-0.01em] ${
                          allLocked ? 'text-carbon/30'
                          : allCompleted ? 'text-carbon/45'
                          : 'text-carbon'
                        }`}>
                          {block.label}
                        </span>

                        <ChevronDown className={`h-4 w-4 text-carbon/30 shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`} />
                      </button>

                      {/* ── Sub-items ── */}
                      {isExpanded && (
                        <div className="flex flex-col gap-1">
                          {block.subItems.map((sub) => {
                            const state = getSubItemState(sub, block);
                            const subHref = `${basePath}/${sub.route}`;
                            const isLocked = state === 'locked';

                            return (
                              <Link
                                key={sub.id}
                                href={isLocked ? '#' : subHref}
                                onClick={(e) => { if (isLocked) e.preventDefault(); }}
                                className={`flex items-center justify-between py-2 transition-colors ${
                                  state === 'active'
                                    ? 'text-carbon'
                                    : state === 'locked'
                                    ? 'text-carbon/20 cursor-not-allowed'
                                    : state === 'completed'
                                    ? 'text-carbon/35 hover:text-carbon/55'
                                    : 'text-carbon/50 hover:text-carbon'
                                }`}
                              >
                                <span className={`text-[14px] ${
                                  state === 'active' ? 'font-semibold' : 'font-normal'
                                }`}>
                                  {sub.label}
                                </span>

                                {state === 'completed' && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-carbon/25" strokeWidth={2} />
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
