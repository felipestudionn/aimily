'use client';

import { useState, useCallback, useMemo, type ReactNode, type ComponentType } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { WizardSidebar } from '@/components/wizard/WizardSidebar';
import { Navbar } from '@/components/layout/navbar';
import { TimelineProvider } from '@/contexts/TimelineContext';
import { WorkspaceNavigationProvider, type ViewState } from './workspace-context';
import { ViewPort, type WorkspaceComponentProps } from './ViewPort';
import { resolveWorkspace } from './workspace-registry';
import type { TimelineMilestone } from '@/types/timeline';

/* ══════════════════════════════════════════════════════════════
   WorkspaceShell — Unified view orchestrator

   Replaces CollectionHubShell + WizardLayout with a single
   component that manages animated transitions between:
   - Dashboard (page children from Next.js routing)
   - Sub-dashboards (page children with ?block= param)
   - Workspaces (lazy-loaded components, no page navigation)

   The key insight: {children} is always the dashboard/page content
   from Next.js routing. When navigating to a workspace, we HIDE
   children and show a lazy-loaded workspace component instead.
   URL is updated via window.history so deep-links work.
   ══════════════════════════════════════════════════════════════ */

/* ── Sidebar widths (match WizardSidebar constants) ── */
const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_EXPANDED = 380;

interface WorkspaceShellProps {
  children: ReactNode;
  collectionId: string;
  collectionName: string;
  season?: string;
  milestones: TimelineMilestone[];
  launchDate?: string | null;
  skuCount?: number;
  setupData?: Record<string, unknown> | null;
}

export function WorkspaceShell({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
  launchDate,
  skuCount,
  setupData,
}: WorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState(collectionName);

  /* The spine covers <main> in BOTH calendar and presentation modes —
     in each, the aside expands to 100vw and renders its own canvas
     (timeline / slide deck). Workspace stays underneath but invisible
     so the cube morph is uninterrupted. */
  const isCovered = !!pathname && (pathname.endsWith('/calendar') || pathname.endsWith('/presentation'));

  /* ── View state: 'page' = show children, 'workspace' = show lazy component ── */
  const [viewState, setViewState] = useState<ViewState>({ type: 'page' });

  /* ── Resolved workspace component (null when showing page) ── */
  const [WorkspaceComponent, setWorkspaceComponent] = useState<ComponentType<WorkspaceComponentProps> | null>(null);
  const [workspaceFullWidth, setWorkspaceFullWidth] = useState(false);

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const basePath = `/collection/${collectionId}`;

  /* ── Navigate to a workspace (state-based, no page navigation) ── */
  const navigateToWorkspace = useCallback((workspaceId: string, route: string) => {
    const resolved = resolveWorkspace(route);
    if (!resolved) {
      // Fallback: if workspace not in registry, use real navigation
      router.push(`${basePath}/${route}`);
      return;
    }

    // Determine blockParam from route params
    const blockParam = resolved.params.block || resolved.params.phase || undefined;

    // Update view state
    setViewState({
      type: 'workspace',
      workspaceId: resolved.workspaceId,
      route,
      params: resolved.params,
    });

    // Set the component (triggers ViewPort transition)
    setWorkspaceComponent(() => resolved.component);
    setWorkspaceFullWidth(resolved.fullWidth);

    // Update URL without Next.js navigation (deep-linking support)
    const newUrl = `${basePath}/${route}`;
    window.history.replaceState(
      { ...window.history.state, workspaceView: route },
      '',
      newUrl,
    );
  }, [basePath, router]);

  /* ── Navigate back to dashboard ── */
  const navigateToDashboard = useCallback(() => {
    if (viewState.type === 'page') {
      // Already showing page — navigate to dashboard via Next.js
      router.push(basePath);
      return;
    }

    // Clear workspace view, show children
    setViewState({ type: 'page' });
    setWorkspaceComponent(null);
    setWorkspaceFullWidth(false);

    // Navigate to dashboard (real navigation to reset children to dashboard page)
    router.replace(basePath, { scroll: false });
  }, [viewState, basePath, router]);

  /* ── Navigate to sub-dashboard (block expanded in dashboard) ── */
  const navigateToSubDashboard = useCallback((blockId: string) => {
    if (viewState.type === 'workspace') {
      // Coming from a workspace — need to go back to page mode first
      setViewState({ type: 'page' });
      setWorkspaceComponent(null);
      setWorkspaceFullWidth(false);
    }

    // Navigate to dashboard with ?block= param
    router.replace(`${basePath}?block=${blockId}`, { scroll: false });
  }, [viewState, basePath, router]);

  /* ── Build workspace props ── */
  const workspaceProps: WorkspaceComponentProps = useMemo(() => {
    const params = viewState.type === 'workspace' ? viewState.params : undefined;
    return {
      collectionId,
      collectionName: displayName,
      season,
      blockParam: params?.block || params?.phase || undefined,
    };
  }, [collectionId, displayName, season, viewState]);

  /* ── Navigation context value ── */
  const navContextValue = useMemo(() => ({
    viewState,
    navigateToWorkspace,
    navigateToDashboard,
    navigateToSubDashboard,
    collectionId,
    collectionName: displayName,
    season,
  }), [viewState, navigateToWorkspace, navigateToDashboard, navigateToSubDashboard, collectionId, displayName, season]);

  const showPage = viewState.type === 'page';

  return (
    <TimelineProvider collectionPlanId={collectionId} initialMilestones={milestones}>
      <WorkspaceNavigationProvider value={navContextValue}>
        {/* ── Persistent top navbar — shifts right for sidebar ── */}
        <Navbar
          variant="workspace"
          collectionName={displayName}
          collectionId={collectionId}
          sidebarWidth={sidebarWidth}
          onCollectionRename={setDisplayName}
        />

        {/* ── Floating sidebar ── */}
        <WizardSidebar
          collectionId={collectionId}
          collectionName={displayName}
          season={season}
          launchDate={launchDate}
          skuCount={skuCount}
          setupData={setupData}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Mobile hamburger — floating pill */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-[72px] left-4 z-30 w-10 h-10 rounded-full bg-white shadow-card text-carbon/60 flex items-center justify-center hover:shadow-card-hover transition-shadow"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* ── Main content — offset by sidebar width on md+.
             On mobile the sidebar is off-screen (drawer), so content
             takes the full viewport. Opacity choreography: instant
             fade-out when going into calendar/presentation, delayed
             fade-in when returning to nav. */}
        <main
          className="ml-0 md:ml-[var(--sb-w)] pt-16 min-h-screen transition-opacity ease-out"
          style={{
            ['--sb-w' as string]: `${sidebarWidth}px`,
            opacity: isCovered ? 0 : 1,
            transitionDuration: isCovered ? '250ms' : '400ms',
            transitionDelay: isCovered ? '0ms' : '900ms',
          }}
        >
          <ViewPort
            showPage={showPage}
            WorkspaceComponent={WorkspaceComponent}
            workspaceProps={workspaceProps}
          >
            {children}
          </ViewPort>
        </main>
      </WorkspaceNavigationProvider>
    </TimelineProvider>
  );
}
