-- B1 — Email sequence support: add sequence grouping fields to
-- email_templates_content so an AI-generated sequence (5-7 emails)
-- persists as a set of rows sharing the same sequence_id.
--
-- Applied to Supabase via MCP before committing. This file is the canonical
-- migration history.

ALTER TABLE email_templates_content
  ADD COLUMN IF NOT EXISTS sequence_id uuid,
  ADD COLUMN IF NOT EXISTS sequence_name text,
  ADD COLUMN IF NOT EXISTS sequence_type text,
  ADD COLUMN IF NOT EXISTS sequence_position integer,
  ADD COLUMN IF NOT EXISTS sequence_total integer,
  ADD COLUMN IF NOT EXISTS trigger text,
  ADD COLUMN IF NOT EXISTS send_delay_hours integer,
  ADD COLUMN IF NOT EXISTS send_time_preference text,
  ADD COLUMN IF NOT EXISTS exit_conditions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS one_job text,
  ADD COLUMN IF NOT EXISTS hook_type text,
  ADD COLUMN IF NOT EXISTS success_metrics jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS email_templates_content_sequence_id_idx
  ON email_templates_content(sequence_id)
  WHERE sequence_id IS NOT NULL;

COMMENT ON COLUMN email_templates_content.sequence_id IS
  'B1 — Groups emails that belong to the same AI-generated sequence. NULL for single emails.';
COMMENT ON COLUMN email_templates_content.sequence_type IS
  'B1 — welcome | launch | post_purchase | re_engagement';
COMMENT ON COLUMN email_templates_content.hook_type IS
  'B1/B4 — curiosity | story | value | contrarian';
