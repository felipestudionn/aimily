-- Pricing rebrand May 2026:
--   • Plan IDs: starter→founder, professional→team, professional_max→team_pro
--   • New "student" plan (free 12 months, email-domain auto-verified)
--   • Launch promo: first 100 paid subscriptions get 50% off for first 12 months
--   • Whitelist of academic email domains for student auto-verification

-- ─── 1. Update subscriptions.plan CHECK to include new plan IDs ────────────
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN (
    -- new IDs (May 2026 rebrand)
    'trial', 'student', 'founder', 'team', 'team_pro', 'enterprise',
    -- legacy IDs (kept for backward compat — no live paying subs use these)
    'starter', 'professional', 'professional_max', 'free', 'pro', 'business'
  ));

-- ─── 2. academic_domains: whitelist for Student tier auto-verification ────
CREATE TABLE IF NOT EXISTS academic_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  short_name TEXT,
  country TEXT NOT NULL,
  city TEXT,
  school_type TEXT,
  website TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_domains_domain
  ON academic_domains(domain) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_academic_domains_country
  ON academic_domains(country);

ALTER TABLE academic_domains ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read the whitelist (used at signup time)
CREATE POLICY "Public can read academic_domains"
  ON academic_domains FOR SELECT
  USING (active = TRUE);

-- Only service role can modify
CREATE POLICY "Service role manages academic_domains"
  ON academic_domains FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 3. student_verifications: track who is on Student tier and when expires ─
CREATE TABLE IF NOT EXISTS student_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  school_name TEXT,
  verification_method TEXT NOT NULL DEFAULT 'email_domain'
    CHECK (verification_method IN ('email_domain', 'manual_review', 'institutional_code')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'pending_review')),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_verifications_user
  ON student_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_verifications_expires
  ON student_verifications(expires_at) WHERE status = 'active';

ALTER TABLE student_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own student_verification"
  ON student_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages student_verifications"
  ON student_verifications FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 4. launch_promo_counter: atomic counter for first-100 promo ─────────
-- Single-row table. Atomic INCREMENT via UPDATE … RETURNING.
CREATE TABLE IF NOT EXISTS launch_promo_counter (
  id INT PRIMARY KEY CHECK (id = 1),
  promo_code TEXT NOT NULL DEFAULT 'LAUNCH-50-Y1',
  total_slots INT NOT NULL DEFAULT 100,
  claimed_slots INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO launch_promo_counter (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE launch_promo_counter ENABLE ROW LEVEL SECURITY;

-- Public read so the pricing page can show the counter
CREATE POLICY "Public can read launch_promo_counter"
  ON launch_promo_counter FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role manages launch_promo_counter"
  ON launch_promo_counter FOR ALL
  USING (auth.role() = 'service_role');

-- Atomic claim function: returns TRUE + new claimed_slots if a slot was
-- claimed, FALSE if no slots left or promo inactive. Used by checkout.
CREATE OR REPLACE FUNCTION claim_launch_promo_slot()
RETURNS TABLE(claimed BOOLEAN, new_claimed_slots INT, total_slots INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed_slots INT;
  v_total_slots INT;
  v_active BOOLEAN;
BEGIN
  -- Lock the row to prevent races
  SELECT lpc.claimed_slots, lpc.total_slots, lpc.active
    INTO v_claimed_slots, v_total_slots, v_active
    FROM launch_promo_counter lpc
    WHERE lpc.id = 1
    FOR UPDATE;

  IF NOT v_active OR v_claimed_slots >= v_total_slots THEN
    RETURN QUERY SELECT FALSE, v_claimed_slots, v_total_slots;
    RETURN;
  END IF;

  UPDATE launch_promo_counter
    SET claimed_slots = claimed_slots + 1,
        updated_at = NOW()
    WHERE id = 1
    RETURNING launch_promo_counter.claimed_slots, launch_promo_counter.total_slots
    INTO v_claimed_slots, v_total_slots;

  RETURN QUERY SELECT TRUE, v_claimed_slots, v_total_slots;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_launch_promo_slot() TO authenticated, anon;

-- ─── 5. Helper to expire student verifications ───────────────────────────
-- Run from a daily cron (Supabase pg_cron or Vercel cron route).
CREATE OR REPLACE FUNCTION expire_student_verifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INT;
BEGIN
  WITH expired AS (
    UPDATE student_verifications
      SET status = 'expired',
          updated_at = NOW()
      WHERE status = 'active' AND expires_at < NOW()
      RETURNING user_id
  ),
  downgraded AS (
    UPDATE subscriptions
      SET plan = 'trial',
          status = 'active',
          updated_at = NOW()
      WHERE user_id IN (SELECT user_id FROM expired)
        AND plan = 'student'
      RETURNING user_id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;

  RETURN v_expired_count;
END;
$$;
