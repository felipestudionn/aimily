-- Migration 027 — Imagery quota system
-- Renames ai_usage.generation_count → imagery_count to reflect that we only
-- track AI image/video generation (not text). Adds imagery_credits ledger
-- for one-time Aimily Credits pack purchases. Fixes the subscriptions.plan
-- CHECK constraint to match the actual plan IDs the app uses.

-- 1. Rename ai_usage.generation_count → imagery_count
ALTER TABLE ai_usage RENAME COLUMN generation_count TO imagery_count;

-- 2. Fix subscriptions plan CHECK constraint
-- Old constraint allowed: free, pro, business, enterprise
-- New constraint matches actual plan IDs in the app.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('trial', 'starter', 'professional', 'professional_max', 'enterprise', 'free', 'pro', 'business'));

-- 3. Imagery credits ledger — current balance per user (Aimily Credits pack purchases)
CREATE TABLE IF NOT EXISTS imagery_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Imagery credits purchase history (audit trail for finance)
CREATE TABLE IF NOT EXISTS imagery_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack TEXT NOT NULL CHECK (pack IN ('pack_50', 'pack_250', 'pack_1000')),
  imagery_amount INTEGER NOT NULL,
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE imagery_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagery_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own imagery credits"
  ON imagery_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages imagery credits"
  ON imagery_credits FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own imagery credit purchases"
  ON imagery_credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages imagery credit purchases"
  ON imagery_credit_purchases FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_imagery_credits_user_id ON imagery_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_imagery_credit_purchases_user_id ON imagery_credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_imagery_credit_purchases_session ON imagery_credit_purchases(stripe_session_id);

-- 5. Atomic credit add RPC — used by Stripe webhook on pack purchase
-- Idempotent on stripe_session_id (Stripe can retry webhook delivery).
CREATE OR REPLACE FUNCTION add_imagery_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_pack TEXT,
  p_stripe_session_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Idempotency check
  IF EXISTS (
    SELECT 1 FROM imagery_credit_purchases WHERE stripe_session_id = p_stripe_session_id
  ) THEN
    RETURN;
  END IF;

  -- Insert purchase row
  INSERT INTO imagery_credit_purchases (user_id, pack, imagery_amount, stripe_session_id)
  VALUES (p_user_id, p_pack, p_amount, p_stripe_session_id);

  -- Add credits to balance
  INSERT INTO imagery_credits (user_id, balance, total_purchased, updated_at)
  VALUES (p_user_id, p_amount, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = imagery_credits.balance + p_amount,
        total_purchased = imagery_credits.total_purchased + p_amount,
        updated_at = NOW();
END;
$$;
