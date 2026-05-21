-- Applied 2026-05-21 via Supabase MCP (version 20260521175248).
-- Backfilled into the repo on 2026-05-21 so supabase/migrations/ matches DB state.

-- Wave 4 — Read-only lib-read tables (9 tables).
-- All had 0 rows, 0 write paths in src/, only consumers were lib readers
-- (milestone-sync-map, prompt-context, presentation-data, storefront/*)
-- which I stubbed to Promise.resolve({data:[], count:0}) in the same commit
-- as this migration. The corresponding milestone sync predicates in SYNC_MAP
-- will continue to evaluate false (same as today with empty tables),
-- keeping Block 4 milestones in "pending" state.

DROP TABLE IF EXISTS content_calendar CASCADE;
DROP TABLE IF EXISTS content_pillars CASCADE;
DROP TABLE IF EXISTS email_templates_content CASCADE;
DROP TABLE IF EXISTS launch_tasks CASCADE;
DROP TABLE IF EXISTS lookbook_pages CASCADE;
DROP TABLE IF EXISTS paid_campaigns CASCADE;
DROP TABLE IF EXISTS product_copy CASCADE;
DROP TABLE IF EXISTS social_templates CASCADE;
DROP TABLE IF EXISTS commercial_actions CASCADE;
