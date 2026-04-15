'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Clock,
  Circle,
  Trash2,
  Download,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import { useSkus } from '@/hooks/useSkus';
import { useCollectionTimeline } from '@/hooks/useCollectionTimeline';
import { useWorkspaceNavigationOptional } from '@/components/workspace/workspace-context';
import { useTranslation } from '@/i18n';
import type { WizardPhaseId, WizardPhaseStatus } from '@/lib/wizard-phases';
import type { TimelineMilestone, TimelinePhase, MilestoneStatus } from '@/types/timeline';
import {
  PHASES,
  MILESTONE_TO_MINI_BLOCK,
  getTimelineBounds,
  getMonthColumns,
  getMilestoneDate,
  getMilestoneEndDate,
  formatDate,
  daysBetween,
} from '@/lib/timeline-template';

/* ══════════════════════════════════════════════════════════════
   Sidebar data model

   Every sub-item maps to a REAL existing route.
   Items sharing a route = they live on the same page.
   phaseId = milestone tracking from wizard-phases.ts.
   ══════════════════════════════════════════════════════════════ */

type SidebarLabelKey =
  | 'creativeDirection' | 'consumer' | 'moodboard' | 'moodboardResearch' | 'marketResearch' | 'brandIdentity' | 'creativeOverview'
  | 'merchandisingPlanning' | 'buyingStrategy' | 'assortmentPricing' | 'familiesPricing' | 'distribution' | 'channelsMarkets' | 'financialPlan' | 'budgetFinancials' | 'collectionBuilder'
  | 'designDevelopment' | 'sketchColor' | 'techPack' | 'prototyping' | 'production' | 'finalSelection'
  | 'marketingSales' | 'gtmLaunchPlan' | 'salesDashboard' | 'contentStudio' | 'communications' | 'pointOfSale'
  | 'calendar' | 'presentation' | 'dashboard';

interface SidebarSubItem {
  id: string;
  labelKey: SidebarLabelKey;
  route: string;
  phaseId?: WizardPhaseId;
  isOutput?: boolean;      // true = consolidation step (shows → instead of ✓)
}

interface SidebarBlock {
  id: TimelinePhase;
  labelKey: SidebarLabelKey;
  icon: React.ElementType;  // shown only in collapsed state
  route: string;
  phaseIds: WizardPhaseId[];
  subItems: SidebarSubItem[];
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'creative',
    labelKey: 'creativeDirection',
    icon: Feather,
    route: 'creative',
    phaseIds: ['product', 'brand'],
    subItems: [
      { id: 'consumer', labelKey: 'consumer', route: 'creative?block=consumer', phaseId: 'product' },
      { id: 'moodboard', labelKey: 'moodboard', route: 'creative?block=moodboard', phaseId: 'product' },
      { id: 'market-research', labelKey: 'marketResearch', route: 'creative?block=research', phaseId: 'product' },
      { id: 'brand-identity', labelKey: 'brandIdentity', route: 'creative?block=brand-dna', phaseId: 'brand' },
      { id: 'creative-overview', labelKey: 'creativeOverview', route: 'creative?block=synthesis', isOutput: true },
    ],
  },
  {
    id: 'planning',
    labelKey: 'merchandisingPlanning',
    icon: ClipboardList,
    route: 'merchandising',
    phaseIds: ['merchandising'],
    subItems: [
      { id: 'scenarios', labelKey: 'buyingStrategy', route: 'merchandising?block=scenarios', phaseId: 'merchandising' },
      { id: 'families-pricing', labelKey: 'assortmentPricing', route: 'merchandising?block=families', phaseId: 'merchandising' },
      { id: 'channels', labelKey: 'distribution', route: 'merchandising?block=channels', phaseId: 'merchandising' },
      { id: 'budget', labelKey: 'financialPlan', route: 'merchandising?block=budget', phaseId: 'merchandising' },
      { id: 'builder-merch', labelKey: 'collectionBuilder', route: 'product', isOutput: true },
    ],
  },
  {
    id: 'development',
    labelKey: 'designDevelopment',
    icon: Ruler,
    route: 'product',
    phaseIds: ['design', 'prototyping', 'sampling', 'production'],
    subItems: [
      { id: 'sketch', labelKey: 'sketchColor', route: 'product?phase=sketch', phaseId: 'design' },
      { id: 'tech-pack', labelKey: 'techPack', route: 'product?phase=techpack', phaseId: 'design' },
      { id: 'prototyping', labelKey: 'prototyping', route: 'product?phase=prototyping', phaseId: 'prototyping' },
      { id: 'production', labelKey: 'production', route: 'product?phase=production', phaseId: 'production' },
      { id: 'final-selection', labelKey: 'finalSelection', route: 'product?phase=selection', phaseId: 'sampling', isOutput: true },
    ],
  },
  {
    id: 'go_to_market',
    labelKey: 'marketingSales',
    icon: Megaphone,
    route: 'marketing/creation',
    phaseIds: ['marketing-creation', 'marketing-distribution'],
    subItems: [
      { id: 'gtm-launch', labelKey: 'gtmLaunchPlan', route: 'marketing/creation?block=gtm', phaseId: 'marketing-creation' },
      { id: 'content-studio', labelKey: 'contentStudio', route: 'marketing/creation?block=content', phaseId: 'marketing-creation' },
      { id: 'communications', labelKey: 'communications', route: 'marketing/creation?block=comms', phaseId: 'marketing-creation' },
      { id: 'sales', labelKey: 'salesDashboard', route: 'marketing/creation?block=sales', phaseId: 'marketing-creation' },
      { id: 'pos', labelKey: 'pointOfSale', route: 'marketing/creation?block=pos', phaseId: 'marketing-creation', isOutput: true },
    ],
  },
];

