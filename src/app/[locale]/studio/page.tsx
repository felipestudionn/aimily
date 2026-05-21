/* ═══════════════════════════════════════════════════════════════════════════
   /[locale]/studio — Aimily Studio public landing.

   Wedge product landing for content creation. Server wrapper handles the
   logged-in redirect; the client component owns rendering + AuthModal so
   CTAs open auth inline instead of routing to the broken /auth/sign-up
   path that never existed.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import StudioLandingClient from './StudioLandingClient';

export default async function StudioLandingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { user } = await getServerSession();
  if (user) redirect('/studio');
  await props.params;
  return <StudioLandingClient />;
}
