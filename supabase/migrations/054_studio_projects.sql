-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 054 · Aimily Studio · Projects table
--
-- Studio is the content-creation wedge product (aimily.app/studio). A Studio
-- project is the user's lightweight brand container — much simpler than a
-- full Aimily 360 collection_plan. The client uploads their brand assets
-- (name, palette, 1-3 fabric references) and from that container generates
-- packs of editorial campaign outputs.
--
-- A user can have many studio_projects (one per brand they manage).
-- The project owns the outputs (via collection_assets.studio_project_id,
-- added in migration 055) and the purchased packs (studio_purchases,
-- migration 056).
--
-- Reference: .planning/studio/IMPLEMENTATION-PLAN.md §2.1
-- Reference: memory/business-plan_aimily-studio-2026-05-14.md §0.0
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lightweight brand info (no full Aimily 360 CIS)
  brand_name TEXT NOT NULL,
  brand_logo_url TEXT,
  brand_palette JSONB DEFAULT '[]'::jsonb,
  brand_fabric_refs JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE,

  CHECK (length(brand_name) >= 1 AND length(brand_name) <= 200)
);

COMMENT ON TABLE public.studio_projects IS
  'Aimily Studio · lightweight brand container per user. Owns Studio outputs (collection_assets.studio_project_id) and packs purchased (studio_purchases.studio_project_id).';
COMMENT ON COLUMN public.studio_projects.brand_palette IS
  'Optional array of hex strings, e.g. ["#1a1a1a","#f5f1eb","#b8956f"]. Up to 5 colors.';
COMMENT ON COLUMN public.studio_projects.brand_fabric_refs IS
  'Optional array of {url, label} for fabric / texture references uploaded by the user.';
COMMENT ON COLUMN public.studio_projects.archived_at IS
  'Soft delete timestamp. NULL = active. Set when user archives the project from the dashboard.';

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_studio_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_studio_projects_updated_at
  BEFORE UPDATE ON public.studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_studio_projects_updated_at();

-- Indexes
CREATE INDEX idx_studio_projects_user_id ON public.studio_projects(user_id);
CREATE INDEX idx_studio_projects_active ON public.studio_projects(user_id, created_at DESC)
  WHERE archived_at IS NULL;

-- Row Level Security · user owns their projects
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_projects_owner_select"
  ON public.studio_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "studio_projects_owner_insert"
  ON public.studio_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "studio_projects_owner_update"
  ON public.studio_projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "studio_projects_owner_delete"
  ON public.studio_projects FOR DELETE
  USING (auth.uid() = user_id);
