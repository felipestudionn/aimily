'use client';

import { createContext, useContext } from 'react';

/* ══════════════════════════════════════════════════════════════
   Workspace Navigation Context

   Provides state-based navigation between dashboard, sub-dashboards,
   and workspace views — all without Next.js page navigation.
   Eliminates the flash caused by URL-based routing.
   ══════════════════════════════════════════════════════════════ */

export type ViewState =
  | { type: 'page' }  // Showing {children} from Next.js routing (initial load / deep link)
  | {
      type: 'workspace';
      workspaceId: string;   // e.g. 'creative', 'brand', 'merchandising', 'product', 'marketing/creation'
      route: string;         // full route segment e.g. 'creative?block=consumer'
      params?: Record<string, string>;  // parsed query params e.g. { block: 'consumer' }
    };

export interface WorkspaceNavigation {
  viewState: ViewState;
  /** Navigate to a workspace view (lazy-loaded, animated, no page navigation) */
  navigateToWorkspace: (workspaceId: string, route: string) => void;
  /** Navigate back to dashboard (may trigger real navigation if needed) */
  navigateToDashboard: () => void;
  /** Navigate to sub-dashboard (block expanded view) */
  navigateToSubDashboard: (blockId: string) => void;
  /** Collection context */
  collectionId: string;
  collectionName: string;
  season?: string;
}

const WorkspaceNavigationContext = createContext<WorkspaceNavigation | null>(null);

export function useWorkspaceNavigation(): WorkspaceNavigation {
  const ctx = useContext(WorkspaceNavigationContext);
  if (!ctx) {
    throw new Error('useWorkspaceNavigation must be used within WorkspaceShell');
  }
  return ctx;
}

/** Optional hook that returns null outside of WorkspaceShell (safe for pages loaded directly) */
export function useWorkspaceNavigationOptional(): WorkspaceNavigation | null {
  return useContext(WorkspaceNavigationContext);
}

export const WorkspaceNavigationProvider = WorkspaceNavigationContext.Provider;
