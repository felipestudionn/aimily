
-- =============================================================================
-- Migration 059 · Aimily Strategy foundation
-- =============================================================================

-- Extensions ------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Enums -----------------------------------------------------------------------

CREATE TYPE strategy_source_format AS ENUM (
  'zara_rnk_pdf',
  'shopify_csv',
  'shopify_csv_bundle',
  'erp_custom_csv',
  'erp_sftp',
  'erp_api',
  'manual_upload'
);

CREATE TYPE strategy_source_type AS ENUM (
  'pdf',
  'csv',
  'xlsx',
  'json',
  'api',
  'sftp'
);

CREATE TYPE strategy_observation_window AS ENUM (
  'd1',
  'd2',
  '7d',
  '8_14d',
  'season',
  'lifetime'
);

CREATE TYPE strategy_match_type AS ENUM (
  'exact_model_match',
  'colorway_variant',
  'renamed_carryover',
  'similar_silhouette',
  'substitute_product',
  'unknown'
);

CREATE TYPE strategy_lifecycle_stage AS ENUM (
  'new',
  'ramp',
  'peak',
  'decay',
  'mature',
  'exit',
  'insufficient_evidence'
);

CREATE TYPE strategy_scope AS ENUM (
  'sku',
  'family',
  'archetype',
  'color',
  'lineage'
);

CREATE TYPE strategy_action_type AS ENUM (
  'carryover',
  'kill',
  'resize_up',
  'resize_down',
  'recolor',
  'markdown_accelerate',
  'markdown_delay',
  'investigate',
  'substitute',
  'geographic_redistribute',
  'replenish'
);

CREATE TYPE strategy_scenario_type AS ENUM (
  'base_case',
  'creative_amplified',
  'risk_minimized',
  'growth_aggressive',
  'kill_heavy',
  'custom'
);

CREATE TYPE strategy_run_status AS ENUM (
  'pending',
  'ingesting',
  'scoring',
  'recommending',
  'complete',
  'failed'
);

CREATE TYPE strategy_tenant_role AS ENUM (
  'owner',
  'admin',
  'analyst',
  'viewer'
);

CREATE TYPE strategy_tenant_tier AS ENUM (
  'tier2_mid',
  'tier2_premium',
  'tier1_fashion',
  'tier1_mega'
);

CREATE TYPE strategy_isolation_mode AS ENUM (
  'shared_rls',
  'dedicated_schema',
  'dedicated_project',
  'vpc_byoc'
);

-- =============================================================================
-- Tenants + membership
-- =============================================================================

CREATE TABLE strategy_tenants (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  legal_name text,
  country_code text NOT NULL DEFAULT 'ES',
  tier strategy_tenant_tier NOT NULL DEFAULT 'tier2_mid',
  isolation_mode strategy_isolation_mode NOT NULL DEFAULT 'shared_rls',
  dpa_signed_at timestamptz,
  ai_act_classification text,
  reverse_logistics_cost_per_unit numeric(10,2) DEFAULT 6.00,
  default_currency text NOT NULL DEFAULT 'EUR',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz
);

CREATE INDEX strategy_tenants_slug_idx ON strategy_tenants(slug);
CREATE INDEX strategy_tenants_active_idx ON strategy_tenants(id) WHERE archived_at IS NULL;

