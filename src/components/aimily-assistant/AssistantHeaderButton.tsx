'use client';

/**
 * AssistantHeaderButton — discreet editorial pill rendered inside the navbar,
 * to the left of the notifications bell.
 *
 * Design rules (Felipe, 2026-05-02):
 *   - No sparkle / AI star icon (too "AI-coded").
 *   - No visible ⌘K hint on the button — the shortcut still works globally,
 *     but the button itself stays clean.
 *   - Editorial calm. Subtle border, small text, lowercase brand for the
 *     proper noun "aimily" never; "Aimily" is the assistant name (a
 *     character, not the product), so it stays capitalised.
 *   - Two variants: light (carbon text on shade — default workspace) and
 *     dark (crema text on transparent — workspace-dark variant).
 *
 * Returns null if the AssistantContext is missing (public pages where the
 * assistant is not mounted at all). That keeps the button invisible on
 * landing/marketing surfaces.
 */

import { useTranslation } from '@/i18n';
import { useAssistant } from './AssistantContext';

interface Props {
  variant?: 'light' | 'dark';
}

export function AssistantHeaderButton({ variant = 'light' }: Props) {
  const t = useTranslation();
  const ctx = useAssistant();
  if (!ctx) return null;

  const base =
    'inline-flex items-center rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[-0.01em] transition-colors';

  const styles =
    variant === 'dark'
      ? 'border border-crema/15 text-crema/70 hover:border-crema/35 hover:text-crema'
      : 'border border-carbon/[0.1] text-carbon/60 hover:border-carbon/25 hover:text-carbon';

  return (
    <button
      type="button"
      onClick={ctx.toggle}
      className={`${base} ${styles}`}
      aria-label={t.aimilyAssistant.fab.label}
    >
      {t.aimilyAssistant.fab.label}
    </button>
  );
}
