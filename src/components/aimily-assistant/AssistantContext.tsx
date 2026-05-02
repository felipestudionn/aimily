'use client';

/**
 * AssistantContext — shared open/close state for the in-product assistant.
 *
 * The header button (rendered inside Navbar / GlobalNav) and the slide-over
 * panel (rendered at root layout level) both need to know if the panel is
 * open. Cmd+K toggles from anywhere. This context is the single source of
 * truth.
 */

import { createContext, useContext } from 'react';

interface AssistantContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

export const AssistantContext = createContext<AssistantContextValue | null>(null);

/**
 * Returns null when called outside the provider (e.g. on a public page where
 * the assistant is not mounted). Consumers should treat null as "no
 * assistant available — render nothing" rather than throwing.
 */
export function useAssistant(): AssistantContextValue | null {
  return useContext(AssistantContext);
}
