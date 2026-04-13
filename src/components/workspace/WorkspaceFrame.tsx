'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   WorkspaceFrame — standard wrapper for ALL workspaces.

   Provides consistent layout:
   - Collection name (small, grey) → context
   - Workspace title (large, black) → what you're working on
   - Optional mode selector slot
   - Centered content with max-width
   - Optional prev/next navigation between sub-items
   ═══════════════════════════════════════════════════════════ */

interface WorkspaceFrameProps {
  children: React.ReactNode;
  collectionName?: string;
  title: string;
  subtitle?: string;
  prevLabel?: string;
  prevHref?: string;
  nextLabel?: string;
  nextHref?: string;
  maxWidth?: string;
  modeSelector?: React.ReactNode;
}

export function WorkspaceFrame({
  children,
  collectionName,
  title,
  subtitle,
  prevLabel,
  prevHref,
  nextLabel,
  nextHref,
  maxWidth = '900px',
  modeSelector,
}: WorkspaceFrameProps) {
  const { id } = useParams();

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16 pb-16">

        {/* ── Header ── */}
        <div className="mb-10" style={{ maxWidth }}>
          {collectionName && (
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
              {collectionName}
            </p>
          )}
          <h1 className="text-[32px] md:text-[40px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-carbon/45 leading-[1.7] tracking-[-0.02em] mt-3 max-w-[600px]">
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Mode selector (Free/Assisted/AI) ── */}
        {modeSelector && (
          <div className="mb-10" style={{ maxWidth }}>
            {modeSelector}
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ maxWidth }}>
          {children}
        </div>

        {/* ── Prev / Next ── */}
        {(prevHref || nextHref) && (
          <div className="flex items-center justify-between mt-16 pt-8 border-t border-carbon/[0.06]" style={{ maxWidth }}>
            {prevHref ? (
              <Link
                href={prevHref}
                className="flex items-center gap-2 text-[13px] font-medium text-carbon/40 hover:text-carbon transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {prevLabel}
              </Link>
            ) : <div />}

            {nextHref ? (
              <Link
                href={nextHref}
                className="flex items-center gap-2 text-[13px] font-medium text-carbon/40 hover:text-carbon transition-colors"
              >
                {nextLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : <div />}
          </div>
        )}
      </div>
    </div>
  );
}
