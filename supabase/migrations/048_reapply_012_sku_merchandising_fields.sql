-- Migration 048 · Re-apply migration 012 (sku_merchandising_fields)
--
-- The original migration 012_sku_merchandising_fields.sql was authored but
-- not applied to production. Verified 2026-05-06 via
-- information_schema.columns: origin, sku_role, source_sku_id were missing
-- in prod, even though /api/skus/route.ts:72-112 inserts those fields and
-- the carry-over flow assumes sku_role exists.
--
-- This migration is idempotent (ADD COLUMN IF NOT EXISTS + DO blocks for
-- constraints) so it is safe against any environment that already has
-- some / all of these objects.
--
-- Already applied to prod project sbweszownvspzjfejmfx via Supabase MCP
-- on 2026-05-06 — this file makes the change visible to a fresh clone.
--
-- Audit reference: memory/aimily-sku-lifecycle-audit-2026-05-06.md (D3).

ALTER TABLE collection_skus
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS sku_role text DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS source_sku_id uuid REFERENCES collection_skus(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.collection_skus'::regclass
      AND conname = 'sku_origin_check'
  ) THEN
    ALTER TABLE collection_skus
      ADD CONSTRAINT sku_origin_check
      CHECK (origin IS NULL OR origin IN ('LOCAL', 'CHINA', 'EUROPE', 'OTHER'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.collection_skus'::regclass
      AND conname = 'sku_role_check'
  ) THEN
    ALTER TABLE collection_skus
      ADD CONSTRAINT sku_role_check
      CHECK (sku_role IS NULL OR sku_role IN ('NEW', 'BESTSELLER_REINVENTION', 'CARRYOVER', 'CAPSULE'));
  END IF;
END $$;
