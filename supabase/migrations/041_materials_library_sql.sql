-- Phase 7 — Materials Library moves from a TS-bundled catalog into a
-- proper SQL table. The TS catalog stays as the source-of-truth for
-- now (it's curated and version-controlled); this migration mirrors
-- it into BD so:
--   1. an admin CRUD UI can edit/extend without redeploys
--   2. a vendor portal can read materials directly via REST
--   3. analytics over material usage become trivial (joins)
--
-- Sync strategy:
--   - The TS catalog is still authoritative for now.
--   - A seed cron / one-time job (next step in Phase 7) populates this
--     table from CATALOG. Re-running is idempotent (PRIMARY KEY id).
--   - Going forward, when admin CRUD lands, this table becomes
--     authoritative and the TS catalog is regenerated on build.

CREATE TABLE IF NOT EXISTS public.materials_library (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  layer           text NOT NULL CHECK (layer IN ('L1','L2','L3')),
  parent_id       text REFERENCES public.materials_library(id) ON DELETE SET NULL,
  family          text NOT NULL,
  composition     text NOT NULL,
  weight_min      numeric,
  weight_max      numeric,
  weight_unit     text,
  default_finish  text,
  finish_options  text[] DEFAULT '{}',
  zones           text[] DEFAULT '{}',
  subtypes        text[] DEFAULT '{}',
  price_tier      text[] DEFAULT '{}',
  aesthetic_tags  text[] DEFAULT '{}',
  season_fit      text[] DEFAULT '{}',
  certifications  text[] DEFAULT '{}',
  rsl_flags       text[] DEFAULT '{}',
  vegan           boolean NOT NULL DEFAULT false,
  cites_status    text,
  cogs_value      numeric,
  cogs_unit       text,
  cogs_currency   text,
  supplier_name   text,
  supplier_origin text,
  supplier_url    text,
  source          text NOT NULL DEFAULT 'ts-catalog',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materials_library_family_idx ON public.materials_library (family);
CREATE INDEX IF NOT EXISTS materials_library_layer_idx ON public.materials_library (layer);
CREATE INDEX IF NOT EXISTS materials_library_zones_idx ON public.materials_library USING GIN (zones);
CREATE INDEX IF NOT EXISTS materials_library_subtypes_idx ON public.materials_library USING GIN (subtypes);
CREATE INDEX IF NOT EXISTS materials_library_aesthetic_idx ON public.materials_library USING GIN (aesthetic_tags);

ALTER TABLE public.materials_library ENABLE ROW LEVEL SECURITY;

-- The catalog is shared knowledge — every authenticated user can read
-- it. Mutations are gated to admin emails (handled at the API layer).
DROP POLICY IF EXISTS materials_library_read ON public.materials_library;
CREATE POLICY materials_library_read ON public.materials_library
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.materials_library IS
  'Phase 7: curated fashion materials catalog. ~963 entries seeded from src/lib/materials-library/rama-*.ts. Read-only for users; admin CRUD landing in a follow-up.';
