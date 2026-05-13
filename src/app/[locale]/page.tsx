/* ═══════════════════════════════════════════════════════════════════
   [locale]/ — Marketing home, server-side auth gate.

   Logged-in users hitting `aimily.app` used to render the marketing
   landing for a beat before a client-side useEffect noticed the auth
   state and bounced them to /my-collections. That produced the
   "abre / parece que entra / encuentra el caché / entra a las
   colecciones" flash chain Felipe flagged on 2026-05-13.

   Now the server checks the auth cookie and 307s straight to
   /my-collections before any marketing HTML ships. The marketing
   client component (`MarketingHomeClient`) handles the actual landing
   for unauthenticated visitors — and for the deep-link case where a
   logged-in user explicitly wants to see pricing
   (`/?pricing=1#pricing`, used by /account → "Ver planes").

   The client component also keeps its own post-login redirect
   (useEffect on `user`) so AuthModal sign-ins on this page route to
   /my-collections without an extra round-trip.
   ═══════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import MarketingHomeClient from './MarketingHomeClient';

interface PageProps {
  searchParams: Promise<{ pricing?: string }>;
}

export default async function MarketingHomePage({ searchParams }: PageProps) {
  const [{ user }, { pricing }] = await Promise.all([
    getServerSession(),
    searchParams,
  ]);

  // Authenticated users skip the marketing entirely — straight to the
  // app. Escape hatch: `?pricing=1` lets paid-plan UI deep-link to the
  // public pricing table (used by /account when a trial user clicks
  // "Ver planes"). The hash (#pricing) still drives the scroll.
  if (user && pricing !== '1') {
    redirect('/my-collections');
  }

  return <MarketingHomeClient />;
}
