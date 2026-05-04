-- Phase 8 — PO variance tracking.
--
-- When a production order closes, the user logs the actual money
-- paid. variance_total and variance_pct are GENERATED columns so
-- dashboards can filter / sort without recomputing in the app layer.
--
-- variance_total = actual - projected
-- variance_pct   = (actual - projected) / projected × 100
--
-- Both NULL until both numbers are set (PO open OR projected total
-- missing). closed_at + close_notes capture the settlement event for
-- audit + dashboards (which factories overrun by how much, on average).

ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS actual_total_cost numeric,
  ADD COLUMN IF NOT EXISTS variance_total numeric GENERATED ALWAYS AS (
    CASE WHEN actual_total_cost IS NULL OR total_cost IS NULL OR total_cost = 0
         THEN NULL
         ELSE actual_total_cost - total_cost
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS variance_pct numeric GENERATED ALWAYS AS (
    CASE WHEN actual_total_cost IS NULL OR total_cost IS NULL OR total_cost = 0
         THEN NULL
         ELSE ROUND(((actual_total_cost - total_cost) / total_cost * 100)::numeric, 2)
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_notes text;

COMMENT ON COLUMN public.production_orders.actual_total_cost IS
  'Phase 8: real money paid at PO settlement. variance_total / variance_pct generated from this vs total_cost (the projected landed cost at PO open).';
