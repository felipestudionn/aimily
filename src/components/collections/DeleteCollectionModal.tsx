'use client';

/**
 * <DeleteCollectionModal />
 *
 * Editorial confirmation modal that replaces the native window.confirm()
 * dialog when a user clicks the trash button on a collection card.
 *
 * Surfaces the cost of the action — collection name, SKU count, milestone
 * count — and the safety net (30-day soft-delete in trash). Carbon CTA
 * with arrow, "Keep it" as the secondary, ESC + backdrop close.
 */

import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  collectionName: string;
  skuCount?: number;
  milestoneCount?: number;
}

export function DeleteCollectionModal({
  isOpen,
  onClose,
  onConfirm,
  collectionName,
  skuCount = 0,
  milestoneCount = 0,
}: Props) {
  const t = useTranslation();
  const c = t.collections as Record<string, string>;
  const [deleting, setDeleting] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // ESC closes; focus the safe button on open so a stray Enter doesn't delete.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape' && !deleting) onClose();
    }
    window.addEventListener('keydown', handleKey);
    cancelBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, deleting, onClose]);

  async function handleConfirm() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  if (!isOpen) return null;

  const hasData = skuCount > 0 || milestoneCount > 0;
  const dataParts: string[] = [];
  if (skuCount > 0) {
    dataParts.push((c.deleteModalSkus || '{n} SKUs').replace('{n}', String(skuCount)));
  }
  if (milestoneCount > 0) {
    dataParts.push((c.deleteModalMilestones || '{n} milestones').replace('{n}', String(milestoneCount)));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-carbon/60 backdrop-blur-sm"
        onClick={() => !deleting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-collection-title"
        className="relative bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] w-full max-w-[440px] p-8"
      >
        <button
          type="button"
          onClick={() => !deleting && onClose()}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full text-carbon/40 hover:text-carbon hover:bg-carbon/[0.04] transition-colors"
          disabled={deleting}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-carbon/[0.04] mb-5">
          <Trash2 className="h-4 w-4 text-carbon/60" strokeWidth={1.75} />
        </div>

        <h2
          id="delete-collection-title"
          className="font-light tracking-[-0.02em] leading-[1.2] text-[24px] text-carbon mb-3"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {(c.deleteModalTitle || 'Delete {name}?').replace('{name}', collectionName)}
        </h2>

        <p className="text-[13px] text-carbon/55 leading-[1.65] mb-2">
          {hasData
            ? dataParts.join(' · ')
            : (c.deleteModalNoData || 'No SKUs or milestones yet')}
        </p>

        <p className="text-[13px] text-carbon/45 leading-[1.65] mb-8">
          {c.deleteModalBody || 'Moves to trash for 30 days, then permanently deleted.'}
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-5 py-2.5 rounded-full text-[13px] font-medium text-carbon/70 hover:text-carbon hover:bg-carbon/[0.04] transition-colors disabled:opacity-50"
          >
            {c.deleteModalCancel || 'Keep it'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-6 py-2.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-crema hover:bg-carbon/90 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {deleting ? '...' : (c.deleteModalConfirm || 'Move to trash')}
          </button>
        </div>
      </div>
    </div>
  );
}
