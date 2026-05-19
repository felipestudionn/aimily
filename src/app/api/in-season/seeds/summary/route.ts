/**
 * GET /api/in-season/seeds/summary
 *
 * Aggregate live seeds across ALL aimily_360 tenants the user is a member of.
 * Used by /new-collection to show a "you have N seeds" banner without
 * forcing the user to know which tenant they belong to.
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §2-§3.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getServerSession();
  if (!user) return NextResponse.json({ tenants: [], total_live: 0 }, { status: 200 });

  const tenants = await listUserTenants(user.id);
  if (tenants.length === 0) return NextResponse.json({ tenants: [], total_live: 0 });

  const tenantIds = tenants.map((t) => t.id);

  const { data: tenantsMeta } = await supabaseAdmin
    .from('strategy_tenants')
    .select('id, slug, display_name, surface_mode')
    .in('id', tenantIds);

  const aimily360Ids = (tenantsMeta ?? [])
    .filter((t) => (t as { surface_mode?: string }).surface_mode === 'aimily_360')
    .map((t) => (t as { id: string }).id);

  if (aimily360Ids.length === 0) return NextResponse.json({ tenants: [], total_live: 0 });

  const { data: seedCounts } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .select('tenant_id, seed_type')
    .in('tenant_id', aimily360Ids)
    .eq('status', 'live');

  // Aggregate by tenant
  const byTenant = new Map<string, { count: number; by_type: Record<string, number> }>();
  for (const row of (seedCounts ?? []) as Array<{ tenant_id: string; seed_type: string }>) {
    const b = byTenant.get(row.tenant_id) ?? { count: 0, by_type: {} };
    b.count += 1;
    b.by_type[row.seed_type] = (b.by_type[row.seed_type] || 0) + 1;
    byTenant.set(row.tenant_id, b);
  }

  const tenantSummaries = (tenantsMeta ?? [])
    .filter((t) => byTenant.has((t as { id: string }).id))
    .map((t) => {
      const meta = t as { id: string; slug: string; display_name: string };
      const b = byTenant.get(meta.id)!;
      return {
        tenant_id: meta.id,
        tenant_slug: meta.slug,
        display_name: meta.display_name,
        live_count: b.count,
        by_type: b.by_type,
      };
    });

  const totalLive = tenantSummaries.reduce((s, t) => s + t.live_count, 0);

  return NextResponse.json({ tenants: tenantSummaries, total_live: totalLive });
}
