'use client';

/**
 * AssistantMount — root-level wrapper. Provides the AssistantContext to its
 * subtree and renders the slide-over panel as a sibling.
 *
 * The header pill that triggers the panel lives elsewhere (rendered by the
 * existing Navbar via AssistantHeaderButton, which consumes this context).
 * The hotkey Cmd+K is bound here so it works app-wide while the panel is
 * mounted.
 *
 * Mount conditions:
 *   - Authenticated user only.
 *   - Hidden on auth/login/signup, public share, PDF export, and the
 *     marketing landing — assistant is for the authenticated product.
 *
 * When not allowed, the children render without the provider, so any nested
 * AssistantHeaderButton receives null from useAssistant() and renders
 * nothing. That keeps marketing surfaces clean.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AssistantContext } from './AssistantContext';
import { AssistantPanel } from './AssistantPanel';
import { derivePageContext } from './page-context';

const HIDDEN_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
  '/p/',                   // public share links
  '/presentation/export/', // PDF export rendering surface
];

export function AssistantMount({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  /* Public + auth pages stay clean. Anon users never see the assistant. */
  const allowedHere = useMemo(() => {
    if (loading) return false;
    if (!user) return false;
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return false;
    if (pathname === '/' || pathname.startsWith('/meet-aimily') || pathname.startsWith('/trust')) {
      return false;
    }
    return true;
  }, [loading, user, pathname]);

  /* Cmd+K / Ctrl+K toggles. Skip when typing in inputs (with shift modifier
     to keep the standard "even from a textarea" UX intact). */
  useEffect(() => {
    if (!allowedHere) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isField =
          tag === 'input' ||
          tag === 'textarea' ||
          (target?.isContentEditable ?? false);
        if (isField && e.shiftKey) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowedHere]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const ctxValue = useMemo(
    () => ({ open, setOpen, toggle, close }),
    [open, toggle, close],
  );

  const pageContext = useMemo(
    () => derivePageContext(pathname, searchParams),
    [pathname, searchParams],
  );

  /* Outside allowed pages, do NOT mount the provider. AssistantHeaderButton
     and any other consumer will see useAssistant() === null and render
     nothing. Children render normally. */
  if (!allowedHere) return <>{children}</>;

  return (
    <AssistantContext.Provider value={ctxValue}>
      {children}
      <AssistantPanel pageContext={pageContext} />
    </AssistantContext.Provider>
  );
}
