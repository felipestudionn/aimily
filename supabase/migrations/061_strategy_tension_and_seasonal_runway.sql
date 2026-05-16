
-- Two enhancements per Felipe direction (2026-05-16):
-- 1. tension_flag action type: when sales-driven recommendation contradicts
--    the creative brief. Surfaces strategic tension as its own first-class
--    recommendation, not buried in evidence.
-- 2. seasonal_runway_days metric per SKU: remaining sell window in days
--    derived from season_tag + product type + activation_date + current
--    calendar. Used by the replenishment allocator (Paso 3) and surfaced
--    in classifier_traces.

ALTER TYPE strategy_action_type ADD VALUE IF NOT EXISTS 'tension_flag';
ALTER TYPE strategy_action_type ADD VALUE IF NOT EXISTS 'new_sku_proposal';
ALTER TYPE strategy_action_type ADD VALUE IF NOT EXISTS 'family_extension';

-- Add columns to strategy_sku_scores so seasonal_runway is queryable.
ALTER TABLE strategy_sku_scores
  ADD COLUMN IF NOT EXISTS seasonal_runway_days integer,
  ADD COLUMN IF NOT EXISTS seasonal_runway_score numeric(5,4);

COMMENT ON COLUMN strategy_sku_scores.seasonal_runway_days IS
  'Days remaining in the SKU''s natural sell window. e.g. a V26 (spring/summer) SKU observed in May has ~120 days of runway; a V26 SKU observed in September has ~30. Drives replenishment buy allocation in scenarios.';
COMMENT ON COLUMN strategy_sku_scores.seasonal_runway_score IS
  '0-1 normalized version of runway_days, capped at ~180 days. Higher = more time to sell through. Combined with demand_score in replenishment ranking.';
