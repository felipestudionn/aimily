'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import type { ReactNode, ComponentType } from 'react';

/* ══════════════════════════════════════════════════════════════
   ViewPort — Animated view container

   Manages mounting/unmounting of content with smooth spring
   animations inspired by Daniel Cross / iPad-like transitions:
   - Exit:  opacity 0, scale 0.98, translateY 6px (subtle, fast)
   - Enter: opacity 1, scale 1,    translateY 0   (spring, slightly slower)
   - Timing: cubic-bezier(0.32, 0.72, 0, 1)
   ══════════════════════════════════════════════════════════════ */

const EXIT_DURATION = 250;   // ms — fast, subtle exit
const ENTER_DURATION = 450;  // ms — slightly slower, smooth spring enter
const SWAP_DELAY = 30;       // ms — tiny gap between exit and enter for DOM swap

interface ViewPortProps {
  /** Children = Next.js page content (dashboard / deep-linked workspace) */
  children: ReactNode;
  /** Whether to show children (page mode) or the lazy workspace */
  showPage: boolean;
  /** The lazy-loaded workspace component to show (null = page mode) */
  WorkspaceComponent: ComponentType<WorkspaceComponentProps> | null;
  /** Props to pass to the workspace component */
  workspaceProps: WorkspaceComponentProps;
}

export interface WorkspaceComponentProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  blockParam?: string;
}

/** Loading skeleton — matches card grid layout for seamless feel */
function WorkspaceLoadingSkeleton() {
  return (
    <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-16 animate-pulse">
      <div className="text-center mb-12">
        <div className="h-4 w-32 bg-carbon/[0.06] rounded-full mx-auto mb-4" />
        <div className="h-10 w-64 bg-carbon/[0.06] rounded-full mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-40 bg-white rounded-[20px]" />
        <div className="h-40 bg-white rounded-[20px]" />
        <div className="h-40 bg-white rounded-[20px]" />
        <div className="h-56 bg-white rounded-[20px] col-span-3" />
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

    // Phase 1: Exit current content (fast, subtle)
    setPhase('exiting');

    // Phase 2: Swap content and start enter animation
    timeoutRef.current = setTimeout(() => {
      setDisplayedContent(showPage ? 'page' : 'workspace');

      // Small RAF to ensure DOM has swapped before entering
      requestAnimationFrame(() => {
        setPhase('entering');

        // Phase 3: After enter completes, go idle
        timeoutRef.current = setTimeout(() => {
          setPhase('idle');
        }, ENTER_DURATION);
      });
    }, EXIT_DURATION + SWAP_DELAY);
  }, [showPage, cleanup]);

  // Dynamic styles based on phase
  const style: React.CSSProperties = (() => {
    switch (phase) {
      case 'exiting':
        return {
          opacity: 0,
          transform: 'scale(0.985) translateY(4px)',
          transition: `all ${EXIT_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        };
      case 'entering':
        return {
          opacity: 1,
          transform: 'scale(1) translateY(0)',
          transition: `all ${ENTER_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        };
      case 'idle':
      default:
        return {
          opacity: 1,
          transform: 'scale(1) translateY(0)',
        };
    }
  })();

  // When entering, start from the exit position
  const enterInitialStyle: React.CSSProperties = phase === 'entering' ? {} : {};

  return (
    <div
      className="will-change-[transform,opacity]"
      style={style}
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
