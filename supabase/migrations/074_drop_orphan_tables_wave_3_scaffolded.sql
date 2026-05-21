-- Applied 2026-05-21 via Supabase MCP (version 20260521171805).
-- Backfilled into the repo on 2026-05-21 so supabase/migrations/ matches DB state.

-- Wave 3 — Scaffolded features that never shipped (8 tables).
-- Felipe explicit decision 2026-05-21: "drop todas, mi recomendación hacia adelante".
-- Product-decision rationale per table documented in
-- memory/db-dropped-tables-backup-2026-05-21.md
--
-- Pre-flight verified: 0 rows in each, 0 external FK constraints, 0 lib refs.

DROP TABLE IF EXISTS market_predictions CASCADE;
DROP TABLE IF EXISTS campaign_shoots CASCADE;
DROP TABLE IF EXISTS paid_ad_sets CASCADE;
DROP TABLE IF EXISTS launch_checklist CASCADE;
DROP TABLE IF EXISTS launch_issues CASCADE;
DROP TABLE IF EXISTS lessons_learned CASCADE;
DROP TABLE IF EXISTS brand_models CASCADE;
DROP TABLE IF EXISTS pr_contacts CASCADE;
