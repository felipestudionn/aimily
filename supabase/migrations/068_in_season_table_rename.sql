-- 068_in_season_table_rename
--
-- Felipe 2026-05-19/20 · physical DB rename strategy_* → in_season_*
--
-- Approach: ALTER TABLE RENAME (preserves FKs by OID, RLS policies, indexes,
-- triggers, sequences) + recreate `strategy_user_is_tenant_member` to query
-- the renamed `in_season_tenant_members` + create SELECT * back-compat views
-- with security_invoker=true so existing code paths using `.from('strategy_X')`
-- keep working through PostgREST until the codebase migration finishes.
--
-- Views with security_invoker=true execute under the caller's role, so RLS
-- policies attached to the underlying in_season_* tables continue to apply
-- as before. Simple `SELECT *` views are auto-updatable by Postgres for
-- INSERT/UPDATE/DELETE without needing INSTEAD OF triggers.
--
-- Reversible: ALTER VIEW + ALTER TABLE RENAME back.

BEGIN;

-- 1) Rename all 25 strategy_* tables → in_season_*
ALTER TABLE public.strategy_action_executions             RENAME TO in_season_action_executions;
ALTER TABLE public.strategy_algorithm_versions            RENAME TO in_season_algorithm_versions;
ALTER TABLE public.strategy_analysis_runs                 RENAME TO in_season_analysis_runs;
ALTER TABLE public.strategy_backtests                     RENAME TO in_season_backtests;
ALTER TABLE public.strategy_constraints                   RENAME TO in_season_constraints;
ALTER TABLE public.strategy_creative_briefs               RENAME TO in_season_creative_briefs;
ALTER TABLE public.strategy_efficiency_facts              RENAME TO in_season_efficiency_facts;
ALTER TABLE public.strategy_family_scores                 RENAME TO in_season_family_scores;
ALTER TABLE public.strategy_inventory_facts               RENAME TO in_season_inventory_facts;
ALTER TABLE public.strategy_inventory_snapshots           RENAME TO in_season_inventory_snapshots;
ALTER TABLE public.strategy_product_facts                 RENAME TO in_season_product_facts;
ALTER TABLE public.strategy_raw_records                   RENAME TO in_season_raw_records;
ALTER TABLE public.strategy_recommendation_candidates     RENAME TO in_season_recommendation_candidates;
ALTER TABLE public.strategy_recommended_palettes          RENAME TO in_season_recommended_palettes;
ALTER TABLE public.strategy_replenishment_allocations     RENAME TO in_season_replenishment_allocations;
ALTER TABLE public.strategy_sales_windows                 RENAME TO in_season_sales_windows;
ALTER TABLE public.strategy_scenarios                     RENAME TO in_season_scenarios;
ALTER TABLE public.strategy_sku_identity_graph            RENAME TO in_season_sku_identity_graph;
ALTER TABLE public.strategy_sku_scores                    RENAME TO in_season_sku_scores;
ALTER TABLE public.strategy_sources                       RENAME TO in_season_sources;
ALTER TABLE public.strategy_taxonomies                    RENAME TO in_season_taxonomies;
ALTER TABLE public.strategy_tenant_connectors             RENAME TO in_season_tenant_connectors;
ALTER TABLE public.strategy_tenant_members                RENAME TO in_season_tenant_members;
ALTER TABLE public.strategy_tenants                       RENAME TO in_season_tenants;
ALTER TABLE public.strategy_user_sku_selections           RENAME TO in_season_user_sku_selections;

