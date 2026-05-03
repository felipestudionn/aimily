/**
 * POST /api/onboarding/complete
 *
 * Marks the user's onboarding as finished. Called from <OnboardingFlow />
 * when the user clicks "Create your first collection" OR "Skip".
 *
 * Side effects:
 *   1. subscriptions.onboarding_completed_at = NOW()
 *   2. auth.users.user_metadata.language = body.language (so the next
 *      session restores the chosen locale even before LanguageContext
 *      hits localStorage on a different device)
 *
 * Idempotent: re-calling the endpoint is harmless (the COALESCE keeps
 * the original timestamp).
 */
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const SUPPORTED = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'sv', 'no'] as const;
type Language = (typeof SUPPORTED)[number];

function isLanguage(v: unknown): v is Language {
  return typeof v === 'string' && (SUPPORTED as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: { language?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — onboarding can complete without a language change.
  }

  const language = isLanguage(body.language) ? body.language : null;

  // 1. Set onboarding_completed_at, but only if it was NULL (first time).
  //    A re-call leaves the original timestamp untouched.
  const { error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('onboarding_completed_at', null);

  if (subErr) {
    // Don't block the user — log and continue. Worst case they see /welcome
    // once more on next signin and the defensive redirect catches them.
    console.error('[onboarding/complete] subscription update failed:', subErr);
  }

  // 2. Persist language to auth metadata so a fresh device picks the right
  //    locale on next login (LanguageContext reads user_metadata first).
  if (language) {
    const { error: authMetaErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        language,
      },
    });
    if (authMetaErr) {
      console.error('[onboarding/complete] auth metadata update failed:', authMetaErr);
    }
  }

  return NextResponse.json({ ok: true });
}
