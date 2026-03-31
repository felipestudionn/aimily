'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

/* ── Types ── */
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  saved: () => void;
}

/* ── Context ── */
const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  saved: () => {},
});

export const useToast = () => useContext(ToastContext);

/* ── Icons per type ── */
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check className="h-3 w-3" />,
  error: <X className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
};

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-carbon text-crema',
  error: 'bg-[#A0463C] text-white',
  warning: 'bg-[#9c7c4c] text-white',
  info: 'bg-carbon/80 text-crema',
};

/* ── Single toast item ── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium tracking-[0.04em] shadow-lg transition-all duration-200 ${TYPE_STYLES[toast.type]} ${
        exiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      style={{ animation: exiting ? undefined : 'slideUp 0.2s ease-out' }}
    >
      {ICONS[toast.type]}
      <span>{toast.message}</span>
    </div>
  );
}

/* ── Provider ── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 2500) => {
    const id = `toast-${++idCounter.current}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  const saved = useCallback(() => {
    showToast('Saved', 'success', 1500);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toast: showToast, saved }}>
      {children}
      {/* Toast container — bottom center */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
