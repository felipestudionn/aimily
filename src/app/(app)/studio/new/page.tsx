/* ═══════════════════════════════════════════════════════════════════════════
   /studio/new — Create a new Studio project + select first pack.

   Two-step on a single page:
     Step 1: Brand info (name + optional palette)
     Step 2: Pack tier selector (Capsule / Editorial / Full Campaign)

   On submit:
     • POST /api/studio/projects   → creates project, returns id
     • POST /api/studio/checkout   → creates Stripe Session, redirects user to Stripe-hosted checkout
     • Stripe success_url returns to /studio/[id]?studio_pack=success&tier=...
     • Webhook (already wired) allocates outputs to the project pool
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import NewProjectClient from './NewProjectClient';

export const dynamic = 'force-dynamic';

export default async function NewStudioProjectPage() {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  return <NewProjectClient />;
}
