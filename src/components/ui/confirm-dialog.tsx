'use client';

import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, ArrowLeft } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'neutral';
  icon?: React.ReactNode;
}

const VARIANT_STYLES = {
  danger: {
    icon: <Trash2 className="h-[18px] w-[18px] text-[#A0463C]" strokeWidth={1.8} />,
    iconBg: 'bg-[#A0463C]/[0.08]',
    confirmBtn: 'bg-[#A0463C] text-white hover:bg-[#A0463C]/90',
  },
  warning: {
    icon: <AlertTriangle className="h-[18px] w-[18px] text-[#9c7c4c]" strokeWidth={1.8} />,
    iconBg: 'bg-[#9c7c4c]/[0.08]',
    confirmBtn: 'bg-[#9c7c4c] text-white hover:bg-[#9c7c4c]/90',
  },
  neutral: {
    icon: <ArrowLeft className="h-[18px] w-[18px] text-carbon/60" strokeWidth={1.8} />,
    iconBg: 'bg-carbon/[0.05]',
    confirmBtn: 'bg-carbon text-white hover:bg-carbon/90',
  },
};

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'neutral',
  icon,
}: ConfirmDialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const styles = VARIANT_STYLES[variant];

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ animation: 'fadeIn 0.15s ease-out forwards' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-carbon/40 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Dialog */}
      <div
        className="relative bg-white rounded-[20px] border border-carbon/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.18)] max-w-sm w-full mx-4 p-6"
        style={{ animation: 'slideUp 0.2s ease-out forwards' }}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`shrink-0 w-10 h-10 rounded-[12px] flex items-center justify-center ${styles.iconBg}`}>
            {icon || styles.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight">{title}</h3>
            {description && (
              <p className="text-[13px] text-carbon/55 leading-relaxed mt-2">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-[12px] font-medium text-carbon/60 hover:text-carbon hover:bg-carbon/[0.04] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-colors ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
