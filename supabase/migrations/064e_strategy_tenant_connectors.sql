-- Applied 2026-05-19 via Supabase MCP (version 20260519103725).
-- Backfilled into the repo on 2026-05-21 so supabase/migrations/ matches DB state.

-- Felipe sprint Shopify lane sprint 3b · 2026-05-19
--
-- Connector credentials persistidas por tenant para que el cron diario
-- pueda recorrer tenants activos sin que el cliente reintroduzca el
-- token cada día.
--
-- v1: config jsonb sin encryption (PoC). Producción debe usar pgsodium
-- o un KMS externo para el access_token. Anotado para sprint futuro.

CREATE TABLE IF NOT EXISTS strategy_tenant_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  connector_type text NOT NULL CHECK (connector_type IN ('shopify_graphql', 'shopify_app', 'prediko', 'loop_returns', 'klaviyo')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed', 'revoked')),
  last_sync_at timestamptz NULL,
  last_sync_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  UNIQUE (tenant_id, connector_type)
);

CREATE INDEX IF NOT EXISTS idx_connectors_active
  ON strategy_tenant_connectors(tenant_id, status)
  WHERE status = 'active';

ALTER TABLE strategy_tenant_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY connectors_select
  ON strategy_tenant_connectors FOR SELECT
  USING (strategy_user_is_tenant_member(tenant_id));
CREATE POLICY connectors_insert
  ON strategy_tenant_connectors FOR INSERT
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));
CREATE POLICY connectors_update
  ON strategy_tenant_connectors FOR UPDATE
  USING (strategy_user_is_tenant_member(tenant_id))
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));
CREATE POLICY connectors_delete
  ON strategy_tenant_connectors FOR DELETE
  USING (strategy_user_is_tenant_member(tenant_id));

COMMENT ON TABLE strategy_tenant_connectors IS
  'Per-tenant connector credentials (Shopify, Prediko, Loop, Klaviyo). v1 unencrypted PoC; v2 must use pgsodium for access_token at rest.';
