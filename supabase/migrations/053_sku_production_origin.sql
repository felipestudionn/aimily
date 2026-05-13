-- 053 · production_origin for cost-aware production planning
--
-- Felipe (2026-05-13): at the Materials sub-step, the user should pick the
-- country / region where the SKU will be produced. That decision cascades
-- into the costing panel (factory rate / freight / duties), the production
-- calendar (lead time = production + transit weeks), and the suppliers
-- workspace (which factories of that origin are on file).
--
-- The legacy `origin` column was a 4-value enum (LOCAL/CHINA/EUROPE/OTHER)
-- — too coarse to drive realistic numbers. The new column stores an ISO
-- 3166-1 alpha-2 country code (e.g. 'IT', 'PT', 'TR', 'CN'). The legacy
-- column is preserved for now; the new column wins when both are set.
ALTER TABLE collection_skus
  ADD COLUMN IF NOT EXISTS production_origin TEXT;

COMMENT ON COLUMN collection_skus.production_origin IS
  'ISO 3166-1 alpha-2 country code where the SKU is manufactured. Drives the costing panel defaults (factory rate, freight EUR/unit, duties %) and the timeline lead-time math (production weeks + transit weeks). Set by the user in the Materials sub-step. Falls back to the legacy `origin` enum when null.';
