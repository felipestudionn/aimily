/* ═══════════════════════════════════════════════════════════════════
   FLOATING PANEL — portal + fixed-position dropdown helper

   The presentation top-bar uses `overflow-x-auto` so action buttons
   scroll horizontally on narrow viewports. CSS forces the other axis
   to `auto` as soon as one axis is non-visible, which clips any
   `absolute` dropdown to the 64px-tall bar. Every popover anchored to
   the top-bar (Style, Share, Promote) therefore needs to escape that
   clip by rendering into document.body with fixed coordinates derived
   from the trigger's bounding rect.

   Usage:
     <button ref={triggerRef} onClick={() => setOpen(o => !o)}>…</button>
     <FloatingPanel
       anchorRef={triggerRef}
       open={open}
       onClose={() => setOpen(false)}
       width={420}
     >
       …panel content…
     </FloatingPanel>
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width: number;
  children: ReactNode;
  /** Extra classes on the panel wrapper (padding, etc). */
  className?: string;
  /** Gap between trigger and panel. */
  gap?: number;
  /** Viewport margin — panel is clamped so it never touches the edge. */
  viewportMargin?: number;
  /** Minimum panel height before clamping kicks in. */
  minHeight?: number;
  /** Optional id for aria-controls wiring on the trigger. */
  id?: string;
}

export function FloatingPanel({
  anchorRef,
  open,
  onClose,
  width,
  children,
  className = '',
  gap = 8,
  viewportMargin = 12,
  minHeight = 200,
  id,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0, left: 0, maxHeight: 0,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = r.bottom + gap;
    const left = Math.min(
      Math.max(r.right - width, viewportMargin),
      vw - width - viewportMargin,
    );
    const maxHeight = Math.max(minHeight, vh - top - viewportMargin);
    setCoords({ top, left, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => updatePosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !mounted) return null;

  const style: CSSProperties = {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    width,
    maxHeight: coords.maxHeight,
  };

  return createPortal(
    <div ref={panelRef} id={id} style={style} className={`overflow-y-auto z-[1000] ${className}`}>
      {children}
    </div>,
    document.body,
  );
}
