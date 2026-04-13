'use client';

import type { ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════════
   DecisionCard — Workspace content card

   Matches the visual language of the dashboard sub-block cards:
   - White surface, rounded-[20px], generous padding
   - Title + optional pill (status/label)
   - Consistent across all workspaces

   Variants:
   - Default (1 col): short inputs, selectors, toggles
   - Wide (2 cols): text-heavy content, profiles, descriptions
   - Full (3 cols): full-width sections
   ══════════════════════════════════════════════════════════════ */

export interface DecisionCardProps {
  children: ReactNode;
  /** Card title (section label) */
  title?: string;
  /** Optional description below title */
  description?: string;
  /** Column span: 1 (default), 2 (wide), 3 (full row) */
  span?: 1 | 2 | 3;
  /** Optional pill label (top-right) */
  pill?: string;
  /** Pill variant */
  pillVariant?: 'dark' | 'outline' | 'muted';
  /** Ghost number (e.g. "01") — large, faded, like sub-block cards */
  ghostNumber?: string;
  /** Additional className */
  className?: string;
}

export function DecisionCard({
  children,
  title,
  description,
  span = 1,
  pill,
  pillVariant = 'dark',
  ghostNumber,
  className = '',
}: DecisionCardProps) {
  const spanClass = span === 3 ? 'col-span-3' : span === 2 ? 'col-span-2' : 'col-span-1';

  const pillStyles = {
    dark: 'bg-carbon text-white',
    outline: 'border border-carbon/[0.15] text-carbon',
    muted: 'bg-carbon/[0.06] text-carbon/60',
  };

  return (
    <div className={`bg-white rounded-[20px] p-8 md:p-10 flex flex-col relative ${spanClass} ${className}`}>
      {/* Ghost number */}
      {ghostNumber && (
        <span className="absolute top-6 left-8 text-[48px] font-bold text-carbon/[0.04] leading-none tracking-[-0.04em] pointer-events-none select-none">
          {ghostNumber}
        </span>
      )}

      {/* Header: title + pill */}
      {(title || pill) && (
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && (
              <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-carbon">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[13px] text-carbon/40 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {pill && (
            <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-[-0.01em] shrink-0 ml-4 ${pillStyles[pillVariant]}`}>
              {pill}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DecisionCardGrid — Grid container for DecisionCards

   3-column grid on desktop, stacks on mobile.
   Full width of the workspace area.
   ══════════════════════════════════════════════════════════════ */

export interface DecisionCardGridProps {
  children: ReactNode;
  /** Number of columns (default 3) */
  columns?: 2 | 3;
  /** Additional className */
  className?: string;
}

export function DecisionCardGrid({
  children,
  columns = 3,
  className = '',
}: DecisionCardGridProps) {
  const gridClass = columns === 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-5'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';

  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  );
}
