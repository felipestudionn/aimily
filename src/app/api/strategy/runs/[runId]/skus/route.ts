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
  resolveTargetRotationDays,
  appendExtendColorsAction,
  appendDropColorAction,
  appendAmplifyWinnerAction,
  DEFAULT_TARGET_ROTATION_DAYS,
  type SkuVerdictInput,
  type SkuVerdictAction,
  type LineageColorWinner,
  type LineageColorLoser,
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
    .select('id, tenant_id, source_set_ids, constraint_id, creative_brief_id, default_lead_time_days')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  // B.5 · Lead-time gate. Replenish coverage = rotation + lead_time so
  // heroes with tight stock days but long supplier lead-time don't get a
  // silent "no replenish" verdict.
  const leadTimeDays =
    typeof (run as any).default_lead_time_days === 'number'
      ? (run as any).default_lead_time_days
      : 0;

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
  // D.4 · Single source of truth for color name → hex. The frontend used
  // to hold its own COLOR_NAME_HEX dict with space-separated keys, while
  // the taxonomy stored snake_case names — silent grey fallback whenever
  // the names diverged. Now the backend resolves both and ships the hex
  // alongside the name in each action's evidence.
  const colorCodeHexMap = (
    ((colorTaxRes as any)?.data?.mapping?.code_to_hex) || {}
  ) as Record<string, string>;
  const resolveColorHex = (codeOrName: string | null | undefined): string | null => {
    if (!codeOrName) return null;
    const raw = String(codeOrName).trim();
    if (!raw) return null;
    if (colorCodeHexMap[raw]) return colorCodeHexMap[raw];
    // Fallback: name → hex via inverse map (lowercased, space-separated).
    const lower = raw.toLowerCase().replace(/_/g, ' ');
    const inv: Record<string, string> = {};
    for (const [code, name] of Object.entries(colorCodeMap)) {
      const k = (name as string).toLowerCase().replace(/_/g, ' ');
      inv[k] = colorCodeHexMap[code] ?? '';
    }
    return inv[lower] || null;
  };

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
            .select('product_fact_id, demand_score, sell_through_bought_pct, returns_pct, classifier_traces')
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
      velocity_stockout_adjusted_7d: number | null;
    }
  >();
  for (const row of ((scoresRes as any).data || []) as any[]) {
    // B.6 · Extract the stockout-adjusted velocity from classifier_traces
    // so replenish math can target the velocity-if-stocked.
    const traces = (row.classifier_traces ?? {}) as Record<string, any>;
    const adj = traces.stockout_aware_velocity?.adjusted_velocity_7d;
    scoresByPid.set(row.product_fact_id, {
      demand_score: row.demand_score ?? null,
      sell_through_bought_pct: row.sell_through_bought_pct ?? null,
      returns_pct: row.returns_pct ?? null,
      velocity_stockout_adjusted_7d:
        typeof adj === 'number' && adj > 0 ? adj : null,
    });
  }

  // A.5 · Pull full lineage memberships for ALL run products, then compute
  // which SKUs ALSO fire amplify_winner so we can surface "el 250 también
  // está en top 10" type sibling refs in the rationale.
  const { data: allLineagesRows } = targetPids.length > 0
    ? await supabaseAdmin
        .from('strategy_sku_identity_graph')
        .select('id, member_product_fact_ids')
        .overlaps('member_product_fact_ids', targetPids)
    : { data: [] as any[] };
  const lineagePidsByPid = new Map<string, string[]>();
  for (const row of (allLineagesRows || []) as any[]) {
    const members = (row.member_product_fact_ids as string[]) || [];
    for (const pid of members) {
      const sibs = members.filter((m: string) => m !== pid);
      if (sibs.length > 0) {
        const existing = lineagePidsByPid.get(pid) ?? [];
        existing.push(...sibs);
        lineagePidsByPid.set(pid, Array.from(new Set(existing)));
      }
    }
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

  // Aggregate color winners + losers per lineage. Color candidates carry
  // scope_ref = `<lineage_id>#<color_code>`. action_type === 'recolor' is
  // the winner (rank='top'); action_type === 'kill' is the loser
  // (rank='bottom'). The winner becomes `extend_colors`; the loser becomes
  // a color-scope `kill` (C.5 — was previously orphaned in the DB).
  const colorWinnersByLineage = new Map<string, LineageColorWinner>();
  const colorLosersByLineage = new Map<string, LineageColorLoser>();
  for (const c of colorCandidates) {
    const [lineageId, colorCode] = String(c.scope_ref).split('#');
    if (!lineageId || !colorCode) continue;
    const conf = Number(c.confidence_action) || 0;
    const evidence = (c.evidence || {}) as Record<string, unknown>;
    const colorName = colorCodeMap[colorCode]
      ? colorCodeMap[colorCode].replace(/_/g, ' ')
      : colorCode;
    const isLoser =
      c.action_type === 'kill' ||
      (typeof evidence.rank === 'string' && evidence.rank === 'bottom');
    const colorHex = colorCodeHexMap[colorCode] ?? null;
    if (isLoser) {
      const existing = colorLosersByLineage.get(lineageId);
      if (existing && existing.confidence >= conf) continue;
      colorLosersByLineage.set(lineageId, {
        color_name: colorName,
        color_code: colorCode,
        color_hex: colorHex,
        confidence: conf,
        return_risk:
          typeof evidence.return_risk === 'number' ? (evidence.return_risk as number) : null,
        demand_score:
          typeof evidence.demand_score === 'number' ? (evidence.demand_score as number) : null,
        margin_score:
          typeof evidence.margin_score === 'number' ? (evidence.margin_score as number) : null,
      });
    } else {
      const existing = colorWinnersByLineage.get(lineageId);
      if (existing && existing.confidence >= conf) continue;
      colorWinnersByLineage.set(lineageId, {
        color_name: colorName,
        color_code: colorCode,
        color_hex: colorHex,
        confidence: conf,
        rank: typeof evidence.rank === 'string' ? (evidence.rank as string) : 'top',
        demand_score:
          typeof evidence.demand_score === 'number' ? (evidence.demand_score as number) : null,
      });
    }
  }

  // Look up lineage → member_product_fact_ids so we can attach the
  // extend_colors / color-kill actions to every SKU in the lineage.
  const lineageIdsForColors = Array.from(
    new Set([
      ...Array.from(colorWinnersByLineage.keys()),
      ...Array.from(colorLosersByLineage.keys()),
    ])
  );
  const { data: lineageRowsForColors } =
    lineageIdsForColors.length > 0
      ? await supabaseAdmin
          .from('strategy_sku_identity_graph')
          .select('id, member_product_fact_ids')
          .in('id', lineageIdsForColors)
      : { data: [] as any[] };
  const winnerByMemberPid = new Map<string, LineageColorWinner>();
  const loserByMemberPid = new Map<string, LineageColorLoser>();
  for (const row of (lineageRowsForColors || []) as any[]) {
    const members = (row.member_product_fact_ids as string[]) || [];
    const winner = colorWinnersByLineage.get(row.id);
    const loser = colorLosersByLineage.get(row.id);
    for (const pid of members) {
      // Higher-confidence wins when a SKU sits in multiple lineages.
      if (winner) {
        const existing = winnerByMemberPid.get(pid);
        if (!existing || winner.confidence > existing.confidence) {
          winnerByMemberPid.set(pid, winner);
        }
      }
      if (loser) {
        const existing = loserByMemberPid.get(pid);
        if (!existing || loser.confidence > existing.confidence) {
          loserByMemberPid.set(pid, loser);
        }
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
    const skuScore = scoresByPid.get(p.id);
    inputs.set(p.id, {
      product_fact_id: p.id,
      velocity_7d: vel['7d'],
      velocity_d1: vel.d1,
      velocity_stockout_adjusted_7d: skuScore?.velocity_stockout_adjusted_7d ?? null,
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
  //
  // 8.1 (2026-05-17) — color_ref and color_name are now part of identity
  // so the color-scope appenders (appendDropColorAction,
  // appendExtendColorsAction) can filter by SKU color match per the
  // output-unit cardinal rule. See sku-verdict-resolver.ts for context.
  const identityByPid = new Map(
    products.map((p) => {
      const colorRef = (p.color_ref as string | null | undefined) ?? null;
      const colorName = colorRef
        ? (colorCodeMap[colorRef] ?? colorRef).replace(/_/g, ' ')
        : null;
      return [
        p.id,
        {
          product_name: p.product_name ?? null,
          family_code: p.family_code ?? null,
          model_ref: p.model_ref ?? null,
          color_ref: colorRef,
          color_name: colorName,
        },
      ] as const;
    })
  );
  const verdicts = Array.from(inputs.entries()).map(([pid, base]) => {
    const ident = identityByPid.get(pid);
    // B.3 · Per-family rotation override. Fluidos = 4d (fast-fashion),
    // Sastrería = 10d, Capsule families = 14d, Denim = 7d. Falls back to
    // 4d when no override matches.
    const rotation = resolveTargetRotationDays(ident?.family_code ?? null);
    return resolveSkuVerdict(
      { ...base, product_fact_id: pid, candidates: candidatesByPid.get(pid) ?? [] },
      rotation,
      ident,
      leadTimeDays
    );
  });

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

  // PDF rank = position in the source RNK report. products is ordered by
  // created_at ASC, which matches the ingest order (= PDF row order).
  const pdfRankByPid = new Map<string, number>();
  products.forEach((p, idx) => pdfRankByPid.set(p.id, idx + 1));

  // A.5 · Pre-compute which SKUs would fire amplify_winner so we can
  // surface "X also fires" for sibling SKUs in the rationale.
  const heroPids = new Set<string>();
  for (const p of products) {
    const pid = p.id;
    const sc = scoresByPid.get(pid);
    if (!sc) continue;
    if ((sc.returns_pct ?? 0) > 0.35) continue;
    const pdfR = pdfRankByPid.get(pid);
    const velR = velocityRankByPid.get(pid);
    const fam = p.family_code;
    const v7d = velocityByPid.get(pid)?.['7d'] ?? null;
    const famAvg = fam ? familyVelocityAvg.get(fam) ?? null : null;
    const famRatio = v7d != null && famAvg != null && famAvg > 0 ? v7d / famAvg : 0;
    const triggers =
      (pdfR != null && pdfR <= 10) ||
      ((sc.demand_score ?? 0) >= 0.7 && (sc.sell_through_bought_pct ?? 0) >= 0.5) ||
      (velR != null && velR <= 10) ||
      famRatio >= 2.0;
    if (triggers) heroPids.add(pid);
  }
  // Map pid → model_ref for sibling ref rendering.
  const modelRefByPid = new Map<string, string>();
  for (const p of products) {
    if (p.model_ref) modelRefByPid.set(p.id, p.model_ref);
  }

  // Layer in lineage-level + hero-level actions after modulation.
  // extend_colors comes from the color-scope candidates of this run;
  // amplify_winner is computed from each SKU's evidence + sell-through.
  modulated = modulated.map((v) => {
    let next = v;
    const identity = identityByPid.get(v.product_fact_id) ?? {
      product_name: null,
      family_code: null,
      model_ref: null,
      color_ref: null,
      color_name: null,
    };
    const winner = winnerByMemberPid.get(v.product_fact_id);
    if (winner) {
      // D.5 · Pass brief color_story so the appender can propose concrete
      // adjacent tones instead of just "extend toward adjacent tones".
      next = {
        ...appendExtendColorsAction(next, winner, identity, briefCtx.color_story ?? []),
        modulator_notes: next.modulator_notes,
      };
    }
    // C.5 · Surface color-scope losers as a color-flavoured kill action.
    // Mirrors extend_colors. The appender no-ops if a SKU-scope kill is
    // already on the stack (that's a stronger signal).
    const loser = loserByMemberPid.get(v.product_fact_id);
    if (loser) {
      next = { ...appendDropColorAction(next, loser, identity), modulator_notes: next.modulator_notes };
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
    // Resolve this SKU's colour name (used to drop it from suggestions).
    const product = products.find((p) => p.id === v.product_fact_id);
    const currentColorRaw = product?.color_ref as string | null | undefined;
    const currentColorName = currentColorRaw
      ? (colorCodeMap[currentColorRaw] ?? currentColorRaw).replace(/_/g, ' ')
      : null;
    // A.5 · Sibling-hero references — lineage members of THIS SKU that
    // also fire amplify_winner. Surfaced in the rationale so the buyer
    // sees the colourways are co-validated.
    const siblingPids = lineagePidsByPid.get(v.product_fact_id) ?? [];
    const siblingHeroModelRefs = siblingPids
      .filter((sp) => heroPids.has(sp))
      .map((sp) => modelRefByPid.get(sp))
      .filter((m): m is string => !!m);
    const productPvp = product?.pvp ?? null;
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
        pdf_rank: pdfRankByPid.get(v.product_fact_id) ?? null,
        velocity_rank: velocityRankByPid.get(v.product_fact_id) ?? null,
        family_velocity_ratio: famRatio,
        brief_colors: briefCtx.color_story ?? [],
        current_color: currentColorName,
        pvp: productPvp != null ? Number(productPvp) : null,
        sibling_hero_model_refs: siblingHeroModelRefs,
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
