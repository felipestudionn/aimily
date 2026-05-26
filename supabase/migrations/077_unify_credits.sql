-- 077_unify_credits.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Credits unification — single ledger + canonical user_credits balance.
--
-- Felipe 2026-05-26: the 3 concurrent credit systems collapse into one.
-- Verified zero rows in all of them at migration time (no live customers
-- to migrate), so this is a clean rename + restructure with no data
-- preservation needed.
--
--   1. imagery_credits → user_credits (rename, semantic — it's not just
--      imagery any more; in-season runs and other actions all draw from
--      the same balance).
--   2. credit_ledger created — append-only audit log of every consume,
--      refund and topup. Idempotency on Stripe events comes from the
--      UNIQUE constraint on (source, source_id) for type='topup' rows.
--   3. imagery_credit_purchases dropped — its job (idempotent topup +
--      audit) is subsumed by credit_ledger.
--   4. RPCs recreated under new names that match the table:
--        consume_user_credits / refund_user_credits / add_user_credits
--      Each one writes to credit_ledger inside the same transaction so the
--      ledger never drifts from the balance.
--
-- studio_purchases is NOT touched here — the readers in /studio/page.tsx
-- etc. still query it. It gets removed in a later commit once those
-- readers migrate to the global user_credits balance.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. ── Drop the legacy idempotency table (zero rows, nothing to migrate).
DROP TABLE IF EXISTS public.imagery_credit_purchases CASCADE;

-- 2. ── Rename imagery_credits → user_credits.
ALTER TABLE public.imagery_credits RENAME TO user_credits;

-- 3. ── Create the canonical ledger.
CREATE TABLE public.credit_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- + for topups, - for consumes; refunds are positive entries referencing
  -- the original consume's id via metadata.original_ledger_id.
  delta       integer NOT NULL,
  -- consume_action is null for topup/refund rows; for consume rows it's
  -- the CreditAction key (editorial, still_life, tryon, video_kling,
  -- sketch, in_season_run, etc.) so analytics can group consumption by
  -- product without joining ai_usage.
  consume_action text,
  type        text NOT NULL CHECK (type IN ('topup','consume','refund')),
  source      text,     -- 'stripe' | 'admin' | 'plan_grant' | 'api'
  source_id   text,     -- stripe session id / admin user id / etc.
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  balance_after integer, -- snapshot for fast last-N audit reads
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_ledger_user_created
  ON public.credit_ledger(user_id, created_at DESC);

-- Idempotency: a Stripe webhook MUST never double-credit a user even if
-- the event is replayed. We enforce it at the row level — the topup helper
-- attempts the insert and a unique violation tells it "already applied".
CREATE UNIQUE INDEX idx_credit_ledger_unique_stripe_topup
  ON public.credit_ledger(source, source_id)
  WHERE type='topup' AND source='stripe';

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own ledger (CreditMeter "history" UI later).
CREATE POLICY credit_ledger_read_own ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Writes only via SECURITY DEFINER RPCs below — no client-side inserts.

-- 4. ── Recreate the 3 RPCs on top of the new schema, writing to the
--       ledger inside the same transaction.

