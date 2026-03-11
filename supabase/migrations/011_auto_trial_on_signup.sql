-- Phase 2: Auto-create trial subscription on user signup

-- Trigger function: create trial subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (id, user_id, plan, status, trial_ends_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'trial',
    'trialing',
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill: existing users without a subscription get trial
INSERT INTO subscriptions (id, user_id, plan, status, trial_ends_at, created_at, updated_at)
SELECT gen_random_uuid(), id, 'trial', 'trialing', created_at + INTERVAL '14 days', NOW(), NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Set trial_ends_at for existing trial users that don't have it
UPDATE subscriptions
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE plan = 'trial' AND trial_ends_at IS NULL;
