-- B3 — Stories enrichment: priority score, structured content direction, editorial hook.
-- content_direction (text) is kept for backward compat; new data populates
-- content_direction_structured (jsonb) with { setting, lighting, styling, model_attitude, camera_approach }.
--
-- Applied to Supabase via MCP before committing. This file is the canonical
-- migration history.

ALTER TABLE collection_stories
  ADD COLUMN IF NOT EXISTS content_direction_structured jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS priority_score_total numeric,
  ADD COLUMN IF NOT EXISTS priority_score_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS editorial_hook text,
  ADD COLUMN IF NOT EXISTS consumer_signals jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN collection_stories.content_direction_structured IS
  'B3 enrichment: { setting, lighting, styling, model_attitude, camera_approach } — each <=20 words';
COMMENT ON COLUMN collection_stories.priority_score_total IS
  'B3 enrichment: 0-10 score for commercial prioritization';
COMMENT ON COLUMN collection_stories.priority_score_breakdown IS
  'B3 enrichment: { customer_impact, commercial_fit, visual_differentiation, rationale }';
COMMENT ON COLUMN collection_stories.editorial_hook IS
  'B3 enrichment: 15-25 word editorial hook — the tension that makes this story shareable';
COMMENT ON COLUMN collection_stories.consumer_signals IS
  'B3 enrichment: array of real consumer voice phrases (DMs, reviews, objections) that informed this story';