const COLLAPSED_W = 72;
const EXPANDED_W = 340;

/* ── Calendar-mode layout constants (used when pathname ends with /calendar) ── */
const CAL_SUB_ITEM_HEIGHT = 37;
const CAL_BLOCK_HEADER_HEIGHT = 46;
const CAL_HEADER_AREA_HEIGHT = 152;
const CAL_DAY_WIDTH = 4;
const CAL_DAYS_PER_WEEK = 7;
const CAL_SIDEBAR_BG = '#EBEAE6';

function calSnapToWeek(days: number): number {
  return Math.round(days / CAL_DAYS_PER_WEEK) * CAL_DAYS_PER_WEEK;
}

function calBarTextColor(color: string): string {
  const pale = ['#B6C8C7', '#FFF4CE', '#F1EFED', '#EDF1F0', '#FBF8EC'];
  return pale.some(c => color.toUpperCase() === c.toUpperCase()) ? 'text-carbon' : 'text-white';
}

function CalStatusIcon({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case 'completed': return <Check className="w-3 h-3 text-moss" strokeWidth={3} />;
    case 'in-progress': return <Clock className="w-3 h-3 text-carbon/70" strokeWidth={2.5} />;
    default: return <Circle className="w-3 h-3 text-carbon/25" strokeWidth={2} />;
  }
}

