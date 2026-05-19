-- =============================================================================
-- Migration 066 · Tenant sales connections (Shopify / Stripe OAuth bridge)
-- =============================================================================
--
-- Felipe 2026-05-19 noche · Sprint 4 of In-Season feedback loop arch
-- (memory/architecture_in-season-feedback-loop.md).
--
-- Brands using aimily 360 publish their collection on `brand.aimily.shop`
-- which embeds Stripe Buy / Shopify Buy SDK for checkout. Sales data lives
-- in Stripe or Shopify, not in our DB. To close the In-Season feedback loop
-- we need a per-tenant connection that the daily cron uses to pull orders
-- and ingest them into strategy_* tables.
--
-- MVP scope:
--   - 1 connection per (tenant, provider)
--   - Provider = 'shopify' for now (Stripe is a future sprint)
--   - access_token stored plaintext for dev — production needs Supabase Vault
--   - Sync history audited in a separate table for debug + cron observability

CREATE TYPE tenant_sales_provider AS ENUM (
  'shopify',
  'stripe'
);

CREATE TYPE tenant_sales_connection_status AS ENUM (
  'active',
  'paused',
  'error',
  'revoked'
);

CREATE TABLE tenant_sales_connections (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  provider tenant_sales_provider NOT NULL,

  -- Shopify-specific
  shop_domain text,                     -- e.g. "aimily-mlyel0nm.myshopify.com"
  access_token text NOT NULL,           -- TODO: encrypt at rest via Supabase Vault (sprint hardening)
  scopes text[] NOT NULL DEFAULT '{}',  -- Track granted scopes for capability inference

  -- Sync state
  status tenant_sales_connection_status NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  last_sync_source_id uuid,             -- pointer to last strategy_sources row produced
  last_sync_error text,
  last_sync_records_count int,
  next_sync_at timestamptz NOT NULL DEFAULT now(),

  -- Cadence config (allows per-tenant customization later)
  sync_cadence_hours int NOT NULL DEFAULT 24,

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,

  -- One active connection per (tenant, provider). Subsequent connect
  -- replaces (delete+insert) the old one rather than maintaining history.
  CONSTRAINT tenant_sales_connections_unique_active
    UNIQUE (tenant_id, provider)
);

CREATE INDEX tenant_sales_connections_next_sync_idx
  ON tenant_sales_connections(next_sync_at)
  WHERE status = 'active';
CREATE INDEX tenant_sales_connections_tenant_idx
  ON tenant_sales_connections(tenant_id);

-- Audit trail per sync attempt
CREATE TABLE tenant_sales_sync_runs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  connection_id uuid NOT NULL REFERENCES tenant_sales_connections(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  trigger text NOT NULL,                -- 'cron' | 'manual' | 'webhook'
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'error'
  source_id uuid,                       -- strategy_sources row produced
  records_count int,
  error text,
  duration_ms int
);

CREATE INDEX tenant_sales_sync_runs_connection_idx
  ON tenant_sales_sync_runs(connection_id, started_at DESC);

-- RLS: members of the tenant can read their connection (UI), but only service
-- role can write (cron runs as service). User-facing connect/disconnect uses
-- service role via the route handler that has tenant access guard upstream.

ALTER TABLE tenant_sales_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sales_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_sales_connections_select
  ON tenant_sales_connections FOR SELECT
  USING (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY tenant_sales_sync_runs_select
  ON tenant_sales_sync_runs FOR SELECT
  USING (strategy_user_is_tenant_member(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_sales_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_sales_sync_runs TO service_role;

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION tenant_sales_connections_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, public;

CREATE TRIGGER tenant_sales_connections_touch_trg
  BEFORE UPDATE ON tenant_sales_connections
  FOR EACH ROW EXECUTE FUNCTION tenant_sales_connections_touch();

COMMENT ON TABLE tenant_sales_connections IS
  'Per-tenant connection to Shopify/Stripe (and future providers). Daily cron uses these to pull sales + inventory into strategy_* tables, closing the In-Season feedback loop for aimily_360 tenants. See memory/architecture_in-season-feedback-loop.md §4.';

COMMENT ON COLUMN tenant_sales_connections.access_token IS
  'Plaintext for MVP — production hardening sprint must move to Supabase Vault (pgsodium). Treat any prod row as a secret artifact.';
