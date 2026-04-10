-- ============================================================================
-- 015_team_members_marketing_permissions.sql
--
-- Extend the team_members.permissions default with marketing-scope keys.
--
-- Context: team_members was created in a prior session with a default
-- permissions JSONB that only covered design/production (view_all, export_po,
-- edit_design, edit_financial, edit_production, approve_production). Fase 4.3
-- introduces granular marketing permissions enforced server-side by
-- `checkTeamPermission()` and surfaced client-side by `useCollectionPermissions()`.
--
-- This migration:
--   1. Replaces the column default with the full permission set (owner-level)
--      so new team_members rows get all keys.
--   2. Backfills existing rows to merge the new keys into their current
--      permissions JSONB without overwriting explicit false values.
--
-- Safe to run multiple times: jsonb_set + COALESCE + || (concat) are all
-- idempotent for this use case.
-- ============================================================================

-- 1. New default: owner-level (full access). Non-owner roles get their
--    restricted map set explicitly by the app when a row is inserted.
ALTER TABLE public.team_members
  ALTER COLUMN permissions SET DEFAULT jsonb_build_object(
    'view_all', true,
    'edit_design', true,
    'edit_production', true,
    'approve_production', true,
    'edit_financial', true,
    'export_po', true,
    'edit_marketing', true,
    'generate_ai_marketing', true,
    'manage_pr_contacts', true,
    'edit_paid_campaigns', true,
    'publish_content', true,
    'manage_team', true,
    'manage_billing', true
  );

-- 2. Backfill: only add keys that don't exist yet on each row.
--    `COALESCE(permissions, '{}'::jsonb) || new_keys_only` preserves existing
--    values (including explicit `false`) and only fills missing ones.
UPDATE public.team_members
SET permissions = (
  jsonb_build_object(
    'edit_marketing', COALESCE(permissions->'edit_marketing', 'true'::jsonb),
    'generate_ai_marketing', COALESCE(permissions->'generate_ai_marketing', 'true'::jsonb),
    'manage_pr_contacts', COALESCE(permissions->'manage_pr_contacts', 'true'::jsonb),
    'edit_paid_campaigns', COALESCE(permissions->'edit_paid_campaigns', 'true'::jsonb),
    'publish_content', COALESCE(permissions->'publish_content', 'true'::jsonb),
    'manage_team', COALESCE(permissions->'manage_team', 'true'::jsonb),
    'manage_billing', COALESCE(permissions->'manage_billing', 'true'::jsonb)
  ) || COALESCE(permissions, '{}'::jsonb)
);
--
-- Note on the concat order: `new || existing` means `existing` wins on conflict,
-- so any explicit false from the previous schema stays false. `new` only fills
-- in keys that were not present at all.
