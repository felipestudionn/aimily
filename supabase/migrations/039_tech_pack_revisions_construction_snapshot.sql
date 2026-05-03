-- Phase 7 — close the gap: revisions table missed a column for the
-- new construction_details section. Without this, every revision after
-- migration 038 would have lost the new structured field on diff and
-- on the vendor portal.

ALTER TABLE public.tech_pack_revisions
  ADD COLUMN IF NOT EXISTS construction_details_snapshot jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tech_pack_revisions.construction_details_snapshot IS
  'Phase 6 construction details snapshot — added in 039 to fix a gap in 035 where the field did not exist yet.';
