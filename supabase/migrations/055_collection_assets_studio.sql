-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 055 · Aimily Studio · Allow assets without collection_plan_id
--
-- collection_assets currently requires collection_plan_id NOT NULL because
-- every asset was born inside a collection (Aimily 360 flow). With Studio,
-- the asset is born inside a studio_project — no collection involved.
--
-- This migration:
--   1. Relaxes collection_plan_id from NOT NULL → NULLABLE
--   2. Adds studio_project_id (NULLABLE, FK to studio_projects)
--   3. Adds CHECK: each asset must belong to EITHER a collection OR a studio_project
--   4. Adds index for studio_project_id lookups
--   5. Adds RLS policy so Studio users only see their own studio outputs
--
-- Existing rows with collection_plan_id IS NOT NULL are UNAFFECTED — they
-- keep their collection_plan_id intact, studio_project_id stays NULL.
-- The CHECK constraint is satisfied because every existing row has
-- collection_plan_id NOT NULL.
--
-- Reference: .planning/studio/IMPLEMENTATION-PLAN.md §2.1
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Relax NOT NULL
ALTER TABLE public.collection_assets
  ALTER COLUMN collection_plan_id DROP NOT NULL;

-- 2. Add studio_project_id FK
ALTER TABLE public.collection_assets
  ADD COLUMN IF NOT EXISTS studio_project_id UUID
  REFERENCES public.studio_projects(id) ON DELETE CASCADE;

-- 3. CHECK constraint: must belong to one or the other
ALTER TABLE public.collection_assets
  ADD CONSTRAINT collection_assets_collection_or_studio
  CHECK (
    (collection_plan_id IS NOT NULL AND studio_project_id IS NULL) OR
    (collection_plan_id IS NULL AND studio_project_id IS NOT NULL)
  );

-- 4. Index for Studio project lookups
CREATE INDEX IF NOT EXISTS idx_collection_assets_studio_project_id
  ON public.collection_assets(studio_project_id)
  WHERE studio_project_id IS NOT NULL;

-- 5. RLS policy for Studio assets
-- Existing collection-scoped policies stay intact. We add a parallel policy
-- for studio_project_id ownership so a user can SELECT/INSERT/DELETE assets
-- inside their own studio_projects.

CREATE POLICY "collection_assets_studio_owner_select"
  ON public.collection_assets FOR SELECT
  USING (
    studio_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.studio_projects sp
      WHERE sp.id = collection_assets.studio_project_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_assets_studio_owner_insert"
  ON public.collection_assets FOR INSERT
  WITH CHECK (
    studio_project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.studio_projects sp
      WHERE sp.id = collection_assets.studio_project_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_assets_studio_owner_update"
  ON public.collection_assets FOR UPDATE
  USING (
    studio_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.studio_projects sp
      WHERE sp.id = collection_assets.studio_project_id
      AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    studio_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.studio_projects sp
      WHERE sp.id = collection_assets.studio_project_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_assets_studio_owner_delete"
  ON public.collection_assets FOR DELETE
  USING (
    studio_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.studio_projects sp
      WHERE sp.id = collection_assets.studio_project_id
      AND sp.user_id = auth.uid()
    )
  );
