-- Tech Pack data per SKU — specs, BOM, measurements, grading.
-- One row per (collection_plan_id, sku_id). JSONB for flexibility
-- during MVP iterations; will migrate to typed columns if we lock
-- a schema later.
CREATE TABLE IF NOT EXISTS public.tech_pack_data (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES public.collection_plans(id) ON DELETE CASCADE,
  sku_id          uuid NOT NULL REFERENCES public.collection_skus(id) ON DELETE CASCADE,
  header          jsonb DEFAULT '{}'::jsonb,
  drawings        jsonb DEFAULT '{}'::jsonb,
  measurements    jsonb DEFAULT '{}'::jsonb,
  bom             jsonb DEFAULT '{}'::jsonb,
  grading         jsonb DEFAULT '{}'::jsonb,
  factory_notes   jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (sku_id)
);

CREATE INDEX IF NOT EXISTS tech_pack_data_collection_idx
  ON public.tech_pack_data (collection_plan_id);

CREATE TABLE IF NOT EXISTS public.tech_pack_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES public.collection_plans(id) ON DELETE CASCADE,
  sku_id          uuid NOT NULL REFERENCES public.collection_skus(id) ON DELETE CASCADE,
  block           text NOT NULL CHECK (block IN ('header','drawings','measurements','bom','grading','factory','general')),
  body            text NOT NULL,
  author_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tech_pack_comments_sku_idx
  ON public.tech_pack_comments (sku_id, created_at DESC);

ALTER TABLE public.tech_pack_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_pack_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tech_pack_data_owner_select ON public.tech_pack_data;
CREATE POLICY tech_pack_data_owner_select ON public.tech_pack_data
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS tech_pack_data_owner_all ON public.tech_pack_data;
CREATE POLICY tech_pack_data_owner_all ON public.tech_pack_data
  FOR ALL USING (
    collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS tech_pack_comments_owner_select ON public.tech_pack_comments;
CREATE POLICY tech_pack_comments_owner_select ON public.tech_pack_comments
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS tech_pack_comments_owner_all ON public.tech_pack_comments;
CREATE POLICY tech_pack_comments_owner_all ON public.tech_pack_comments
  FOR ALL USING (
    collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.touch_tech_pack_data_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tech_pack_data_touch ON public.tech_pack_data;
CREATE TRIGGER tech_pack_data_touch
  BEFORE UPDATE ON public.tech_pack_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_tech_pack_data_updated_at();
