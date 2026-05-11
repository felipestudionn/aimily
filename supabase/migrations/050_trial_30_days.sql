-- Fix P0.1 — Trial duration: 14 → 30 days
--
-- The marketing copy in src/i18n/home.ts promises "30 days free" / "30 días
-- gratis" in all 9 locales, and the Stripe checkout `subscription_data`
-- already gives a 30-day trial. But the auth.users insert trigger
-- introduced in 011_auto_trial_on_signup.sql created a 14-day trial in
-- the DB — so cold-traffic users who sign up without going through
-- checkout (the default path from Google Ads) received 14 days instead
-- of the 30 promised on landing.
--
-- This migration:
--   1) Rewrites the trigger function to issue 30-day trials.
--   2) Backfills all currently-trialing users to 30 days from their
--      created_at, but only when that pushes their trial_ends_at FORWARD —
--      we never shorten a trial in-flight, even if data was wonky.
--   3) Refreshes the legacy backfill from 011 for users with NULL
--      trial_ends_at, also at 30 days.

-- 1) Trigger function — 30 days
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (id, user_id, plan, status, trial_ends_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'trial',
    'trialing',
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Backfill: extend in-flight 14-day trials to 30 days from created_at.
--    GREATEST() guarantees we never shorten — if a row already had a later
--    trial_ends_at (e.g. manually extended) we leave it alone.
UPDATE subscriptions
SET trial_ends_at = GREATEST(trial_ends_at, created_at + INTERVAL '30 days'),
    updated_at = NOW()
WHERE plan = 'trial'
  AND status = 'trialing'
  AND trial_ends_at IS NOT NULL;

-- 3) Catch any NULL trial_ends_at (legacy users from before 011) — 30d.
UPDATE subscriptions
SET trial_ends_at = created_at + INTERVAL '30 days',
    updated_at = NOW()
WHERE plan = 'trial'
  AND trial_ends_at IS NULL;
