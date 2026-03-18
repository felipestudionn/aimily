'use client';

import Link from 'next/link';
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
  Palette,
  ShoppingBag,
  PenTool,
  Megaphone,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelinePhase } from '@/types/timeline';

/* ── Block definitions for sidebar grouping ── */
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
  {
    id: 'creative',
    label: 'Creative & Brand',
    shortLabel: 'Creative',
    icon: Palette,
    route: 'creative',
    phaseIds: ['product', 'brand'],
    showSubItems: false,
  },
  {
    id: 'planning',
    label: 'Merchandising & Planning',
    shortLabel: 'Merch',
    icon: ShoppingBag,
    route: 'merchandising',
    phaseIds: ['merchandising'],
    showSubItems: false,
  },
  {
    id: 'development',
    label: 'Design & Development',
    shortLabel: 'Design',
    icon: PenTool,
    route: 'development',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    showSubItems: true,
  },
  {
    id: 'go_to_market',
    label: 'Marketing & Digital',
    shortLabel: 'Marketing',
    icon: Megaphone,
    route: 'marketing/creation',
    phaseIds: ['marketing-creation', 'marketing-distribution'],
    showSubItems: true,
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

/* ── Circular progress component ── */
function CircleProgress({ value, size = 40 }: { value: number; size?: number }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeWidth={2}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="fill-white text-[9px] font-semibold" transform={`rotate(90 ${size / 2} ${size / 2})`}>
        {value}%
      </text>
    </svg>
  );
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
  const { phases, overallProgress } = useWizardState(milestones);
  const [collapsed, setCollapsed] = useState(false);

  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

  const basePath = `/collection/${collectionId}`;

  // Time remaining in weeks + days
  const daysUntilLaunch = launchDate
    ? Math.ceil((new Date(launchDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const weeksLeft = daysUntilLaunch !== null && daysUntilLaunch > 0 ? Math.floor(daysUntilLaunch / 7) : 0;
  const daysLeft = daysUntilLaunch !== null && daysUntilLaunch > 0 ? daysUntilLaunch % 7 : 0;

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
    return block.phaseIds.some((id) => {
      const ps = phaseMap.get(id);
      if (!ps) return false;
      return pathname?.startsWith(`${basePath}/${ps.phase.path}`);
    });
  }

  // Capitalize collection name
  const displayName = collectionName
    ? collectionName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 bg-carbon z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-[52px]' : 'w-48'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-4 h-12 flex items-center">
          <Link href="/my-collections" className="text-white/90 hover:text-white text-sm font-light tracking-tight transition-opacity">
            aimily
          </Link>
          {saving && !collapsed && (
            <Loader2 className="h-2.5 w-2.5 text-white/50 animate-spin ml-auto flex-shrink-0" />
          )}
          <button onClick={onMobileClose} className="md:hidden ml-auto w-6 h-6 flex items-center justify-center text-white/60 hover:text-white" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Collection Header — compact */}
        {!collapsed && (
          <div className="px-4 pb-4 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-[13px] font-medium text-white tracking-tight leading-tight truncate">
                  {displayName}
                </h2>
                {season && (
                  <p className="text-[10px] text-white/40 mt-0.5 tracking-[0.15em] uppercase">{season}</p>
                )}
              </div>
              {/* Circular progress */}
              <CircleProgress value={overallProgress} size={36} />
            </div>

            {/* Time remaining */}
            {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
              <p className="text-[10px] text-white/30 mt-2">
                {weeksLeft > 0 && <span className="text-white/50">{weeksLeft}w </span>}
                <span className="text-white/50">{daysLeft}d</span> left
              </p>
            )}
          </div>
        )}

        {/* Block Navigation — compact */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {SIDEBAR_BLOCKS.map((block) => {
            const isExpanded = expandedBlocks.has(block.id);
            const blockActive = isBlockActive(block);
            const blockProgress = getBlockProgress(block);
            const blockPhases = block.phaseIds
              .map((id) => phaseMap.get(id))
              .filter(Boolean) as WizardPhaseStatus[];
            const allLocked = blockPhases.every((p) => p.state === 'locked');
            const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
            const blockHref = `${basePath}/${block.route}`;
            const Icon = block.icon;

            return (
              <div key={block.id}>
                <div
                  className={`w-full flex items-center gap-2 px-4 py-2 transition-all ${
                    blockActive ? 'text-white bg-white/[0.06]' : allLocked ? 'text-white/25' : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {!collapsed && (
                    <>
                      {/* Status dot / icon */}
                      <div className="flex-shrink-0 w-4 flex justify-center">
                        {allLocked ? (
                          <Lock className="h-2.5 w-2.5" />
                        ) : allCompleted ? (
                          <div className="h-3 w-3 bg-white flex items-center justify-center">
                            <Check className="h-2 w-2 text-carbon" strokeWidth={3} />
                          </div>
                        ) : (
                          <Icon className="h-3 w-3" />
                        )}
                      </div>

                      {/* Block label — short */}
                      <Link
                        href={allLocked ? '#' : blockHref}
                        onClick={(e) => { if (allLocked) e.preventDefault(); }}
                        className="text-[11px] font-medium tracking-[0.06em] uppercase flex-1 truncate hover:text-white transition-colors"
                      >
                        {block.shortLabel}
                      </Link>

                      {/* Progress % */}
                      {!allLocked && blockProgress > 0 && (
                        <span className="text-[9px] text-white/25 tabular-nums">{blockProgress}%</span>
                      )}
                      {block.showSubItems && (
                        <button onClick={() => toggleBlock(block.id)} className="p-0.5 hover:bg-white/[0.06] transition-colors">
                          <ChevronDown className={`h-2.5 w-2.5 text-white/25 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Sub-items */}
                {!collapsed && block.showSubItems && isExpanded && (
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
                          className={`flex items-center gap-2 pl-10 pr-4 py-1.5 transition-all text-[11px] tracking-wide ${
                            isActive ? 'bg-white/[0.10] text-white' : isLocked ? 'text-white/20' : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex-shrink-0 w-3 flex justify-center">
                            {isLocked ? <Lock className="h-2 w-2" /> : isCompleted ? (
                              <div className="h-2.5 w-2.5 bg-white flex items-center justify-center">
                                <Check className="h-1.5 w-1.5 text-carbon" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className={`h-1 w-1 rounded-full ${isActive ? 'bg-white' : 'bg-white/40'}`} />
                            )}
                          </div>
                          <span className="truncate">{ps.phase.name}</span>
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
        <div className="border-t border-white/[0.06] py-2 px-2">
          {[
            { id: 'calendar', path: '/calendar', label: 'Calendar', Icon: CalendarDays },
            { id: 'overview', path: '', label: 'Overview', Icon: LayoutDashboard },
          ].map((item) => {
            const fullPath = `${basePath}${item.path}`;
            const isActive = item.path === '' ? pathname === basePath || pathname === `${basePath}/` : pathname?.startsWith(fullPath);
            return (
              <Link key={item.id} href={fullPath}
                className={`flex items-center gap-2.5 px-3 py-2 transition-all text-[11px] tracking-wide ${
                  isActive ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
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
          onClick={() => { setCollapsed(!collapsed); onCollapsedChange?.(!collapsed); }}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-carbon border border-white/20 items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="h-2.5 w-2.5" /> : <PanelLeftClose className="h-2.5 w-2.5" />}
        </button>
      </aside>
    </>
  );
}
