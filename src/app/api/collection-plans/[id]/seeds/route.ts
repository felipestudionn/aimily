/**
 * GET /api/collection-plans/[id]/seeds
 *
 * Lists In-Season SKU seeds that were consumed by this collection. Used by
 * the Builder to (a) surface a "Trajiste N semillas" chip on the overview
 * and (b) feed the moodboard/brief blocks with the seed's proposed_changes
 * (palette, concept brief) in subsequent sprints.
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §2.
 *
 * Auth: the user must own the collection plan (collection_plans.user_id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server-session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { user } = await getServerSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: collectionId } = await ctx.params;

  // Ownership check
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('id, user_id')
    .eq('id', collectionId)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  if ((plan as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: seeds } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .select(
      'id, seed_type, source_action_type, proposed_changes, evidence, rationale, ' +
        'source_model_ref, source_color_ref, source_product_name, source_family_code, source_season_tag, ' +
        'tenant_id, source_run_id, consumed_at, created_at'
    )
    .eq('consumed_in_collection_id', collectionId)
    .order('consumed_at', { ascending: false });

  // Aggregate counts by type for at-a-glance chip
  const byType: Record<string, number> = {};
  for (const s of (seeds ?? []) as unknown as Array<{ seed_type: string }>) {
    byType[s.seed_type] = (byType[s.seed_type] || 0) + 1;
  }

  // Aggregate proposed colors across all extend_colors / amplify_next_season
  // seeds — the moodboard / brief block ingestion (Sprint E real) will read
  // from here to pre-populate the color palette.
  const aggregatedColors: Array<{ name: string; hex: string; from_seed_id: string }> = [];
  for (const s of (seeds ?? []) as unknown as Array<{
    id: string;
    proposed_changes: Record<string, unknown>;
  }>) {
    const colors = (s.proposed_changes?.new_colors ?? s.proposed_changes?.proposed_colors) as
      | Array<{ name?: string; hex?: string }>
      | undefined;
    if (Array.isArray(colors)) {
      for (const c of colors) {
        if (c.name && c.hex) {
          aggregatedColors.push({ name: c.name, hex: c.hex, from_seed_id: s.id });
        }
      }
    }
  }

  return NextResponse.json({
    collection_id: collectionId,
    seeds: seeds ?? [],
    summary: {
      total: (seeds ?? []).length,
      by_type: byType,
      proposed_palette: aggregatedColors,
    },
  });
}
