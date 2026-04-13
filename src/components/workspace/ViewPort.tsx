'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import type { ReactNode, ComponentType } from 'react';

/* ══════════════════════════════════════════════════════════════
   ViewPort — Animated view container

   Manages mounting/unmounting of content with Daniel Cross
   spring animations:
   - Exit:  opacity 0, scale 0.96, translateY 8px
   - Enter: opacity 1, scale 1,    translateY 0, staggered
   - Timing: cubic-bezier(0.32, 0.72, 0, 1), 400-500ms
   ══════════════════════════════════════════════════════════════ */

const TRANSITION_DURATION = 400;  // ms
const ENTER_DELAY = 60;           // ms delay before enter animation starts

interface ViewPortProps {
  /** Children = Next.js page content (dashboard / deep-linked workspace) */
  children: ReactNode;
  /** Whether to show children (page mode) or the lazy workspace */
  showPage: boolean;
  /** The lazy-loaded workspace component to show (null = page mode) */
  WorkspaceComponent: ComponentType<WorkspaceComponentProps> | null;
  /** Props to pass to the workspace component */
  workspaceProps: WorkspaceComponentProps;
  /** Callback when exit animation completes (before enter) */
  onExitComplete?: () => void;
}

export interface WorkspaceComponentProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  blockParam?: string;
}

/** Loading skeleton shown while workspace component loads */
function WorkspaceLoadingSkeleton() {
  return (
    <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16 pb-16 animate-pulse">
      <div className="text-center mb-12">
        <div className="h-4 w-32 bg-carbon/[0.06] rounded mx-auto mb-4" />
        <div className="h-10 w-64 bg-carbon/[0.06] rounded mx-auto" />
      </div>
      <div className="max-w-[900px] mx-auto space-y-6">
        <div className="h-48 bg-carbon/[0.04] rounded-[20px]" />
        <div className="h-32 bg-carbon/[0.04] rounded-[20px]" />
      </div>
    </div>
  );
}

type Phase = 'idle' | 'exiting' | 'entering';

export function ViewPort({
  children,
  showPage,
  WorkspaceComponent,
  workspaceProps,
}: ViewPortProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [displayedContent, setDisplayedContent] = useState<'page' | 'workspace'>(
    showPage ? 'page' : 'workspace'
  );
  const prevShowPageRef = useRef(showPage);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (prevShowPageRef.current === showPage) return;
    prevShowPageRef.current = showPage;

    cleanup();

    // Phase 1: Exit current content
    setPhase('exiting');

    // Phase 2: After exit animation, swap content and enter
    timeoutRef.current = setTimeout(() => {
      setDisplayedContent(showPage ? 'page' : 'workspace');
      setPhase('entering');

      // Phase 3: After enter animation, go idle
      timeoutRef.current = setTimeout(() => {
        setPhase('idle');
      }, TRANSITION_DURATION + ENTER_DELAY);
    }, TRANSITION_DURATION);
  }, [showPage, cleanup]);

  const animationClass = (() => {
    switch (phase) {
      case 'exiting':
        return 'opacity-0 scale-[0.96] translate-y-2';
      case 'entering':
        return 'opacity-0 scale-[0.96] translate-y-2 animate-viewport-enter';
      case 'idle':
      default:
        return 'opacity-100 scale-100 translate-y-0';
    }
  })();

  return (
    <div
      className={`transition-all ease-[cubic-bezier(0.32,0.72,0,1)] ${animationClass}`}
      style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
    >
      {displayedContent === 'page' ? (
        children
      ) : WorkspaceComponent ? (
        <Suspense fallback={<WorkspaceLoadingSkeleton />}>
          <WorkspaceComponent {...workspaceProps} />
        </Suspense>
      ) : (
        <WorkspaceLoadingSkeleton />
      )}
    </div>
  );
}
