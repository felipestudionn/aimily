'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Lock,
  Check,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelinePhase } from '@/types/timeline';

/* ── Block definitions for sidebar grouping ── */
interface SidebarBlock {
  id: TimelinePhase;
  label: string;
  /** Route for the block landing page */
  route: string;
  /** Wizard phase IDs (for progress tracking) */
  phaseIds: WizardPhaseId[];
  /**
   * If true, show individual phase sub-items in the sidebar.
   * When false, the block header link IS the navigation (for blocks
   * whose landing page has its own in-page navigation).
   */
  showSubItems: boolean;
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'creative',
    label: 'Creative & Brand',
    route: 'creative',
    phaseIds: ['product', 'brand'],
    showSubItems: false, // Creative page has 3-step in-page nav
  },
  {
    id: 'planning',
    label: 'Merchandising & Planning',
    route: 'merchandising',
    phaseIds: ['merchandising'],
    showSubItems: false, // Merchandising page has 4-card in-page nav
  },
  {
    id: 'development',
    label: 'Design & Development',
    route: 'development',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    showSubItems: true, // Each phase is a separate route/workspace
  },
  {
    id: 'go_to_market',
    label: 'Marketing & Digital',
    route: 'marketing/creation',
    phaseIds: ['marketing-creation', 'marketing-distribution'],
    showSubItems: true, // Creation and Distribution are separate routes
  },
];

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
  skuCount = 0,
  setupData,
  mobileOpen = false,
  onMobileClose,
  onCollapsedChange,
}: WizardSidebarProps) {
  const pathname = usePathname();
  const { milestones, saving } = useTimeline();
  const { phases, overallProgress } = useWizardState(milestones);
  const [collapsed, setCollapsed] = useState(false);

  // Track which blocks are expanded — default all open
  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

  const basePath = `/collection/${collectionId}`;

  const launchDateStr = launchDate
    ? new Date(launchDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const daysUntilLaunch = launchDate
    ? Math.ceil((new Date(launchDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const phaseMap = new Map(phases.map((ps) => [ps.phase.id, ps]));

  function toggleBlock(blockId: TimelinePhase) {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }

  function getBlockProgress(block: SidebarBlock): number {
    const blockPhases = block.phaseIds
      .map((id) => phaseMap.get(id))
      .filter(Boolean) as WizardPhaseStatus[];
    if (blockPhases.length === 0) return 0;
    const total = blockPhases.reduce((s, p) => s + p.totalCount, 0);
    const completed = blockPhases.reduce((s, p) => s + p.completedCount, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  function isBlockActive(block: SidebarBlock): boolean {
    const blockPath = `${basePath}/${block.route}`;
    if (pathname?.startsWith(blockPath)) return true;
    // Also check sub-item routes
    return block.phaseIds.some((id) => {
      const ps = phaseMap.get(id);
      if (!ps) return false;
      const phasePath = `${basePath}/${ps.phase.path}`;
      return pathname?.startsWith(phasePath);
    });
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 bg-carbon z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-[52px]' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
      {/* Logo + mobile close */}
      <div className="px-6 h-16 flex items-center">
        <Link href="/my-collections" className="flex items-center">
          <Image
            src="/images/aimily-logo-white.png"
            alt="aimily"
            width={774}
            height={96}
            className="object-contain h-6 w-auto opacity-100 hover:opacity-80 transition-opacity"
            priority
            unoptimized
          />
        </Link>
        {saving && !collapsed && (
          <Loader2 className="h-3 w-3 text-white/60 animate-spin ml-auto flex-shrink-0" />
        )}
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="md:hidden ml-auto w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Collection Header */}
      {!collapsed && (
        <div className="px-6 pb-6 border-b border-white/[0.08]">
          <h2 className="text-lg text-white tracking-tight leading-tight lowercase">
            {collectionName}
          </h2>
          {season && (
            <p className="text-[11px] text-white/60 mt-1.5 tracking-[0.2em] uppercase">{season}</p>
          )}

          {/* Progress */}
          <div className="mt-5">
            <div className="h-[2px] bg-white/[0.10] overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-sm text-white/70 mt-2.5">
              <span className="text-white">{overallProgress}%</span> complete
            </p>
          </div>

          {/* Launch date */}
          <div className="mt-4">
            <p className="text-base text-white tracking-tight">{launchDateStr}</p>
            {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
              <p className="text-[11px] text-white/40 mt-0.5">{daysUntilLaunch}d left</p>
            )}
          </div>
        </div>
      )}

      {/* Block Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {SIDEBAR_BLOCKS.map((block) => {
          const isExpanded = expandedBlocks.has(block.id);
          const blockActive = isBlockActive(block);
          const blockProgress = getBlockProgress(block);
          const blockPhases = block.phaseIds
            .map((id) => phaseMap.get(id))
            .filter(Boolean) as WizardPhaseStatus[];
          const allLocked = blockPhases.every((p) => p.state === 'locked');
          const allCompleted =
            blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');

          const blockHref = `${basePath}/${block.route}`;

          return (
            <div key={block.id}>
              {/* Block header — clickable label navigates, chevron expands/collapses */}
              <div
                className={`w-full flex items-center gap-3 px-6 py-3 transition-all ${
                  blockActive
                    ? 'text-white bg-white/[0.06]'
                    : allLocked
                    ? 'text-white/30'
                    : 'text-white/70 hover:text-white/90'
                }`}
              >
                {!collapsed && (
                  <>
                    {/* Block status indicator */}
                    <div className="flex-shrink-0 w-5 flex justify-center">
                      {allLocked ? (
                        <Lock className="h-3 w-3" />
                      ) : allCompleted ? (
                        <div className="h-3.5 w-3.5 bg-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-carbon" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="h-[6px] w-[6px] rounded-full bg-current" />
                      )}
                    </div>

                    {/* Block label — links to block landing page */}
                    <Link
                      href={allLocked ? '#' : blockHref}
                      onClick={(e) => { if (allLocked) e.preventDefault(); }}
                      className="text-[11px] font-medium tracking-[0.12em] uppercase flex-1 truncate hover:text-white transition-colors"
                    >
                      {block.label}
                    </Link>

                    {/* Progress + chevron */}
                    {!allLocked && blockProgress > 0 && (
                      <span className="text-[10px] text-white/30 tabular-nums mr-1">
                        {blockProgress}%
                      </span>
                    )}
                    {block.showSubItems && (
                      <button
                        onClick={() => toggleBlock(block.id)}
                        className="p-0.5 hover:bg-white/[0.08] transition-colors"
                      >
                        <ChevronDown
                          className={`h-3 w-3 text-white/30 transition-transform ${
                            isExpanded ? '' : '-rotate-90'
                          }`}
                        />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Sub-items (only for blocks with separate route pages) */}
              {!collapsed && block.showSubItems && isExpanded && (
                <div className="pb-1">
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
                        className={`group flex items-center gap-3 pl-14 pr-6 py-2.5 transition-all ${
                          isActive
                            ? 'bg-white/[0.12] text-white'
                            : isLocked
                            ? 'text-white/25 cursor-not-allowed'
                            : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
                        }`}
                      >
                        {/* Status indicator */}
                        <div className="flex-shrink-0 w-4 flex justify-center">
                          {isLocked ? (
                            <Lock className="h-2.5 w-2.5" />
                          ) : isCompleted ? (
                            <div className="h-3 w-3 bg-white flex items-center justify-center">
                              <Check className="h-2 w-2 text-carbon" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-white/50'}`} />
                          )}
                        </div>

                        <span className="text-[13px] tracking-wide truncate">
                          {ps.phase.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom: Calendar + Overview */}
      <div className="border-t border-white/[0.08] py-3 px-3">
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
              className={`flex items-center gap-3.5 px-4 py-3 transition-all text-sm tracking-wide ${
                isActive
                  ? 'text-white bg-white/[0.10]'
                  : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse Toggle (desktop only) */}
      <button
        onClick={() => { setCollapsed(!collapsed); onCollapsedChange?.(!collapsed); }}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-carbon border border-white/20 items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-2.5 w-2.5" />
        ) : (
          <PanelLeftClose className="h-2.5 w-2.5" />
        )}
      </button>
      </aside>
    </>
  );
}
