-- Applied 2026-05-19 via Supabase MCP (version 20260519093757).
-- Backfilled into the repo on 2026-05-21 so supabase/migrations/ matches DB state.

-- Felipe sprint Shopify lane sprint 3 · 2026-05-19
--
-- Shopify (y la mayoría de ERPs cloud) NO exponen historial nativo de
-- inventory ni de price. Para calcular rotation_7d, emptying_rate,
-- max_sale_no_promo, etc. necesitamos snapshots diarios propios.
--
-- Esta tabla se popula via cron (o trigger manual) llamando GraphQL
-- Admin API. Después los classifiers en src/lib/strategy/classifiers
-- leen los últimos 14-28 días y derivan rotation native sin depender
-- de input del cliente.

CREATE TABLE IF NOT EXISTS strategy_inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  stock_available integer NULL,
  stock_on_hand integer NULL,
  stock_committed integer NULL,
  stock_incoming integer NULL,
  pvp numeric(10, 2) NULL,
  pvp_compare numeric(10, 2) NULL,
  on_promo boolean NOT NULL DEFAULT false,
  connector_type text NOT NULL DEFAULT 'shopify_graphql' CHECK (connector_type IN ('shopify_graphql', 'shopify_csv', 'manual_upload', 'zara_pdf_extracted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_fact_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snap_tenant_date
  ON strategy_inventory_snapshots(tenant_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_snap_product_date
  ON strategy_inventory_snapshots(product_fact_id, snapshot_date DESC);

ALTER TABLE strategy_inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_select
  ON strategy_inventory_snapshots
  FOR SELECT
  USING (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY snapshots_insert
  ON strategy_inventory_snapshots
  FOR INSERT
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY snapshots_update
  ON strategy_inventory_snapshots
  FOR UPDATE
  USING (strategy_user_is_tenant_member(tenant_id))
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY snapshots_delete
  ON strategy_inventory_snapshots
  FOR DELETE
  USING (strategy_user_is_tenant_member(tenant_id));

COMMENT ON TABLE strategy_inventory_snapshots IS
  'Daily inventory + price snapshots para construir rotation/emptying/max_sale history nativa cuando el source (Shopify, ERP) no lo expone. Populado vía cron + connectors. Felipe sprint 3 Shopify lane 2026-05-19.';
