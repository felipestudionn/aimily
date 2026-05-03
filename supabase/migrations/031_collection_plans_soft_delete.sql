-- Soft-delete for collection_plans.
--
-- Until now, DELETE /api/collections/[id] removed the row outright (with
-- CASCADE wiping ~28 related tables). Storage assets were moved to
-- `__trash/` so they could be recovered, but the row itself was gone —
-- meaning a click on the trash button was permanent for the data side.
--
-- The new DELETE flow flips deleted_at = NOW() and leaves everything
-- else intact. A separate cleanup cron (sweep at >30 days) is what
-- actually CASCADE-deletes the row + sweeps Storage to __trash/.
-- Restore (within the 30-day window) is just SET deleted_at = NULL.

ALTER TABLE collection_plans
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index — only rows that ARE deleted, so the cleanup cron
-- can find them without scanning the whole (much larger) live set.
CREATE INDEX IF NOT EXISTS idx_collection_plans_deleted_at
  ON collection_plans (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Partial index for the live set (the most common query path).
-- Speeds up SELECT ... FROM collection_plans WHERE user_id = $1
-- AND deleted_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_collection_plans_user_id_active
  ON collection_plans (user_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN collection_plans.deleted_at IS
  'Soft-delete marker. NULL = live. NOT NULL = trashed (waiting on the 30-day cron sweep). Restore = set back to NULL.';
