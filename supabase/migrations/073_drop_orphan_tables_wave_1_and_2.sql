-- Applied 2026-05-21 via Supabase MCP (version 20260521160851).
-- Backfilled into the repo on 2026-05-21 so supabase/migrations/ matches DB state.

-- Senior-dev pre-ship cleanup (Felipe 2026-05-21).
-- Drops 8 tables: 6 from never-shipped social trends pipeline + asset_reviews
-- + 2 with confirmed replacement in current journey.
--
-- Audit chain that authorized this drop:
--   1. src/ grep: zero refs to .from('table') for each
--   2. Information schema FK: only internal FK analyzed_content→raw_content (drops together)
--   3. pg_views / pg_matviews: zero references
--   4. pg_proc functions / procedures: zero references
--   5. information_schema.triggers: zero
--   6. cron.job pg_cron schedules: zero referencing these
--   7. Dynamic table-name strings in code (e.g., /api/account/export array): zero
--
-- Replacement tables for journey continuity:
--   tech_packs        → tech_pack_data + tech_pack_revisions + tech_pack_comments
--   sales_entries     → in_season_raw_records + in_season_sales_windows + in_season_efficiency_facts
--
-- 3 demo rows from signals backed up to memory/db-dropped-tables-backup-2026-05-21.md before drop.

-- Wave 1: Social trends pipeline + asset_reviews
DROP TABLE IF EXISTS analyzed_content CASCADE;
DROP TABLE IF EXISTS raw_content CASCADE;
DROP TABLE IF EXISTS signals CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS asset_reviews CASCADE;

-- Wave 2: Replaced by current journey tables
DROP TABLE IF EXISTS tech_packs CASCADE;
DROP TABLE IF EXISTS sales_entries CASCADE;
