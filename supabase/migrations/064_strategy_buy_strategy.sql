-- ========================================================================
-- Migration 064 · Strategy Buy-Strategy schema (constraints + scenarios)
--
-- Adds the data shape behind the Setup workspace's "Buy strategy" block:
--   · chosen_archetype_id (A/B/C/D) on strategy_constraints
--   · action_mix jsonb with strict validate_action_mix() check (range + sum)
--   · buy_waves jsonb (per-wave SKU + timing intent)
--   · target_adjacent_families jsonb (required when archetype D)
--   · parent_scenario_id on strategy_scenarios (custom scenarios link to source)
--   · partial UNIQUE index: only one is_selected=true per run
--
-- The strategy_scenario_type enum extension (`category_transition`) lives in
-- 064b — Postgres ADD VALUE is best run as its own statement and its own
-- file to avoid edge cases where the new value is referenced in the same
-- transaction that adds it.
--
-- Source: .planning/strategy/plan_strategy-restructure-v3-2026-05-16.md §4.3
-- Codex review: PASS (4th pass, see plan §11-12 + companion v3 review)
-- ========================================================================

-- ── 064a · strategy_constraints columns ──────────────────────────────────

ALTER TABLE strategy_constraints
  ADD COLUMN IF NOT EXISTS chosen_archetype_id text,
  ADD COLUMN IF NOT EXISTS action_mix jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS buy_waves jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_adjacent_families jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Limit chosen_archetype_id to the four supported postures. NULL = strategy
-- not yet defined (legacy constraints rows + tenants in setup).
ALTER TABLE strategy_constraints
  DROP CONSTRAINT IF EXISTS chosen_archetype_id_valid;

ALTER TABLE strategy_constraints
  ADD CONSTRAINT chosen_archetype_id_valid CHECK (
    chosen_archetype_id IS NULL
    OR chosen_archetype_id IN ('A', 'B', 'C', 'D')
  );

COMMENT ON COLUMN strategy_constraints.chosen_archetype_id IS
  'Buy-strategy archetype: A=Replenish & Amplify, B=Balanced ROI, C=Defend & Curate, D=Category Transition. NULL until the user confirms a posture in the setup workspace.';
COMMENT ON COLUMN strategy_constraints.action_mix IS
  'Validated jsonb {replenish_pct, new_sku_proposal_pct, family_extension_pct, kill_pct}. Each in [0,100], sum must equal 100. Empty {} allowed for legacy rows.';
COMMENT ON COLUMN strategy_constraints.buy_waves IS
  'Array of waves: [{ name, share_pct, target_lead_time_days, scheduled_at }]. Drives LeadTimeCalendarCard + replenishment time-phasing.';
COMMENT ON COLUMN strategy_constraints.target_adjacent_families IS
  'Required when chosen_archetype_id=D. Array of family_code strings the user wants to push into via family_extension + new_sku_proposal proposers.';


-- ── 064b · validate_action_mix() function + CHECK ────────────────────────
--
-- Per-key validation (each pct numeric, range [0,100]) + sum-to-100 check.
-- DB CHECK alone is too weak because UNKNOWN passes for missing keys; this
-- function raises explicit exceptions that surface to the caller as 23514
-- (check_violation) with a human-readable MESSAGE.
--
-- STABLE because output depends only on input. SECURITY INVOKER (default) is
-- fine — no privileged operations.

CREATE OR REPLACE FUNCTION validate_action_mix(mix jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  required_keys text[] := ARRAY[
    'replenish_pct',
    'new_sku_proposal_pct',
    'family_extension_pct',
    'kill_pct'
  ];
  k    text;
  v    numeric;
  total numeric := 0;
BEGIN
  -- Empty / null mix is allowed (legacy constraints without strategy chosen).
  IF mix IS NULL OR mix = '{}'::jsonb THEN
    RETURN true;
  END IF;

  -- All 4 keys must be present.
  FOREACH k IN ARRAY required_keys LOOP
    IF NOT (mix ? k) THEN
      RAISE EXCEPTION 'action_mix missing required key: %', k
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  -- Each value must parse to numeric AND be in [0, 100].
  FOREACH k IN ARRAY required_keys LOOP
    BEGIN
      v := (mix ->> k)::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'action_mix.% is not numeric: %', k, mix ->> k
        USING ERRCODE = 'check_violation';
    END;

    IF v < 0 OR v > 100 THEN
      RAISE EXCEPTION 'action_mix.% must be in [0,100], got %', k, v
        USING ERRCODE = 'check_violation';
    END IF;

    total := total + v;
  END LOOP;

  -- Sum must equal 100 within 0.5 tolerance (UI rounding slack).
  IF abs(total - 100) > 0.5 THEN
    RAISE EXCEPTION 'action_mix sum must be 100, got %', total
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_action_mix(jsonb) IS
  'Validates strategy_constraints.action_mix: 4 required keys, each numeric in [0,100], sum=100 ±0.5. Empty {} returns true.';

ALTER TABLE strategy_constraints
  DROP CONSTRAINT IF EXISTS action_mix_valid;

ALTER TABLE strategy_constraints
  ADD CONSTRAINT action_mix_valid CHECK (validate_action_mix(action_mix));


-- ── 064d · parent_scenario_id on strategy_scenarios ──────────────────────
--
-- Custom scenarios created from the inline run-detail editor link back to
-- the scenario they branched from. Preserves provenance for the
-- "counterfactual on top of run X" UX badge + audit trail.

ALTER TABLE strategy_scenarios
  ADD COLUMN IF NOT EXISTS parent_scenario_id uuid
    REFERENCES strategy_scenarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_strategy_scenarios_parent
  ON strategy_scenarios(parent_scenario_id)
  WHERE parent_scenario_id IS NOT NULL;

COMMENT ON COLUMN strategy_scenarios.parent_scenario_id IS
  'Set when this scenario was created as a custom variant of another scenario (inline editor flow). NULL for pristine run-generated scenarios.';


-- ── 064e · partial UNIQUE index on is_selected ───────────────────────────
--
-- Codex P1 #4 (v3): without this, multiple scenarios can have is_selected=
-- true simultaneously, leaving decision-pack rendering ambiguous. The
-- partial index enforces "at most one selected per run" at the DB layer; the
-- promote endpoint wraps demote-all-then-select in a transaction so the
-- window between operations cannot race.

CREATE UNIQUE INDEX IF NOT EXISTS strategy_scenarios_one_selected_per_run
  ON strategy_scenarios(run_id)
  WHERE is_selected = true;

COMMENT ON INDEX strategy_scenarios_one_selected_per_run IS
  'Enforces at most one is_selected=true scenario per run_id. Promote endpoint must demote siblings in same TX before setting target.';


-- ── notes ────────────────────────────────────────────────────────────────
-- · The strategy_scenario_type enum value `category_transition` is added in
--   064b_strategy_scenario_type_category_transition.sql (separate file due
--   to Postgres ADD VALUE transactional semantics).
-- · No data backfill needed — all new columns have safe defaults and
--   existing constraints rows remain valid (NULL chosen_archetype_id, empty
--   action_mix passes validate_action_mix).
-- · No RLS changes — strategy_constraints already has policy from migration
--   059; the new columns inherit it automatically.
