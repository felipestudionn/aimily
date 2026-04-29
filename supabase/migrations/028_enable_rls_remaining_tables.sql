-- Pre-launch defense in depth (2026-04-29)
-- Four user-scoped tables had RLS disabled. All current code paths use
-- supabaseAdmin (which bypasses RLS) so this is not a live data leak today,
-- but enabling RLS protects us against any future call with the anon JWT.

-- 1. collection_decisions — the CIS table. Per-user via collection_plans ownership.
ALTER TABLE collection_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read decisions on their own collections"
  ON collection_decisions FOR SELECT
  USING (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can write decisions on their own collections"
  ON collection_decisions FOR INSERT
  WITH CHECK (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update decisions on their own collections"
  ON collection_decisions FOR UPDATE
  USING (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete decisions on their own collections"
  ON collection_decisions FOR DELETE
  USING (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  );

-- 2. sales_channels — per-user via collection_plans ownership.
ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sales channels for their own collections"
  ON sales_channels FOR ALL
  USING (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  );

-- 3. wholesale_orders — per-user via collection_plans ownership.
ALTER TABLE wholesale_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage wholesale orders for their own collections"
  ON wholesale_orders FOR ALL
  USING (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    collection_plan_id IN (
      SELECT id FROM collection_plans WHERE user_id = auth.uid()
    )
  );

-- 4. push_subscriptions — per-user direct.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. aimily_models — read-only catalog (28 models). Public read; no writes from clients.
ALTER TABLE aimily_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aimily models are publicly readable"
  ON aimily_models FOR SELECT
  USING (true);
