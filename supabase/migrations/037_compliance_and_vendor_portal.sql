-- Phase 5 — Compliance Hub + Vendor Portal
--
-- Two table additions, one workflow:
--   1. certifications: certs uploaded by the user that cover specific
--      suppliers/materials. Surfaced in the compliance pill when a
--      flagged material is covered by an active cert. Cron warns the
--      user 90 days before expiry so PO commitments don't lapse.
--   2. vendor_invitations: opaque-token grants for factories to read
--      their assigned SKUs in /vendor/[token]. No password. 30-day TTL
--      by default; revocable from the user's vendor portal page.
--
-- vendor_invitations.permissions is a small jsonb so we can extend per
-- vendor without schema churn (today: read-only tech pack + sample
-- upload; future: comment, BOM annotate, etc).

CREATE TABLE IF NOT EXISTS public.certifications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_type    text NOT NULL,
  certificate_number    text,
  issuer                text,
  scope                 text,
  document_url          text,
  issued_date           date,
  expires_date          date,
  linked_supplier_name  text,
  linked_material_ids   text[] DEFAULT '{}',
  status                text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active','expiring_soon','expired','revoked')
  ),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certifications_user_idx ON public.certifications (user_id);
CREATE INDEX IF NOT EXISTS certifications_expires_idx ON public.certifications (expires_date) WHERE expires_date IS NOT NULL;

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS certifications_owner_select ON public.certifications;
CREATE POLICY certifications_owner_select ON public.certifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS certifications_owner_all ON public.certifications;
CREATE POLICY certifications_owner_all ON public.certifications FOR ALL USING (user_id = auth.uid());

-- Vendor portal invitations.
CREATE TABLE IF NOT EXISTS public.vendor_invitations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id  uuid NOT NULL REFERENCES public.collection_plans(id) ON DELETE CASCADE,
  invited_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_email        text NOT NULL,
  vendor_name         text,
  -- Opaque random token. The /vendor/[token] route hashes-compares; the
  -- plain token is shown to the user once and emailed to the vendor.
  token               text NOT NULL UNIQUE,
  -- Which SKUs this vendor can see. Empty = all SKUs in the collection.
  sku_ids             uuid[] DEFAULT '{}',
  permissions         jsonb NOT NULL DEFAULT '{"read_tech_pack": true, "upload_samples": true, "comment": true, "translate": true}'::jsonb,
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  last_used_at        timestamptz,
  use_count           integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_invitations_collection_idx ON public.vendor_invitations (collection_plan_id);
CREATE INDEX IF NOT EXISTS vendor_invitations_token_idx ON public.vendor_invitations (token);

ALTER TABLE public.vendor_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendor_invitations_owner_select ON public.vendor_invitations;
CREATE POLICY vendor_invitations_owner_select ON public.vendor_invitations FOR SELECT USING (
  collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS vendor_invitations_owner_all ON public.vendor_invitations;
CREATE POLICY vendor_invitations_owner_all ON public.vendor_invitations FOR ALL USING (
  collection_plan_id IN (SELECT id FROM public.collection_plans WHERE user_id = auth.uid())
);

COMMENT ON TABLE public.certifications IS
  'Phase 5: cert documents the user holds (OEKO-TEX, GOTS, BCI, RWS, RDS, GRS, RCS, FSC, LWG, B-Corp, EU Ecolabel). Surfaced in compliance reports + 90-day expiry warning email.';
COMMENT ON TABLE public.vendor_invitations IS
  'Phase 5: opaque-token grants for factories to read assigned SKUs at /vendor/[token]. Revocable; default 30-day TTL.';
