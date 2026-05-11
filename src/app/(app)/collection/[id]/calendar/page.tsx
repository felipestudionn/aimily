/* Calendar route = the sidebar in 'calendar' mode.

   WizardSidebar reads `usePathname()` and, when the path ends with
   `/calendar`, renders a portal-based full-viewport version of itself
   with timeline tracks alongside each mini-block row. That portal
   escapes the WorkspaceShell's stacking context and covers the normal
   sidebar + main area.

   This page renders only the calendar-level intelligence overlay:
   the ProductionCalendarBanner that surfaces variance between the
   per-SKU production timeline and the calendar template (and offers
   a one-click adjust). Banner uses its own portal so it sits on top
   of the WizardSidebar's full-viewport Gantt portal. */
import { ProductionCalendarBanner } from '@/components/timeline/ProductionCalendarBanner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CalendarPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductionCalendarBanner collectionPlanId={id} />;
}
