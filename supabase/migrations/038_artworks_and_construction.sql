-- Phase 6 — Artworks Library + Construction Details + Multi-view drawings
--
-- Three additions wrap up the PLM parity plan:
--   1. `artworks` table — graphics, AOP repeats, placement prints,
--      embroidery concepts. Assigned to SKUs via `collection_skus.
--      artwork_ids` (text[] of artwork ids).
--   2. `tech_pack_data.construction_details` — jsonb of structured
--      stitching/pressing/finishing fields. Coexists with the existing
--      free-form `factory_notes` column.
--   3. The drawings JSONB stays compatible: existing keys (viewA, viewB,
--      callouts) keep working; new shape `{ views: [{slot, label, url,
--      callouts[]}] }` is layered in via the same column. The UI reads
--      whichever shape is present.
--
-- Storage:
--   - artwork files live in the existing 'collection-assets' bucket.
--   - thread color refs are free-form (artworks.thread_palette text[]);
--     full DST embroidery upload is deferred to Phase 6b/P3.

CREATE TABLE IF NOT EXISTS public.artworks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_plan_id  uuid REFERENCES public.collection_plans(id) ON DELETE SET NULL,
  name                text NOT NULL,
  artwork_type        text NOT NULL CHECK (artwork_type IN ('graphic','aop_repeat','placement','embroidery_concept')),
  preview_url         text,
  source_file_url     text,
  scale_min_cm        numeric,
  scale_max_cm        numeric,
  aspect_ratio        text,
  thread_palette      text[] DEFAULT '{}',
  tags                text[] DEFAULT '{}',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artworks_user_idx ON public.artworks (user_id);
CREATE INDEX IF NOT EXISTS artworks_collection_idx ON public.artworks (collection_plan_id) WHERE collection_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artworks_type_idx ON public.artworks (artwork_type);

ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS artworks_owner_select ON public.artworks;
CREATE POLICY artworks_owner_select ON public.artworks FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS artworks_owner_all ON public.artworks;
CREATE POLICY artworks_owner_all ON public.artworks FOR ALL USING (user_id = auth.uid());

-- SKU ↔ artwork link.
ALTER TABLE public.collection_skus
  ADD COLUMN IF NOT EXISTS artwork_ids uuid[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS collection_skus_artwork_ids_idx ON public.collection_skus USING GIN (artwork_ids);

-- Construction details — structured replacement for the part of
-- factory_notes that is too important to leave free-form.
ALTER TABLE public.tech_pack_data
  ADD COLUMN IF NOT EXISTS construction_details jsonb DEFAULT '{}'::jsonb;

COMMENT ON TABLE public.artworks IS
  'Phase 6: graphics / AOP / placement / embroidery concepts. Assigned to SKUs via collection_skus.artwork_ids.';
COMMENT ON COLUMN public.tech_pack_data.construction_details IS
  'Phase 6: structured stitching / pressing / finishing fields. Shape: { stitching: [{seam,type,spi,thread_color,thread_weight}], pressing: [{area,temp,time,instructions}], finishing: [{edge,treatment}], hand_feel_target: string }. Coexists with factory_notes (free-form).';
