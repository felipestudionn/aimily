-- Phase 7 — Pantone TCX/TPX colors moved from TS bundle into SQL.
-- Mirrors src/lib/pantone-library/catalog.ts (87 fashion-relevant TCX
-- entries); seed via scripts/seed-pantone-library.ts. New entries land
-- here as the library extends.

CREATE TABLE IF NOT EXISTS public.pantone_colors (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  series      text NOT NULL CHECK (series IN ('TCX','TPX','TPG','PMS')),
  family      text NOT NULL,
  hex         text NOT NULL,
  rgb_r       integer NOT NULL,
  rgb_g       integer NOT NULL,
  rgb_b       integer NOT NULL,
  lab_l       numeric NOT NULL,
  lab_a       numeric NOT NULL,
  lab_b       numeric NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pantone_family_idx ON public.pantone_colors (family);
CREATE INDEX IF NOT EXISTS pantone_series_idx ON public.pantone_colors (series);

ALTER TABLE public.pantone_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pantone_read ON public.pantone_colors;
CREATE POLICY pantone_read ON public.pantone_colors FOR SELECT USING (auth.role() = 'authenticated');
