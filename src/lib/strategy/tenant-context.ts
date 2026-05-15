/**
 * Strategy tenant context — resolves which enterprise tenant the current user
 * is operating against and the highest role they hold within it.
 *
 * Per business-plan_aimily-strategy-2026-05-15.md §4.8, tenant isolation is
 * strict: a user can belong to multiple tenants, but every request operates
 * against exactly ONE tenant at a time. The tenant_id is resolved from:
 *
 *   1. The URL path segment (`/strategy/[tenantSlug]/...`)
 *   2. A `?tenant` query string
 *   3. A `aimily_strategy_tenant` cookie last touched in this session
 *   4. The user's only-tenant if they have exactly one (auto-pick)
 *
 * All Strategy queries MUST go through `loadStrategyTenant()` or the helpers
 * in `auth-guard.ts` — never query strategy_* tables without a tenant_id.
 */

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const STRATEGY_TENANT_COOKIE = 'aimily_strategy_tenant';

export type StrategyTenantRole = 'owner' | 'admin' | 'analyst' | 'viewer';
export type StrategyTenantTier =
  | 'tier2_mid'
  | 'tier2_premium'
  | 'tier1_fashion'
  | 'tier1_mega';

export interface StrategyTenantSummary {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  country_code: string;
  tier: StrategyTenantTier;
  isolation_mode: string;
  reverse_logistics_cost_per_unit: number;
  default_currency: string;
}

export interface StrategyTenantWithRole extends StrategyTenantSummary {
  role: StrategyTenantRole;
  joined_at: string | null;
}

const ROLE_RANK: Record<StrategyTenantRole, number> = {
  viewer: 1,
  analyst: 2,
  admin: 3,
  owner: 4,
};

export function roleSatisfies(role: StrategyTenantRole, minimum: StrategyTenantRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * List every tenant the user is an active member of, with their role.
 *
 * Used by:
 *   - Dashboard listing tenants the user can pick
 *   - Tenant switcher in the Strategy nav
 *   - Empty-state UX when a user has zero tenants
 */
export async function listUserTenants(userId: string): Promise<StrategyTenantWithRole[]> {
  const { data, error } = await supabaseAdmin
    .from('strategy_tenant_members')
    .select(
      'role, joined_at, strategy_tenants!inner(id, slug, display_name, legal_name, country_code, tier, isolation_mode, reverse_logistics_cost_per_unit, default_currency, archived_at)'
    )
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error || !data) return [];

  return data
    .map((row: any) => {
      const t = row.strategy_tenants;
      if (!t || t.archived_at) return null;
      return {
        id: t.id,
        slug: t.slug,
        display_name: t.display_name,
        legal_name: t.legal_name,
        country_code: t.country_code,
        tier: t.tier as StrategyTenantTier,
        isolation_mode: t.isolation_mode,
        reverse_logistics_cost_per_unit: Number(t.reverse_logistics_cost_per_unit) || 0,
        default_currency: t.default_currency,
        role: row.role as StrategyTenantRole,
        joined_at: row.joined_at,
      };
    })
    .filter(Boolean) as StrategyTenantWithRole[];
}

/**
 * Resolve the active tenant for a request. `slugHint` wins if the user is a
 * member, otherwise we fall back to cookie / single-tenant auto-pick / null.
 */
export async function resolveActiveTenant(
  userId: string,
  slugHint?: string | null
): Promise<StrategyTenantWithRole | null> {
  const tenants = await listUserTenants(userId);
  if (tenants.length === 0) return null;

  if (slugHint) {
    const match = tenants.find((t) => t.slug === slugHint);
    if (match) return match;
  }

  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get(STRATEGY_TENANT_COOKIE)?.value;
  if (cookieSlug) {
    const match = tenants.find((t) => t.slug === cookieSlug);
    if (match) return match;
  }

  if (tenants.length === 1) return tenants[0];

  return tenants[0]; // most-recently-joined heuristic: caller can re-pick
}

/**
 * Strict tenant membership check — returns the role or null.
 * Backs every API route that operates on tenant-scoped tables.
 */
export async function getUserTenantRole(
  userId: string,
  tenantId: string
): Promise<StrategyTenantRole | null> {
  const { data, error } = await supabaseAdmin
    .from('strategy_tenant_members')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as StrategyTenantRole;
}

/**
 * Fetch a tenant by slug (no membership check — caller MUST gate this).
 */
export async function getTenantBySlug(slug: string): Promise<StrategyTenantSummary | null> {
  const { data, error } = await supabaseAdmin
    .from('strategy_tenants')
    .select('id, slug, display_name, legal_name, country_code, tier, isolation_mode, reverse_logistics_cost_per_unit, default_currency')
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    reverse_logistics_cost_per_unit: Number(data.reverse_logistics_cost_per_unit) || 0,
  } as StrategyTenantSummary;
}
