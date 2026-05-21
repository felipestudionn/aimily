-- Applied 2026-05-18 via Supabase MCP (version 20260518202643).
-- Backfilled into the repo on 2026-05-21 so supabase/migrations/ matches DB state.

-- Aimily Design (modal embebido en In-Season) · 2026-05-18 · Felipe
-- Permite ejecutar variantes de color + replicar concepto sobre la imagen
-- del SKU sin salir del demo. Persiste resultados para que vuelvan a ser
-- visibles en sesiones futuras.

-- 1) Campo nuevo en product_facts: URL de la imagen del SKU en máxima calidad
ALTER TABLE strategy_product_facts
  ADD COLUMN IF NOT EXISTS product_image_url text NULL;

COMMENT ON COLUMN strategy_product_facts.product_image_url IS
  'URL de la imagen del SKU extraída del PDF original en alta resolución, almacenada en strategy-uploads. Fuente única para los flujos de Aimily Design (extend_colors + amplify_next_season).';

-- 2) Tabla nueva: ejecuciones de acciones creativas sobre SKUs
CREATE TABLE IF NOT EXISTS strategy_action_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('extend_colors', 'amplify_next_season')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
  output_asset_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_by uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_strategy_action_executions_run_sku
  ON strategy_action_executions(run_id, product_fact_id, action_type);

CREATE INDEX IF NOT EXISTS idx_strategy_action_executions_tenant_created
  ON strategy_action_executions(tenant_id, created_at DESC);

ALTER TABLE strategy_action_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategy_action_executions_select
  ON strategy_action_executions
  FOR SELECT
  USING (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY strategy_action_executions_insert
  ON strategy_action_executions
  FOR INSERT
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY strategy_action_executions_update
  ON strategy_action_executions
  FOR UPDATE
  USING (strategy_user_is_tenant_member(tenant_id))
  WITH CHECK (strategy_user_is_tenant_member(tenant_id));

CREATE POLICY strategy_action_executions_delete
  ON strategy_action_executions
  FOR DELETE
  USING (strategy_user_is_tenant_member(tenant_id));

COMMENT ON TABLE strategy_action_executions IS
  'Aimily Design · ejecuciones de variantes creativas (extender colores / replicar concepto) generadas desde In-Season. Persiste output assets para evitar regenerar.';
