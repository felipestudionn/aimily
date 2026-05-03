-- Add onboarding_completed_at to subscriptions so we can route signups
-- to /welcome only once. Backfills existing rows to NOW() so users
-- already in the product don't see the onboarding flow.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

UPDATE subscriptions
  SET onboarding_completed_at = NOW()
  WHERE onboarding_completed_at IS NULL;

COMMENT ON COLUMN subscriptions.onboarding_completed_at IS
  'Set when the user finishes (or skips) the /welcome onboarding flow. NULL = onboarding pending. Backfilled to NOW() at migration time for pre-existing users.';
