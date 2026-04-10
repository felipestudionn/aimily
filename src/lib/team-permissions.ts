// ── Team permissions helper ──
//
// Collection-scoped authorization on top of `getAuthenticatedUser()`.
//
// PHILOSOPHY (single-user by default):
//   The overwhelmingly common case is a single owner per collection. That
//   owner should never see a permission gate — the app behaves as if
//   permissions didn't exist. Team members are the exception.
//
//   The helper reflects that:
//     1. First check: collection owner? → allow everything, return instantly.
//        This is the fast path for 99% of requests and has zero overhead.
//     2. Otherwise check `team_members.permissions` for a granular flag.
//     3. No team row at all → deny.
//
//   As a result, adding `checkTeamPermission(..., { permission: 'X' })` to
//   any route is transparent for the owner and only ever matters once
//   someone is invited as a team member with restricted access. Today, no
//   team members exist, so this is pure infrastructure for a future feature.
//
// Client-side note:
//   There is intentionally NO client hook / API route that exposes the
//   permissions map to the browser. The UI does not branch on permissions
//   for the owner. When team seats ship, the intended UX is binary: if a
//   team member doesn't have access to a block, the block simply doesn't
//   appear in their sidebar. No disabled buttons, no read-only badges.
//
// Usage in an API route:
//
//   const { user, error } = await getAuthenticatedUser();
//   if (error) return error;
//
//   const check = await checkTeamPermission({
//     userId: user.id,
//     collectionPlanId,
//     permission: 'generate_ai_marketing',
//   });
//   if (!check.allowed) return check.error;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type TeamRole = 'owner' | 'admin' | 'designer' | 'viewer';

/**
 * All granular permissions tracked on a collection.
 *
 * Naming:
 *   view_*    — read access to a section
 *   edit_*    — create/update/delete entities in a section
 *   generate_* — trigger a billed AI call
 *   manage_*  — administrative ops (invite, roles, billing, danger zone)
 *   export_*  — produce artifacts that leave the platform
 *   approve_* — gate status transitions
 */
export type TeamPermission =
  // Read
  | 'view_all'
  // Design / production
  | 'edit_design'
  | 'edit_production'
  | 'approve_production'
  | 'edit_financial'
  | 'export_po'
  // Marketing — core
  | 'edit_marketing'
  | 'generate_ai_marketing'
  // Marketing — sensitive subsets
  | 'manage_pr_contacts'
  | 'edit_paid_campaigns'
  | 'publish_content'
  // Team / billing
  | 'manage_team'
  | 'manage_billing';

export type TeamPermissions = Partial<Record<TeamPermission, boolean>>;

/**
 * Default permissions granted to each role.
 *
 * Used when creating a team_members row. Existing rows keep whatever was
 * stored; use `mergeDefaultsForRole()` if you want to fill in missing keys
 * without overwriting explicit overrides.
 */
export const ROLE_DEFAULTS: Record<TeamRole, TeamPermissions> = {
  owner: {
    view_all: true,
    edit_design: true,
    edit_production: true,
    approve_production: true,
    edit_financial: true,
    export_po: true,
    edit_marketing: true,
    generate_ai_marketing: true,
    manage_pr_contacts: true,
    edit_paid_campaigns: true,
    publish_content: true,
    manage_team: true,
    manage_billing: true,
  },
  admin: {
    view_all: true,
    edit_design: true,
    edit_production: true,
    approve_production: true,
    edit_financial: true,
    export_po: true,
    edit_marketing: true,
    generate_ai_marketing: true,
    manage_pr_contacts: true,
    edit_paid_campaigns: true,
    publish_content: true,
    manage_team: true,
    manage_billing: false,
  },
  designer: {
    view_all: true,
    edit_design: true,
    edit_production: false,
    approve_production: false,
    edit_financial: false,
    export_po: false,
    edit_marketing: true,
    generate_ai_marketing: true,
    manage_pr_contacts: false,
    edit_paid_campaigns: false,
    publish_content: false,
    manage_team: false,
    manage_billing: false,
  },
  viewer: {
    view_all: true,
    edit_design: false,
    edit_production: false,
    approve_production: false,
    edit_financial: false,
    export_po: false,
    edit_marketing: false,
    generate_ai_marketing: false,
    manage_pr_contacts: false,
    edit_paid_campaigns: false,
    publish_content: false,
    manage_team: false,
    manage_billing: false,
  },
};

export function mergeDefaultsForRole(
  role: TeamRole,
  overrides: TeamPermissions = {},
): TeamPermissions {
  return { ...ROLE_DEFAULTS[role], ...overrides };
}

interface CheckResult {
  allowed: boolean;
  role?: TeamRole;
  isOwner?: boolean;
  permissions?: TeamPermissions;
  error?: NextResponse;
}

/**
 * Verify the authenticated user has `permission` on `collectionPlanId`.
 *
 * Resolution order:
 *   1. If user is the collection owner (collection_plans.user_id), allow.
 *   2. If a team_members row exists for (plan, user), use its permissions map.
 *   3. Otherwise, deny.
 *
 * Returns a ready-to-return 403 response in `error` on denial, so callers
 * can do: `if (!check.allowed) return check.error;`
 */
export async function checkTeamPermission(params: {
  userId: string;
  collectionPlanId: string;
  permission: TeamPermission;
}): Promise<CheckResult> {
  const { userId, collectionPlanId, permission } = params;

  // 1. Collection ownership check
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id')
    .eq('id', collectionPlanId)
    .single();

  if (planErr || !plan) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Collection not found' }, { status: 404 }),
    };
  }

  if (plan.user_id === userId) {
    return {
      allowed: true,
      role: 'owner',
      isOwner: true,
      permissions: ROLE_DEFAULTS.owner,
    };
  }

  // 2. Team member check
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('role, permissions')
    .eq('collection_plan_id', collectionPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  const role = (member.role as TeamRole) ?? 'viewer';
  const permissions = (member.permissions as TeamPermissions) ?? {};
  const allowed = permissions[permission] === true;

  if (!allowed) {
    return {
      allowed: false,
      role,
      permissions,
      error: NextResponse.json(
        {
          error: 'Insufficient permissions',
          required: permission,
          role,
        },
        { status: 403 },
      ),
    };
  }

  return { allowed: true, role, isOwner: false, permissions };
}

/**
 * Fetch the permissions map for a user on a collection, without enforcing a
 * specific check. Useful for the UI hook that needs the full picture to
 * render conditional controls.
 *
 * Returns `null` if the user has no access at all (not owner, no team row).
 */
export async function getCollectionPermissions(
  userId: string,
  collectionPlanId: string,
): Promise<{ role: TeamRole; isOwner: boolean; permissions: TeamPermissions } | null> {
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id')
    .eq('id', collectionPlanId)
    .single();

  if (!plan) return null;

  if (plan.user_id === userId) {
    return { role: 'owner', isOwner: true, permissions: ROLE_DEFAULTS.owner };
  }

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('role, permissions')
    .eq('collection_plan_id', collectionPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member) return null;

  return {
    role: (member.role as TeamRole) ?? 'viewer',
    isOwner: false,
    permissions: (member.permissions as TeamPermissions) ?? {},
  };
}
