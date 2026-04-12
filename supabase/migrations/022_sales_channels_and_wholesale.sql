-- Migration 022: sales_channels + wholesale_orders for Point of Sale card
-- Applied via mcp__supabase__apply_migration on 2026-04-12.

BEGIN;

CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id UUID NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN (
    'shopify', 'woocommerce', 'custom_ecommerce', 'aimily_web', 'wholesale', 'marketplace'
  )),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'setup' CHECK (status IN ('setup', 'connected', 'syncing', 'live', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_channels_plan ON sales_channels (collection_plan_id);

CREATE TABLE IF NOT EXISTS wholesale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id UUID NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_company TEXT,
  buyer_email TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'
  )),
  order_lines JSONB DEFAULT '[]',
  total_units INTEGER DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  delivery_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_plan ON wholesale_orders (collection_plan_id);

COMMIT;
