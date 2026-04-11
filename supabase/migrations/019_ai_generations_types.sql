-- Update the ai_generations.generation_type CHECK constraint to match the
-- current TypeScript enum in src/types/studio.ts (GenerationType).
--
-- Why: the original schema was created with values {'tryon', 'product_render',
-- 'lifestyle', 'editorial', 'ad_creative', 'video', 'copy'}. During the
-- 2026-04-10 fal.ai cleanup (commit eada71a) the code was updated to use
-- 'still_life' instead of 'lifestyle' and added 'brand_model' for the new
-- Freepik Nano Banana flow — but the SQL constraint was never updated.
--
-- Impact before this fix: every Still Life or Brand Model persist to
-- ai_generations failed with 23514 (check constraint violation). Felipe
-- surfaced this on 2026-04-11 when the new enterprise error reporting
-- layer exposed the real Supabase error in the UI banner.
--
-- The authoritative source is the TypeScript enum. The 8 valid values:
--   tryon, product_render, still_life, editorial, ad_creative,
--   video, brand_model, copy
--
-- Data migration: legacy 'lifestyle' rows (if any ever existed — the
-- table was empty at apply time) are mapped to 'still_life' before the
-- constraint is redefined, to keep this migration idempotent and safe
-- if run on a non-empty clone.

BEGIN;

-- 1. Migrate any legacy 'lifestyle' rows to the new 'still_life' value.
UPDATE ai_generations
SET generation_type = 'still_life'
WHERE generation_type = 'lifestyle';

-- 2. Drop the stale constraint.
ALTER TABLE ai_generations
  DROP CONSTRAINT IF EXISTS ai_generations_generation_type_check;

-- 3. Recreate it with the current enum values. Kept as text CHECK (not a
--    Postgres enum type) to match the existing table convention and avoid
--    the operational overhead of ALTER TYPE ... ADD VALUE on every extension.
ALTER TABLE ai_generations
  ADD CONSTRAINT ai_generations_generation_type_check
  CHECK (generation_type = ANY (ARRAY[
    'tryon'::text,
    'product_render'::text,
    'still_life'::text,
    'editorial'::text,
    'ad_creative'::text,
    'video'::text,
    'brand_model'::text,
    'copy'::text
  ]));

COMMIT;
