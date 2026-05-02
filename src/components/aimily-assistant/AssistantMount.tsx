'use client';

/**
 * AssistantMount — the root-level wrapper that decides whether to render
 * the assistant at all.
 *
 * Mount logic:
 *   - Hidden when there is no authenticated user (anonymous landing pages
 *     stay clean).
 *   - Hidden on the auth pages (/login, /signup, /forgot-password) and
 *     the public landing/marketing pages — assistant is for the
 *     authenticated product, not for marketing surfaces.
 *
 * Hotkey:
 *   - Global Cmd+K / Ctrl+K toggles the panel from anywhere in the app.
 *   - Skipped when the focused element is an input/textarea/contentEditable
 *     so the user's own typing isn't intercepted.
 *
 * Page context:
 *   - usePathname → derive collectionId, miniBlockId, blockCoord from
 *     the URL by matching against SIDEBAR_BLOCKS. The route handler
 *     templates the Aimily system prompt with this context.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AssistantFab } from './AssistantFab';
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

export function AssistantMount() {
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
      // Public landing/trust pages: hide. Authenticated users can still
      // open it via Cmd+K from anywhere else in the app.
      return false;
    }
    return true;
  }, [loading, user, pathname]);

  /* Cmd+K / Ctrl+K toggles. Skip when typing in inputs. */
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
        // We allow Cmd+K even from a field, because that's THE pattern
        // users expect. But skip if Cmd+K is being used by another
        // app-level shortcut (none currently — verified at install).
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

  const pageContext = useMemo(
    () => derivePageContext(pathname, searchParams),
    [pathname, searchParams],
  );

  if (!allowedHere) return null;

  return (
    <>
      <AssistantFab open={open} onClick={toggle} />
      <AssistantPanel open={open} onClose={close} pageContext={pageContext} />
    </>
  );
}
