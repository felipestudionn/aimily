-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 056 · Aimily Studio · Purchase packs + RPC allocation
--
-- A studio_purchase records the purchase of one pack tier (Capsule €99 /
-- Editorial €199 / Full Campaign €399) and tracks how many of its outputs
-- have been consumed. When a user generates a Studio output, the
-- consume_studio_output() RPC finds the oldest unexhausted purchase for
-- the project and decrements outputs_remaining atomically.
--
-- Refund-on-failure path: when the AI generation throws after we've
-- decremented, refund_studio_output() restores outputs_remaining on the
-- most recently consumed purchase row.
--
-- Stripe webhook calls allocate_studio_outputs() when payment succeeds.
-- The webhook reads pack metadata (tier, outputs count) from the Stripe
-- payment_intent.metadata and forwards it here.
--
-- Reference: .planning/studio/IMPLEMENTATION-PLAN.md §2.2
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.studio_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_project_id UUID NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,

  pack_tier TEXT NOT NULL CHECK (pack_tier IN ('capsule','editorial','full_campaign')),
  outputs_allocated INTEGER NOT NULL CHECK (outputs_allocated > 0),
  outputs_consumed INTEGER NOT NULL DEFAULT 0 CHECK (outputs_consumed >= 0),

  stripe_payment_intent_id TEXT UNIQUE,
  amount_eur_cents INTEGER CHECK (amount_eur_cents IS NULL OR amount_eur_cents > 0),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  CHECK (outputs_consumed <= outputs_allocated)
);

COMMENT ON TABLE public.studio_purchases IS
  'Aimily Studio · purchase record per Stripe payment. Tracks pack tier + outputs allocated/consumed for the project pool.';

CREATE INDEX idx_studio_purchases_project_id_remaining
  ON public.studio_purchases(studio_project_id, created_at)
  WHERE outputs_consumed < outputs_allocated;

CREATE INDEX idx_studio_purchases_user_id
  ON public.studio_purchases(user_id);

-- RLS
ALTER TABLE public.studio_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_purchases_owner_select"
  ON public.studio_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT only by service_role (via webhook). No client direct insert.
-- UPDATE/DELETE only by service_role (RPC functions run with SECURITY DEFINER).
-- No policies for INSERT/UPDATE/DELETE → RLS defaults to deny for authenticated users.

-- ─────────────────────────────────────────────────────────────────────────
-- RPC · allocate_studio_outputs
--   Called by Stripe webhook on payment_intent.succeeded with metadata
--   type='studio_pack'. Creates the studio_purchase row atomically.
--   Idempotent on stripe_payment_intent_id (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.allocate_studio_outputs(
  p_user_id UUID,
  p_studio_project_id UUID,
  p_pack_tier TEXT,
  p_outputs_count INTEGER,
  p_stripe_payment_intent_id TEXT,
  p_amount_eur_cents INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id UUID;
  v_project_user_id UUID;
BEGIN
  -- Verify the project belongs to the user
  SELECT user_id INTO v_project_user_id
  FROM public.studio_projects
  WHERE id = p_studio_project_id;

  IF v_project_user_id IS NULL THEN
    RAISE EXCEPTION 'studio_project not found: %', p_studio_project_id;
  END IF;

  IF v_project_user_id != p_user_id THEN
    RAISE EXCEPTION 'studio_project ownership mismatch';
  END IF;

  -- Idempotent insert
  INSERT INTO public.studio_purchases (
    user_id,
    studio_project_id,
    pack_tier,
    outputs_allocated,
    outputs_consumed,
    stripe_payment_intent_id,
    amount_eur_cents
  ) VALUES (
    p_user_id,
    p_studio_project_id,
    p_pack_tier,
    p_outputs_count,
    0,
    p_stripe_payment_intent_id,
    p_amount_eur_cents
  )
  ON CONFLICT (stripe_payment_intent_id) DO NOTHING
  RETURNING id INTO v_purchase_id;

  -- If conflict (already exists), return the existing id
  IF v_purchase_id IS NULL THEN
    SELECT id INTO v_purchase_id
    FROM public.studio_purchases
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;
  END IF;

  RETURN v_purchase_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.allocate_studio_outputs FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_studio_outputs TO service_role;

COMMENT ON FUNCTION public.allocate_studio_outputs IS
  'Aimily Studio · called by Stripe webhook. Creates studio_purchase row idempotent on payment_intent_id. SECURITY DEFINER + service_role only.';

-- ─────────────────────────────────────────────────────────────────────────
-- RPC · consume_studio_output
--   Called by /api/studio/generate before AI call. Atomically decrements
--   outputs_remaining from the OLDEST unexhausted purchase for the project.
--   Returns the purchase_id consumed (for refund on failure) or NULL if
--   no outputs available.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consume_studio_output(
  p_user_id UUID,
  p_studio_project_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id UUID;
  v_project_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_project_user_id
  FROM public.studio_projects
  WHERE id = p_studio_project_id;

  IF v_project_user_id IS NULL OR v_project_user_id != p_user_id THEN
    RAISE EXCEPTION 'studio_project ownership check failed';
  END IF;

  -- Find oldest unexhausted purchase and decrement atomically
  WITH oldest_active AS (
    SELECT id
    FROM public.studio_purchases
    WHERE studio_project_id = p_studio_project_id
      AND outputs_consumed < outputs_allocated
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.studio_purchases sp
  SET outputs_consumed = sp.outputs_consumed + 1
  FROM oldest_active
  WHERE sp.id = oldest_active.id
  RETURNING sp.id INTO v_purchase_id;

  -- v_purchase_id is NULL if no active purchase exists (pool empty)
  RETURN v_purchase_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_studio_output FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_studio_output TO authenticated;

COMMENT ON FUNCTION public.consume_studio_output IS
  'Aimily Studio · atomic decrement of oldest active studio_purchase. Returns purchase_id (for refund) or NULL if pool empty.';

-- ─────────────────────────────────────────────────────────────────────────
-- RPC · refund_studio_output
--   Called by /api/studio/generate when AI call fails after consume.
--   Atomically increments outputs_remaining on a specific purchase_id.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refund_studio_output(
  p_user_id UUID,
  p_purchase_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.studio_purchases
  SET outputs_consumed = GREATEST(outputs_consumed - 1, 0)
  WHERE id = p_purchase_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_studio_output FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_studio_output TO authenticated;

COMMENT ON FUNCTION public.refund_studio_output IS
  'Aimily Studio · atomic refund of one output to a specific purchase. Used on AI failure path.';
