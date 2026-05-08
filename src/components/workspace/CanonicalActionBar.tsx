'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Check, Loader2 } from 'lucide-react';

/**
 * Canonical confirm bar — used at the bottom of every mini-block that
 * follows the entry → propose → confirm pattern locked in Sprint A.
 *
 * Layout: justify-between row, "Modificar" (left, ghost) + primary
 * confirm CTA (right, carbon pill). Replaces the legacy "Validar y
 * Continuar" centered floating button across Block 1 (already updated)
 * and now Block 2 mini-blocks.
 *
 * Why a portal to document.body:
 * The WorkspaceShell ViewPort wrapper applies `will-change: transform`
 * to handle workspace transitions. That CSS prop creates a stacking
 * context AND a containing block, which silently breaks
 * `position: sticky` and `position: fixed` for any descendant — same
 * bug we hit with the Block 1 → Block 2 handoff overlay (see
 * memory/handoff_block-2-merchandising.md §1.4). Portaling to body
 * sidesteps the broken containing block so the bar truly anchors to
 * the viewport bottom.
 *
 * Per `feedback_canonical-back-forward-bar.md`.
 */

interface CanonicalActionBarProps {
  onModify: () => void;
  onConfirm: () => void;
  modifyLabel?: string;
  confirmLabel: string;
  modifyDisabled?: boolean;
  confirmDisabled?: boolean;
  loading?: boolean;
  /**
   * When true (default), bar is portaled to document.body and fixed
   * to the viewport bottom (respecting the sidebar gutter). Disable
   * for short forms that fit in one viewport — the bar then renders
   * inline at the bottom of its parent.
   */
  sticky?: boolean;
}

export function CanonicalActionBar({
  onModify,
  onConfirm,
  modifyLabel = 'Modificar',
  confirmLabel,
  modifyDisabled = false,
  confirmDisabled = false,
  loading = false,
  sticky = true,
}: CanonicalActionBarProps) {
  const [mounted, setMounted] = useState(false);
  const [leftOffset, setLeftOffset] = useState(0);
  useEffect(() => setMounted(true), []);

  // The WorkspaceShell defines --sb-w on its <main>; portaled
  // descendants don't inherit it, so we read the actual sidebar width
  // from the DOM and re-measure on resize. Falls back to 0 on mobile
  // (sidebar hidden / overlaid).
  useEffect(() => {
    if (!sticky) return;
    const measure = () => {
      const main = document.querySelector<HTMLElement>('main.ml-0, main[class*="ml-["]');
      if (!main) {
        setLeftOffset(0);
        return;
      }
      const ml = parseInt(getComputedStyle(main).marginLeft || '0', 10);
      setLeftOffset(Number.isFinite(ml) ? ml : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sticky]);

  // Reserve viewport space underneath the bar so the user can always
  // scroll past every editor card. Cleaned up on unmount so other
  // workspaces aren't affected.
  useEffect(() => {
    if (!sticky) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '88px';
    return () => { document.body.style.paddingBottom = prev; };
  }, [sticky]);

  const inner = (
    <div className="flex items-center justify-between max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16">
      <button
        type="button"
        onClick={onModify}
        disabled={modifyDisabled || loading}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:bg-carbon/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white/60 backdrop-blur-sm"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        {modifyLabel}
      </button>

      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled || loading}
        className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold bg-carbon text-white hover:bg-carbon/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        )}
        {confirmLabel}
      </button>
    </div>
  );

  if (!sticky) {
    return <div className="mt-10 py-4">{inner}</div>;
  }

  // Portal to body to escape the ViewPort `will-change: transform`
  // containing block. Fixed to viewport bottom; left gutter matches
  // the sidebar width on md+ via the `--sb-w` CSS var, falling back
  // to 0 on mobile.
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed bottom-0 right-0 z-[60] py-4 bg-shade/92 backdrop-blur-md border-t border-carbon/[0.08]"
      style={{ left: `${leftOffset}px` }}
    >
      {inner}
    </div>,
    document.body,
  );
}
