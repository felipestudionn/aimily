-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 049 · Block 4 Sales Strategy
--
-- Adds the structural backbone for Block 4 · Marketing & Sales:
--   1. collection_skus: fulfillment_model + lead_time_days + deposit_pct +
--      channel_availability (jsonb)
--   2. drops: mechanic + gating_config + window_open_at + window_close_at +
--      waitlist_count
--   3. storefronts.payment_provider: extend CHECK constraint with new
--      providers (tiktok_shop_native, manual_invoice_split, preproduct,
--      bizum, mercadopago, pix, whatsapp_pay, creator_passthrough_komi,
--      creator_passthrough_stan)
--   4. sales_actions: new table for the timeline of marketing tasks derived
--      by the Sales Dashboard motor.
--
-- CIS keys for marketing.sales_strategy.* live in collection_decisions
-- (already present, no schema change required).
--
-- Reference: memory/spec_block-4-sales-strategy-archetypes.md (FINAL spec)
-- Reference: memory/architecture-block-4-channels.md (channel taxonomy)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. collection_skus · MTO + channel availability ────────────────────────

ALTER TABLE public.collection_skus
  ADD COLUMN IF NOT EXISTS fulfillment_model text NOT NULL DEFAULT 'in_stock'
    CHECK (fulfillment_model IN ('in_stock', 'made_to_order', 'pre_order')),
  ADD COLUMN IF NOT EXISTS lead_time_days int CHECK (lead_time_days IS NULL OR lead_time_days > 0),
  ADD COLUMN IF NOT EXISTS deposit_pct numeric(5,2) CHECK (deposit_pct IS NULL OR (deposit_pct >= 0 AND deposit_pct <= 100)),
  ADD COLUMN IF NOT EXISTS channel_availability jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.collection_skus.fulfillment_model IS
  'Block 4: how this SKU is fulfilled. in_stock = ship from inventory · made_to_order = production triggered by order · pre_order = capsule drop with pre-collection.';
COMMENT ON COLUMN public.collection_skus.lead_time_days IS
  'Block 4: days from order to ship for MTO/pre_order SKUs. NULL for in_stock.';
COMMENT ON COLUMN public.collection_skus.deposit_pct IS
  'Block 4: deposit percentage charged at order for MTO SKUs (0-100). NULL = full upfront. 50 = split deposit (50% at order, 50% at ship).';
COMMENT ON COLUMN public.collection_skus.channel_availability IS
  'Block 4: array of {channel_id, enabled, override_payment_provider?, override_lead_time?}. Empty array = available on all channels activated for the collection.';

-- ── 2. drops · drop mechanic + gating + window ─────────────────────────────

ALTER TABLE public.drops
  ADD COLUMN IF NOT EXISTS mechanic text NOT NULL DEFAULT 'continuous'
    CHECK (mechanic IN ('continuous', 'fcfs', 'raffle', 'unlimited_window', 'gated', 'on_demand', 'scheduled_capsule')),
  ADD COLUMN IF NOT EXISTS gating_config jsonb,
  ADD COLUMN IF NOT EXISTS window_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS window_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS waitlist_count int NOT NULL DEFAULT 0 CHECK (waitlist_count >= 0);

COMMENT ON COLUMN public.drops.mechanic IS
  'Block 4: drop release pattern. continuous = always available · fcfs = first-come-first-served (sells until stock-out) · raffle = lottery · unlimited_window = Telfar-style open window with post-window production · gated = Discord/waitlist required · on_demand = MTO · scheduled_capsule = creator-style cyclical drops.';
COMMENT ON COLUMN public.drops.gating_config IS
  'Block 4: optional gate config. {type: discord_role | waitlist_position | coupon_code, value: string}.';
COMMENT ON COLUMN public.drops.window_open_at IS
  'Block 4: when the drop window opens (used by unlimited_window/gated mechanics). NULL for continuous/on_demand.';
COMMENT ON COLUMN public.drops.window_close_at IS
  'Block 4: when the drop window closes. NULL for continuous/on_demand.';
COMMENT ON COLUMN public.drops.waitlist_count IS
  'Block 4: rolling count of customers signed up to the waitlist for this drop.';

