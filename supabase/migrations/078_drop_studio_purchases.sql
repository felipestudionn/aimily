-- 078_drop_studio_purchases.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Drop the per-project Studio outputs model.
--
-- Migration 077 unified all credits into user_credits + credit_ledger. The
-- 4 readers of studio_purchases (Studio dashboard / project page / project
-- list endpoints / output-checker) and the Stripe webhook's studio_pack
-- branch have been migrated to read/write the global balance instead.
-- Verified zero rows in studio_purchases before applying this migration.
--
-- The 3 RPCs that operated on the old table (allocate_studio_outputs,
-- consume_studio_output, refund_studio_output) are dropped here too. No
-- code path calls them anymore.
-- ───────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.allocate_studio_outputs(uuid, uuid, text, integer, text, integer);
DROP FUNCTION IF EXISTS public.consume_studio_output(uuid, uuid);
DROP FUNCTION IF EXISTS public.refund_studio_output(uuid, uuid);

DROP TABLE IF EXISTS public.studio_purchases CASCADE;
