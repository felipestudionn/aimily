-- =============================================================================
-- Migration 065 · In-Season SKU seeds + tenant surface_mode
-- =============================================================================
--
-- Felipe 2026-05-19 noche · feedback loop architecture (see memory/
-- architecture_in-season-feedback-loop.md).
--
-- In-Season verdicts of types {amplify_next_season, extend_colors, drop_color,
-- retire} produce "SKU seeds" — persistent artifacts that feed into the next
-- collection cycle. Each seed has its own life (live → consumed/rejected/
-- expired) and connects to a future collection_plan when the user starts a
-- new collection in aimily 360.
--
-- This migration:
--   1. Adds `surface_mode` to strategy_tenants so we know which tenants are
--      "aimily_360" (full lifecycle) vs "connector_standalone" (Shopify-only).
--      Only aimily_360 tenants materialize seeds.
--   2. Creates `in_season_sku_seeds` table (NEW naming convention per Sprint A
--      rename plan — keeps prefix `in_season_*` even though sibling tables
--      still use `strategy_*` until the rename happens).
--   3. RLS policies + indexes.
--
-- Naming note: we deliberately use `in_season_*` for the new table even though
-- `strategy_tenants` still has the legacy prefix. When Sprint A renames
-- strategy_* → in_season_* globally, this table is already correctly named
-- and only the FK needs to update.

-- 1. Surface mode on tenants ---------------------------------------------------

CREATE TYPE strategy_surface_mode AS ENUM (
  'connector_standalone',  -- Brand brings its own catalog via Shopify/ERP/etc.
  'aimily_360'              -- Brand uses aimily end-to-end (Block 1 → 6)
);

ALTER TABLE strategy_tenants
  ADD COLUMN surface_mode strategy_surface_mode NOT NULL DEFAULT 'connector_standalone';

COMMENT ON COLUMN strategy_tenants.surface_mode IS
  'Determines whether In-Season verdicts materialize as SKU seeds for next-collection feedback. Only aimily_360 tenants get seed materialization; connector_standalone tenants get verdicts only.';

-- 2. SKU seeds table -----------------------------------------------------------

CREATE TYPE in_season_seed_type AS ENUM (
  'amplify_next_season',   -- Replicate concept with alter color/fabric/silhouette
  'extend_colors',          -- Same SKU base, N new colors from moodboard
  'drop_color',             -- Retire color from next palette
  'retire',                 -- Don't include model_ref in next collection
  'reorder'                 -- Re-pedir same SKU AHORA (in-season; not really a
                            -- seed but logged for telemetry — status='consumed'
                            -- immediately, no next-collection gate)
);

CREATE TYPE in_season_seed_status AS ENUM (
  'live',       -- Materialized, awaiting user decision
  'consumed',   -- User pulled this seed into a new collection
  'rejected',   -- User explicitly declined
  'expired'     -- Auto-expired (e.g. after 12 months unconsumed)
);

CREATE TABLE in_season_sku_seeds (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,

  -- Provenance: which run + which SKU produced this seed
  source_run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  source_product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  source_action_type text NOT NULL,    -- the verdict action (e.g. 'extend_colors')

  -- What the seed proposes
  seed_type in_season_seed_type NOT NULL,
  proposed_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Free-form per seed_type:
    --   extend_colors:     { new_colors: [{name, hex}], rationale }
    --   amplify_next_season: { concept_brief, alter_dims: [fabric, silhouette, ...] }
    --   drop_color:        { color_name, color_hex }
    --   retire:            { reason }
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Snapshot of the verdict that produced this seed (for audit + UI display)
  rationale text NOT NULL DEFAULT '',

  -- Identity preserved for display (cheap denormalization vs joining facts)
  source_model_ref text,
  source_color_ref text,
  source_product_name text,
  source_family_code text,
  source_season_tag text,

  -- Lifecycle
  status in_season_seed_status NOT NULL DEFAULT 'live',
  consumed_at timestamptz,
  consumed_in_collection_id uuid,      -- FK soft (no constraint yet — collection_plans table is in
                                        -- a different schema cluster, will wire when seeds become
                                        -- a real input to new-collection gate)
  rejected_at timestamptz,
  rejection_reason text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the typical queries
CREATE INDEX in_season_sku_seeds_tenant_status_idx
  ON in_season_sku_seeds(tenant_id, status)
  WHERE status = 'live';
CREATE INDEX in_season_sku_seeds_source_run_idx
  ON in_season_sku_seeds(source_run_id);
CREATE INDEX in_season_sku_seeds_source_pfid_idx
  ON in_season_sku_seeds(source_product_fact_id);
CREATE INDEX in_season_sku_seeds_consumed_collection_idx
  ON in_season_sku_seeds(consumed_in_collection_id)
  WHERE consumed_in_collection_id IS NOT NULL;

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION in_season_sku_seeds_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, public;

CREATE TRIGGER in_season_sku_seeds_touch_trg
  BEFORE UPDATE ON in_season_sku_seeds
  FOR EACH ROW EXECUTE FUNCTION in_season_sku_seeds_touch();

-- 3. RLS ------------------------------------------------------------------------

ALTER TABLE in_season_sku_seeds ENABLE ROW LEVEL SECURITY;

-- Re-use the existing strategy_user_is_tenant_member() helper (defined in 059b).
-- A user can see/modify seeds for tenants they're a member of (analyst+).

CREATE POLICY in_season_sku_seeds_select
  ON in_season_sku_seeds FOR SELECT
  USING (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY in_season_sku_seeds_insert
  ON in_season_sku_seeds FOR INSERT
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY in_season_sku_seeds_update
  ON in_season_sku_seeds FOR UPDATE
  USING (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY in_season_sku_seeds_delete
  ON in_season_sku_seeds FOR DELETE
  USING (strategy_user_is_tenant_member(tenant_id));

-- Service role bypasses RLS (used by the materialization hook in API routes).
GRANT SELECT, INSERT, UPDATE, DELETE ON in_season_sku_seeds TO service_role;

-- 4. Constraint: status consistency --------------------------------------------

ALTER TABLE in_season_sku_seeds
  ADD CONSTRAINT in_season_sku_seeds_status_consistency CHECK (
    (status = 'live'      AND consumed_at IS NULL AND rejected_at IS NULL) OR
    (status = 'consumed'  AND consumed_at IS NOT NULL AND rejected_at IS NULL) OR
    (status = 'rejected'  AND rejected_at IS NOT NULL AND consumed_at IS NULL) OR
    (status = 'expired'   AND consumed_at IS NULL AND rejected_at IS NULL)
  );

COMMENT ON TABLE in_season_sku_seeds IS
  'In-Season verdicts that propose changes for the next collection cycle. See memory/architecture_in-season-feedback-loop.md for the full lifecycle and the new-collection gate that consumes these.';
