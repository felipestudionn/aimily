/**
 * POST /api/collection-plans/[id]/seeds/apply-to-moodboard
 *
 * Felipe 2026-05-19 Sprint E · deep ingestion of In-Season SKU seeds into
 * the Creative & Brand block's moodboard.
 *
 * Reads every seed consumed by this collection (via
 * GET /api/collection-plans/[id]/seeds), aggregates the proposed palette
 * plus a short narrative rationale, and writes them into the Collection
 * Intelligence System under the canonical creative keys:
 *
 *   creative.color.primary_palette   — list of "Name #hex" strings (the
 *                                       same shape storefront + downstream
 *                                       AI already consume).
 *   creative.moodboard.seed_summary  — narrative paragraph that explains
 *                                       which In-Season decisions seeded
 *                                       this collection (winners we are
 *                                       amplifying, colors extended, etc.).
 *
 * Confidence is 'suggested' so the user can still edit the palette in the
 * moodboard step. Source is 'inherited' (CIS taxonomy for cross-collection
 * provenance).
 *
 * Architecture: memory/architecture_in-season-feedback-loop.md §5.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { recordDecision } from '@/lib/collection-intelligence';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface SeedRow {
  id: string;
  seed_type: string;
  source_action_type: string | null;
  proposed_changes: Record<string, unknown> | null;
  rationale: string | null;
  source_product_name: string | null;
  source_color_ref: string | null;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { user } = await getServerSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: collectionId } = await ctx.params;

  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('id, user_id')
    .eq('id', collectionId)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  if ((plan as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rawSeeds } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .select(
      'id, seed_type, source_action_type, proposed_changes, rationale, source_product_name, source_color_ref'
    )
    .eq('consumed_in_collection_id', collectionId)
    .order('consumed_at', { ascending: false });

  const seeds = (rawSeeds ?? []) as unknown as SeedRow[];
  if (seeds.length === 0) {
    return NextResponse.json({ ok: true, applied: 0, reason: 'no seeds consumed by this collection' });
  }

  // Aggregate palette across all extend_colors / amplify_next_season seeds.
  // Dedup by hex so the same color extended in multiple seeds collapses.
  const paletteByHex = new Map<string, { name: string; hex: string }>();
  for (const s of seeds) {
    const colors = (s.proposed_changes?.new_colors ?? s.proposed_changes?.proposed_colors) as
      | Array<{ name?: string; hex?: string }>
      | undefined;
    if (!Array.isArray(colors)) continue;
    for (const c of colors) {
      if (!c.hex || !c.name) continue;
      const hex = c.hex.toLowerCase();
      if (!paletteByHex.has(hex)) paletteByHex.set(hex, { name: c.name, hex });
    }
  }
  const palette = Array.from(paletteByHex.values());

  // Build narrative summary: 1-3 sentences explaining the seeds' shape.
  const byType: Record<string, number> = {};
  for (const s of seeds) byType[s.seed_type] = (byType[s.seed_type] || 0) + 1;
  const winners = seeds
    .filter((s) => s.seed_type === 'amplify_next_season' || s.seed_type === 'extend_colors')
    .slice(0, 5)
    .map((s) =>
      s.source_color_ref
        ? `${s.source_product_name ?? 'producto'} (${s.source_color_ref})`
        : s.source_product_name ?? 'producto'
    );
  const summarySentences: string[] = [];
  summarySentences.push(
    `${seeds.length} semilla${seeds.length === 1 ? '' : 's'} de In-Season alimentan esta colección.`
  );
  if (winners.length > 0) {
    summarySentences.push(
      `Anclas heredadas: ${winners.join(' · ')}.`
    );
  }
  if (palette.length > 0) {
    summarySentences.push(
      `Paleta propuesta a partir de los winners: ${palette.length} color${palette.length === 1 ? '' : 'es'} listo${palette.length === 1 ? '' : 's'} para que el moodboard parta de aquí.`
    );
  }
  const seedSummary = summarySentences.join(' ');

  // Write CIS decisions. Confidence is 'suggested' so the user can edit in
  // the moodboard step; source is 'inherited' for cross-collection provenance.
  if (palette.length > 0) {
    const paletteList = palette.map((c) => `${c.name} ${c.hex}`);
    await recordDecision({
      collectionPlanId: collectionId,
      domain: 'creative',
      subdomain: 'color',
      key: 'primary_palette',
      value: paletteList,
      valueType: 'list',
      rationale: `Heredado de ${seeds.length} semilla(s) In-Season consumidas por esta colección.`,
      confidence: 'suggested',
      source: 'inherited',
      sourcePhase: 'in_season_seed_ingestion',
      sourceComponent: 'apply-to-moodboard',
      tags: ['in-season', 'seed-derived'],
      userId: user.id,
    });
  }

  await recordDecision({
    collectionPlanId: collectionId,
    domain: 'creative',
    subdomain: 'moodboard',
    key: 'seed_summary',
    value: seedSummary,
    valueType: 'text',
    rationale: `Resumen automatic de las semillas In-Season aplicadas (${Object.entries(byType).map(([t, n]) => `${t}=${n}`).join(', ')}).`,
    confidence: 'suggested',
    source: 'inherited',
    sourcePhase: 'in_season_seed_ingestion',
    sourceComponent: 'apply-to-moodboard',
    tags: ['in-season', 'seed-derived'],
    userId: user.id,
  });

  // Stamp every seed as applied so the banner CTA can show 'applied' next time.
  await supabaseAdmin
    .from('in_season_sku_seeds')
    .update({ applied_to_moodboard_at: new Date().toISOString() })
    .in('id', seeds.map((s) => s.id));

  return NextResponse.json({
    ok: true,
    applied: seeds.length,
    palette_count: palette.length,
    summary: seedSummary,
  });
}
