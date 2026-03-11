-- Phase 1: Fix subscription plan names to match code
-- Old: free/pro/business/enterprise → New: trial/starter/professional/enterprise

-- 1. Drop old CHECK constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- 2. Migrate existing data
UPDATE subscriptions SET plan = 'trial' WHERE plan = 'free';
UPDATE subscriptions SET plan = 'starter' WHERE plan = 'pro';
UPDATE subscriptions SET plan = 'professional' WHERE plan = 'business';

-- 3. Add new CHECK with correct plan names
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise'));

-- 4. Add trial_ends_at column for trial expiration tracking
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 5. Add is_admin column for owner bypass
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
