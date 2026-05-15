
-- Per Codex P1 review: recommendation_candidates persisted only confidence_action.
-- The BP §9 promises 6 confidence dimensions per recommendation. Add the
-- remaining 5 columns so the UI can render the breakdown that the value
-- prop hinges on.

ALTER TABLE strategy_recommendation_candidates
  ADD COLUMN IF NOT EXISTS confidence_data_completeness numeric(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_identity numeric(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_demand numeric(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_margin numeric(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_creative_fit numeric(5,4);

COMMENT ON COLUMN strategy_recommendation_candidates.confidence_data_completeness IS
  'Snapshot from strategy_sku_scores: % of expected fields present at score time.';
COMMENT ON COLUMN strategy_recommendation_candidates.confidence_identity IS
  'Snapshot: identity_graph confidence for this SKU (1.0 if matched, 0.5 if orphan).';
COMMENT ON COLUMN strategy_recommendation_candidates.confidence_demand IS
  'Snapshot: how reliable is the observed velocity (penalised by stockout suppression).';
COMMENT ON COLUMN strategy_recommendation_candidates.confidence_margin IS
  'Snapshot: how reliable is the effective margin (penalised when returns data is missing).';
COMMENT ON COLUMN strategy_recommendation_candidates.confidence_creative_fit IS
  'Snapshot: alignment with Bucket B creative brief. NULL if no brief in the run.';
