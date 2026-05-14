/**
 * /welcome — first-run onboarding for newly signed-up users.
 *
 *   1. Auth guard: anonymous → redirect to "/".
 *   2. Read subscriptions.onboarding_completed_at:
 *        - NOT NULL → redirect to /my-collections (they already finished).
 *        - NULL     → render <OnboardingFlow />.
 *
 * The onboarding itself runs client-side; this server component only
 * gates access and passes the user's name down to the greeting.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export const metadata = {
  title: 'Welcome — aimily',
  robots: { index: false, follow: false },
};

interface WelcomePageProps {
  searchParams: Promise<{ next?: string; tier?: string }>;
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // ─── Studio fork ─────────────────────────────────────────────────────
  // If the user signed up from the Studio funnel (?next=/studio/...),
  // skip the Aimily-360 OnboardingFlow entirely. Mark their onboarding
  // as completed (so future logins don't bounce them back here) and
  // redirect to the requested Studio destination, propagating `tier` if
  // provided.
  //
  // Business plan §5.6 rule "solo ves lo tuyo": Studio buyers don't see
  // the collection onboarding because they didn't ask for a collection.
  // ─────────────────────────────────────────────────────────────────────
  if (params.next && params.next.startsWith('/studio')) {
    try {
      await supabaseAdmin
        .from('subscriptions')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('[welcome] failed to mark onboarding complete for Studio fork:', err);
      // Soft-fail — we still redirect them; worst case they revisit /welcome later.
    }
    const dest = params.tier
      ? `${params.next}${params.next.includes('?') ? '&' : '?'}tier=${encodeURIComponent(params.tier)}`
      : params.next;
    redirect(dest);
  }

  // Check whether onboarding is already done. We use the admin client so
  // we don't hit RLS friction on a fresh row that hasn't propagated yet.
  // Soft-fail: if the read errors, fall through to the onboarding (it's
  // safer to show it twice than to block a brand-new user behind a stale
  // query).
  let alreadyDone = false;
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('onboarding_completed_at')
      .eq('user_id', user.id)
      .single();
    alreadyDone = !!sub?.onboarding_completed_at;
  } catch {
    alreadyDone = false;
  }

  if (alreadyDone) {
    redirect('/my-collections');
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) || null;
  const initialLanguage = (user.user_metadata?.language as string | undefined) || null;

  return <OnboardingFlow fullName={fullName} initialLanguage={initialLanguage} />;
}
