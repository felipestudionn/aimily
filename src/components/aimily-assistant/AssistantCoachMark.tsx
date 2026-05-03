'use client';

/**
 * <AssistantCoachMark />
 *
 * Single-use tooltip rendered below the AssistantHeaderButton to surface the
 * ⌘K shortcut to a brand-new user. Fires only on /collection/* routes (the
 * first place where the assistant is genuinely useful), only once per
 * browser, and auto-dismisses after a few seconds.
 *
 * Why client-only + localStorage instead of a server-side flag: this is
 * pure UI ergonomics, not a contract. We don't need to track it across
 * devices, and we want zero round-trips on page load.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAssistant } from './AssistantContext';

const STORAGE_KEY = 'aimily_assistant_coach_seen';
const SHOW_AFTER_MS = 2500;
const AUTO_DISMISS_MS = 9000;

export function AssistantCoachMark() {
  const t = useTranslation();
  const pathname = usePathname();
  const ctx = useAssistant();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ctx) return; // assistant not mounted on this surface
    if (!pathname?.startsWith('/collection/')) return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    const showTimer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const dismissTimer = window.setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, '1');
    }, SHOW_AFTER_MS + AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [pathname, ctx]);

  // If the user opens the assistant on their own, kill the coach mark — they
  // discovered it without our nudge.
  useEffect(() => {
    if (ctx?.open && visible) {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }, [ctx?.open, visible]);

  function dismiss() {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }

  if (!visible) return null;

  const ts = t.aimilyAssistant.coachMark;
  if (!ts) return null;

  return (
    <div
      role="status"
      className="absolute top-full right-0 mt-3 z-50 animate-fade-in"
    >
      <div className="relative bg-carbon text-crema rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.18)] px-4 py-3 max-w-[260px]">
        {/* Arrow pointing up to the assistant pill */}
        <div className="absolute -top-1.5 right-8 w-3 h-3 bg-carbon rotate-45" />

        <button
          type="button"
          onClick={dismiss}
          aria-label={ts.dismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-crema/40 hover:text-crema/80 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>

        <p className="text-[12px] leading-[1.5] pr-5 text-crema/90">
          {ts.message}
        </p>
      </div>
    </div>
  );
}
