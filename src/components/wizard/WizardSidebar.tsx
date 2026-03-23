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
  PenTool,
  Megaphone,
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
  { id: 'development', label: 'Design & Development', shortLabel: 'Design', icon: PenTool, route: 'development', phaseIds: ['design', 'prototyping', 'sampling', 'production'], showSubItems: true },
  { id: 'go_to_market', label: 'Marketing & Digital', shortLabel: 'Marketing', icon: Megaphone, route: 'marketing/creation', phaseIds: ['marketing-creation', 'marketing-distribution'], showSubItems: true },
];

const COLLAPSED_W = 56;
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

/* ── Icon with progress ring ── */
function IconWithRing({
  Icon, progress, size = 32, iconSize = 16, active = false, locked = false, completed = false,
}: {
  Icon: React.ElementType; progress: number; size?: number; iconSize?: number;
  active?: boolean; locked?: boolean; completed?: boolean;
}) {
  const r = (size - 3) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  const hasProgress = progress > 0 && !locked;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Progress ring */}
      {hasProgress && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={completed ? 'rgba(255,255,255,0.5)' : active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}
            strokeWidth={1.5} strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
      )}

      {/* Icon */}
      <Icon style={{ width: iconSize, height: iconSize }} className={
        locked ? 'text-white/15' : active ? 'text-white' : 'text-white/45'
      } />

      {/* Completed check badge */}
      {completed && !locked && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
          <Check className="h-2 w-2 text-carbon" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

/* ── Overall progress ring (logo area) ── */
function OverallRing({ value, size = 36 }: { value: number; size?: number }) {
  const r = (size - 3) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
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

  // Capitalize collection name
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

  /* ── Hover expand with delay ── */
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
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onMobileClose} />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        className={`fixed left-0 top-0 bottom-0 bg-carbon z-50 transition-all duration-300 ease-out flex flex-col overflow-hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* ── Logo area ── */}
        <div className="h-14 flex items-center justify-center relative shrink-0">
          <Link href="/my-collections" className="flex items-center justify-center hover:opacity-80 transition-opacity">
            {collapsed ? (
              /* Rotated "aimily" wordmark — vertical */
              <div className="relative">
                <OverallRing value={overallProgress} size={34} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/70 tracking-wider">
                  {overallProgress}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 w-full">
                <img src="/images/aimily-logo-white.png" alt="aimily" className="h-6 w-auto" />
                {saving && <Loader2 className="h-2.5 w-2.5 text-white/40 animate-spin ml-auto" />}
              </div>
            )}
          </Link>

          {/* Mobile close */}
          <button onClick={onMobileClose} className="md:hidden absolute right-2 w-6 h-6 flex items-center justify-center text-white/60 hover:text-white" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Collection header (expanded only) ── */}
        {!collapsed && (
          <div className="px-4 pb-3 border-b border-white/[0.06] shrink-0">
            <h2 className="text-[12px] font-medium text-white tracking-tight leading-tight truncate">
              {displayName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {season && (
                <span className="text-[10px] text-white/35 tracking-[0.12em] uppercase">{season}</span>
              )}
              {daysUntilLaunch !== null && daysUntilLaunch > 0 && (
                <span className="text-[10px] text-white/25">
                  {weeksLeft > 0 && <>{weeksLeft}w </>}{daysLeft}d
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Block Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {SIDEBAR_BLOCKS.map((block) => {
            const blockActive = isBlockActive(block);
            const blockProgress = getBlockProgress(block);
            const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
            const allLocked = blockPhases.every((p) => p.state === 'locked');
            const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
            const blockHref = `${basePath}/${block.route}`;
            const Icon = block.icon;
            const isExpanded = expandedBlocks.has(block.id);

            return (
              <div key={block.id} className="mb-1">
                {/* ── Collapsed: icon only ── */}
                {collapsed ? (
                  <Link
                    href={allLocked ? '#' : blockHref}
                    onClick={(e) => { if (allLocked) e.preventDefault(); }}
                    className={`flex items-center justify-center py-2.5 mx-auto transition-all group relative ${
                      allLocked ? 'cursor-not-allowed' : ''
                    }`}
                    title={block.shortLabel}
                  >
                    {/* Active indicator bar */}
                    {blockActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-white rounded-r-full" />
                    )}
                    <IconWithRing
                      Icon={Icon}
                      progress={blockProgress}
                      active={blockActive}
                      locked={allLocked}
                      completed={allCompleted}
                      size={30}
                      iconSize={15}
                    />
                  </Link>
                ) : (
                  /* ── Expanded: full row ── */
                  <>
                    <div className={`flex items-center gap-2.5 px-4 py-2 transition-all ${
                      blockActive ? 'text-white' : allLocked ? 'text-white/20' : 'text-white/55 hover:text-white/75'
                    }`}>
                      {/* Active bar */}
                      {blockActive && (
                        <div className="absolute left-0 w-[2px] h-5 bg-white rounded-r-full" />
                      )}

                      <IconWithRing
                        Icon={Icon}
                        progress={blockProgress}
                        active={blockActive}
                        locked={allLocked}
                        completed={allCompleted}
                        size={26}
                        iconSize={13}
                      />

                      <Link
                        href={allLocked ? '#' : blockHref}
                        onClick={(e) => { if (allLocked) e.preventDefault(); }}
                        className="text-[11px] font-medium tracking-[0.06em] uppercase flex-1 truncate hover:text-white transition-colors"
                      >
                        {block.shortLabel}
                      </Link>

                      {!allLocked && blockProgress > 0 && (
                        <span className="text-[9px] text-white/20 tabular-nums">{blockProgress}%</span>
                      )}

                      {block.showSubItems && (
                        <button onClick={() => toggleBlock(block.id)} className="p-0.5 hover:bg-white/[0.06] rounded transition-colors">
                          <ChevronDown className={`h-2.5 w-2.5 text-white/20 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
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
                              className={`flex items-center gap-2 pl-12 pr-4 py-1.5 transition-all text-[11px] tracking-wide ${
                                isActive ? 'text-white' : isLocked ? 'text-white/15' : 'text-white/35 hover:text-white/60'
                              }`}
                            >
                              <div className="flex-shrink-0 w-3 flex justify-center">
                                {isLocked ? (
                                  <Lock className="h-2 w-2" />
                                ) : isCompleted ? (
                                  <Check className="h-2.5 w-2.5 text-white/50" />
                                ) : (
                                  <div className={`h-1 w-1 rounded-full ${isActive ? 'bg-white' : 'bg-white/30'}`} />
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
        <div className="border-t border-white/[0.06] py-2 shrink-0">
          {[
            { id: 'calendar', path: '/calendar', label: 'Calendar', Icon: CalendarDays },
            { id: 'overview', path: '', label: 'Overview', Icon: LayoutDashboard },
          ].map((item) => {
            const fullPath = `${basePath}${item.path}`;
            const isActive = item.path === '' ? pathname === basePath || pathname === `${basePath}/` : pathname?.startsWith(fullPath);
            return (
              <Link key={item.id} href={fullPath}
                className={`flex items-center ${collapsed ? 'justify-center py-2.5' : 'gap-2.5 px-4 py-2'} transition-all text-[11px] tracking-wide relative ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/65'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-white rounded-r-full" />
                )}
                <item.Icon className={`${collapsed ? 'h-4 w-4' : 'h-3.5 w-3.5'} flex-shrink-0`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* ── Pin toggle (expanded only, bottom) ── */}
        {!collapsed && (
          <button
            onClick={handleTogglePin}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 border-t border-white/[0.06] text-[10px] text-white/25 hover:text-white/50 tracking-[0.1em] uppercase transition-colors"
          >
            {pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          </button>
        )}
      </aside>
    </>
  );
}
