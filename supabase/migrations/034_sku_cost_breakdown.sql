-- Phase 2.1 — BOM-driven costing engine
--
-- Adds a `cost_breakdown` JSONB column to collection_skus to hold the
-- derived landed-cost composition. The existing `cost` numeric column
-- stays as the canonical financial number consumed by Range Plan,
-- Production financial recap, PO totals, exports, sales dashboards
-- and marketing forecasts — we do not break those consumers. When
-- `cost_breakdown.source_of_truth = 'bom'` the engine syncs `cost`
-- from `cost_breakdown.total_landed`. When 'manual' the user override
-- wins and the engine is advisory only.
--
-- Shape:
--   {
--     materials: {
--       bom_rolled_up: number,      // sum(bom.lines[].qty × cost)
--       manual_override: number?,
--       source_of_truth: 'bom' | 'manual'
--     },
--     labor: {
--       factory_rate: number,        // EUR per hour
--       hours: number,
--       total: number
--     },
--     overhead_pct: number,          // % applied on materials + labor
--     freight: {
--       origin: string,
--       destination: string,
--       method: 'sea' | 'air' | 'rail' | 'road',
--       total: number
--     },
--     duties_pct: number,            // % applied on materials + labor + overhead + freight
--     total_landed: number,          // EUR — the derived landed cost
--     target_margin_pct: number,     // % brand target (from CIS or set by user)
--     current_margin_pct: number,    // 100 × (pvp - total_landed) / pvp
--     variance_pct: number,          // current - target
--     last_recalc_at: timestamp,
--     ai_suggestions: any[]          // populated by /api/ai/costing/suggest-substitutions
--   }
--
-- Detected during the PLM-parity master plan; first deliverable of
-- Phase 2 (BOM-driven costing engine + AI Margin Protection).

ALTER TABLE public.collection_skus
  ADD COLUMN IF NOT EXISTS cost_breakdown jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_collection_skus_cost_breakdown_recalc
  ON public.collection_skus ((cost_breakdown->>'last_recalc_at'))
  WHERE cost_breakdown IS NOT NULL AND cost_breakdown != '{}'::jsonb;

COMMENT ON COLUMN public.collection_skus.cost_breakdown IS
  'Phase 2 BOM-driven costing engine output. See landed-cost.ts for the
shape and recalculateCostBreakdown() for the derivation. The existing
cost column stays canonical; this column is the audit trail and the
input to AI Margin Protection.';
