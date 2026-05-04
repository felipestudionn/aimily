/* Calendar route = the sidebar in 'calendar' mode.

   WizardSidebar reads `usePathname()` and, when the path ends with
   `/calendar`, renders a portal-based full-viewport version of itself
   with timeline tracks alongside each mini-block row. That portal
   escapes the WorkspaceShell's stacking context and covers the normal
   sidebar + main area.

   This page therefore renders nothing — the spine owns everything. */
export default function CalendarPage() {
  return null;
}