interface DragState {
  milestoneId: string;
  type: 'move' | 'resize-right' | 'resize-left';
  startX: number;
  originalStartWeeksBefore: number;
  originalDurationWeeks: number;
  currentDeltaDays: number;
}

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
  const searchParams = useSearchParams();
  const { milestones } = useTimeline();
  const { phases } = useWizardState(milestones);
  const workspaceNav = useWorkspaceNavigationOptional();
  const t = useTranslation();
  const sidebarT = t.sidebar as Record<string, string>;
  const labelOf = (key: SidebarLabelKey) => sidebarT[key] || key;
  const [collapsed, setCollapsed] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

  const basePath = `/collection/${collectionId}`;

  /* ══════════════════════════════════════════════════════════════
     Mode detection — URL drives the spine form.
     - 'nav' (default): sidebar as we always knew it (340px, labels only).
     - 'calendar': sidebar EXPANDS to full viewport, each row grows a
       timeline track on the right. Same labels, same IDs.
     - 'presentation': future — sidebar becomes chapter index.
     ══════════════════════════════════════════════════════════════ */
  const mode: 'nav' | 'calendar' | 'presentation' =
    pathname?.endsWith('/calendar') ? 'calendar'
    : pathname?.endsWith('/presentation') ? 'presentation'
    : 'nav';

  /* Client-only mount flag (for createPortal on the edit modal). */
  const [clientMounted, setClientMounted] = useState(false);
  useEffect(() => setClientMounted(true), []);

  /* Timeline data (only materially used in calendar mode, but calling
     the hook unconditionally keeps hook rules happy). Falls through
     gracefully when the collection has no stored timeline. */
  const {
    timeline,
    saving,
    updateMilestone,
    updateTimeline,
    resetToDefaults,
  } = useCollectionTimeline(
    collectionId,
    collectionName,
    season || 'SS27',
    launchDate || '2027-02-01'
  );

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

  /* ── Active workspace route from WorkspaceShell (state-based navigation) ── */
  const wsRoute = workspaceNav?.viewState.type === 'workspace' ? workspaceNav.viewState.route : null;

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
    // If WorkspaceShell has an active workspace, match against its route
    if (wsRoute) {
      const wsBase = getRoutePath(wsRoute);
      const blockPath = getRoutePath(block.route);
      if (wsBase === blockPath) return true;
      return block.subItems.some(sub => getRoutePath(sub.route) === wsBase);
    }

    const blockPath = getRoutePath(block.route);
    if (pathname?.startsWith(`${basePath}/${blockPath}`)) return true;
    return block.subItems.some(sub => {
      const subPath = `${basePath}/${getRoutePath(sub.route)}`;
      return pathname === subPath || pathname?.startsWith(`${subPath}/`);
    });
  }

  function isSubItemActive(sub: SidebarSubItem, block: SidebarBlock): boolean {
    // If WorkspaceShell has an active workspace, match against its route
    if (wsRoute) {
      // Exact route match (including query params)
      if (sub.route === wsRoute) return true;

      // Match base path + query params separately
      const wsBase = getRoutePath(wsRoute);
      const subBase = getRoutePath(sub.route);
      if (wsBase !== subBase) return false;

      // Check query param match
      const wsPhase = getRouteParam(wsRoute, 'phase');
      const wsBlock = getRouteParam(wsRoute, 'block');
      const subPhase = getRouteParam(sub.route, 'phase');
      const subBlock = getRouteParam(sub.route, 'block');

      if (subPhase) return subPhase === wsPhase;
      if (subBlock) return subBlock === wsBlock;

      // No query params on sub-item — active if workspace also has no relevant params
      if (!wsPhase && !wsBlock) {
        const firstWithSameRoute = block.subItems.find(s => getRoutePath(s.route) === subBase && !getRouteParam(s.route, 'phase') && !getRouteParam(s.route, 'block'));
        return firstWithSameRoute?.id === sub.id;
      }
      return false;
    }

    // Fallback: pathname-based matching (normal Next.js navigation)
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
    { id: 'calendar', path: '/calendar', label: labelOf('calendar'), Icon: CalendarDays, mode: 'calendar' as const },
    { id: 'presentation', path: '/presentation', label: labelOf('presentation'), Icon: Presentation, mode: 'presentation' as const },
    { id: 'overview', path: '', label: labelOf('dashboard'), Icon: LayoutDashboard, mode: 'nav' as const },
  ];

  /* ══════════════════════════════════════════════════════════════
     CALENDAR MODE — timeline data + drag state + bar rendering.
     Only meaningful when mode === 'calendar'; data is always fetched
     (hooks can't be conditional) but the tracks are only rendered
     in the calendar branch below.
     ══════════════════════════════════════════════════════════════ */
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ nameEs: string; durationWeeks: number; startWeeksBefore: number; notes: string }>({ nameEs: '', durationWeeks: 0, startWeeksBefore: 0, notes: '' });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const calScrollRef = useRef<HTMLDivElement>(null);

  const calBounds = useMemo(() => timeline ? getTimelineBounds(timeline) : null, [timeline]);
  const calMonths = useMemo(() => calBounds ? getMonthColumns(calBounds.earliestDate, calBounds.latestDate) : [], [calBounds]);
  const calChartWidth = calBounds ? calBounds.totalDays * CAL_DAY_WIDTH : 0;

  const calTodayOffset = useMemo(() => {
    if (!calBounds) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return daysBetween(calBounds.earliestDate, today) * CAL_DAY_WIDTH;
  }, [calBounds]);

  const calLaunchOffset = useMemo(() => {
    if (!calBounds || !timeline) return 0;
    return daysBetween(calBounds.earliestDate, calBounds.launchDate) * CAL_DAY_WIDTH;
  }, [calBounds, timeline]);

  const calMilestonesByRow = useMemo(() => {
    const map: Record<string, TimelineMilestone[]> = {};
    if (!timeline) return map;
    for (const m of timeline.milestones) {
      const rowId = MILESTONE_TO_MINI_BLOCK[m.id];
      if (!rowId) continue;
      if (!map[rowId]) map[rowId] = [];
      map[rowId].push(m);
    }
    return map;
  }, [timeline]);

  /* Scroll to today on entering calendar mode. */
  useEffect(() => {
    if (mode === 'calendar' && calScrollRef.current && calTodayOffset > 0) {
      calScrollRef.current.scrollLeft = Math.max(0, calTodayOffset - 200);
    }
  }, [mode, calTodayOffset]);

  const handleBarDragStart = useCallback((e: React.MouseEvent, mid: string, type: DragState['type']) => {
    e.preventDefault();
    e.stopPropagation();
    if (!timeline) return;
    const m = timeline.milestones.find(mm => mm.id === mid);
    if (!m) return;
    setDragState({
      milestoneId: mid,
      type,
      startX: e.clientX,
      originalStartWeeksBefore: m.startWeeksBefore,
      originalDurationWeeks: m.durationWeeks,
      currentDeltaDays: 0,
    });
  }, [timeline]);

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const dd = (e.clientX - dragState.startX) / CAL_DAY_WIDTH;
      setDragState(prev => prev ? { ...prev, currentDeltaDays: dd } : null);
    };
    const onUp = () => {
      if (!dragState) return;
      const snapped = calSnapToWeek(dragState.currentDeltaDays);
      const dw = snapped / CAL_DAYS_PER_WEEK;
      if (dragState.type === 'move') {
        const ns = dragState.originalStartWeeksBefore - dw;
        if (ns !== dragState.originalStartWeeksBefore) updateMilestone(dragState.milestoneId, { startWeeksBefore: Math.round(ns * 2) / 2 });
      } else if (dragState.type === 'resize-right') {
        const nd = Math.max(0.5, Math.round((dragState.originalDurationWeeks + dw) * 2) / 2);
        if (nd !== dragState.originalDurationWeeks) updateMilestone(dragState.milestoneId, { durationWeeks: nd });
      } else if (dragState.type === 'resize-left') {
        const nd = Math.max(0.5, dragState.originalDurationWeeks - dw);
        const clamped = Math.round(nd * 2) / 2;
        const adj = Math.round((dragState.originalStartWeeksBefore + (clamped - dragState.originalDurationWeeks)) * 2) / 2;
        if (clamped !== dragState.originalDurationWeeks) updateMilestone(dragState.milestoneId, { startWeeksBefore: adj, durationWeeks: clamped });
      }
      setDragState(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragState, updateMilestone]);

  const cycleStatus = (id: string, current: MilestoneStatus) => {
    const next: MilestoneStatus = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'completed' : 'pending';
    updateMilestone(id, { status: next });
  };

  const openEditor = (m: TimelineMilestone) => {
    setEditingMilestone(m.id);
    setEditValues({ nameEs: m.nameEs, durationWeeks: m.durationWeeks, startWeeksBefore: m.startWeeksBefore, notes: m.notes || '' });
  };
  const saveEditor = () => {
    if (!editingMilestone) return;
    updateMilestone(editingMilestone, {
      nameEs: editValues.nameEs,
      durationWeeks: editValues.durationWeeks,
      startWeeksBefore: editValues.startWeeksBefore,
      notes: editValues.notes || undefined,
    });
    setEditingMilestone(null);
  };
  const deleteMilestoneInline = (id: string) => {
    if (!timeline) return;
    updateTimeline({ milestones: timeline.milestones.filter(m => m.id !== id) });
    setEditingMilestone(null);
  };

  const getBarPosition = (m: TimelineMilestone) => {
    if (!calBounds || !timeline) return { left: 0, width: 0, startDate: new Date(), endDate: new Date(), durationWeeks: 0 };
    let sw = m.startWeeksBefore;
    let dw = m.durationWeeks;
    if (dragState && dragState.milestoneId === m.id) {
      const dd = dragState.currentDeltaDays;
      if (dragState.type === 'move') sw = dragState.originalStartWeeksBefore - dd / CAL_DAYS_PER_WEEK;
      else if (dragState.type === 'resize-right') dw = Math.max(0.5, dragState.originalDurationWeeks + dd / CAL_DAYS_PER_WEEK);
      else if (dragState.type === 'resize-left') {
        const nd = Math.max(0.5, dragState.originalDurationWeeks - dd / CAL_DAYS_PER_WEEK);
        sw = dragState.originalStartWeeksBefore + (nd - dragState.originalDurationWeeks);
        dw = nd;
      }
    }
    const sd = getMilestoneDate(timeline.launchDate, sw);
    const ed = getMilestoneEndDate(timeline.launchDate, sw, dw);
    const startDay = daysBetween(calBounds.earliestDate, sd);
    const duration = daysBetween(sd, ed);
    return { left: startDay * CAL_DAY_WIDTH, width: Math.max(duration * CAL_DAY_WIDTH, 8), startDate: sd, endDate: ed, durationWeeks: dw };
  };

  /* ══════════════════════════════════════════════════════════════
     MODE SWITCHER — Work / Calendar / Presentation.
     The spine is always ONE wizard; mode switcher just re-shapes it.
     Rendered identically at the top of the sidebar in all modes.
     ══════════════════════════════════════════════════════════════ */
  const modeOptions = [
    { mode: 'nav' as const, label: labelOf('dashboard'), path: '', Icon: LayoutDashboard },
    { mode: 'calendar' as const, label: labelOf('calendar'), path: '/calendar', Icon: CalendarDays },
    { mode: 'presentation' as const, label: labelOf('presentation'), path: '/presentation', Icon: Presentation },
  ];
  const modeSwitcher = (
    <div className="flex items-center gap-0.5 rounded-full bg-carbon/[0.04] p-1 w-full">
      {modeOptions.map((opt) => {
        const active = mode === opt.mode;
        const href = opt.path === '' ? basePath : `${basePath}${opt.path}`;
        return (
          <Link
            key={opt.mode}
            href={href}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-all ${
              active
                ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-carbon'
                : 'text-carbon/50 hover:text-carbon/80'
            }`}
          >
            <opt.Icon className="h-[13px] w-[13px] shrink-0" strokeWidth={1.5} />
            <span className="truncate">{opt.label}</span>
          </Link>
        );
      })}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     CALENDAR MODE RENDER — the SAME <aside> expands in place.
     No portal, no new component. Just the aside's width grows from
     EXPANDED_W to 100vw with a CSS transition, and its inner content
     switches to the tracks layout. WorkspaceShell's <main> is still
     under the aside (fixed z-50) so the expansion visually covers
     everything rightward.

     SIDEBAR_BLOCKS + labelOf() + getSubItemState() reused so labels
     stay identical to nav mode.
     ══════════════════════════════════════════════════════════════ */
  if (mode === 'calendar') {
    return (
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 p-3 transition-[width] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: '100vw' }}
      >
        <div
          className="flex flex-col overflow-hidden rounded-[16px] h-full"
          style={{ background: CAL_SIDEBAR_BG }}
        >
          {/* Single scroll zone — horizontal + vertical */}
          <div
            ref={calScrollRef}
            className="flex-1 overflow-auto scrollbar-subtle"
            style={{ cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'col-resize') : undefined }}
          >
            <div style={{ minWidth: EXPANDED_W + calChartWidth }}>
              {/* Header row: logo+name (sticky) | month header */}
              <div className="flex items-end" style={{ height: CAL_HEADER_AREA_HEIGHT }}>
                <div
                  className="sticky left-0 z-30 h-full flex flex-col justify-end px-5 pb-4"
                  style={{ width: EXPANDED_W, background: CAL_SIDEBAR_BG }}
                >
                  <Link href="/my-collections" className="block mb-4">
                    <Image src="/images/aimily-logo-black.png" alt="aimily" width={774} height={96} className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity" unoptimized />
                  </Link>
                  <Link href={basePath} className="block group mb-3">
                    <p className="text-[13px] font-medium text-carbon truncate">{displayName}</p>
                  </Link>
                  {modeSwitcher}
                </div>
                <div className="relative flex items-end h-full" style={{ width: calChartWidth }}>
                  <div className="relative w-full" style={{ height: 46 }}>
                    {calMonths.map((month, i) => (
                      <div key={i} className="absolute top-0 h-full flex items-end border-l border-carbon/[0.06]" style={{ left: month.startDay * CAL_DAY_WIDTH, width: month.days * CAL_DAY_WIDTH }}>
                        <span className="px-2 pb-2 text-[11px] font-medium text-carbon/50 tracking-[-0.01em] whitespace-nowrap">{month.name} {month.year}</span>
                      </div>
                    ))}
                    {calTodayOffset > 0 && calTodayOffset < calChartWidth && (
                      <div className="absolute top-0 h-full w-px bg-moss z-10" style={{ left: calTodayOffset }}>
                        <div className="absolute top-0 -left-3 px-1.5 py-0.5 bg-moss text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">HOY</div>
                      </div>
                    )}
                    <div className="absolute top-0 h-full w-px bg-carbon z-10" style={{ left: calLaunchOffset }}>
                      <div className="absolute top-0 -left-6 px-1.5 py-0.5 bg-carbon text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">LAUNCH</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="sticky left-0 h-px bg-carbon/[0.12]" style={{ minWidth: EXPANDED_W + calChartWidth }} />

              {/* Nav rows — same SIDEBAR_BLOCKS + labelOf() as nav mode */}
              <div className="pt-6 pb-4 flex flex-col">
                {SIDEBAR_BLOCKS.map((block) => {
                  const phase = PHASES[block.id];
                  return (
                    <div key={block.id} className="mb-5">
                      {/* Block header row — identical styling to nav mode (no icon, no chevron) */}
                      <div className="flex" style={{ height: CAL_BLOCK_HEADER_HEIGHT }}>
                        <div className="sticky left-0 z-20 flex items-center px-6" style={{ width: EXPANDED_W, background: CAL_SIDEBAR_BG }}>
                          <Link href={`${basePath}?block=${block.id}`} className="w-full px-4 py-2.5 rounded-full flex items-center bg-carbon/[0.04] hover:bg-carbon/[0.06] transition-colors">
                            <span className="text-[15px] font-bold tracking-[-0.01em] text-carbon truncate">{labelOf(block.labelKey)}</span>
                          </Link>
                        </div>
                        <div className="relative" style={{ width: calChartWidth, background: phase.bgColor + '55' }}>
                          {calTodayOffset > 0 && calTodayOffset < calChartWidth && (
                            <div className="absolute top-0 bottom-0 w-px bg-moss/30" style={{ left: calTodayOffset }} />
                          )}
                          <div className="absolute top-0 bottom-0 w-px bg-carbon/30" style={{ left: calLaunchOffset }} />
                        </div>
                      </div>

                      {/* Sub-item rows with tracks */}
                      {block.subItems.map((sub) => {
                        const state = getSubItemState(sub, block);
                        const isLocked = state === 'locked';
                        const isActive = state === 'active';
                        const rowMilestones = calMilestonesByRow[sub.id] || [];
                        return (
                          <div key={sub.id} className="flex" style={{ height: CAL_SUB_ITEM_HEIGHT }}>
                            <div className="sticky left-0 z-10 flex items-center px-6" style={{ width: EXPANDED_W, background: CAL_SIDEBAR_BG }}>
                              <div className="ml-1 pl-5 border-l border-carbon/[0.15] flex-1">
                                <Link
                                  href={isLocked ? '#' : `${basePath}/${sub.route}`}
                                  className={`flex items-center justify-between py-1 px-3 -mx-3 rounded-[10px] transition-all ${
                                    isActive ? 'bg-carbon text-white'
                                    : isLocked ? 'text-carbon/25 cursor-not-allowed'
                                    : 'text-carbon hover:bg-carbon/[0.04]'
                                  }`}
                                >
                                  <span className={`text-[14px] ${isActive ? 'font-semibold text-white' : 'font-normal'}`}>
                                    {labelOf(sub.labelKey)}
                                  </span>
                                  {sub.isOutput && <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white/60' : 'text-carbon/40'}`} strokeWidth={2} />}
                                  {!sub.isOutput && skuPhaseCounts[sub.id] > 0 && (
                                    <span className={`text-[12px] font-normal tabular-nums ${isActive ? 'text-white/60' : 'text-carbon/40'}`}>{skuPhaseCounts[sub.id]}</span>
                                  )}
                                  {!sub.isOutput && state === 'completed' && !skuPhaseCounts[sub.id] && (
                                    <Check className="h-3.5 w-3.5 shrink-0 text-carbon" strokeWidth={2} />
                                  )}
                                </Link>
                              </div>
                            </div>
                            <div className="relative border-b border-carbon/[0.04]" style={{ width: calChartWidth, background: phase.bgColor + '15' }}>
                              {calMonths.map((m, i) => (
                                <div key={i} className="absolute top-0 h-full border-l border-carbon/[0.04]" style={{ left: m.startDay * CAL_DAY_WIDTH }} />
                              ))}
                              {calTodayOffset > 0 && calTodayOffset < calChartWidth && (
                                <div className="absolute top-0 h-full w-px bg-moss/40" style={{ left: calTodayOffset }} />
                              )}
                              <div className="absolute top-0 h-full w-px bg-carbon/40" style={{ left: calLaunchOffset }} />

                              {rowMilestones.map((m) => {
                                const pos = getBarPosition(m);
                                const isCompleted = m.status === 'completed';
                                const isInProgress = m.status === 'in-progress';
                                const isDragging = dragState?.milestoneId === m.id;
                                const barHeight = CAL_SUB_ITEM_HEIGHT - 12;
                                return (
                                  <div key={m.id} className={`absolute group/bar ${isDragging ? 'z-20' : 'z-[5]'}`} style={{ left: pos.left, width: pos.width, top: 6, height: barHeight, transition: isDragging ? 'none' : 'left 0.2s ease, width 0.2s ease' }}>
                                    {pos.width > 80 && (
                                      <button onClick={(e) => { e.stopPropagation(); cycleStatus(m.id, m.status); }} className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 hover:scale-125 transition-transform">
                                        <CalStatusIcon status={m.status} />
                                      </button>
                                    )}
                                    <div className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-10" onMouseDown={(e) => handleBarDragStart(e, m.id, 'resize-left')} />
                                    <div
                                      className={`w-full h-full rounded-full transition-shadow cursor-grab active:cursor-grabbing hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${isCompleted ? 'opacity-50' : ''} ${isDragging ? 'shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-2 ring-carbon/30' : ''}`}
                                      style={{
                                        backgroundColor: m.color,
                                        backgroundImage: isInProgress ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)' : undefined,
                                      }}
                                      onMouseDown={(e) => handleBarDragStart(e, m.id, 'move')}
                                      onDoubleClick={() => openEditor(m)}
                                    >
                                      {pos.width > 60 && (
                                        <div className="absolute inset-0 flex items-center px-3 overflow-hidden pointer-events-none">
                                          <span className={`text-[10px] font-semibold truncate tracking-[-0.01em] ${calBarTextColor(m.color)}`}>{m.nameEs}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10" onMouseDown={(e) => handleBarDragStart(e, m.id, 'resize-right')} />
                                    {!isDragging && (
                                      <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/bar:block z-30 pointer-events-none">
                                        <div className="bg-carbon text-white text-[11px] px-3 py-2 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] whitespace-nowrap">
                                          <div className="font-semibold text-[12px] tracking-[-0.01em]">{m.nameEs}</div>
                                          <div className="text-white/60 mt-1">{formatDate(pos.startDate)} → {formatDate(pos.endDate)}</div>
                                          <div className="text-white/50 mt-0.5">{pos.durationWeeks.toFixed(1)} semanas · {m.responsible}</div>
                                          {m.notes && <div className="text-citronella mt-1 text-[10px] max-w-[240px] break-words whitespace-normal">{m.notes}</div>}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom bar — calendar-specific tools only (Export / Reset /
              Saving). Mode switching lives in the top switcher, not here. */}
          <div className="flex-shrink-0 border-t border-carbon/[0.12] h-[52px] flex items-center justify-end px-6 gap-2" style={{ background: CAL_SIDEBAR_BG }}>
            <button
              onClick={async () => {
                if (!timeline) return;
                const { exportTimelineToExcel } = await import('@/lib/export-timeline-excel');
                await exportTimelineToExcel(timeline, 'es');
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
              title="Export"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {saving && (
              <span className="inline-flex items-center gap-1 text-[11px] text-carbon/50 ml-1">
                <Cloud className="w-3 h-3" /> Saving
              </span>
            )}
          </div>
        </div>

        {/* Editor modal — portal to escape the aside's stacking context */}
        {editingMilestone && clientMounted && timeline && (() => {
          const m = timeline.milestones.find(mm => mm.id === editingMilestone);
          if (!m) return null;
          const sd = getMilestoneDate(timeline.launchDate, editValues.startWeeksBefore);
          const ed = getMilestoneEndDate(timeline.launchDate, editValues.startWeeksBefore, editValues.durationWeeks);
          return createPortal(
            <div className="fixed inset-0 bg-carbon/40 z-[10000] flex items-center justify-center backdrop-blur-sm" onClick={() => setEditingMilestone(null)}>
              <div className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: m.color + '1F' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/50">{PHASES[m.phase as TimelinePhase].nameEs}</span>
                  <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.05em] bg-carbon/[0.04] text-carbon/60">{m.responsible}</span>
                </div>
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Nombre</label>
                    <input type="text" value={editValues.nameEs} onChange={(e) => setEditValues(v => ({ ...v, nameEs: e.target.value }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Inicio (sem. antes)</label>
                      <input type="number" step={0.5} value={editValues.startWeeksBefore} onChange={(e) => setEditValues(v => ({ ...v, startWeeksBefore: parseFloat(e.target.value) || 0 }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Duración (sem.)</label>
                      <input type="number" step={0.5} min={0.15} value={editValues.durationWeeks} onChange={(e) => setEditValues(v => ({ ...v, durationWeeks: parseFloat(e.target.value) || 0.5 }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono" />
                    </div>
                  </div>
                  <div className="text-[12px] text-carbon/50 bg-carbon/[0.03] px-4 py-2.5 rounded-[12px] tracking-[-0.01em]">{formatDate(sd)} → {formatDate(ed)}</div>
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Notas</label>
                    <textarea rows={2} value={editValues.notes} onChange={(e) => setEditValues(v => ({ ...v, notes: e.target.value }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed" placeholder="Añadir notas..." />
                  </div>
                </div>
                <div className="px-6 py-4 flex items-center gap-2 border-t border-carbon/[0.06]">
                  <button onClick={() => { if (confirm('¿Eliminar este hito?')) deleteMilestoneInline(editingMilestone!); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium text-error hover:bg-error/[0.06] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setEditingMilestone(null)} className="inline-flex items-center px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors">Cancelar</button>
                  <button onClick={saveEditor} className="inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors">Guardar</button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
      </aside>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onMobileClose} />
      )}

      <aside
        style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        className={`fixed left-0 top-0 bottom-0 z-50 p-3 transition-[width] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
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
                <Link href="/my-collections" className="block mb-4">
                  <Image
                    src="/images/aimily-logo-black.png"
                    alt="aimily"
                    width={774}
                    height={96}
                    className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity"
                    unoptimized
                  />
                </Link>
                <Link href={basePath} className="block group mb-4">
                  <p className="text-[13px] font-medium text-carbon transition-colors truncate">
                    {displayName}
                  </p>
                </Link>
                {modeSwitcher}
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
                      title={labelOf(block.labelKey)}
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
                          {labelOf(block.labelKey)}
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
                                  {labelOf(sub.labelKey)}
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

          {/* Mode switching now lives in the modeSwitcher at the top of
             the sidebar — no duplicate utility bar at the bottom. */}
        </div>
      </aside>
    </>
  );
}
