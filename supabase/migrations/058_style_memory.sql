-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 058 · Aimily Studio · Style Memory v1 (user-driven)
--
-- Style Memory lets the user mark a generated output as "this is brand
-- correct" (★ button in the gallery). Marked outputs are automatically
-- injected as style references in future generations within the same
-- studio_project — the system learns the brand's visual vocabulary from
-- the outputs the user approves.
--
-- This is the LIGHT version (not the heavy Brand DNA Lock used in
-- Aimily 360). No CIS, no fabric library — just a flag + role per asset.
-- Soft lock-in: the more outputs the user marks, the more coherent the
-- next generations get, the less they want to switch tools.
--
-- Reference: business-plan_aimily-studio-2026-05-14.md §0.0 decision #6
-- Reference: .planning/studio/IMPLEMENTATION-PLAN.md §2.1
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.collection_assets
  ADD COLUMN IF NOT EXISTS is_style_memory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS style_memory_role TEXT
    CHECK (style_memory_role IS NULL OR style_memory_role IN ('principal', 'reference', 'color_anchor'));

COMMENT ON COLUMN public.collection_assets.is_style_memory IS
  'Aimily Studio · user marked this output as brand-correct via the ★ button in the gallery. Inject as style reference in future generations of the same studio_project.';

COMMENT ON COLUMN public.collection_assets.style_memory_role IS
  'Aimily Studio · the role this style-memory asset plays. principal = primary brand reference, used most strongly. reference = supporting style ref. color_anchor = used only for palette fidelity. Default: principal when first marked.';

-- Partial index for fast Style Memory lookups per project (only matters for studio_project_id NOT NULL)
CREATE INDEX IF NOT EXISTS idx_collection_assets_style_memory
  ON public.collection_assets(studio_project_id, created_at DESC)
  WHERE is_style_memory = true AND studio_project_id IS NOT NULL;
