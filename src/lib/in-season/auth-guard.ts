/**
 * Strategy API route auth guard.
 *
 * Every `/api/in-season/*` route MUST call `requireStrategyAccess()` before
 * touching any strategy_* table. The guard:
 *
 *   1. Resolves the authenticated user via `@supabase/ssr` (the same pattern
 *      as src/lib/api-auth.ts so cookies and JWT verification stay
 *      consistent across the app).
 *   2. Resolves the tenant by ID (`tenantId` request param) or by slug
 *      (`tenantSlug`).
 *   3. Verifies the user is an active member of that tenant with at least
 *      the `minRole` required.
 *
 * Returns an `{ unauthorized | forbidden }` NextResponse on failure so
 * routes can `if (!result.ok) return result.response`.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getTenantBySlug,
  getUserTenantRole,
  roleSatisfies,
  type StrategyTenantRole,
  type StrategyTenantSummary,
} from './tenant-context';

export type StrategyAccessResult =
  | {
      ok: true;
      userId: string;
      tenant: StrategyTenantSummary;
      role: StrategyTenantRole;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export interface RequireStrategyAccessOptions {
  tenantId?: string;
  tenantSlug?: string;
  minRole?: StrategyTenantRole;
}

export async function requireStrategyAccess(
  opts: RequireStrategyAccessOptions
): Promise<StrategyAccessResult> {
  const minRole: StrategyTenantRole = opts.minRole ?? 'viewer';

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  let tenant: StrategyTenantSummary | null = null;
  if (opts.tenantId) {
    const { data } = await supabaseAdmin
      .from('strategy_tenants')
      .select(
        'id, slug, display_name, legal_name, country_code, tier, isolation_mode, reverse_logistics_cost_per_unit, default_currency'
      )
      .eq('id', opts.tenantId)
      .is('archived_at', null)
      .maybeSingle();
    if (data) {
      tenant = {
        ...(data as any),
        reverse_logistics_cost_per_unit:
          Number((data as any).reverse_logistics_cost_per_unit) || 0,
      };
    }
  } else if (opts.tenantSlug) {
    tenant = await getTenantBySlug(opts.tenantSlug);
  }

  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }),
    };
  }

  const role = await getUserTenantRole(user.id, tenant.id);
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not a member of tenant' }, { status: 403 }),
    };
  }

  if (!roleSatisfies(role, minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Requires ${minRole} role` },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id, tenant, role };
}
