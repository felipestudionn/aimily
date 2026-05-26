-- 076_studio_brand_inherit.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Studio projects can soft-link to a collection_plan as their brand source.
--
-- When brand_source_collection_id IS NULL, the project uses its own
-- brand_name / brand_palette / brand_fabric_refs / brand_logo_url fields
-- (this is the historical, Studio-standalone behaviour and the only flow for
-- subscribers who only have Studio).
--
-- When brand_source_collection_id IS NOT NULL, the brand fields are
-- resolved at read time from the referenced collection's CIS (collection_
-- decisions, domain='creative', subdomain='identity' for brand_name and
-- subdomain in ('identity','color') for palette). The Studio project's own
-- brand_name / brand_palette stay populated as the most recent snapshot
-- (for fallback if the source collection is deleted; the FK uses ON DELETE
-- SET NULL so a deletion downgrades the project to standalone with its
-- last-known snapshot intact). brand_logo_url and brand_fabric_refs are
-- never inherited — those are Studio-local assets.
--
-- This is the soft-link model (option A in Felipe's 2026-05-26 decision):
-- live updates to the source collection's brand reflect immediately in the
-- linked Studio projects, without copying the brand into Studio.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.studio_projects
  ADD COLUMN IF NOT EXISTS brand_source_collection_id uuid
    REFERENCES public.collection_plans(id) ON DELETE SET NULL;

-- Index so the cascading "show me Studio projects linked to this collection"
-- query (used in the collection settings UI later) is fast.
CREATE INDEX IF NOT EXISTS idx_studio_projects_brand_source_collection_id
  ON public.studio_projects(brand_source_collection_id)
  WHERE brand_source_collection_id IS NOT NULL;
