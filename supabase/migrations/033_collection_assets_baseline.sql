-- Phase 0 reconciliation: baseline migration for collection_assets.
--
-- The table was created in production at some point but the CREATE TABLE
-- migration was never committed to this repo. Migration 013 only added
-- the storage bucket and RLS policies, and assumed the table already
-- existed. Result: a fresh database cannot be recreated from migrations
-- alone. This migration backfills the schema as it exists in production
-- today (verified via Supabase MCP on 2026-05-03).
--
-- Idempotent: uses IF NOT EXISTS so re-applying to a database that
-- already has the table is a no-op. Production is untouched.
--
-- Detected during the PLM-parity codebase audit (Codex independent review).
-- See .research/block-3-codebase-audit.md (R2 corrections).

CREATE TABLE IF NOT EXISTS public.collection_assets (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid         NOT NULL REFERENCES public.collection_plans(id) ON DELETE CASCADE,
  milestone_id    text,
  phase           text           NOT NULL,
  asset_type      text           NOT NULL,
  name            text           NOT NULL,
  description     text,
  url             text           NOT NULL,
  thumbnail_url   text,
  file_size       integer,
  metadata        jsonb          DEFAULT '{}'::jsonb,
  version         integer        DEFAULT 1,
  status          text           DEFAULT 'draft',
  uploaded_by     uuid           REFERENCES auth.users(id),
  created_at      timestamptz    DEFAULT now(),
  updated_at      timestamptz    DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_collection_assets_plan
  ON public.collection_assets (collection_plan_id);

CREATE INDEX IF NOT EXISTS idx_collection_assets_phase
  ON public.collection_assets (collection_plan_id, phase);

CREATE INDEX IF NOT EXISTS idx_collection_assets_type
  ON public.collection_assets (collection_plan_id, asset_type);

CREATE INDEX IF NOT EXISTS idx_collection_assets_milestone
  ON public.collection_assets (milestone_id)
  WHERE milestone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_assets_uploaded_by
  ON public.collection_assets (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_collection_assets_active
  ON public.collection_assets (collection_plan_id)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.collection_assets IS
  'Asset records for files in Supabase Storage. version + status + soft delete.
   Schema baseline backfilled in migration 033 — production was created earlier
   without a tracked migration. Buckets + RLS in migration 013.';
