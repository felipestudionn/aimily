'use client';

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
   * When true (default), bar sticks to the viewport bottom with a
   * subtle backdrop blur so the user always sees it while scrolling
   * the editor. Disable for short forms that fit in one viewport.
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
  const wrapperClass = sticky
    ? 'sticky bottom-0 z-30 -mx-6 md:-mx-12 lg:-mx-16 mt-10 px-6 md:px-12 lg:px-16 py-4 bg-shade/85 backdrop-blur-md border-t border-carbon/[0.08]'
    : 'mt-10 px-2 py-4';

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between max-w-[1400px] mx-auto">
        <button
          type="button"
          onClick={onModify}
          disabled={modifyDisabled || loading}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:bg-carbon/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}