-- ── 3. storefronts.payment_provider · extend allowed values ────────────────
-- Drop and re-create the CHECK constraint to add new providers needed by
-- TikTok Shop, MTO with PreProduct/manual invoice, Community DM with Bizum/
-- Pix/MercadoPago/WhatsApp Pay, and creator passthrough rails.

ALTER TABLE public.storefronts
  DROP CONSTRAINT IF EXISTS storefronts_payment_provider_check;

ALTER TABLE public.storefronts
  ADD CONSTRAINT storefronts_payment_provider_check
  CHECK (payment_provider IN (
    'stripe_buy_button',
    'shopify_buy',
    'lookbook_only',
    -- new providers · Block 4
    'tiktok_shop_native',
    'preproduct',
    'manual_invoice_split',
    'manual_invoice_full',
    'bizum',
    'mercadopago',
    'pix',
    'whatsapp_pay',
    'creator_passthrough_komi',
    'creator_passthrough_stan',
    'creator_passthrough_linktree',
    'creator_passthrough_shopmy'
  ));

-- ── 4. sales_actions · timeline of marketing tasks derived by Sales Dashboard ─

CREATE TABLE IF NOT EXISTS public.sales_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES public.collection_plans(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES public.collection_skus(id) ON DELETE CASCADE,
  drop_id uuid REFERENCES public.drops(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN (
    'own_storefront',
    'tiktok_shop',
    'community_dm',
    'wholesale_b2b',
    'pop_ups_physical',
    'marketplaces'
  )),
  action_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  relative_offset_days int,                      -- T-N (negative) or T+N (positive) days from anchor
  anchor_event text DEFAULT 'sku_entry',         -- sku_entry | drop_launch | drop_window_open | drop_window_close
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'generated', 'scheduled', 'live', 'completed', 'skipped', 'cancelled')),
  target_endpoint text,                          -- /api/ai/{block}/... that auto-generate triggers
  payload jsonb,                                 -- prefill payload for the generator
  generated_artifact_id uuid,                    -- ref to ai_generations.id or content row id
  generated_artifact_type text,                  -- copy | image | video | pdf | feed | brief
  generated_artifact_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_actions_collection
  ON public.sales_actions(collection_plan_id);

CREATE INDEX IF NOT EXISTS idx_sales_actions_scheduled
  ON public.sales_actions(scheduled_at)
  WHERE status IN ('pending', 'scheduled');

CREATE INDEX IF NOT EXISTS idx_sales_actions_sku
  ON public.sales_actions(sku_id) WHERE sku_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_actions_drop
  ON public.sales_actions(drop_id) WHERE drop_id IS NOT NULL;

COMMENT ON TABLE public.sales_actions IS
  'Block 4: timeline of marketing actions derived by the Sales Dashboard motor from sku entry dates × archetype × channels. Each action has a target_endpoint that the Auto-generate button triggers to prefill the corresponding artifact (creator brief, email, press release, etc.). Status flows pending → generating → generated → scheduled → live → completed.';

-- RLS · users see only their own collections
ALTER TABLE public.sales_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_actions_owner_select ON public.sales_actions;
CREATE POLICY sales_actions_owner_select ON public.sales_actions
  FOR SELECT
  USING (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sales_actions_owner_insert ON public.sales_actions;
CREATE POLICY sales_actions_owner_insert ON public.sales_actions
  FOR INSERT
  WITH CHECK (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sales_actions_owner_update ON public.sales_actions;
CREATE POLICY sales_actions_owner_update ON public.sales_actions
  FOR UPDATE
  USING (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sales_actions_owner_delete ON public.sales_actions;
CREATE POLICY sales_actions_owner_delete ON public.sales_actions
  FOR DELETE
  USING (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.sales_actions_updated_at_fn() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_actions_updated_at_trigger ON public.sales_actions;
CREATE TRIGGER sales_actions_updated_at_trigger
  BEFORE UPDATE ON public.sales_actions
  FOR EACH ROW EXECUTE FUNCTION public.sales_actions_updated_at_fn();