CREATE TABLE strategy_tenant_members (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role strategy_tenant_role NOT NULL DEFAULT 'analyst',
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX strategy_tenant_members_user_idx ON strategy_tenant_members(user_id) WHERE revoked_at IS NULL;
CREATE INDEX strategy_tenant_members_tenant_idx ON strategy_tenant_members(tenant_id) WHERE revoked_at IS NULL;

-- =============================================================================
-- Ingestion: sources + raw_records (anti-corruption layer)
-- =============================================================================

CREATE TABLE strategy_sources (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  season text NOT NULL,
  market text,
  source_format strategy_source_format NOT NULL,
  source_type strategy_source_type NOT NULL,
  parser_version text NOT NULL DEFAULT '1.0.0',
  storage_path text,
  observation_date date NOT NULL,
  record_count integer DEFAULT 0,
  parse_confidence numeric(3,2) DEFAULT 1.00 CHECK (parse_confidence BETWEEN 0 AND 1),
  coverage_dimensions jsonb DEFAULT '{}'::jsonb,
  parser_warnings jsonb DEFAULT '[]'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  notes text
);

CREATE INDEX strategy_sources_tenant_idx ON strategy_sources(tenant_id, observation_date DESC);
CREATE INDEX strategy_sources_season_idx ON strategy_sources(tenant_id, season);

CREATE TABLE strategy_raw_records (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES strategy_sources(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  page_coord jsonb,
  raw_json jsonb NOT NULL,
  original_labels jsonb,
  extraction_confidence numeric(3,2) DEFAULT 1.00 CHECK (extraction_confidence BETWEEN 0 AND 1),
  parser_warnings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_raw_records_source_idx ON strategy_raw_records(source_id);
CREATE INDEX strategy_raw_records_tenant_idx ON strategy_raw_records(tenant_id);

-- =============================================================================
-- Fact tables (normalized, derived from raw_records)
-- =============================================================================

CREATE TABLE strategy_product_facts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES strategy_sources(id) ON DELETE CASCADE,
  raw_record_id uuid REFERENCES strategy_raw_records(id) ON DELETE SET NULL,
  observation_date date NOT NULL,
  model_ref text NOT NULL,
  color_ref text,
  variant_ref text,
  product_name text,
  family_code text,
  subfamily_code text,
  section_code text,
  season_tag text NOT NULL,
  activation_date date,
  pvp numeric(10,2),
  pvp_compare numeric(10,2),
  markup_pct numeric(7,2),
  on_promo boolean DEFAULT false,
  cluster_size integer,
  cost_estimate numeric(10,2),
  margin_pct_list numeric(7,4),
  description_raw text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_product_facts_tenant_obs_idx ON strategy_product_facts(tenant_id, observation_date DESC);
CREATE INDEX strategy_product_facts_model_idx ON strategy_product_facts(tenant_id, model_ref, color_ref);
CREATE INDEX strategy_product_facts_family_idx ON strategy_product_facts(tenant_id, family_code);
CREATE INDEX strategy_product_facts_season_idx ON strategy_product_facts(tenant_id, season_tag);
CREATE INDEX strategy_product_facts_source_idx ON strategy_product_facts(source_id);
CREATE INDEX strategy_product_facts_name_trgm_idx ON strategy_product_facts USING GIN (product_name extensions.gin_trgm_ops);

CREATE TABLE strategy_inventory_facts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  observation_date date NOT NULL,
  stock_store integer,
  stock_warehouse integer,
  stock_available integer,
  stock_in_transit integer,
  stock_pending integer,
  stock_pending_date date,
  stock_adjusted integer,
  stock_blocked integer,
  stock_fabric integer,
  days_in_store integer,
  stores_with_stock integer,
  stores_active integer,
  stores_total integer,
  pipeline_total integer,
  cd2_available integer,
  blocked_per_store numeric(7,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_inventory_facts_product_idx ON strategy_inventory_facts(product_fact_id);
CREATE INDEX strategy_inventory_facts_tenant_obs_idx ON strategy_inventory_facts(tenant_id, observation_date DESC);

CREATE TABLE strategy_sales_windows (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  observation_date date NOT NULL,
  window_type strategy_observation_window NOT NULL,
  units integer DEFAULT 0,
  gross_commission numeric(12,2),
  share_net_sales numeric(7,4),
  importe numeric(12,2),
  max_sale_promo integer,
  max_sale_no_promo integer,
  stores_with_sale integer,
  rotation_1d numeric(7,4),
  rotation_7d numeric(7,4),
  rotation_td_tr_aj_7d numeric(7,4),
  rotation_td_tr_7d numeric(7,4),
  emptying_rate numeric(7,4),
  emptying_rate_available numeric(7,4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_sales_windows_product_window_idx ON strategy_sales_windows(product_fact_id, window_type);
CREATE INDEX strategy_sales_windows_tenant_obs_idx ON strategy_sales_windows(tenant_id, observation_date DESC);

CREATE TABLE strategy_efficiency_facts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  observation_date date NOT NULL,
  total_bought integer,
  total_sold integer,
  total_shipped integer,
  sell_through_shipped_pct numeric(7,4),
  sell_through_bought_pct numeric(7,4),
  returns_pct numeric(7,4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_efficiency_facts_product_idx ON strategy_efficiency_facts(product_fact_id);
CREATE INDEX strategy_efficiency_facts_tenant_obs_idx ON strategy_efficiency_facts(tenant_id, observation_date DESC);

-- =============================================================================
-- Identity graph (confidence-weighted lineage; not a "drop color suffix" hack)
-- =============================================================================

CREATE TABLE strategy_sku_identity_graph (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  canonical_id text NOT NULL,
  display_name text,
  member_product_fact_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  variant_color_codes text[] DEFAULT ARRAY[]::text[],
  match_type strategy_match_type NOT NULL DEFAULT 'unknown',
  match_confidence numeric(3,2) NOT NULL DEFAULT 0.00 CHECK (match_confidence BETWEEN 0 AND 1),
  evidence_signals jsonb DEFAULT '{}'::jsonb,
  human_validated boolean DEFAULT false,
  human_validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  human_validated_at timestamptz,
  first_seen date,
  last_seen date,
  seasons_present text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, canonical_id)
);

CREATE INDEX strategy_sku_identity_graph_tenant_idx ON strategy_sku_identity_graph(tenant_id);
CREATE INDEX strategy_sku_identity_graph_canonical_idx ON strategy_sku_identity_graph(tenant_id, canonical_id);
CREATE INDEX strategy_sku_identity_graph_members_idx ON strategy_sku_identity_graph USING GIN (member_product_fact_ids);

-- =============================================================================
-- Taxonomies (per-tenant, versioned)
-- =============================================================================

CREATE TABLE strategy_taxonomies (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  taxonomy_kind text NOT NULL CHECK (taxonomy_kind IN ('family','color','archetype','lineage')),
  version text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, taxonomy_kind, version)
);

CREATE INDEX strategy_taxonomies_tenant_kind_idx ON strategy_taxonomies(tenant_id, taxonomy_kind);
CREATE UNIQUE INDEX strategy_taxonomies_active_unique ON strategy_taxonomies(tenant_id, taxonomy_kind) WHERE is_active = true;

-- =============================================================================
-- Inputs · Bucket A (constraints) + Bucket B (creative brief) — SEPARATE per Codex
-- =============================================================================

CREATE TABLE strategy_constraints (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collection_plans(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  target_total_skus integer,
  target_buy_budget numeric(14,2),
  target_avg_margin numeric(5,4),
  family_share_targets jsonb DEFAULT '{}'::jsonb,
  price_ladder_overrides jsonb DEFAULT '{}'::jsonb,
  positioning_tier text CHECK (positioning_tier IN ('premium','mid','value') OR positioning_tier IS NULL),
  channel_mix_targets jsonb DEFAULT '{}'::jsonb,
  geographic_priorities jsonb DEFAULT '[]'::jsonb,
  sourcing_constraints jsonb DEFAULT '{}'::jsonb,
  drop_count integer,
  drop_cadence text,
  hard_exclusions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX strategy_constraints_tenant_idx ON strategy_constraints(tenant_id);
CREATE INDEX strategy_constraints_collection_idx ON strategy_constraints(collection_id);

CREATE TABLE strategy_creative_briefs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collection_plans(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  moodboard_ref uuid,
  color_story text[] DEFAULT ARRAY[]::text[],
  archetypes_focus text[] DEFAULT ARRAY[]::text[],
  family_pivot jsonb DEFAULT '{}'::jsonb,
  silhouette_preferences jsonb DEFAULT '{}'::jsonb,
  material_direction jsonb DEFAULT '{}'::jsonb,
  customer_segment_shift text,
  creative_narrative text,
  embedding extensions.vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX strategy_creative_briefs_tenant_idx ON strategy_creative_briefs(tenant_id);
CREATE INDEX strategy_creative_briefs_collection_idx ON strategy_creative_briefs(collection_id);

-- =============================================================================
-- Analysis runs (versioned, reproducible)
-- =============================================================================

CREATE TABLE strategy_algorithm_versions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  version text NOT NULL UNIQUE,
  released_at timestamptz NOT NULL DEFAULT now(),
  thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
  classifiers_active text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  is_default boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX strategy_algorithm_versions_default_unique ON strategy_algorithm_versions(is_default) WHERE is_default = true;

CREATE TABLE strategy_analysis_runs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_set_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  algorithm_version_id uuid NOT NULL REFERENCES strategy_algorithm_versions(id) ON DELETE RESTRICT,
  taxonomy_version_ids uuid[] DEFAULT ARRAY[]::uuid[],
  constraint_id uuid REFERENCES strategy_constraints(id) ON DELETE SET NULL,
  creative_brief_id uuid REFERENCES strategy_creative_briefs(id) ON DELETE SET NULL,
  data_coverage_summary jsonb DEFAULT '{}'::jsonb,
  data_sufficiency_warnings jsonb DEFAULT '[]'::jsonb,
  run_status strategy_run_status NOT NULL DEFAULT 'pending',
  scoring_started_at timestamptz,
  scoring_completed_at timestamptz,
  recommending_completed_at timestamptz,
  error_log jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX strategy_analysis_runs_tenant_idx ON strategy_analysis_runs(tenant_id, created_at DESC);
CREATE INDEX strategy_analysis_runs_status_idx ON strategy_analysis_runs(run_status) WHERE run_status NOT IN ('complete','failed');

-- =============================================================================
-- Scoring (run-scoped, multi-dimensional confidence)
-- =============================================================================

CREATE TABLE strategy_sku_scores (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  identity_node_id uuid REFERENCES strategy_sku_identity_graph(id) ON DELETE SET NULL,
  demand_score numeric(5,4),
  margin_score numeric(5,4),
  effective_margin numeric(10,4),
  return_risk_score numeric(5,4),
  stockout_risk_score numeric(5,4),
  markdown_risk_score numeric(5,4),
  cannibalization_risk_score numeric(5,4),
  distribution_breadth_score numeric(5,4),
  lifecycle_stage strategy_lifecycle_stage,
  confidence_data_completeness numeric(5,4) DEFAULT 0,
  confidence_identity numeric(5,4) DEFAULT 0,
  confidence_demand numeric(5,4) DEFAULT 0,
  confidence_margin numeric(5,4) DEFAULT 0,
  confidence_creative_fit numeric(5,4),
  confidence_action numeric(5,4) DEFAULT 0,
  classifier_traces jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, product_fact_id)
);

CREATE INDEX strategy_sku_scores_run_idx ON strategy_sku_scores(run_id);
CREATE INDEX strategy_sku_scores_tenant_idx ON strategy_sku_scores(tenant_id);
CREATE INDEX strategy_sku_scores_lifecycle_idx ON strategy_sku_scores(run_id, lifecycle_stage);

CREATE TABLE strategy_family_scores (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  family_code text NOT NULL,
  family_display_name text,
  family_roi numeric(8,4),
  saturation_score numeric(5,4),
  cannibalization_score numeric(5,4),
  return_drag_score numeric(5,4),
  stock_productivity numeric(8,4),
  share_of_wallet_pct numeric(5,4),
  share_of_wallet_trend numeric(5,4),
  sku_count integer,
  hero_count integer,
  dog_count integer,
  classifier_traces jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, family_code)
);

CREATE INDEX strategy_family_scores_run_idx ON strategy_family_scores(run_id);
CREATE INDEX strategy_family_scores_tenant_idx ON strategy_family_scores(tenant_id);

-- =============================================================================
-- Recommendation candidates + scenarios
-- =============================================================================

CREATE TABLE strategy_recommendation_candidates (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  scope strategy_scope NOT NULL,
  scope_ref text NOT NULL,
  action_type strategy_action_type NOT NULL,
  proposed_magnitude jsonb,
  evidence jsonb DEFAULT '{}'::jsonb,
  counter_evidence jsonb DEFAULT '{}'::jsonb,
  assumptions jsonb DEFAULT '[]'::jsonb,
  confidence_action numeric(5,4) DEFAULT 0,
  data_sufficiency_warning text,
  narrative text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_recs_run_idx ON strategy_recommendation_candidates(run_id);
CREATE INDEX strategy_recs_action_idx ON strategy_recommendation_candidates(run_id, action_type);
CREATE INDEX strategy_recs_scope_idx ON strategy_recommendation_candidates(run_id, scope, scope_ref);
CREATE INDEX strategy_recs_tenant_idx ON strategy_recommendation_candidates(tenant_id);

CREATE TABLE strategy_scenarios (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scenario_type strategy_scenario_type NOT NULL DEFAULT 'base_case',
  candidate_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  constraint_satisfaction_summary jsonb DEFAULT '{}'::jsonb,
  creative_application_summary text,
  total_predicted_revenue numeric(14,2),
  total_predicted_margin numeric(14,2),
  total_predicted_returns numeric(14,2),
  total_predicted_buy_budget numeric(14,2),
  predicted_sku_count integer,
  is_default boolean DEFAULT false,
  is_selected boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_scenarios_run_idx ON strategy_scenarios(run_id);
CREATE INDEX strategy_scenarios_tenant_idx ON strategy_scenarios(tenant_id);

-- =============================================================================
-- Provenance bridge to Block 2 (when v3 emits a plan)
-- =============================================================================

CREATE TABLE collection_plan_strategy_links (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  strategy_run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE RESTRICT,
  strategy_scenario_id uuid NOT NULL REFERENCES strategy_scenarios(id) ON DELETE RESTRICT,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  emitted_diff jsonb DEFAULT '{}'::jsonb,
  confidence_summary jsonb DEFAULT '{}'::jsonb,
  deviation_log jsonb[] DEFAULT ARRAY[]::jsonb[]
);

CREATE INDEX cp_strategy_links_plan_idx ON collection_plan_strategy_links(collection_plan_id);
CREATE INDEX cp_strategy_links_run_idx ON collection_plan_strategy_links(strategy_run_id);
CREATE INDEX cp_strategy_links_tenant_idx ON collection_plan_strategy_links(tenant_id);

-- =============================================================================
-- Backtesting
-- =============================================================================

CREATE TABLE strategy_backtests (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  train_season_tags text[] NOT NULL,
  test_season_tag text NOT NULL,
  precision_heroes numeric(5,4),
  precision_dogs numeric(5,4),
  precision_carryover numeric(5,4),
  recall_heroes numeric(5,4),
  recall_dogs numeric(5,4),
  return_trap_catch_rate numeric(5,4),
  color_winner_accuracy numeric(5,4),
  late_climber_catch_rate numeric(5,4),
  identity_graph_accuracy numeric(5,4),
  scorecard_summary jsonb DEFAULT '{}'::jsonb,
  evidence_pairs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX strategy_backtests_run_idx ON strategy_backtests(run_id);
CREATE INDEX strategy_backtests_tenant_idx ON strategy_backtests(tenant_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE strategy_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_raw_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_product_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_inventory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_sales_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_efficiency_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_sku_identity_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_creative_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_algorithm_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_sku_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_family_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_recommendation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_plan_strategy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_backtests ENABLE ROW LEVEL SECURITY;

-- Membership-check helper -----------------------------------------------------

CREATE OR REPLACE FUNCTION strategy_user_is_tenant_member(
  p_tenant_id uuid,
  p_min_role strategy_tenant_role DEFAULT 'viewer'::strategy_tenant_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM strategy_tenant_members m
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = (SELECT auth.uid())
      AND m.revoked_at IS NULL
      AND (
        p_min_role = 'viewer'
        OR (p_min_role = 'analyst' AND m.role IN ('analyst','admin','owner'))
        OR (p_min_role = 'admin' AND m.role IN ('admin','owner'))
        OR (p_min_role = 'owner' AND m.role = 'owner')
      )
  );
$fn$;

REVOKE EXECUTE ON FUNCTION strategy_user_is_tenant_member(uuid, strategy_tenant_role) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION strategy_user_is_tenant_member(uuid, strategy_tenant_role) TO authenticated;

-- Tenant policies -------------------------------------------------------------

CREATE POLICY strategy_tenants_read ON strategy_tenants FOR SELECT TO authenticated
USING (strategy_user_is_tenant_member(id));

CREATE POLICY strategy_tenants_insert ON strategy_tenants FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY strategy_tenants_update ON strategy_tenants FOR UPDATE TO authenticated
USING (strategy_user_is_tenant_member(id, 'owner'::strategy_tenant_role))
WITH CHECK (strategy_user_is_tenant_member(id, 'owner'::strategy_tenant_role));

-- Member policies -------------------------------------------------------------

CREATE POLICY strategy_tenant_members_read ON strategy_tenant_members FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR strategy_user_is_tenant_member(tenant_id, 'admin'::strategy_tenant_role)
);

CREATE POLICY strategy_tenant_members_insert ON strategy_tenant_members FOR INSERT TO authenticated
WITH CHECK (strategy_user_is_tenant_member(tenant_id, 'admin'::strategy_tenant_role));

CREATE POLICY strategy_tenant_members_update ON strategy_tenant_members FOR UPDATE TO authenticated
USING (strategy_user_is_tenant_member(tenant_id, 'admin'::strategy_tenant_role))
WITH CHECK (strategy_user_is_tenant_member(tenant_id, 'admin'::strategy_tenant_role));

CREATE POLICY strategy_tenant_members_delete ON strategy_tenant_members FOR DELETE TO authenticated
USING (strategy_user_is_tenant_member(tenant_id, 'admin'::strategy_tenant_role));

-- Generic tenant-scoped policies (16 tables) ---------------------------------

DO $do$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'strategy_sources',
      'strategy_raw_records',
      'strategy_product_facts',
      'strategy_inventory_facts',
      'strategy_sales_windows',
      'strategy_efficiency_facts',
      'strategy_sku_identity_graph',
      'strategy_taxonomies',
      'strategy_constraints',
      'strategy_creative_briefs',
      'strategy_analysis_runs',
      'strategy_sku_scores',
      'strategy_family_scores',
      'strategy_recommendation_candidates',
      'strategy_scenarios',
      'collection_plan_strategy_links',
      'strategy_backtests'
    ])
  LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (strategy_user_is_tenant_member(tenant_id));', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (strategy_user_is_tenant_member(tenant_id, ''analyst''::strategy_tenant_role));', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (strategy_user_is_tenant_member(tenant_id, ''analyst''::strategy_tenant_role)) WITH CHECK (strategy_user_is_tenant_member(tenant_id, ''analyst''::strategy_tenant_role));', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (strategy_user_is_tenant_member(tenant_id, ''admin''::strategy_tenant_role));', t || '_delete', t);
  END LOOP;
END
$do$;

CREATE POLICY strategy_algorithm_versions_read ON strategy_algorithm_versions FOR SELECT TO authenticated
USING (true);

-- Updated-at triggers ---------------------------------------------------------

CREATE OR REPLACE FUNCTION strategy_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$fn$;

CREATE TRIGGER strategy_tenants_touch BEFORE UPDATE ON strategy_tenants
FOR EACH ROW EXECUTE FUNCTION strategy_touch_updated_at();
CREATE TRIGGER strategy_constraints_touch BEFORE UPDATE ON strategy_constraints
FOR EACH ROW EXECUTE FUNCTION strategy_touch_updated_at();
CREATE TRIGGER strategy_creative_briefs_touch BEFORE UPDATE ON strategy_creative_briefs
FOR EACH ROW EXECUTE FUNCTION strategy_touch_updated_at();
CREATE TRIGGER strategy_sku_identity_graph_touch BEFORE UPDATE ON strategy_sku_identity_graph
FOR EACH ROW EXECUTE FUNCTION strategy_touch_updated_at();

-- Seed: algorithm v1.0.0 ------------------------------------------------------

INSERT INTO strategy_algorithm_versions (version, thresholds, classifiers_active, notes, is_default)
VALUES (
  '1.0.0',
  jsonb_build_object(
    'hero_sell_through_bought_p_min', 0.40,
    'hero_returns_pct_max', 0.20,
    'hero_distribution_breadth_min', 0.60,
    'dog_sell_through_bought_p_max', 0.15,
    'dog_velocity_slope_max', -0.05,
    'climber_velocity_ratio_min', 1.25,
    'climber_runway_days_min', 7,
    'decay_velocity_ratio_max', 0.75,
    'decay_overstock_days_min', 30,
    'new_days_in_store_max', 14,
    'mature_days_in_store_min', 90,
    'color_winner_top_n_per_lineage', 2,
    'returns_risk_family_p_min', 0.75,
    'cannibalization_overlap_min', 0.65,
    'cannibalization_inverse_corr_max', -0.40
  ),
  ARRAY[
    'distribution_normalized_velocity',
    'returns_penalized_margin',
    'capacity_aware_demand_ceiling',
    'stockout_aware_velocity',
    'cannibalization_detector',
    'lifecycle_stage_classifier',
    'color_winner_intra_lineage',
    'carryover_survivor',
    'returns_risk_family',
    'family_roi_share_of_wallet'
  ],
  'Initial release · 10 classifiers per business-plan_aimily-strategy-2026-05-15.md §5. Conservative thresholds.',
  true
);

COMMENT ON TABLE strategy_tenants IS 'Enterprise tenant entity. One row per fashion brand customer.';
COMMENT ON TABLE strategy_sources IS 'Upload metadata. Anti-corruption layer entry point.';
COMMENT ON TABLE strategy_raw_records IS 'Row-level raw extraction. Original labels preserved for re-derivation.';
COMMENT ON TABLE strategy_product_facts IS 'Normalized product identity per observation snapshot.';
COMMENT ON TABLE strategy_inventory_facts IS 'Multi-location stock state per snapshot.';
COMMENT ON TABLE strategy_sales_windows IS 'Velocity per snapshot per time window.';
COMMENT ON TABLE strategy_efficiency_facts IS 'Lifecycle metrics: bought / sold / shipped / sell-through / returns.';
COMMENT ON TABLE strategy_sku_identity_graph IS 'Confidence-weighted lineage. Handles renames, ERP variants, supplier aliases.';
COMMENT ON TABLE strategy_taxonomies IS 'Per-tenant family/color/archetype/lineage mappings. Versioned.';
COMMENT ON TABLE strategy_constraints IS 'Bucket A · hard/semi-hard commercial constraints.';
COMMENT ON TABLE strategy_creative_briefs IS 'Bucket B · OPTIONAL creative direction. Soft weights, NEVER constraints. Stored SEPARATELY per Codex.';
COMMENT ON TABLE strategy_algorithm_versions IS 'Versioned classifier bundles. Reproducibility.';
COMMENT ON TABLE strategy_analysis_runs IS 'One row per generated recommendation set. Versioned end-to-end.';
COMMENT ON TABLE strategy_sku_scores IS 'Per SKU/color per run. 6 confidence dimensions (NOT one number).';
COMMENT ON TABLE strategy_family_scores IS 'Per family per run. ROI + saturation + cannibalization.';
COMMENT ON TABLE strategy_recommendation_candidates IS 'Concrete actions before scenario assembly.';
COMMENT ON TABLE strategy_scenarios IS 'Assembled recommendation sets honoring constraints.';
COMMENT ON TABLE collection_plan_strategy_links IS 'Provenance bridge to Block 2. Full deviation_log per Codex.';
COMMENT ON TABLE strategy_backtests IS 'Train-on-N-1 / test-on-N. Required for paid pilot.';
