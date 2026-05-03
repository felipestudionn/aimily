-- Phase 0 hotfix: extend tech_pack_comments.block CHECK to allow 'materials'.
--
-- Why: TechPackSheet.tsx (line 38, types) declares a 'materials' block for
-- comments anchored to the Material Swatches section. The original CHECK
-- constraint added in 023_tech_pack_comments_and_data.sql omitted it, so
-- any attempt to save a materials-section comment in production would fail
-- with a constraint violation. This migration aligns the schema with the
-- type system already in code.
--
-- Detected during the PLM-parity codebase audit (Codex independent review).
-- See .research/block-3-codebase-audit.md (R2 corrections).

ALTER TABLE public.tech_pack_comments
  DROP CONSTRAINT IF EXISTS tech_pack_comments_block_check;

ALTER TABLE public.tech_pack_comments
  ADD CONSTRAINT tech_pack_comments_block_check
  CHECK (block = ANY (ARRAY[
    'header'::text,
    'drawings'::text,
    'measurements'::text,
    'bom'::text,
    'grading'::text,
    'factory'::text,
    'general'::text,
    'materials'::text
  ]));

COMMENT ON CONSTRAINT tech_pack_comments_block_check ON public.tech_pack_comments
  IS 'Comment block anchor — must match TechPackSheet.tsx CommentBlock type. Phase 0 added materials.';