CREATE OR REPLACE FUNCTION public.consume_user_credits(
  p_user_id      uuid,
  p_units        integer,
  p_plan_limit   integer,
  p_action       text DEFAULT NULL,
  p_metadata     jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month            text;
  v_current          integer;
  v_pack_balance     integer;
  v_plan_remaining   integer;
  v_total_remaining  integer;
  v_consume_plan     integer;
  v_consume_pack     integer;
BEGIN
  IF p_units IS NULL OR p_units <= 0 THEN
    RAISE EXCEPTION 'units must be > 0';
  END IF;

  v_month := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');

  -- Lock the usage row (insert if missing).
  INSERT INTO ai_usage (user_id, month, imagery_count, updated_at)
  VALUES (p_user_id, v_month, 0, now())
  ON CONFLICT (user_id, month) DO NOTHING;

  SELECT imagery_count INTO v_current
  FROM ai_usage WHERE user_id = p_user_id AND month = v_month
  FOR UPDATE;

  -- Lock the pack balance row.
  INSERT INTO user_credits (user_id, balance, updated_at)
  VALUES (p_user_id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_pack_balance
  FROM user_credits WHERE user_id = p_user_id
  FOR UPDATE;

  -- Unlimited plans (-1) skip the math but still record consumption in
  -- the ledger so we have full attribution. Pack balance untouched.
  IF p_plan_limit = -1 THEN
    UPDATE ai_usage
    SET imagery_count = v_current + p_units, updated_at = now()
    WHERE user_id = p_user_id AND month = v_month;

    INSERT INTO credit_ledger(user_id, delta, consume_action, type, source, metadata, balance_after)
    VALUES (p_user_id, -p_units, p_action, 'consume', 'api', p_metadata, v_pack_balance);

    RETURN jsonb_build_object(
      'allowed', true,
      'plan_consumed', p_units,
      'pack_consumed', 0,
      'current', v_current + p_units,
      'limit', -1,
      'pack_balance', v_pack_balance
    );
  END IF;

  v_plan_remaining  := GREATEST(0, p_plan_limit - v_current);
  v_total_remaining := v_plan_remaining + v_pack_balance;

  IF v_total_remaining < p_units THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'limit_reached',
      'current', v_current,
      'limit', p_plan_limit,
      'pack_balance', v_pack_balance
    );
  END IF;

  v_consume_plan := LEAST(p_units, v_plan_remaining);
  v_consume_pack := p_units - v_consume_plan;

  IF v_consume_plan > 0 THEN
    UPDATE ai_usage
    SET imagery_count = v_current + v_consume_plan, updated_at = now()
    WHERE user_id = p_user_id AND month = v_month;
  END IF;

  IF v_consume_pack > 0 THEN
    UPDATE user_credits
    SET balance = v_pack_balance - v_consume_pack, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- One ledger row per consume call (records the full units, with a split
  -- breakdown in metadata so analytics can attribute plan vs pack).
  INSERT INTO credit_ledger(user_id, delta, consume_action, type, source, metadata, balance_after)
  VALUES (
    p_user_id,
    -p_units,
    p_action,
    'consume',
    'api',
    p_metadata || jsonb_build_object('plan_consumed', v_consume_plan, 'pack_consumed', v_consume_pack),
    v_pack_balance - v_consume_pack
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'plan_consumed', v_consume_plan,
    'pack_consumed', v_consume_pack,
    'current', v_current + v_consume_plan,
    'limit', p_plan_limit,
    'pack_balance', v_pack_balance - v_consume_pack
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_user_credits(
  p_user_id        uuid,
  p_plan_consumed  integer,
  p_pack_consumed  integer,
  p_action         text DEFAULT NULL,
  p_metadata       jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month    text;
  v_balance  integer;
BEGIN
  IF (p_plan_consumed IS NULL OR p_plan_consumed <= 0)
     AND (p_pack_consumed IS NULL OR p_pack_consumed <= 0) THEN
    RETURN;
  END IF;

  v_month := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');

  IF p_plan_consumed > 0 THEN
    UPDATE ai_usage
    SET imagery_count = GREATEST(0, imagery_count - p_plan_consumed),
        updated_at = now()
    WHERE user_id = p_user_id AND month = v_month;
  END IF;

  IF p_pack_consumed > 0 THEN
    UPDATE user_credits
    SET balance = balance + p_pack_consumed, updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_balance;
  ELSE
    SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id;
  END IF;

  INSERT INTO credit_ledger(user_id, delta, consume_action, type, source, metadata, balance_after)
  VALUES (
    p_user_id,
    p_plan_consumed + p_pack_consumed,
    p_action,
    'refund',
    'api',
    p_metadata || jsonb_build_object('plan_refunded', p_plan_consumed, 'pack_refunded', p_pack_consumed),
    COALESCE(v_balance, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id            uuid,
  p_amount             integer,
  p_pack               text,
  p_stripe_session_id  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Idempotency comes from the UNIQUE index on (source, source_id) where
  -- type='topup' AND source='stripe'. A repeated webhook firing hits the
  -- unique violation and we treat it as a no-op success.
  BEGIN
    INSERT INTO user_credits (user_id, balance, total_purchased, updated_at)
    VALUES (p_user_id, p_amount, p_amount, now())
    ON CONFLICT (user_id) DO UPDATE
      SET balance = user_credits.balance + p_amount,
          total_purchased = user_credits.total_purchased + p_amount,
          updated_at = now()
    RETURNING balance INTO v_balance;

    INSERT INTO credit_ledger(user_id, delta, consume_action, type, source, source_id, metadata, balance_after)
    VALUES (
      p_user_id,
      p_amount,
      NULL,
      'topup',
      'stripe',
      p_stripe_session_id,
      jsonb_build_object('pack', p_pack),
      v_balance
    );
  EXCEPTION WHEN unique_violation THEN
    -- Stripe replayed the webhook — already credited, do nothing.
    RETURN;
  END;
END;
$$;

-- 5. ── Backwards-compatible aliases so the api-auth.ts layer can be
--       migrated in a follow-up commit without breaking the running
--       request path. These will be dropped in the cleanup commit.

CREATE OR REPLACE FUNCTION public.consume_imagery_units(
  p_user_id    uuid,
  p_units      integer,
  p_plan_limit integer
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.consume_user_credits(p_user_id, p_units, p_plan_limit, NULL, '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION public.refund_imagery_units(
  p_user_id       uuid,
  p_plan_consumed integer,
  p_pack_consumed integer
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.refund_user_credits(p_user_id, p_plan_consumed, p_pack_consumed, NULL, '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION public.add_imagery_credits(
  p_user_id           uuid,
  p_amount            integer,
  p_pack              text,
  p_stripe_session_id text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT public.add_user_credits(p_user_id, p_amount, p_pack, p_stripe_session_id);
$$;
