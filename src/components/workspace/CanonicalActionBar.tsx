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
}

export function CanonicalActionBar({
  onModify,
  onConfirm,
  modifyLabel = 'Modificar',
  confirmLabel,
  modifyDisabled = false,
  confirmDisabled = false,
  loading = false,
}: CanonicalActionBarProps) {
  return (
    <div className="flex items-center justify-between max-w-[1400px] mx-auto pt-8 pb-2 px-2">
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        )}
        {confirmLabel}
      </button>
    </div>
  );
}
