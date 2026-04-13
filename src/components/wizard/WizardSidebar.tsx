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
  ChevronUp,
  Sparkles,
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
  icon: React.ElementType;
  route: string;
  phaseIds: WizardPhaseId[];
  subItems: SidebarSubItem[];
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'creative',
    label: 'Creative & Brand',
    icon: Sparkles,
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
    icon: ShoppingBag,
    route: 'merchandising',
    phaseIds: ['merchandising'],
    subItems: [
      { id: 'merchandising', label: 'Range Planning', route: 'merchandising', icon: ShoppingBag, phaseId: 'merchandising' },
    ],
  },
  {
    id: 'development',
    label: 'Design & Dev',
    icon: PenTool,
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
    icon: Megaphone,
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

          {/* ── Collapse chevron on edge ── */}
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
               Block navigation — expandable sections
               ═══════════════════════════════════════════ */}
          <nav className="flex-1 overflow-y-auto scrollbar-subtle pt-4 px-3">
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}/${block.route}`;
              const isExpanded = expandedBlocks.has(block.id);
              const BlockIcon = block.icon;

              return (
                <div key={block.id} className="mb-2">
                  {collapsed ? (
                    /* ── Collapsed: block icon ── */
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
                      <BlockIcon className={`h-[18px] w-[18px] ${
                        blockActive ? 'text-carbon' : 'text-carbon/40'
                      }`} strokeWidth={1.5} />
                    </Link>
                  ) : (
                    <>
                      {/* ── Block header: icon + label (BLACK) + chevron ── */}
                      <button
                        onClick={() => !allLocked && toggleBlock(block.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all text-left ${
                          allLocked ? 'opacity-25 cursor-not-allowed'
                          : 'hover:bg-carbon/[0.03]'
                        }`}
                      >
                        <BlockIcon className={`h-[18px] w-[18px] shrink-0 ${
                          blockActive ? 'text-carbon' : 'text-carbon/50'
                        }`} strokeWidth={1.5} />

                        <span className={`text-[15px] font-semibold flex-1 truncate ${
                          allLocked ? 'text-carbon/30'
                          : allCompleted ? 'text-carbon/50'
                          : 'text-carbon'
                        }`}>
                          {block.label}
                        </span>

                        {allCompleted ? (
                          <Check className="h-4 w-4 text-carbon/30 shrink-0" strokeWidth={2} />
                        ) : blockProgress > 0 ? (
                          <span className="text-[12px] font-normal tabular-nums text-carbon/25 shrink-0 px-1.5 py-0.5 rounded-full border border-carbon/[0.08]">
                            {blockProgress}
                          </span>
                        ) : null}

                        {!allLocked && (
                          <ChevronUp className={`h-4 w-4 text-carbon/25 shrink-0 transition-transform duration-200 ${
                            isExpanded ? '' : 'rotate-180'
                          }`} />
                        )}
                      </button>

                      {/* ── Sub-items: indented lines ── */}
                      {isExpanded && (
                        <div className="mt-1 mb-2 ml-4 pl-5 border-l border-carbon/[0.06]">
                          {block.subItems.map((sub) => {
                            const state = getSubItemState(sub);
                            const subHref = `${basePath}/${sub.route}`;
                            const isLocked = state === 'locked';

                            return (
                              <Link
                                key={sub.id}
                                href={isLocked ? '#' : subHref}
                                onClick={(e) => { if (isLocked) e.preventDefault(); }}
                                className={`flex items-center gap-2 py-2 pr-3 transition-all ${
                                  state === 'active'
                                    ? 'text-carbon'
                                    : state === 'locked'
                                    ? 'text-carbon/20 cursor-not-allowed'
                                    : state === 'completed'
                                    ? 'text-carbon/40 hover:text-carbon/60'
                                    : 'text-carbon/50 hover:text-carbon/80'
                                }`}
                              >
                                <span className={`text-[14px] truncate flex-1 ${
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
