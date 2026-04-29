'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
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
  Plus,
} from 'lucide-react';
import { useWizardState } from '@/hooks/useWizardState';
import { useTimeline } from '@/contexts/TimelineContext';
import { useSkus } from '@/hooks/useSkus';
import { PresentationDeck } from '@/components/presentation/PresentationDeck';
import { SPINE } from '@/lib/presentation/spine';
import { DEFAULT_THEME_ID } from '@/lib/presentation/themes';
import type { ThemeId } from '@/lib/presentation/types';
import { usePresentationData } from '@/hooks/usePresentationData';
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
  | 'calendar' | 'presentation' | 'dashboard' | 'workspace';

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
const EXPANDED_W = 380;
/* Inner width of the visible sidebar card, after `aside p-3`. Used so the
   calendar mode's sticky label column spans exactly the same area as the
   nav mode's sidebar — same "common zone" in both views. */
const INNER_W = EXPANDED_W - 24;

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
  const router = useRouter();
  const { milestones } = useTimeline();
  const { phases } = useWizardState(milestones);
  const workspaceNav = useWorkspaceNavigationOptional();
  const t = useTranslation();
  const sidebarT = t.sidebar as Record<string, string>;
  const calT = (t.calendarPage || {}) as Record<string, string>;
  const labelOf = (key: SidebarLabelKey) => sidebarT[key] || key;
  const [collapsed, setCollapsed] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<TimelinePhase>>(
    new Set(SIDEBAR_BLOCKS.map((b) => b.id))
  );

  const basePath = `/collection/${collectionId}`;

  /* ══════════════════════════════════════════════════════════════
     Mode detection — URL drives the spine form, but we keep an
     INTERNAL state so mode changes are instant on click (no waiting
     for Next.js navigation to complete). URL still updates via
     history.pushState so refresh + deep-link work.
     ══════════════════════════════════════════════════════════════ */
  const modeFromUrl = (p: string | null | undefined): 'nav' | 'calendar' | 'presentation' =>
    p?.endsWith('/calendar') ? 'calendar'
    : p?.endsWith('/presentation') ? 'presentation'
    : 'nav';
  const [mode, setMode] = useState<'nav' | 'calendar' | 'presentation'>(modeFromUrl(pathname));
  /* Contraction flag — true during a covered→nav or covered→covered
     transition. Forces the aside back to EXPANDED_W while keeping the
     CURRENT inner rendered (so the morph visually contracts a familiar
     panel rather than snapping to stretched nav content mid-animation). */
  const [contractingOut, setContractingOut] = useState(false);
  /* All click-driven mode changes go through setMode manually (handleModeClick,
     exitCalendarToSubItem, exitCalendarToHref). We DON'T auto-sync from
     `usePathname()` because:
     (a) Next.js usePathname doesn't observe history.replaceState, which
         workspaceNav uses — we'd be syncing against stale data and flipping
         mode back to 'calendar' right after we exit.
     (b) When router.push fires during a mode change, pathname updates mid-
         animation and would race with our setMode timing.
     Browser back/forward is still covered via a popstate listener below. */
  useEffect(() => {
    const onPop = () => setMode(modeFromUrl(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* Exit calendar and open the workspace of a sub-item (Consumer,
     Brand Identity, Buying Strategy, …). Uses workspaceNav.navigateToWorkspace
     so the WorkspaceShell viewState flips to 'workspace' with the
     matching lazy component + blockParam — otherwise the stale
     previous viewState would show the wrong content and the sidebar
     would fall back to the first sub-item (Consumer) as "active". */
  const exitCalendarToSubItem = useCallback((subRoute: string) => {
    setContractingOut(true);
    /* Flip URL in parallel so WorkspaceShell's main starts its 900ms-
       delayed fade-in while the aside is contracting (concurrent
       covered→nav pattern, same as handleModeClick). */
    if (workspaceNav) {
      const routeBase = subRoute.split('?')[0];
      workspaceNav.navigateToWorkspace(routeBase, subRoute);
      router.replace(`${basePath}/${subRoute}`, { scroll: false });
    } else {
      router.push(`${basePath}/${subRoute}`);
    }
    setTimeout(() => {
      setContractingOut(false);
      setMode('nav');
    }, 1200);
  }, [router, workspaceNav, basePath]);

  /* Exit calendar to a plain URL (block sub-dashboard, dashboard, etc.).
     Used for block-header band clicks which navigate to basePath?block={phase}. */
  const exitCalendarToHref = useCallback((href: string) => {
    setContractingOut(true);
    router.push(href);
    setTimeout(() => {
      setContractingOut(false);
      setMode('nav');
    }, 1200);
  }, [router]);

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
    // In the Rubik's-cube navigation model, all mini-blocks are always
    // reachable — the user can jump between planning / design / marketing
    // at any time. Wizard-phase lock state only surfaces as 'completed'
    // now (for the checkmark); 'locked' is no longer returned.
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
  const [editValues, setEditValues] = useState<{ name: string; durationWeeks: number; startWeeksBefore: number; notes: string }>({ name: '', durationWeeks: 0, startWeeksBefore: 0, notes: '' });
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
      /* No click-to-navigate on bars — Felipe wants an explicit button.
         Clicking a bar is only for starting a drag. The hover tooltip
         has a dedicated "Ir al workspace" CTA that navigates. */
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
  }, [dragState, updateMilestone, exitCalendarToSubItem]);

  const cycleStatus = (id: string, current: MilestoneStatus) => {
    const next: MilestoneStatus = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'completed' : 'pending';
    updateMilestone(id, { status: next });
  };

  const openEditor = (m: TimelineMilestone) => {
    setEditingMilestone(m.id);
    setEditValues({ name: m.name, durationWeeks: m.durationWeeks, startWeeksBefore: m.startWeeksBefore, notes: m.notes || '' });
  };
  const saveEditor = () => {
    if (!editingMilestone) return;
    updateMilestone(editingMilestone, {
      name: editValues.name,
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
    { mode: 'nav' as const, label: labelOf('workspace'), path: '', Icon: LayoutDashboard },
    { mode: 'calendar' as const, label: labelOf('calendar'), path: '/calendar', Icon: CalendarDays },
    { mode: 'presentation' as const, label: labelOf('presentation'), path: '/presentation', Icon: Presentation },
  ];
  const handleModeClick = (e: React.MouseEvent<HTMLAnchorElement>, opt: typeof modeOptions[number]) => {
    e.preventDefault();
    if (mode === opt.mode) return;
    const target = opt.mode;
    const href = opt.path === '' ? basePath : `${basePath}${opt.path}`;
    /* Three transitions, all respecting the cube morph:
       (1) nav → covered        : main fades out first (250ms), then aside
           expands 380→100vw (1.2s) while the target's inner renders.
       (2) covered → nav        : contractingOut=true keeps the CURRENT
           inner rendered while the aside contracts 100vw→380 (1.2s).
           URL flips in parallel so main starts its 900ms-delayed fade-in.
           At t=1200, swap to 'nav' and clear the flag.
       (3) covered → covered    : contractingOut first (full 1.2s contract
           with the current inner still visible), THEN push + setMode so
           the aside re-expands to the new mode's inner. Feels like the
           cube rotating back to nav then into the other face. */
    if (mode === 'nav' && target !== 'nav') {
      /* (1) entry */
      router.push(href);
      setTimeout(() => setMode(target), 550);
    } else if (target === 'nav') {
      /* (2) covered → nav — concurrent: contract + URL flip */
      setContractingOut(true);
      router.push(href);
      setTimeout(() => {
        setContractingOut(false);
        setMode('nav');
      }, 1200);
    } else {
      /* (3) covered → covered — sequential: full contract, then re-expand */
      setContractingOut(true);
      setTimeout(() => {
        setContractingOut(false);
        router.push(href);
        setMode(target);
      }, 1200);
    }
  };
  /* Fixed width = INNER_W (356) − px-5 padding (40) = 316. Pinning the
     switcher width keeps icons/labels at their resting size during the
     calendar→nav width animation (the container would otherwise be wider
     mid-transition, stretching the pills). */
  const modeSwitcher = (
    <div
      className="flex items-center gap-0.5 rounded-full bg-carbon/[0.04] p-1"
      style={{ width: INNER_W - 40 }}
    >
      {modeOptions.map((opt) => {
        const active = mode === opt.mode;
        const href = opt.path === '' ? basePath : `${basePath}${opt.path}`;
        return (
          <Link
            key={opt.mode}
            href={href}
            onClick={(e) => handleModeClick(e, opt)}
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
  /* Calendar inner content — rendered conditionally inside the SAME <aside>
     as the nav inner content (below), so React reconciles the element and
     the CSS width transition animates smoothly. */
  const calendarInner = mode === 'calendar' ? (
    <>
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
            <div style={{ minWidth: INNER_W + calChartWidth }}>
              {/* Header row: logo+name+switcher (sticky, same padding as nav mode
                  to avoid visual shift when switching modes) | month header.
                  No fixed height — content drives it, matching nav mode naturally. */}
              <div className="flex items-stretch">
                <div
                  className="sticky left-0 z-30 flex flex-col px-5 pt-7 pb-6"
                  style={{ width: INNER_W, background: CAL_SIDEBAR_BG }}
                >
                  <Link href="/my-collections" className="block mb-5">
                    <Image src="/images/aimily-logo-black.png" alt="aimily" width={774} height={96} className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity" unoptimized />
                  </Link>
                  {modeSwitcher}
                </div>
                <div className="relative flex items-end" style={{ width: calChartWidth }}>
                  <div className="relative w-full" style={{ height: 46 }}>
                    {calMonths.map((month, i) => (
                      <div key={i} className="absolute top-0 h-full flex items-end border-l border-carbon/[0.15]" style={{ left: month.startDay * CAL_DAY_WIDTH, width: month.days * CAL_DAY_WIDTH }}>
                        <span className="px-2 pb-2 text-[11px] font-semibold text-carbon/80 tracking-[0.02em] uppercase whitespace-nowrap">{month.name} {month.year}</span>
                      </div>
                    ))}
                    {calTodayOffset > 0 && calTodayOffset < calChartWidth && (
                      <div className="absolute top-0 h-full w-px bg-moss z-10" style={{ left: calTodayOffset }}>
                        <div className="absolute top-0 -left-3 px-1.5 py-0.5 bg-moss text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">{calT.todayMarker}</div>
                      </div>
                    )}
                    <div className="absolute top-0 h-full w-px bg-carbon z-10" style={{ left: calLaunchOffset }}>
                      <div className="absolute top-0 -left-6 px-1.5 py-0.5 bg-carbon text-white text-[9px] font-semibold rounded-b tracking-[0.1em]">{calT.launchMarker}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="sticky left-0 h-px bg-carbon/[0.12]" style={{ minWidth: INNER_W + calChartWidth }} />

              {/* Nav rows — same SIDEBAR_BLOCKS + labelOf() as nav mode,
                  preceded by the Overview top-level item (shared across
                  the three cube faces; in calendar it takes you back to
                  the collection dashboard). */}
              <div className="pt-6 pb-4 flex flex-col">
                {/* Overview row — row-level so the stick-left column carries
                    it and the right track stays empty (Overview has no
                    timeline bars). */}
                <div className="flex mb-4">
                  <div className="sticky left-0 z-20 px-6" style={{ width: INNER_W, background: CAL_SIDEBAR_BG }}>
                    <button
                      type="button"
                      onClick={() => exitCalendarToHref(basePath)}
                      className="w-full flex items-center px-4 py-2.5 rounded-full text-carbon hover:bg-carbon/[0.04] transition-all"
                    >
                      <span className="text-[17px] font-bold tracking-[-0.03em] flex-1 text-left truncate">
                        {displayName}
                      </span>
                    </button>
                  </div>
                  <div className="flex-1" style={{ width: calChartWidth }} />
                </div>
                {/* Divider below Overview so it reads as a top-level item
                    above the 4 blocks — same visual weight as in nav mode. */}
                <div className="sticky left-0 mb-5 border-t border-carbon/[0.08]" style={{ minWidth: INNER_W + calChartWidth, marginLeft: 24, marginRight: 24 }} />

                {SIDEBAR_BLOCKS.map((block) => {
                  const phase = PHASES[block.id];
                  return (
                    <div key={block.id} className="mb-5">
                      {/* Block header row — same py-2.5 + mb-3 as nav, track on right */}
                      <div className="flex mb-3">
                        <div className="sticky left-0 z-20 px-6" style={{ width: INNER_W, background: CAL_SIDEBAR_BG }}>
                          <Link
                            href={`${basePath}?block=${block.id}`}
                            onClick={(e) => { e.preventDefault(); exitCalendarToHref(`${basePath}?block=${block.id}`); }}
                            className="w-full px-4 py-2.5 rounded-full flex items-center bg-carbon/[0.04] hover:bg-carbon/[0.06] transition-colors"
                          >
                            <span className="text-[15px] font-bold tracking-[-0.01em] text-carbon truncate">{labelOf(block.labelKey)}</span>
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => exitCalendarToHref(`${basePath}?block=${block.id}`)}
                          className="relative cursor-pointer hover:brightness-95 transition"
                          style={{ width: calChartWidth, background: phase.bgColor + '77' }}
                          title={calT.openBlockDashboard}
                        >
                          {calTodayOffset > 0 && calTodayOffset < calChartWidth && (
                            <div className="absolute top-0 bottom-0 w-px bg-moss/50" style={{ left: calTodayOffset }} />
                          )}
                          <div className="absolute top-0 bottom-0 w-px bg-carbon/50" style={{ left: calLaunchOffset }} />
                        </button>
                      </div>

                      {/* Sub-item rows with tracks */}
                      {block.subItems.map((sub) => {
                        const state = getSubItemState(sub, block);
                        const isLocked = state === 'locked';
                        const isActive = state === 'active';
                        const rowMilestones = calMilestonesByRow[sub.id] || [];
                        return (
                          <div key={sub.id} className="flex" style={{ height: CAL_SUB_ITEM_HEIGHT }}>
                            <div className="sticky left-0 z-10 flex items-center px-6" style={{ width: INNER_W, background: CAL_SIDEBAR_BG }}>
                              <div className="ml-1 pl-5 border-l border-carbon/[0.15] flex-1">
                                <Link
                                  href={isLocked ? '#' : `${basePath}/${sub.route}`}
                                  onClick={(e) => {
                                    if (isLocked) { e.preventDefault(); return; }
                                    e.preventDefault();
                                    exitCalendarToSubItem(sub.route);
                                  }}
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
                            <div className="relative border-b border-carbon/[0.08]" style={{ width: calChartWidth, background: phase.bgColor + '22' }}>
                              {calMonths.map((m, i) => (
                                <div key={i} className="absolute top-0 h-full border-l border-carbon/[0.10]" style={{ left: m.startDay * CAL_DAY_WIDTH }} />
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
                                      className={`w-full h-full rounded-full transition-all duration-200 cursor-grab active:cursor-grabbing group-hover/bar:shadow-[0_4px_16px_rgba(0,0,0,0.10),inset_0_0_0_1px_rgba(255,255,255,0.18)] ${isCompleted ? 'opacity-50' : ''} ${isDragging ? 'shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-2 ring-carbon/30' : ''}`}
                                      style={{
                                        backgroundColor: m.color,
                                        backgroundImage: isInProgress ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)' : undefined,
                                      }}
                                      onMouseDown={(e) => handleBarDragStart(e, m.id, 'move')}
                                      onDoubleClick={() => openEditor(m)}
                                    />
                                    {/* Hover-only "+" affordance — bar stays bare in repose
                                        (clean canvas), but a faint plus fades in when the
                                        cursor approaches, telegraphing "more here". Combined
                                        with the inset highlight + drop shadow on the bar
                                        itself, you get a tactile button feel. Hidden on
                                        narrow bars where the icon would crowd the geometry. */}
                                    {pos.width > 60 && !isDragging && (
                                      <Plus
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 group-hover/bar:opacity-70 transition-opacity duration-150 pointer-events-none"
                                        strokeWidth={2.5}
                                      />
                                    )}
                                    <div className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10" onMouseDown={(e) => handleBarDragStart(e, m.id, 'resize-right')} />
                                    {!isDragging && (() => {
                                      // Look up the mini-block's sub.route so the CTA button can
                                      // route cleanly through exitCalendarToSubItem.
                                      const subId = MILESTONE_TO_MINI_BLOCK[m.id];
                                      let routeForBar: string | null = null;
                                      if (subId) {
                                        for (const b of SIDEBAR_BLOCKS) {
                                          const s = b.subItems.find(si => si.id === subId);
                                          if (s) { routeForBar = s.route; break; }
                                        }
                                      }
                                      return (
                                        <div
                                          className="absolute bottom-full left-0 pb-1.5 hidden group-hover/bar:block z-30"
                                          onMouseDown={(e) => e.stopPropagation()}
                                        >
                                          <div className="bg-carbon text-white text-[11px] px-3 py-2 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] whitespace-nowrap">
                                            <div className="font-semibold text-[12px] tracking-[-0.01em]">{m.name}</div>
                                            <div className="text-white/60 mt-1">{formatDate(pos.startDate)} → {formatDate(pos.endDate)}</div>
                                            <div className="text-white/50 mt-0.5">{pos.durationWeeks.toFixed(1)} {calT.weeks} · {m.responsible}</div>
                                            {m.notes && <div className="text-citronella mt-1 text-[10px] max-w-[240px] break-words whitespace-normal">{m.notes}</div>}
                                            {routeForBar && (
                                              <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => { e.stopPropagation(); exitCalendarToSubItem(routeForBar!); }}
                                                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-carbon text-[11px] font-semibold hover:bg-white/90 transition-colors"
                                              >
                                                {calT.openWorkspace}
                                                <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
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
              title={calT.exportLabel}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
              title={calT.resetLabel}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {saving && (
              <span className="inline-flex items-center gap-1 text-[11px] text-carbon/50 ml-1">
                <Cloud className="w-3 h-3" /> {calT.savingLabel}
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
                  <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/50">{PHASES[m.phase as TimelinePhase].name}</span>
                  <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.05em] bg-carbon/[0.04] text-carbon/60">{m.responsible}</span>
                </div>
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{calT.nameField}</label>
                    <input type="text" value={editValues.name} onChange={(e) => setEditValues(v => ({ ...v, name: e.target.value }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{calT.startLabel}</label>
                      <input type="number" step={0.5} value={editValues.startWeeksBefore} onChange={(e) => setEditValues(v => ({ ...v, startWeeksBefore: parseFloat(e.target.value) || 0 }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{calT.durationLabel}</label>
                      <input type="number" step={0.5} min={0.15} value={editValues.durationWeeks} onChange={(e) => setEditValues(v => ({ ...v, durationWeeks: parseFloat(e.target.value) || 0.5 }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors font-mono" />
                    </div>
                  </div>
                  <div className="text-[12px] text-carbon/50 bg-carbon/[0.03] px-4 py-2.5 rounded-[12px] tracking-[-0.01em]">{formatDate(sd)} → {formatDate(ed)}</div>
                  <div>
                    <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Notas</label>
                    <textarea rows={2} value={editValues.notes} onChange={(e) => setEditValues(v => ({ ...v, notes: e.target.value }))} className="w-full mt-2 px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed" placeholder={calT.notesPlaceholder} />
                  </div>
                </div>
                <div className="px-6 py-4 flex items-center gap-2 border-t border-carbon/[0.06]">
                  <button onClick={() => { if (confirm(calT.deleteConfirm)) deleteMilestoneInline(editingMilestone!); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium text-error hover:bg-error/[0.06] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> {calT.deleteLabel}
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setEditingMilestone(null)} className="inline-flex items-center px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors">{calT.cancel}</button>
                  <button onClick={saveEditor} className="inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors">{calT.save}</button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
    </>
  ) : null;

  const asideWidth = contractingOut
    ? EXPANDED_W
    : (mode === 'calendar' || mode === 'presentation')
      ? '100vw'
      : (collapsed ? COLLAPSED_W : EXPANDED_W);

  /* Exit presentation → same concurrent contract+push pattern as
     handleModeClick's covered→nav branch (keeps the deck visible
     shrinking while the aside contracts, then swaps to nav content
     at the end). */
  const exitPresentation = useCallback(() => {
    setContractingOut(true);
    router.push(basePath);
    setTimeout(() => {
      setContractingOut(false);
      setMode('nav');
    }, 1200);
  }, [router, basePath]);

  /* Presentation owns its slide index + theme at the sidebar level so
     the LEFT spine column and the RIGHT deck canvas stay in sync. */
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [presentationThemeId, setPresentationThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);

  /* Fetch slide-shaped CIS data once when the user enters presentation
     mode. Cached per collectionId for the session. Templates render
     editorial placeholders while loading / when a slide has no data.
     `refetch` is called by PresentationDeck after save/revert so the
     deck re-renders with the latest merged overrides. */
  const { data: presentationData, refetch: refetchPresentationData } = usePresentationData(collectionId, mode === 'presentation');

  const presentationTitles = useMemo(
    () => Object.fromEntries(SPINE.map(s => [s.titleKey, labelOf(s.titleKey as SidebarLabelKey)])),
    [labelOf],
  );

  /* ── Presentation inner — mirrors calendarInner's split: persistent
     spine column on the LEFT (logo + name + mode switcher + 20-slide
     index), deck canvas on the RIGHT. Same DOM <aside> as nav and
     calendar so the cube width-morph stays uninterrupted. */
  const presentationInner = mode === 'presentation' ? (
    /* One unified rounded container (same pattern as calendar): LEFT
       spine column and RIGHT deck live inside it, no gap, so the spine
       sits at exactly the same X as in nav and calendar modes. */
    <div
      className="flex h-full rounded-[16px] overflow-hidden"
      style={{ background: CAL_SIDEBAR_BG }}
    >
      {/* LEFT — persistent spine column (INNER_W wide on md+). Hidden
          on mobile so the deck canvas takes the full viewport; users
          navigate via the deck's prev/next and slide pager. */}
      <div
        className="flex-shrink-0 hidden md:flex flex-col"
        style={{ width: INNER_W, background: CAL_SIDEBAR_BG }}
      >
        {/* Header: logo + mode switcher. The collection name now lives
            in the Overview pill below (it's the collection-level entry
            point), so we removed it from here to reduce duplication
            and give the switcher more breathing room. */}
        <div className="shrink-0 px-5 pt-7 pb-6">
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
          {modeSwitcher}
        </div>

        {/* Hairline separator between header and scroll list — matches
           nav mode exactly (mx-5, border-carbon/[0.12]) so the Y
           position of the first block pill is pixel-identical. */}
        <div className="mx-5 border-t border-carbon/[0.12] shrink-0" />

        {/* Spine — Overview (slide 0) + 20 mini-block slides. px-6 pt-6
           matches nav's <nav> padding so the Overview button and block
           pills land at the same X as in nav mode. */}
        <div className="flex-1 overflow-y-auto scrollbar-subtle px-6 pt-6 pb-4">
          {/* Overview — labelled with the collection name so the sidebar
              anchor doubles as "this is the collection I'm in" and
              "click here for the cover slide". */}
          <button
            type="button"
            onClick={() => setPresentationIndex(0)}
            className={`w-full flex items-center px-4 py-2.5 rounded-full mb-4 transition-all ${
              presentationIndex === 0
                ? 'bg-carbon text-white'
                : 'text-carbon hover:bg-carbon/[0.04]'
            }`}
          >
            <span className="text-[17px] font-bold tracking-[-0.03em] flex-1 text-left truncate">
              {displayName}
            </span>
          </button>
          <div className="border-t border-carbon/[0.08] mb-5" />

          {SIDEBAR_BLOCKS.map((block, bIdx) => (
            <div key={block.id} className="mb-5">
              <div className="px-4 py-2.5 rounded-full bg-carbon/[0.04] mb-3 flex items-center justify-between gap-3">
                <span className="text-[15px] font-bold tracking-[-0.01em] text-carbon truncate">
                  {labelOf(block.labelKey)}
                </span>
                <span className="inline-flex items-center justify-center h-6 min-w-6 text-[13px] font-bold tracking-[-0.01em] text-carbon/35 tabular-nums shrink-0">
                  {bIdx + 1}
                </span>
              </div>
              <div className="ml-1 pl-5 border-l border-carbon/[0.15]">
                {block.subItems.map((sub, sIdx) => {
                  /* Cover occupies slot 0, so mini-block indices shift by +1. */
                  const slideIdx = bIdx * 5 + sIdx + 1;
                  const isActive = presentationIndex === slideIdx;
                  /* SPINE[slideIdx - 1].id gives the canonical slide id
                     (differs from sub.id in some blocks, e.g. sidebar
                     'scenarios' → spine 'buying-strategy'). Used to
                     check if the slide has deck overrides applied. */
                  const spineSlideId = SPINE[slideIdx - 1]?.id;
                  const hasOverride = !!spineSlideId && !!presentationData?.overrides[spineSlideId];
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setPresentationIndex(slideIdx)}
                      className={`w-full flex items-center gap-3 py-1.5 px-3 -mx-3 rounded-[10px] transition-all ${
                        isActive ? 'bg-carbon text-white' : 'text-carbon hover:bg-carbon/[0.04]'
                      }`}
                    >
                      <span className={`text-[14px] truncate flex-1 text-left ${isActive ? 'font-semibold' : 'font-normal'}`}>
                        {labelOf(sub.labelKey)}
                      </span>
                      {hasOverride && (
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0 bg-citronella"
                          title="Edited · differs from the auto-generated content"
                        />
                      )}
                      <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${isActive ? 'text-white/55' : 'text-carbon/35'}`}>
                        {bIdx + 1}.{sIdx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — deck canvas fills the remainder */}
      <div
        className="flex-1 min-w-0 overflow-hidden"
        style={{ background: '#0A0A0A' }}
      >
        <PresentationDeck
          meta={{
            collectionName: displayName,
            brandName: presentationData?.cover.brandName,
            season: presentationData?.cover.season ?? season,
            launchDate: presentationData?.cover.launchDate ?? launchDate,
          }}
          collectionId={collectionId}
          titles={presentationTitles}
          coverSubtitle={calT.coverSubtitle ?? 'A collection presentation'}
          data={presentationData}
          index={presentationIndex}
          themeId={presentationThemeId}
          onIndexChange={setPresentationIndex}
          onThemeChange={setPresentationThemeId}
          onExit={exitPresentation}
          onDataChanged={refetchPresentationData}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      {mobileOpen && mode === 'nav' && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onMobileClose} />
      )}

      <aside
        style={{
          width: asideWidth,
          background: (mode === 'calendar' || mode === 'presentation') ? '#F3F2F0' : undefined,
        }}
        className={`fixed left-0 top-0 bottom-0 z-50 p-3 transition-[width] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          (mobileOpen || mode !== 'nav') ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {mode === 'calendar' && calendarInner}
        {mode === 'presentation' && presentationInner}
        {mode === 'nav' && (<>
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
               Header: aimily logo + mode switcher.
               Collection name moved down into the Overview pill —
               it's the collection-level entry so it doubles as
               "this is the collection I'm in".
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
            {/* Overview — top-level item above the 4 blocks. Lives outside
                the SIDEBAR_BLOCKS loop because it's the collection-level
                entry, not a block. Shared across nav / calendar / presentation
                at the same Y offset so the cube morph stays pixel-aligned. */}
            {!collapsed && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (workspaceNav) workspaceNav.navigateToDashboard();
                    else router.push(basePath);
                  }}
                  className={`w-full flex items-center px-4 py-2.5 rounded-full mb-4 transition-all ${
                    pathname === basePath && !searchParams?.get('block')
                      ? 'bg-carbon text-white'
                      : 'text-carbon hover:bg-carbon/[0.04]'
                  }`}
                >
                  <span className="text-[17px] font-bold tracking-[-0.03em] flex-1 text-left truncate">
                    {displayName}
                  </span>
                </button>
                <div className="border-t border-carbon/[0.08] -mx-0 mb-5" />
              </>
            )}
            {collapsed && (
              <button
                type="button"
                onClick={() => {
                  if (workspaceNav) workspaceNav.navigateToDashboard();
                  else router.push(basePath);
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-[10px] mb-4 transition-all ${
                  pathname === basePath && !searchParams?.get('block')
                    ? 'bg-carbon text-white'
                    : 'text-carbon/60 hover:bg-carbon/[0.04]'
                }`}
                title={displayName}
              >
                {/* First two letters of the collection name — tiny mark
                    for the collapsed sidebar (no icon needed). */}
                <span className="text-[11px] font-bold tabular-nums tracking-[-0.02em]">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              </button>
            )}
            {SIDEBAR_BLOCKS.map((block) => {
              const blockActive = isBlockActive(block);
              const blockProgress = getBlockProgress(block);
              const blockPhases = block.phaseIds.map((id) => phaseMap.get(id)).filter(Boolean) as WizardPhaseStatus[];
              const allLocked = block.id === 'development' ? false : blockPhases.every((p) => p.state === 'locked');
              const allCompleted = blockPhases.length > 0 && blockPhases.every((p) => p.state === 'completed');
              const blockHref = `${basePath}?block=${block.id}`;
              const isExpanded = expandedBlocks.has(block.id);

              // Per-phase accent for the sidebar pill — same colour the
              // user saw on the launch canvas and on the dashboard cards.
              const phaseAccent = PHASES[block.id]?.color || '#B6C8C7';

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
                      style={!allLocked ? { backgroundColor: phaseAccent } : undefined}
                      className={`w-10 h-10 flex items-center justify-center rounded-[10px] transition-all ${
                        allLocked ? 'opacity-25 cursor-not-allowed'
                        : 'hover:opacity-90'
                      }`}
                      title={labelOf(block.labelKey)}
                    >
                      <block.icon
                        className="h-[18px] w-[18px] text-carbon"
                        strokeWidth={1.5}
                      />
                    </Link>
                  ) : (
                    <>
                      {/* ── Block header: label navigates, chevron toggles. Painted with the phase accent so the sidebar reads as 4 colour-coded sections at a glance. ── */}
                      <div
                        style={!allLocked ? { backgroundColor: phaseAccent } : undefined}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-full mb-3 transition-colors ${
                          allLocked ? 'opacity-25 bg-carbon/[0.04]' : ''
                        }`}
                      >
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
                                style={state === 'active' ? { backgroundColor: phaseAccent } : undefined}
                                className={`flex items-center justify-between py-2 px-3 -mx-3 rounded-[10px] transition-all ${
                                  state === 'active'
                                    ? 'text-carbon'
                                    : state === 'locked'
                                    ? 'text-carbon/25 cursor-not-allowed'
                                    : 'text-carbon hover:bg-carbon/[0.04]'
                                }`}
                              >
                                <span className={`text-[14px] ${
                                  state === 'active' ? 'font-semibold' : 'font-normal'
                                }`}>
                                  {labelOf(sub.labelKey)}
                                </span>

                                {/* Output items → arrow */}
                                {sub.isOutput && (
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-carbon/55" strokeWidth={2} />
                                )}

                                {/* SKU count badge */}
                                {!sub.isOutput && skuPhaseCounts[sub.id] > 0 && (
                                  <span className="text-[12px] font-normal tabular-nums text-carbon/55">
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
        </>)}
      </aside>
    </>
  );
}
