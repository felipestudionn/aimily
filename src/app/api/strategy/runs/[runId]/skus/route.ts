/**
 * GET /api/strategy/runs/[runId]/skus
 *
 * Returns ALL SKUs in a run with their resolved verdict (1-N actions per
 * SKU) modulated by the buyer's archetype + budget + creative brief.
 *
 * This is the data backbone for the PDF-overlay UI Felipe designed: the
 * front-end fetches this list once, then renders one overlay per SKU on
 * top of the original RNK PDF.
 *
 * Response shape:
 *   {
 *     run_id, source_id, pdf_storage_path, pdf_signed_url,
 *     target_rotation_days_default, archetype_id, target_buy_budget_eur,
 *     skus: SkuRow[],
 *     summary: { total_skus, action_counts: Record<action, n>, ... }
 *   }
 *
 * Auth: requires tenant membership (analyst+).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  resolveSkuVerdict,
  appendExtendColorsAction,
  appendAmplifyWinnerAction,
  DEFAULT_TARGET_ROTATION_DAYS,
  type SkuVerdictInput,
  type SkuVerdictAction,
  type LineageColorWinner,
} from '@/lib/strategy/sku-verdict-resolver';
import {
  modulateSkuVerdicts,
  type ArchetypeContext,
  type BudgetContext,
  type BriefContext,
  type PerSkuFinancials,
} from '@/lib/strategy/sku-verdict-modulator';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PDF_BUCKET = 'strategy-uploads';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { runId } = await ctx.params;

  // Load run + tenant; auth via tenant membership.
  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id, source_set_ids, constraint_id, creative_brief_id')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({ tenantId: run.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // Parallel-load run-scoped data. We deliberately do NOT pull all
  // product_facts for the tenant — that returns rows from other runs.
  // Instead we get the product_fact_ids that THIS run actually scored
  // (via strategy_sku_scores) and look up their facts in step 2.
  const [
    skuScoresRes,
    candidatesRes,
    constraintRes,
    briefRes,
    sourcesRes,
    colorTaxRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('strategy_sku_scores')
      .select('product_fact_id')
      .eq('run_id', runId),
    supabaseAdmin
      .from('strategy_recommendation_candidates')
      .select(
        'scope, scope_ref, action_type, evidence, counter_evidence, assumptions, confidence_data_completeness, confidence_identity, confidence_demand, confidence_margin, confidence_creative_fit, confidence_action, data_sufficiency_warning, proposed_magnitude, narrative'
      )
      .eq('run_id', runId)
      .in('scope', ['sku', 'color']),
    run.constraint_id
      ? supabaseAdmin
          .from('strategy_constraints')
          .select('chosen_archetype_id, action_mix, target_buy_budget')
          .eq('id', run.constraint_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    run.creative_brief_id
      ? supabaseAdmin
          .from('strategy_creative_briefs')
          .select('family_pivot, color_story, archetypes_focus')
          .eq('id', run.creative_brief_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    run.source_set_ids && (run.source_set_ids as string[]).length > 0
      ? supabaseAdmin
          .from('strategy_sources')
          .select('id, storage_path, source_format')
          .in('id', run.source_set_ids as string[])
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin
      .from('strategy_taxonomies')
      .select('mapping')
      .eq('tenant_id', run.tenant_id)
      .eq('taxonomy_kind', 'color')
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const colorCodeMap = (
    ((colorTaxRes as any)?.data?.mapping?.code_to_name) || {}
  ) as Record<string, string>;

  // Resolve product_fact_ids: union of the run's sku_scores +
  // the candidate scope_refs. Some runs only persist one or the other.
  const skuScoreRows = (skuScoresRes.data || []) as Array<{ product_fact_id: string }>;
  const allCandidates = (candidatesRes.data || []) as any[];
  const skuCandidates = allCandidates.filter((c) => c.scope === 'sku');
  const colorCandidates = allCandidates.filter((c) => c.scope === 'color');
  const pidsFromScores = skuScoreRows.map((s) => s.product_fact_id).filter(Boolean);
  const pidsFromCandidates = skuCandidates.map((c) => c.scope_ref as string);
  const targetPids = Array.from(new Set([...pidsFromScores, ...pidsFromCandidates]));

  console.log('[runs/skus] diagnostics', {
    runId,
    tenantId: run.tenant_id,
    skuScoreRows: skuScoreRows.length,
    candidatesTotal: allCandidates.length,
    candidatesSku: skuCandidates.length,
    candidatesColor: colorCandidates.length,
    targetPids: targetPids.length,
    sourcesCount: ((sourcesRes as any).data || []).length,
  });

  // strategy_product_facts only carries identity (model_ref, color, family,
  // pvp, markup). Velocity / stock / stores live in strategy_sales_windows
  // (window_type d1 / 7d / 8_14d) and strategy_inventory_facts.
  // strategy_sku_scores carries demand_score / sell_through / returns from
  // the scoring pass — we need those so amplify_winner can recognise the
  // top SKUs even when no candidate was generated for them.
  const [productFactsRes, salesWindowsRes, inventoryRes, scoresRes] =
    targetPids.length > 0
      ? await Promise.all([
          supabaseAdmin
            .from('strategy_product_facts')
            .select(
              'id, model_ref, color_ref, product_name, family_code, pvp, markup_pct, margin_pct_list, cost_estimate, created_at'
            )
            .in('id', targetPids)
            // Order by insertion → matches the PDF row order so the panel
            // ranking maps 1:1 with the Zara RNK position of each SKU.
            .order('created_at', { ascending: true }),
          supabaseAdmin
            .from('strategy_sales_windows')
            .select('product_fact_id, window_type, units')
            .in('product_fact_id', targetPids)
            .in('window_type', ['d1', '7d']),
          supabaseAdmin
            .from('strategy_inventory_facts')
            .select('product_fact_id, stores_active, stores_with_stock, stock_store, stock_warehouse, pipeline_total'),
          supabaseAdmin
            .from('strategy_sku_scores')
            .select('product_fact_id, demand_score, sell_through_bought_pct, returns_pct')
            .eq('run_id', runId)
            .in('product_fact_id', targetPids),
        ])
      : [
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
        ];

  const products = (productFactsRes.data || []) as any[];
  const candidates = allCandidates;

  // Index velocity (units per window) and inventory rows by product_fact_id
  // so we can merge them into the per-SKU output.
  const velocityByPid = new Map<string, { d1: number | null; '7d': number | null }>();
  for (const row of (salesWindowsRes.data || []) as any[]) {
    const bucket = velocityByPid.get(row.product_fact_id) ?? { d1: null, '7d': null };
    if (row.window_type === 'd1') bucket.d1 = Number(row.units) || 0;
    if (row.window_type === '7d') bucket['7d'] = Number(row.units) || 0;
    velocityByPid.set(row.product_fact_id, bucket);
  }
  const inventoryByPid = new Map<string, any>();
  for (const row of (inventoryRes.data || []) as any[]) {
    if (targetPids.includes(row.product_fact_id)) {
      inventoryByPid.set(row.product_fact_id, row);
    }
  }

  // Index scoring signals per SKU.
  const scoresByPid = new Map<
    string,
    {
      demand_score: number | null;
      sell_through_bought_pct: number | null;
      returns_pct: number | null;
    }
  >();
  for (const row of ((scoresRes as any).data || []) as any[]) {
    scoresByPid.set(row.product_fact_id, {
      demand_score: row.demand_score ?? null,
      sell_through_bought_pct: row.sell_through_bought_pct ?? null,
      returns_pct: row.returns_pct ?? null,
    });
  }

  // Velocity rank across the run (1 = top seller by 7d units).
  const velocityRankByPid = new Map<string, number>();
  const pidsByVelocity = Array.from(velocityByPid.entries())
    .filter(([, v]) => v['7d'] != null && (v['7d'] as number) > 0)
    .sort(
      (a: [string, { d1: number | null; '7d': number | null }], b: [string, { d1: number | null; '7d': number | null }]) =>
        ((b[1]['7d'] as number) ?? 0) - ((a[1]['7d'] as number) ?? 0)
    );
  pidsByVelocity.forEach(([pid], idx) => velocityRankByPid.set(pid, idx + 1));

  // Average velocity by family — anchor for "this SKU sells 2× its family".
  const familyVelocityAvg = new Map<string, number>();
  {
    const buckets = new Map<string, number[]>();
    for (const p of products) {
      const fam = p.family_code;
      if (!fam) continue;
      const vel = (velocityByPid.get(p.id)?.['7d'] as number | null) ?? null;
      if (vel == null) continue;
      const arr = buckets.get(fam) ?? [];
      arr.push(vel);
      buckets.set(fam, arr);
    }
    buckets.forEach((arr, fam) => {
      if (arr.length === 0) return;
      familyVelocityAvg.set(fam, arr.reduce((a, b) => a + b, 0) / arr.length);
    });
  }

  console.log('[runs/skus] joined', {
    runId,
    productsFound: products.length,
    targetPidsRequested: targetPids.length,
    salesWindowRows: (salesWindowsRes.data || []).length,
    inventoryRowsMatched: inventoryByPid.size,
    productsError: (productFactsRes as any).error?.message,
    salesError: (salesWindowsRes as any).error?.message,
    inventoryError: (inventoryRes as any).error?.message,
  });
  const constraint = (constraintRes as any).data;
  const brief = (briefRes as any).data;
  const sources = ((sourcesRes as any).data || []) as Array<{
    id: string;
    storage_path: string;
    source_format: string;
  }>;

  // Group sku-scope candidates by product_fact_id for the resolver.
  const candidatesByPid = new Map<string, any[]>();
  for (const c of skuCandidates) {
    const arr = candidatesByPid.get(c.scope_ref) ?? [];
    arr.push(c);
    candidatesByPid.set(c.scope_ref, arr);
  }

  // Aggregate color winners per lineage. color candidates carry
  // scope_ref = `<lineage_id>#<color_code>` and evidence.rank/demand_score
  // describing the lineage's top color performer.
  const colorWinnersByLineage = new Map<string, LineageColorWinner>();
  for (const c of colorCandidates) {
    const [lineageId, colorCode] = String(c.scope_ref).split('#');
    if (!lineageId || !colorCode) continue;
    const conf = Number(c.confidence_action) || 0;
    const existing = colorWinnersByLineage.get(lineageId);
    if (existing && existing.confidence >= conf) continue;
    const evidence = (c.evidence || {}) as Record<string, unknown>;
    const colorName = colorCodeMap[colorCode]
      ? colorCodeMap[colorCode].replace(/_/g, ' ')
      : colorCode;
    colorWinnersByLineage.set(lineageId, {
      color_name: colorName,
      color_code: colorCode,
      confidence: conf,
      rank: typeof evidence.rank === 'string' ? (evidence.rank as string) : 'top',
      demand_score:
        typeof evidence.demand_score === 'number' ? (evidence.demand_score as number) : null,
    });
  }

  // Look up lineage → member_product_fact_ids so we can attach the
  // extend_colors action to every SKU in the lineage.
  const lineageIdsForColors = Array.from(colorWinnersByLineage.keys());
  const { data: lineageRowsForColors } =
    lineageIdsForColors.length > 0
      ? await supabaseAdmin
          .from('strategy_sku_identity_graph')
          .select('id, member_product_fact_ids')
          .in('id', lineageIdsForColors)
      : { data: [] as any[] };
  const winnerByMemberPid = new Map<string, LineageColorWinner>();
  for (const row of (lineageRowsForColors || []) as any[]) {
    const winner = colorWinnersByLineage.get(row.id);
    if (!winner) continue;
    const members = (row.member_product_fact_ids as string[]) || [];
    for (const pid of members) {
      // Higher-confidence winner wins when a SKU sits in multiple lineages.
      const existing = winnerByMemberPid.get(pid);
      if (!existing || winner.confidence > existing.confidence) {
        winnerByMemberPid.set(pid, winner);
      }
    }
  }

  // Build SkuVerdictInput per product. Merges identity (from product_facts),
  // velocity (from sales_windows), and stock/stores (from inventory_facts).
  const inputs = new Map<string, Omit<SkuVerdictInput, 'candidates'>>();
  const financialsByPid = new Map<string, PerSkuFinancials>();
  for (const p of products) {
    const vel = velocityByPid.get(p.id) ?? { d1: null, '7d': null };
    const inv = inventoryByPid.get(p.id) ?? {};
    const stockTotal =
      (Number(inv.stock_store) || 0) + (Number(inv.stock_warehouse) || 0);
    inputs.set(p.id, {
      product_fact_id: p.id,
      velocity_7d: vel['7d'],
      velocity_d1: vel.d1,
      stores_active: inv.stores_active ?? null,
      stores_with_stock: inv.stores_with_stock ?? null,
      stock_total: stockTotal > 0 ? stockTotal : null,
      pipeline_total: inv.pipeline_total ?? null,
    });
    financialsByPid.set(p.id, {
      product_fact_id: p.id,
      family_code: p.family_code,
      pvp: p.pvp,
      margin_pct_list: p.margin_pct_list,
      cost_per_unit_eur: p.cost_estimate,
    });
  }

  // Resolve verdicts — pass identity so the rationale templates can
  // render brand/family names in the human sentence.
  const identityByPid = new Map(
    products.map((p) => [
      p.id,
      {
        product_name: p.product_name ?? null,
        family_code: p.family_code ?? null,
        model_ref: p.model_ref ?? null,
      },
    ])
  );
  const verdicts = Array.from(inputs.entries()).map(([pid, base]) =>
    resolveSkuVerdict(
      { ...base, product_fact_id: pid, candidates: candidatesByPid.get(pid) ?? [] },
      undefined,
      identityByPid.get(pid)
    )
  );

  // Modulate by archetype + budget + brief.
  const archetype: ArchetypeContext = {
    archetype_id: (constraint?.chosen_archetype_id as 'A' | 'B' | 'C' | 'D' | null) ?? null,
    action_mix: constraint?.action_mix ?? null,
  };
  const budget: BudgetContext = {
    target_buy_budget_eur: constraint?.target_buy_budget ?? null,
    fallback_cost_per_unit_eur: 12,
  };
  const briefCtx: BriefContext = {
    family_pivot: (brief?.family_pivot as Record<string, number>) || {},
    color_story: (brief?.color_story as string[]) || [],
    archetypes_focus: (brief?.archetypes_focus as string[]) || [],
  };
  let modulated = modulateSkuVerdicts(verdicts, archetype, budget, briefCtx, financialsByPid);

  // Layer in lineage-level + hero-level actions after modulation.
  // extend_colors comes from the color-scope candidates of this run;
  // amplify_winner is computed from each SKU's evidence + sell-through.
  modulated = modulated.map((v) => {
    let next = v;
    const identity = identityByPid.get(v.product_fact_id) ?? {
      product_name: null,
      family_code: null,
      model_ref: null,
    };
    const winner = winnerByMemberPid.get(v.product_fact_id);
    if (winner) {
      next = { ...appendExtendColorsAction(next, winner, identity), modulator_notes: next.modulator_notes };
    }
    // Amplify-winner signals: prefer the scored values from sku_scores,
    // fall back to any evidence already in the verdict stack. Add rank and
    // family-relative velocity so the helper fires for top sellers even
    // when no candidate was generated for them.
    const anyEvidence = (next.actions[0]?.evidence ?? {}) as Record<string, unknown>;
    const score = scoresByPid.get(v.product_fact_id);
    const vel = inputs.get(v.product_fact_id)?.velocity_7d ?? null;
    const famAvg = identity.family_code
      ? familyVelocityAvg.get(identity.family_code) ?? null
      : null;
    const famRatio =
      vel != null && famAvg != null && famAvg > 0 ? vel / famAvg : null;
    next = {
      ...appendAmplifyWinnerAction(next, {
        demand_score:
          score?.demand_score ??
          (typeof anyEvidence.demand_score === 'number'
            ? (anyEvidence.demand_score as number)
            : null),
        sell_through_bought_pct:
          score?.sell_through_bought_pct ??
          (typeof anyEvidence.sell_through_bought_pct === 'number'
            ? (anyEvidence.sell_through_bought_pct as number)
            : null),
        returns_pct:
          score?.returns_pct ??
          (typeof anyEvidence.returns_pct === 'number'
            ? (anyEvidence.returns_pct as number)
            : null),
        velocity_7d: vel,
        family_code: identity.family_code,
        velocity_rank: velocityRankByPid.get(v.product_fact_id) ?? null,
        family_velocity_ratio: famRatio,
      }),
      modulator_notes: next.modulator_notes,
    };
    return next;
  });

  // Find the most likely PDF among the sources (zara_rnk_pdf is the
  // primary case). Generate a 1h signed URL for the client to render.
  const pdfSource = sources.find((s) => s.source_format === 'zara_rnk_pdf') ?? sources[0];
  let pdfSignedUrl: string | null = null;
  if (pdfSource?.storage_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from(PDF_BUCKET)
      .createSignedUrl(pdfSource.storage_path, SIGNED_URL_TTL_SECONDS);
    pdfSignedUrl = signed?.signedUrl ?? null;
  }

  // Build SkuRow output ordered the same way as the PDF rows (which is
  // what `products` is sorted by — created_at ASC). We iterate over the
  // products array (not modulated) so the output preserves that order and
  // each row gets a stable `rank` = position in the PDF.
  const modulatedByPid = new Map(modulated.map((m) => [m.product_fact_id, m]));
  const skus = products.map((p, idx) => {
    const v = modulatedByPid.get(p.id);
    const baseInput = inputs.get(p.id);
    return {
      rank: idx + 1,
      product_fact_id: p.id,
      model_ref: p.model_ref ?? null,
      color_ref: p.color_ref ?? null,
      product_name: p.product_name ?? null,
      family_code: p.family_code ?? null,
      pvp: p.pvp ?? null,
      velocity_7d: baseInput?.velocity_7d ?? null,
      velocity_d1: baseInput?.velocity_d1 ?? null,
      stores_active: baseInput?.stores_active ?? null,
      stores_with_stock: baseInput?.stores_with_stock ?? null,
      stock_total: baseInput?.stock_total ?? null,
      target_rotation_days: v?.target_rotation_days ?? 4,
      current_stock_days: v?.current_stock_days ?? null,
      actions: v?.actions ?? [],
      modulator_notes: v?.modulator_notes ?? [],
    };
  });

  // Summary for the page header.
  const actionCounts: Record<string, number> = {};
  for (const sku of skus) {
    for (const a of sku.actions) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    }
  }

  return NextResponse.json({
    run_id: runId,
    tenant_id: run.tenant_id,
    source_id: pdfSource?.id ?? null,
    pdf_storage_path: pdfSource?.storage_path ?? null,
    pdf_signed_url: pdfSignedUrl,
    target_rotation_days_default: DEFAULT_TARGET_ROTATION_DAYS,
    archetype_id: archetype.archetype_id,
    target_buy_budget_eur: budget.target_buy_budget_eur,
    skus,
    summary: {
      total_skus: skus.length,
      action_counts: actionCounts as Record<SkuVerdictAction, number>,
    },
  });
}
