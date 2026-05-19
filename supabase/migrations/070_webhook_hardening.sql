-- 070_webhook_hardening
--
-- Felipe 2026-05-19/20 · production hardening for the Shopify + Stripe
-- webhook endpoints (`/api/in-season/webhooks/*`).
--
-- Adds:
--   1) `tenant_sales_webhook_events` — idempotency log so a duplicated
--      webhook delivery (Shopify retries on 5xx, Stripe retries up to
--      3 days) is not double-processed. Indexed by (provider, event_id)
--      with a uniqueness constraint that hard-rejects replays.
--   2) `tenant_sales_webhook_dead_letters` — DLQ for events that fail
--      verification or tenant lookup. Keeps the raw body so we can
--      replay manually (or via a future operator surface) without
--      losing the delivery.
--   3) `webhook_secret_id uuid` on tenant_sales_connections — per-tenant
--      secret stored in Supabase Vault (parallel to the access token
--      pattern from migration 067). Helpers below wrap the vault calls.
--
-- Code on /api/in-season/webhooks/shopify and /stripe is updated in the
-- same commit to:
--   · look up the secret via `tenant_sales_webhook_get_secret(connection_id)`
--     when set, falling back to the env-wide SHOPIFY_WEBHOOK_SECRET /
--     STRIPE_WEBHOOK_SECRET (kept as transition fallback);
--   · upsert the event into `tenant_sales_webhook_events` BEFORE bumping
--     next_sync_at — a unique-constraint violation = duplicate replay,
--     return 200 OK with `ignored: 'duplicate'`;
--   · on any failure path that has a raw body but no clean tenant or
--     valid signature, insert into the DLQ table for later replay.

BEGIN;

-- 1) Idempotency log
CREATE TABLE IF NOT EXISTS public.tenant_sales_webhook_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           text NOT NULL CHECK (provider IN ('shopify','stripe')),
  event_id           text NOT NULL,
  topic              text,
  connection_id      uuid REFERENCES public.tenant_sales_connections(id) ON DELETE SET NULL,
  tenant_id          uuid REFERENCES public.in_season_tenants(id) ON DELETE CASCADE,
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  status             text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processed','duplicate','error')),
  error              text
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_sales_webhook_events_provider_event_id
  ON public.tenant_sales_webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS tenant_sales_webhook_events_tenant_received
  ON public.tenant_sales_webhook_events (tenant_id, received_at DESC);

ALTER TABLE public.tenant_sales_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_sales_webhook_events_read
  ON public.tenant_sales_webhook_events
  FOR SELECT
  USING (tenant_id IS NULL OR strategy_user_is_tenant_member(tenant_id));

-- 2) Dead-letter queue
CREATE TABLE IF NOT EXISTS public.tenant_sales_webhook_dead_letters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL CHECK (provider IN ('shopify','stripe')),
  reason          text NOT NULL,
  raw_body        text NOT NULL,
  shop_domain     text,
  stripe_account  text,
  topic           text,
  event_id        text,
  signature       text,
  received_at     timestamptz NOT NULL DEFAULT now(),
  replayed_at     timestamptz,
  replay_outcome  text
);

CREATE INDEX IF NOT EXISTS tenant_sales_webhook_dead_letters_provider_received
  ON public.tenant_sales_webhook_dead_letters (provider, received_at DESC);

ALTER TABLE public.tenant_sales_webhook_dead_letters ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: only service_role accesses the DLQ. Operator UI lands later.

-- 3) Per-tenant webhook secret (Vault)
ALTER TABLE public.tenant_sales_connections
  ADD COLUMN IF NOT EXISTS webhook_secret_id uuid;

CREATE OR REPLACE FUNCTION public.tenant_sales_webhook_store_secret(
  p_connection_id uuid,
  p_secret text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  v_secret_id := vault.create_secret(p_secret);
  UPDATE public.tenant_sales_connections
  SET webhook_secret_id = v_secret_id
  WHERE id = p_connection_id;
  RETURN v_secret_id;
END
$$;

CREATE OR REPLACE FUNCTION public.tenant_sales_webhook_get_secret(
  p_connection_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
  SELECT ds.decrypted_secret
  FROM public.tenant_sales_connections c
  JOIN vault.decrypted_secrets ds ON ds.id = c.webhook_secret_id
  WHERE c.id = p_connection_id;
$$;

-- Lock the helpers to service_role (anon/authenticated must NEVER touch
-- vault secrets via the public API). Code calls these via supabaseAdmin.
REVOKE EXECUTE ON FUNCTION public.tenant_sales_webhook_store_secret(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tenant_sales_webhook_get_secret(uuid)        FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.tenant_sales_webhook_store_secret(uuid, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.tenant_sales_webhook_get_secret(uuid)         TO service_role;

COMMIT;
