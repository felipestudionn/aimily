-- ============================================================
-- Migration 006: Schema Audit & RLS Hardening
-- Date: 2026-03-11
-- Purpose: Fix insecure RLS policies that use `true` (open to anyone)
--          and tighten authenticated-only policies to check ownership.
-- ============================================================

-- Helper: reusable check for "user owns this collection_plan"
-- Pattern: collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())

-- ============================================================
-- 1. collection_skus — remove open policy, keep user-scoped ones
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on collection_skus" ON public.collection_skus;

-- ============================================================
-- 2. commercial_actions — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on commercial_actions" ON public.commercial_actions;

CREATE POLICY "Users can view own commercial_actions" ON public.commercial_actions
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own commercial_actions" ON public.commercial_actions
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own commercial_actions" ON public.commercial_actions
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own commercial_actions" ON public.commercial_actions
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 3. content_calendar — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to content_calendar" ON public.content_calendar;

CREATE POLICY "Users can view own content_calendar" ON public.content_calendar
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own content_calendar" ON public.content_calendar
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own content_calendar" ON public.content_calendar
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own content_calendar" ON public.content_calendar
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 4. drops — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on drops" ON public.drops;

CREATE POLICY "Users can view own drops" ON public.drops
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own drops" ON public.drops
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own drops" ON public.drops
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own drops" ON public.drops
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5. market_predictions — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on market_predictions" ON public.market_predictions;

CREATE POLICY "Users can view own market_predictions" ON public.market_predictions
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own market_predictions" ON public.market_predictions
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own market_predictions" ON public.market_predictions
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own market_predictions" ON public.market_predictions
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 6. pr_contacts — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to pr_contacts" ON public.pr_contacts;

CREATE POLICY "Users can view own pr_contacts" ON public.pr_contacts
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own pr_contacts" ON public.pr_contacts
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own pr_contacts" ON public.pr_contacts
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own pr_contacts" ON public.pr_contacts
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 7. product_copy — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to product_copy" ON public.product_copy;

CREATE POLICY "Users can view own product_copy" ON public.product_copy
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own product_copy" ON public.product_copy
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own product_copy" ON public.product_copy
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own product_copy" ON public.product_copy
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 8. production_orders — replace open policy with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on production_orders" ON public.production_orders;

CREATE POLICY "Users can view own production_orders" ON public.production_orders
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own production_orders" ON public.production_orders
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own production_orders" ON public.production_orders
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own production_orders" ON public.production_orders
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 9. sample_reviews — replace open policies with user-scoped
-- ============================================================
DROP POLICY IF EXISTS "sample_reviews_select" ON public.sample_reviews;
DROP POLICY IF EXISTS "sample_reviews_insert" ON public.sample_reviews;
DROP POLICY IF EXISTS "sample_reviews_update" ON public.sample_reviews;
DROP POLICY IF EXISTS "sample_reviews_delete" ON public.sample_reviews;

CREATE POLICY "Users can view own sample_reviews" ON public.sample_reviews
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own sample_reviews" ON public.sample_reviews
  FOR INSERT WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own sample_reviews" ON public.sample_reviews
  FOR UPDATE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own sample_reviews" ON public.sample_reviews
  FOR DELETE USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 10. sku_colorways — replace open policy with user-scoped (via sku → plan)
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on sku_colorways" ON public.sku_colorways;

CREATE POLICY "Users can view own sku_colorways" ON public.sku_colorways
  FOR SELECT USING (
    sku_id IN (
      SELECT cs.id FROM collection_skus cs
      JOIN collection_plans cp ON cs.collection_plan_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own sku_colorways" ON public.sku_colorways
  FOR INSERT WITH CHECK (
    sku_id IN (
      SELECT cs.id FROM collection_skus cs
      JOIN collection_plans cp ON cs.collection_plan_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own sku_colorways" ON public.sku_colorways
  FOR UPDATE USING (
    sku_id IN (
      SELECT cs.id FROM collection_skus cs
      JOIN collection_plans cp ON cs.collection_plan_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own sku_colorways" ON public.sku_colorways
  FOR DELETE USING (
    sku_id IN (
      SELECT cs.id FROM collection_skus cs
      JOIN collection_plans cp ON cs.collection_plan_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- 11. brand_models — tighten from "any authenticated" to owner-scoped
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage brand_models" ON public.brand_models;

CREATE POLICY "Users can manage own brand_models" ON public.brand_models
  FOR ALL USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  ) WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 12. campaign_shoots — tighten from "any authenticated" to owner-scoped
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage campaign_shoots" ON public.campaign_shoots;

CREATE POLICY "Users can manage own campaign_shoots" ON public.campaign_shoots
  FOR ALL USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  ) WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 13. lookbook_pages — tighten from "any authenticated" to owner-scoped
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage lookbook_pages" ON public.lookbook_pages;

CREATE POLICY "Users can manage own lookbook_pages" ON public.lookbook_pages
  FOR ALL USING (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  ) WITH CHECK (
    collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
  );

-- ============================================================
-- 14. Enable RLS on aimily tables that are missing it
--     (raw_content, reports, signals are shared/public data — read-only)
-- ============================================================

-- raw_content: public trend data, managed by service role
ALTER TABLE public.raw_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read raw_content" ON public.raw_content
  FOR SELECT USING (true);
CREATE POLICY "Service role manages raw_content" ON public.raw_content
  FOR ALL USING (auth.role() = 'service_role');

-- reports: public trend reports, managed by service role
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read reports" ON public.reports
  FOR SELECT USING (true);
CREATE POLICY "Service role manages reports" ON public.reports
  FOR ALL USING (auth.role() = 'service_role');

-- signals: public trend signals, managed by service role
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read signals" ON public.signals
  FOR SELECT USING (true);
CREATE POLICY "Service role manages signals" ON public.signals
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 15. Service role access for tables that API routes need
--     (ensures server-side routes with service_role key still work)
-- ============================================================
CREATE POLICY "Service role full access commercial_actions" ON public.commercial_actions
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access content_calendar" ON public.content_calendar
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access drops" ON public.drops
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access market_predictions" ON public.market_predictions
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access pr_contacts" ON public.pr_contacts
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access product_copy" ON public.product_copy
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access production_orders" ON public.production_orders
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access sample_reviews" ON public.sample_reviews
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access sku_colorways" ON public.sku_colorways
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access collection_skus" ON public.collection_skus
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- NOTE: The following tables belong to a DIFFERENT project
-- sharing this Supabase instance and are NOT modified here:
-- account, session, user, verification (better-auth system)
-- bot_memory, briefings, calendar_*, document_search_cache,
-- exercise_plans, meal_plans, processing_jobs, projects,
-- project_olawave_links, raw_content, reminders, reports,
-- rrss_*, signals, tasks, travel_plans
-- ============================================================
