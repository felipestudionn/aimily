-- Phase 4 — Sample Tracking Chain + AI Photo Comparison
--
-- The sample_reviews table has been in the BD since migration 006 but
-- never wired into the UI (PrototypingPhase.tsx renders proto_iterations
-- instead). Block 3 audit flagged it as orphan; Phase 4 plugs it in.
--
-- This migration adds the missing columns to make the chain usable:
--   - factory_promised_date / factory_received_date: lead-time spine.
--     delay_days is GENERATED so consumers (collection-level dashboard
--     of late factories) don't have to compute it everywhere.
--   - ai_comparison: stores the JSON output of /api/ai/sample-review/
--     compare so the UI can render the deviation list without re-running
--     the vision model on every render.
--   - ai_recommendation: the model's approve/minor/major/reject hint so
--     reviewers can see at a glance whether the AI flagged it.
--
-- Indexes:
--   - One sided on (collection_plan_id, factory_promised_date) for the
--     "factories running late" dashboard.
--   - Partial on ai_recommendation IN ('major_revisions','reject') for
--     fast filtering of high-risk samples.

ALTER TABLE public.sample_reviews
  ADD COLUMN IF NOT EXISTS factory_promised_date date,
  ADD COLUMN IF NOT EXISTS factory_received_date date,
  ADD COLUMN IF NOT EXISTS delay_days integer GENERATED ALWAYS AS
    (factory_received_date - factory_promised_date) STORED,
  ADD COLUMN IF NOT EXISTS ai_comparison jsonb,
  ADD COLUMN IF NOT EXISTS ai_recommendation text CHECK (
    ai_recommendation IS NULL OR
    ai_recommendation IN ('approve','minor_revisions','major_revisions','reject')
  ),
  ADD COLUMN IF NOT EXISTS ai_compared_at timestamptz;

CREATE INDEX IF NOT EXISTS sample_reviews_lead_time_idx
  ON public.sample_reviews (collection_plan_id, factory_promised_date)
  WHERE factory_promised_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS sample_reviews_ai_risk_idx
  ON public.sample_reviews (collection_plan_id, ai_recommendation)
  WHERE ai_recommendation IN ('major_revisions','reject');

COMMENT ON COLUMN public.sample_reviews.delay_days IS
  'Generated: factory_received_date - factory_promised_date. NULL until both dates are set. Negative = early, positive = late.';
COMMENT ON COLUMN public.sample_reviews.ai_comparison IS
  'JSON output from /api/ai/sample-review/compare — { deviations: [{area, severity, description}], approval_recommendation }. Cached so the UI does not re-run vision.';