-- 2) Update the membership helper to query the renamed table.
--    Keep the function name `strategy_user_is_tenant_member` because all RLS
--    policies (already attached to the renamed tables) reference it by name.
--    The enum `strategy_tenant_role` is preserved as-is for the same reason.
CREATE OR REPLACE FUNCTION public.strategy_user_is_tenant_member(
  p_tenant_id uuid,
  p_min_role strategy_tenant_role DEFAULT 'viewer'::strategy_tenant_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM in_season_tenant_members m
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
$$;

-- 3) Back-compat views: legacy code using `.from('strategy_X')` keeps working.
--    security_invoker=true ensures RLS on the in_season_* table applies under
--    the caller's role. Auto-updatable for simple SELECT *.
CREATE VIEW public.strategy_action_executions          WITH (security_invoker = true) AS SELECT * FROM public.in_season_action_executions;
CREATE VIEW public.strategy_algorithm_versions         WITH (security_invoker = true) AS SELECT * FROM public.in_season_algorithm_versions;
CREATE VIEW public.strategy_analysis_runs              WITH (security_invoker = true) AS SELECT * FROM public.in_season_analysis_runs;
CREATE VIEW public.strategy_backtests                  WITH (security_invoker = true) AS SELECT * FROM public.in_season_backtests;
CREATE VIEW public.strategy_constraints                WITH (security_invoker = true) AS SELECT * FROM public.in_season_constraints;
CREATE VIEW public.strategy_creative_briefs            WITH (security_invoker = true) AS SELECT * FROM public.in_season_creative_briefs;
CREATE VIEW public.strategy_efficiency_facts           WITH (security_invoker = true) AS SELECT * FROM public.in_season_efficiency_facts;
CREATE VIEW public.strategy_family_scores              WITH (security_invoker = true) AS SELECT * FROM public.in_season_family_scores;
CREATE VIEW public.strategy_inventory_facts            WITH (security_invoker = true) AS SELECT * FROM public.in_season_inventory_facts;
CREATE VIEW public.strategy_inventory_snapshots        WITH (security_invoker = true) AS SELECT * FROM public.in_season_inventory_snapshots;
CREATE VIEW public.strategy_product_facts              WITH (security_invoker = true) AS SELECT * FROM public.in_season_product_facts;
CREATE VIEW public.strategy_raw_records                WITH (security_invoker = true) AS SELECT * FROM public.in_season_raw_records;
CREATE VIEW public.strategy_recommendation_candidates  WITH (security_invoker = true) AS SELECT * FROM public.in_season_recommendation_candidates;
CREATE VIEW public.strategy_recommended_palettes       WITH (security_invoker = true) AS SELECT * FROM public.in_season_recommended_palettes;
CREATE VIEW public.strategy_replenishment_allocations  WITH (security_invoker = true) AS SELECT * FROM public.in_season_replenishment_allocations;
CREATE VIEW public.strategy_sales_windows              WITH (security_invoker = true) AS SELECT * FROM public.in_season_sales_windows;
CREATE VIEW public.strategy_scenarios                  WITH (security_invoker = true) AS SELECT * FROM public.in_season_scenarios;
CREATE VIEW public.strategy_sku_identity_graph         WITH (security_invoker = true) AS SELECT * FROM public.in_season_sku_identity_graph;
CREATE VIEW public.strategy_sku_scores                 WITH (security_invoker = true) AS SELECT * FROM public.in_season_sku_scores;
CREATE VIEW public.strategy_sources                    WITH (security_invoker = true) AS SELECT * FROM public.in_season_sources;
CREATE VIEW public.strategy_taxonomies                 WITH (security_invoker = true) AS SELECT * FROM public.in_season_taxonomies;
CREATE VIEW public.strategy_tenant_connectors          WITH (security_invoker = true) AS SELECT * FROM public.in_season_tenant_connectors;
CREATE VIEW public.strategy_tenant_members             WITH (security_invoker = true) AS SELECT * FROM public.in_season_tenant_members;
CREATE VIEW public.strategy_tenants                    WITH (security_invoker = true) AS SELECT * FROM public.in_season_tenants;
CREATE VIEW public.strategy_user_sku_selections        WITH (security_invoker = true) AS SELECT * FROM public.in_season_user_sku_selections;

-- 4) Grant the same privileges PostgREST already used to expose strategy_* tables
--    to authenticated/anon/service_role on the new views. PG's CREATE VIEW
--    inherits the owner's permissions; PostgREST needs explicit grants too.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.strategy_action_executions,
  public.strategy_algorithm_versions,
  public.strategy_analysis_runs,
  public.strategy_backtests,
  public.strategy_constraints,
  public.strategy_creative_briefs,
  public.strategy_efficiency_facts,
  public.strategy_family_scores,
  public.strategy_inventory_facts,
  public.strategy_inventory_snapshots,
  public.strategy_product_facts,
  public.strategy_raw_records,
  public.strategy_recommendation_candidates,
  public.strategy_recommended_palettes,
  public.strategy_replenishment_allocations,
  public.strategy_sales_windows,
  public.strategy_scenarios,
  public.strategy_sku_identity_graph,
  public.strategy_sku_scores,
  public.strategy_sources,
  public.strategy_taxonomies,
  public.strategy_tenant_connectors,
  public.strategy_tenant_members,
  public.strategy_tenants,
  public.strategy_user_sku_selections
TO authenticated, anon, service_role;

COMMIT;
