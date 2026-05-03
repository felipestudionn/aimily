-- Phase 3 — Tech Pack Version Control + Multi-stage Approvals
--
-- Centric Software's #1 G2 complaint: "no easy way to compare tech pack
-- revisions side-by-side". FlexPLM has version control but the diff UI
-- requires opening each revision in a new tab. Aimily ships:
--   1. Every PATCH /api/tech-pack save creates a new revision (snapshot
--      of the entire TechPackDataRow + drawings + comments + cost).
--   2. Side-by-side diff endpoint that returns which sections changed
--      and which fields within them — server-side, no client-side
--      JSON-walking on a 50KB tech pack.
--   3. 4-stage approval chain (draft → design_review → merch_review →
--      production_review → approved) with e-signature + audit trail.
--
-- Schema design notes:
--   - `is_current` is the cursor: at most one revision per SKU has it
--     true. PATCH writes new row → flips old row's is_current to false.
--   - `version` is semver-ish text ('v1.0', 'v1.1', 'v2.0'). Major
--     bumps on stage transitions to 'approved'; minor bumps on every
--     other save. The handler chooses; the column doesn't enforce it.
--   - `approval_chain` is a jsonb array of decisions: each entry
--     captures stage, reviewer_id, decided_at, decision ('approved' |
--     'rejected'), notes, and an optional signature_image_url.
--   - `approval_status` and `approval_chain` live on the revision (not
--     the SKU) so we have a frozen audit trail per snapshot. The SKU
--     table only points at the current revision via the is_current
--     index — no extra column needed.

CREATE TABLE IF NOT EXISTS public.tech_pack_revisions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id       uuid NOT NULL REFERENCES public.collection_plans(id) ON DELETE CASCADE,
  sku_id                   uuid NOT NULL REFERENCES public.collection_skus(id) ON DELETE CASCADE,
  parent_revision_id       uuid REFERENCES public.tech_pack_revisions(id) ON DELETE SET NULL,
  version                  text NOT NULL,
  is_current               boolean NOT NULL DEFAULT false,

  -- Full snapshot — denormalised on purpose. tech_pack_data may evolve
  -- (sections added/removed); these snapshots remain pristine.
  header_snapshot          jsonb DEFAULT '{}'::jsonb,
  drawings_snapshot        jsonb DEFAULT '{}'::jsonb,
  measurements_snapshot    jsonb DEFAULT '{}'::jsonb,
  bom_snapshot             jsonb DEFAULT '{}'::jsonb,
  materials_snapshot       jsonb DEFAULT '{}'::jsonb,
  grading_snapshot         jsonb DEFAULT '{}'::jsonb,
  factory_notes_snapshot   jsonb DEFAULT '{}'::jsonb,
  cost_breakdown_snapshot  jsonb DEFAULT '{}'::jsonb,
  comments_snapshot        jsonb DEFAULT '[]'::jsonb,

  -- Approval workflow (frozen on this snapshot).
  approval_status          text NOT NULL DEFAULT 'draft' CHECK (approval_status IN (
    'draft',
    'design_review',
    'merch_review',
    'production_review',
    'approved',
    'rejected',
    'archived'
  )),
  approval_chain           jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Authorship.
  created_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name          text,
  change_summary           text,        -- one-line what-changed (optional, written by the caller)
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- The hot path: "list revisions for this SKU, newest first".
CREATE INDEX IF NOT EXISTS tech_pack_revisions_sku_idx
  ON public.tech_pack_revisions (sku_id, created_at DESC);

-- The other hot path: "give me the current revision for this SKU" —
-- used when rendering the tech pack header and the approval pill. The
-- partial unique index enforces the at-most-one-current invariant in
-- the database, not the application layer (so a buggy concurrent PATCH
-- can't leave two rows with is_current=true).
CREATE UNIQUE INDEX IF NOT EXISTS tech_pack_revisions_one_current
  ON public.tech_pack_revisions (sku_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS tech_pack_revisions_collection_idx
  ON public.tech_pack_revisions (collection_plan_id);

CREATE INDEX IF NOT EXISTS tech_pack_revisions_status_idx
  ON public.tech_pack_revisions (approval_status)
  WHERE approval_status IN ('design_review', 'merch_review', 'production_review');

ALTER TABLE public.tech_pack_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tech_pack_revisions_owner_select ON public.tech_pack_revisions;
CREATE POLICY tech_pack_revisions_owner_select ON public.tech_pack_revisions
  FOR SELECT USING (
    collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS tech_pack_revisions_owner_all ON public.tech_pack_revisions;
CREATE POLICY tech_pack_revisions_owner_all ON public.tech_pack_revisions
  FOR ALL USING (
    collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.tech_pack_revisions IS
  'Phase 3 PLM parity: every tech pack save creates a frozen snapshot.
The at-most-one-current invariant is enforced via a partial unique
index on (sku_id) WHERE is_current=true. Approval workflow lives on
the revision so each snapshot carries its own audit trail.';
