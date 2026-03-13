-- ============================================================
-- Migration 014: Add service_role policies to all collection tables
-- Enterprise-ready: explicit service_role access on every table
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'ai_generations',
    'asset_reviews',
    'brand_models',
    'brand_profiles',
    'brand_voice_config',
    'campaign_shoots',
    'collection_stories',
    'content_pillars',
    'email_templates_content',
    'launch_checklist',
    'launch_issues',
    'launch_tasks',
    'lessons_learned',
    'lookbook_pages',
    'paid_ad_sets',
    'paid_campaigns',
    'sales_entries',
    'social_templates'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "Service role manages %s" ON public.%I FOR ALL USING (auth.role() = ''service_role'')',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;
