-- Migration 047 · Baseline for collection_workspace_data
--
-- The table exists in production (project sbweszownvspzjfejmfx) but had no
-- migration file in supabase/migrations/. This baseline mirrors the live
-- schema verified via `information_schema.columns`, `pg_indexes`, and
-- `pg_policy` on 2026-05-06. IF NOT EXISTS guards make it safe to apply
-- against the existing prod DB and against any fresh staging clone.
--
-- This table backs the entire Creative + Merchandising + Design persistence
-- layer (see src/hooks/useWorkspaceData.ts + src/app/api/workspace-data/route.ts).
-- Each row stores blockData (Creative) / cardData (Merch) / phase data (Design)
-- as JSONB, debounced 1s from the UI. The CIS write-through happens AFTER
-- the upsert, in the API handler, via mapWorkspaceToCIS + recordDecisions.

CREATE TABLE IF NOT EXISTS public.collection_workspace_data (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id  UUID        NOT NULL,
  workspace           TEXT        NOT NULL,
  data                JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upsert constraint: one row per (plan, workspace). Used by the POST
-- /api/workspace-data handler with `onConflict: 'collection_plan_id,workspace'`.
CREATE UNIQUE INDEX IF NOT EXISTS collection_workspace_data_collection_plan_id_workspace_key
  ON public.collection_workspace_data (collection_plan_id, workspace);

-- Query index (matches the lookup pattern from loadFullContext + GET handler).
CREATE INDEX IF NOT EXISTS idx_workspace_data_plan_workspace
  ON public.collection_workspace_data (collection_plan_id, workspace);

-- Row Level Security
ALTER TABLE public.collection_workspace_data ENABLE ROW LEVEL SECURITY;

-- Service role: full access (used by API handlers via supabaseAdmin)
DROP POLICY IF EXISTS "Service role manages workspace data" ON public.collection_workspace_data;
CREATE POLICY "Service role manages workspace data"
  ON public.collection_workspace_data
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role');

-- Authenticated users: scoped by collection_plans ownership
DROP POLICY IF EXISTS "Users can read own workspace data" ON public.collection_workspace_data;
CREATE POLICY "Users can read own workspace data"
  ON public.collection_workspace_data
  FOR SELECT
  TO authenticated
  USING (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own workspace data" ON public.collection_workspace_data;
CREATE POLICY "Users can insert own workspace data"
  ON public.collection_workspace_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own workspace data" ON public.collection_workspace_data;
CREATE POLICY "Users can update own workspace data"
  ON public.collection_workspace_data
  FOR UPDATE
  TO authenticated
  USING (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own workspace data" ON public.collection_workspace_data;
CREATE POLICY "Users can delete own workspace data"
  ON public.collection_workspace_data
  FOR DELETE
  TO authenticated
  USING (
    collection_plan_id IN (
      SELECT id FROM public.collection_plans WHERE user_id = auth.uid()
    )
  );

-- Note: this migration was authored AFTER the table was created out-of-band
-- in production. It is idempotent and matches the live schema verified
-- 2026-05-06. Future schema changes to this table should add a separate
-- numbered migration on top of this baseline.
