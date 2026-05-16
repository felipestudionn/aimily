
-- Paso 3 foundation per roadmap_aimily-strategy-paso-2-3-2026-05-16.md §3:
-- 1. supplier_lead_time_days on strategy_product_facts — optional, customer-
--    supplied. Drives deliverable_days = seasonal_runway − lead_time, which
--    feeds the late_to_market tension flag.
-- 2. run_mode column on strategy_analysis_runs (mid_season | pre_season |
--    unscoped). Mid-season prioritises replenish/markdown/redistribute;
--    pre-season prioritises carryover/new_sku/family_extension/kill.
--    Affects scenario assembly + LLM narrative tone.
-- 3. strategy_replenishment_allocations table — scenario × product_fact_id
--    → recommended_buy_units with full justification chain.

ALTER TABLE strategy_product_facts
  ADD COLUMN IF NOT EXISTS supplier_lead_time_days integer;

COMMENT ON COLUMN strategy_product_facts.supplier_lead_time_days IS
  'Days from buy commit to in-store availability. Customer-supplied at ingest. When NULL, replenishment allocator uses tenant default (or skips lead-time gating).';

CREATE TYPE strategy_run_mode AS ENUM (
  'unscoped',
  'pre_season',
  'mid_season'
);

ALTER TABLE strategy_analysis_runs
  ADD COLUMN IF NOT EXISTS run_mode strategy_run_mode NOT NULL DEFAULT 'unscoped',
  ADD COLUMN IF NOT EXISTS default_lead_time_days integer;

COMMENT ON COLUMN strategy_analysis_runs.run_mode IS
  'pre_season = prioritise carryover + new_sku_proposal + family_extension + kill in scenario assembly. mid_season = prioritise replenish + markdown + geographic_redistribute. unscoped = no mode filter applied (default).';
COMMENT ON COLUMN strategy_analysis_runs.default_lead_time_days IS
  'Fallback supplier_lead_time_days used when a product_fact has none set. Specific to this run so different categories can be analysed under different sourcing assumptions.';

CREATE TABLE strategy_replenishment_allocations (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  scenario_id uuid NOT NULL REFERENCES strategy_scenarios(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  recommended_buy_units integer NOT NULL DEFAULT 0,
  projected_cost numeric(14,2),
  ranking_score numeric(6,4),
  score_components jsonb DEFAULT '{}'::jsonb,
  -- score_components shape:
  -- {
  --   demand_score: 0.0,
  --   seasonal_runway_score: 0.0,
  --   return_risk_penalty: 0.0,
  --   creative_alignment_score: 0.0,
  --   lead_time_penalty: 0.0,
  --   deliverable_days: 0,
  --   excluded_reason?: 'late_to_market' | 'no_runway' | 'creative_tension' | null
  -- }
  justification text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, product_fact_id)
);

CREATE INDEX strategy_replenishment_allocations_tenant_idx ON strategy_replenishment_allocations(tenant_id);
CREATE INDEX strategy_replenishment_allocations_run_idx ON strategy_replenishment_allocations(run_id);
CREATE INDEX strategy_replenishment_allocations_scenario_idx ON strategy_replenishment_allocations(scenario_id);
CREATE INDEX strategy_replenishment_allocations_product_idx ON strategy_replenishment_allocations(product_fact_id);
CREATE INDEX strategy_replenishment_allocations_ranking_idx ON strategy_replenishment_allocations(scenario_id, ranking_score DESC);

ALTER TABLE strategy_replenishment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategy_replenishment_allocations_read ON strategy_replenishment_allocations
  FOR SELECT TO authenticated
  USING (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY strategy_replenishment_allocations_insert ON strategy_replenishment_allocations
  FOR INSERT TO authenticated
  WITH CHECK (strategy_user_is_tenant_member(tenant_id, 'analyst'::strategy_tenant_role));

CREATE POLICY strategy_replenishment_allocations_update ON strategy_replenishment_allocations
  FOR UPDATE TO authenticated
  USING (strategy_user_is_tenant_member(tenant_id, 'analyst'::strategy_tenant_role))
  WITH CHECK (strategy_user_is_tenant_member(tenant_id, 'analyst'::strategy_tenant_role));

CREATE POLICY strategy_replenishment_allocations_delete ON strategy_replenishment_allocations
  FOR DELETE TO authenticated
  USING (strategy_user_is_tenant_member(tenant_id, 'admin'::strategy_tenant_role));

COMMENT ON TABLE strategy_replenishment_allocations IS
  'Per-scenario × per-SKU buy unit recommendations. ranking_score = demand × runway × (1-returns) × creative_alignment × (1 - lead_time_penalty). When a SKU is excluded (lead time exceeds runway), the row is still created with recommended_buy_units=0 and excluded_reason set so the UI can surface "late to market" tensions.';
