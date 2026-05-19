-- 071_in_season_seeds_applied_at
--
-- Felipe 2026-05-19/20 · Sprint E deep moodboard ingestion needs to track
-- when a seed has been ingested into the Creative & Brand block, so the
-- banner CTA in CollectionOverview can switch to "Aplicado" on subsequent
-- visits and we can audit cross-collection seed propagation.

ALTER TABLE public.in_season_sku_seeds
  ADD COLUMN IF NOT EXISTS applied_to_moodboard_at timestamptz;

CREATE INDEX IF NOT EXISTS in_season_sku_seeds_applied_moodboard
  ON public.in_season_sku_seeds (consumed_in_collection_id, applied_to_moodboard_at)
  WHERE applied_to_moodboard_at IS NOT NULL;
