'use client';

/**
 * AssistantFab — the bottom-right floating pill that opens the assistant.
 *
 * Behaviour:
 *   - 56px circle by default (sparkle icon).
 *   - Expands to a pill with label "Ask Aimily" + ⌘K hint on hover.
 *   - Hidden when the panel is open (the user already has the panel).
 *   - Position: fixed bottom-6 right-6, z-50.
 *
 * No animation library — pure Tailwind transitions. Light enough to
 * keep render cost negligible.
 */

import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  open: boolean;
  onClick: () => void;
}

export function AssistantFab({ open, onClick }: Props) {
  const t = useTranslation();
  if (open) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.aimilyAssistant.fab.label}
      className="
        group fixed bottom-6 right-6 z-50
        h-14 pl-4 pr-5
        flex items-center gap-2
        rounded-full
        bg-carbon text-white
        shadow-[0_12px_40px_rgba(0,0,0,0.18)]
        transition-all duration-200
        hover:shadow-[0_18px_56px_rgba(0,0,0,0.24)]
        hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 focus-visible:ring-offset-2
      "
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      <span className="text-[13px] font-medium tracking-[-0.01em]">
        {t.aimilyAssistant.fab.label}
      </span>
      <span
        className="
          ml-1 inline-flex items-center justify-center
          rounded-full bg-white/15 px-2 py-0.5
          text-[10px] font-mono tracking-wide
          text-white/90
        "
      >
        ⌘K
      </span>
    </button>
  );
}
