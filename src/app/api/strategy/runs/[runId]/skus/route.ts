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
  appendAmplifyNextSeasonAction,
  appendAmplifyDistributionAction,
  appendPullForwardIntakeAction,
} from '@/lib/strategy/sku-verdict-resolver';
import {
  enrichVerdict,
  DEFAULT_TARGET_ROTATION_DAYS,
  type SkuVerdict,
  type SkuVerdictInput,
  type SkuVerdictAction,
  type LineageColorWinner,
  type LineageColorLoser,
} from '@/lib/strategy/sku-verdict-resolver';
import {
  appendInvestigateAbsoluteTriggers,
  appendHeroFallback,
} from '@/lib/strategy/d9-and-hero-appenders';
import { getDialesForScenario, type ScenarioId } from '@/lib/strategy/scenario-diales';
import { applyScenarioToVerdict } from '@/lib/strategy/scenario-modulator';
import {
  modulateSkuVerdicts,
  type ArchetypeContext,
  type BudgetContext,
  type BriefContext,
  type PerSkuFinancials,
} from '@/lib/strategy/sku-verdict-modulator';
import { computeHeadlineKpis, type HeadlineKpis } from '@/lib/strategy/headline-kpis';
import {
  buildTaxonomyNameToHex,
  resolveColorStory,
} from '@/lib/strategy/color-name-hex-fallback';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PDF_BUCKET = 'strategy-uploads';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * v2 (Felipe 2026-05-18) — Exclusion rules. Cuando dos verbos
 * lógicamente incompatibles disparan a la vez sobre el mismo SKU, el
 * más prioritario gana y el otro se suprime. Las reglas:
 *
 *   1. MATAR bloquea: AMPLIAR_DIST, REPLENISH × 2, ADELANTAR_PEDIDO,
 *      REPLICAR_CONCEPTO, EXTENDER_COLORES
 *      → Si vas a matar, no inviertes en su crecimiento.
 *   2. REBAJAR bloquea: AMPLIAR_DIST, REPLENISH × 2, ADELANTAR_PEDIDO
 *      → Si vas a vaciar via rebaja, no compras más ni amplías.
 *   3. REPOSICIÓN URGENTE (replenish) bloquea: REPONER MAX VENTA
 *      (amplify_in_season). Mutuamente excluyentes — la urgente cubre
 *      máximo y la max-venta inflaría la compra.
 *   4. REDUCIR COMPRA (resize_down) bloquea: REPLICAR CONCEPTO
 *      → Contradictorios — si reduces compra no extiendes concepto.
 *
 * MARCAR PARA REVISIÓN es compatible con todo (es flag, no acción).
 * REPLICAR CONCEPTO + EXTENDER COLORES + ADELANTAR PEDIDO + AMPLIAR
 * DIST entre sí son compatibles (todos refuerzan al hero).
 */
// applyExclusionRules vive ahora en src/lib/strategy/exclusion-rules.ts
// (P0-B · 2026-05-18 · Felipe) — se aplica también dentro de
// applyScenarioToVerdict para que los escenarios no destapen stacks
// contradictorios. Esta función es un wrapper que adapta la firma con
// Map (route) a la firma con v2 directa (módulo).
import { applyExclusionRules as applyExclusionRulesCore } from '@/lib/strategy/exclusion-rules';
import { neutralizeRationale } from '@/lib/strategy/neutralize-source-copy';
function applyExclusionRules<V extends {
  actions: Array<{ action: string; evidence?: Record<string, unknown> }>;
  product_fact_id: string;
}>(
  verdict: V,
  v2SignalsByPid?: Map<string, Record<string, unknown> | null>
): V {
  const v2 = v2SignalsByPid?.get(verdict.product_fact_id) ?? null;
  return applyExclusionRulesCore(verdict, v2);
}

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
  // 2026-05-18 — Name→hex index for brief color_story resolution. The
  // taxonomy stores code→hex and code→name separately; we invert to a
  // single name→hex lookup that color-name-hex-fallback.ts consults as
  // its tier-1 source (tenant authoritative). Tier-2 (Spanish color
  // dictionary) lives in that module and covers moodboard names not yet
  // in the catalog.
  const taxonomyNameToHex = buildTaxonomyNameToHex(colorCodeMap, colorCodeHexMap);
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
              // Felipe 2026-05-19 · BUG: todos los product_facts tenían
              // created_at IDÉNTICO (mismo microsegundo del parser batch
              // insert) → ORDER BY created_at no era determinístico y la
              // UI mostraba SKUs en orden arbitrario. La fuente correcta
              // del orden visual del PDF es strategy_raw_records.row_index
              // (que el parser asigna 1, 2, 3... en orden de aparición).
              // Hacemos un nested select para obtenerlo y luego ordenamos
              // por ese campo en memoria.
              'id, model_ref, color_ref, product_name, family_code, pvp, markup_pct, margin_pct_list, cost_estimate, activation_date, observation_date, created_at, raw_record_id, product_image_url, strategy_raw_records(row_index)'
            )
            .in('id', targetPids),
          supabaseAdmin
            .from('strategy_sales_windows')
            .select('product_fact_id, window_type, units')
            .in('product_fact_id', targetPids)
            .in('window_type', ['d1', '7d']),
          supabaseAdmin
            .from('strategy_inventory_facts')
            .select('product_fact_id, stores_active, stores_with_stock, stock_store, stock_warehouse, pipeline_total, stock_available, stock_in_transit, stock_pending, cd2_available'),
          supabaseAdmin
            // CRITICAL BUG FIX 2026-05-18 (Felipe caso Bomber):
            // sell_through_bought_pct y returns_pct NO viven en
            // strategy_sku_scores — viven en strategy_efficiency_facts.
            // Pedirlos aquí provocaba que Supabase fallara silenciosamente
            // y scoresByPid quedaba VACÍO. Resultado: v2 = null para
            // todos los SKUs → appenders v2 (shippedBased, rotura
            // logística) NO disparaban → Bomber solo tenía 'hold' →
            // desaparecía del UI por el filtro. Solo seleccionamos las
            // columnas que SÍ existen.
            .from('strategy_sku_scores')
            .select('product_fact_id, demand_score, classifier_traces')
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
  // Felipe 2026-05-19 · sort por row_index (= orden visual del PDF Zara
  // RNK). Si row_index es null, fallback a id stable sort.
  products.sort((a, b) => {
    const aRow =
      (a.strategy_raw_records?.row_index as number | null | undefined) ??
      Number.MAX_SAFE_INTEGER;
    const bRow =
      (b.strategy_raw_records?.row_index as number | null | undefined) ??
      Number.MAX_SAFE_INTEGER;
    if (aRow !== bRow) return aRow - bRow;
    return String(a.id).localeCompare(String(b.id));
  });
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
      /** v2 signals persistidas en classifier_traces.v2_signals.
       *  Forma libre — keys mirror SkuScore v2 fields. Null cuando
       *  el run aún no se re-ejecutó con F2 (legacy). */
      v2: Record<string, any> | null;
    }
  >();
  for (const row of ((scoresRes as any).data || []) as any[]) {
    // B.6 · Extract the stockout-adjusted velocity from classifier_traces
    // so replenish math can target the velocity-if-stocked.
    const traces = (row.classifier_traces ?? {}) as Record<string, any>;
    const adj = traces.stockout_aware_velocity?.adjusted_velocity_7d;
    const v2 = (traces.v2_signals ?? null) as Record<string, any> | null;
    // sell_through_bought_pct y returns_pct se leen de v2_signals
    // (efficiency_bought_pct / returns_vs_baseline_score absoluto).
    // Ya no se piden a strategy_sku_scores donde no existen.
    const v2BoughtPct =
      v2 && typeof v2.efficiency_bought_pct === 'number'
        ? (v2.efficiency_bought_pct as number)
        : null;
    // returns_pct absoluto se persiste también en v2_signals si el
    // classifier lo metió. Si no, leemos de un fallback (return_risk
    // score = returns_pct × 2 cap 1, así que returns_pct ≈ score/2).
    const returnRiskRaw = traces.returns_penalized_margin?.returns_pct;
    const v2ReturnsPct =
      typeof returnRiskRaw === 'number' ? returnRiskRaw : null;
    scoresByPid.set(row.product_fact_id, {
      demand_score: row.demand_score ?? null,
      sell_through_bought_pct: v2BoughtPct,
      returns_pct: v2ReturnsPct,
      velocity_stockout_adjusted_7d:
        typeof adj === 'number' && adj > 0 ? adj : null,
      v2,
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

  // P0-C · Hero fallback usa "units_7d en top decil" como tercer trigger
  // independiente de pdf_rank / velocity_rank. Calculamos el umbral una sola
  // vez sobre el corpus del run.
  const allVelocities = pidsByVelocity
    .map(([, v]) => v['7d'] as number)
    .filter((x) => x > 0);
  const unitsTopDecileThreshold: number | null = (() => {
    if (allVelocities.length === 0) return null;
    const idx = Math.max(0, Math.floor(allVelocities.length * 0.1) - 1);
    return allVelocities[idx] ?? null;
  })();

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
  // (rank='bottom').
  //
  // 2026-05-18 — Bug fix: un lineage puede tener MÚLTIPLES ganadores
  // (dynamic top_n en generateColorWinnerCandidates puede ser 2+ para
  // lineages de 2+ miembros). El v1 anterior guardaba solo UNO (el de
  // mayor confianza global), descartando los otros. Eso causaba que un
  // SKU como el 4786/401 (winner conf 0.8) quedara "shadow" por su
  // hermano 4786/250 (winner conf 1.0), y EXTENDER COLORES no disparara
  // para 401 al no matchear color en el filtro output-unit del appender.
  // Ahora guardamos LISTA de ganadores y losers por lineage; al construir
  // winnerByMemberPid matcheamos por color del SKU.
  const colorWinnersByLineage = new Map<string, LineageColorWinner[]>();
  const colorLosersByLineage = new Map<string, LineageColorLoser[]>();
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
      const arr = colorLosersByLineage.get(lineageId) ?? [];
      arr.push({
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
      colorLosersByLineage.set(lineageId, arr);
    } else {
      const arr = colorWinnersByLineage.get(lineageId) ?? [];
      arr.push({
        color_name: colorName,
        color_code: colorCode,
        color_hex: colorHex,
        confidence: conf,
        rank: typeof evidence.rank === 'string' ? (evidence.rank as string) : 'top',
        demand_score:
          typeof evidence.demand_score === 'number' ? (evidence.demand_score as number) : null,
      });
      colorWinnersByLineage.set(lineageId, arr);
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
  // 2026-05-18 — Bug fix: matchear winner/loser por COLOR DEL SKU, no
  // por confianza global del lineage. Ahora cada miembro recibe el winner
  // (o loser) cuyo color_code coincide con su propio color_ref. Si el
  // color del SKU no está entre los ganadores del lineage, no recibe
  // winner (correcto — solo los SKUs que SON ganadores deben disparar
  // EXTENDER COLORES, por la regla cardinal de output-unit).
  const winnerByMemberPid = new Map<string, LineageColorWinner>();
  const loserByMemberPid = new Map<string, LineageColorLoser>();
  // Map pid → color_ref del producto, para el matching.
  const colorRefByPid = new Map<string, string | null>();
  for (const p of products) {
    colorRefByPid.set(p.id, (p.color_ref as string | null | undefined) ?? null);
  }
  for (const row of (lineageRowsForColors || []) as any[]) {
    const members = (row.member_product_fact_ids as string[]) || [];
    const winners = colorWinnersByLineage.get(row.id) ?? [];
    const losers = colorLosersByLineage.get(row.id) ?? [];
    for (const pid of members) {
      const memberColor = colorRefByPid.get(pid);
      if (!memberColor) continue;
      const winnerForMember = winners.find((w) => w.color_code === memberColor);
      if (winnerForMember) {
        // Si el SKU está en múltiples lineages, nos quedamos con el
        // winner de mayor confianza para este color específico.
        const existing = winnerByMemberPid.get(pid);
        if (!existing || winnerForMember.confidence > existing.confidence) {
          winnerByMemberPid.set(pid, winnerForMember);
        }
      }
      const loserForMember = losers.find((l) => l.color_code === memberColor);
      if (loserForMember) {
        const existing = loserByMemberPid.get(pid);
        if (!existing || loserForMember.confidence > existing.confidence) {
          loserByMemberPid.set(pid, loserForMember);
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
    // v2 — Read persisted v2 signals from classifier_traces.v2_signals.
    // Null when the run was scored before F2 (orchestrator must be re-run
    // to populate the new traces). All v2 appenders gate on these.
    const v2 = scoresByPid.get(v.product_fact_id)?.v2 ?? null;

    const winner = winnerByMemberPid.get(v.product_fact_id);
    if (winner) {
      // 2026-05-18 — Resolve color_story names into [{name, hex}] pairs
      // so the UI renders proposal chips directly from evidence. Two-tier
      // resolution: tenant taxonomy (authoritative for catalog colors)
      // then Spanish color dictionary (covers moodboard colors not yet
      // in the catalog — by design, the brief introduces new chromatic
      // territory). Caller (this file) holds the only access to the
      // tenant taxonomy, so resolution happens here, not in the appender.
      const proposedColors = resolveColorStory(
        briefCtx.color_story ?? [],
        taxonomyNameToHex
      );
      // v2 Gate 11 stricter — solo dispara EXTENDER COLORES sobre
      // ganadores limpios (color_winner_strength ≥ 3.0) y estructurales
      // (family_contribution_score ≥ 0.15). Cuando no hay data v2
      // (legacy traces), el appender mantiene compat v1.
      const v2GateSignals = v2
        ? {
            color_winner_strength: (v2.color_winner_strength as number | null) ?? null,
            family_contribution_score:
              (v2.family_contribution_score as number | null) ?? null,
          }
        : undefined;
      next = {
        ...appendExtendColorsAction(next, winner, identity, proposedColors, v2GateSignals),
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
    // Compute days_in_store for the next-season gate (Spec v1 §4 Gate 10
    // requires >= 28 days = 4 weeks of validation data, per Fisher-Raman
    // 1996 + BoF/IESE Mango case studies). Falls back to observation_date
    // when activation_date isn't set.
    const activationDate =
      ((product as { activation_date?: string | null } | undefined)?.activation_date) ?? null;
    const observationDate =
      ((product as { observation_date?: string | null } | undefined)?.observation_date) ?? null;
    const anchorDate = activationDate ?? observationDate;
    const daysInStore = anchorDate
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(anchorDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : null;
    const amplifySignals = {
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
      // Legacy field still consumed by appendAmplifyWinnerAction (the
      // in-season appender). Will be retired once that function stops
      // computing candidateColors. The UI ignores in-season chips per
      // Spec Gate 9 (REPLICAR AHORA = same SKU + same color, no chips).
      brief_colors: briefCtx.color_story ?? [],
      current_color: currentColorName,
      pvp: productPvp != null ? Number(productPvp) : null,
      sibling_hero_model_refs: siblingHeroModelRefs,
      // Felipe 2026-05-18 caso Bomber 5247/600: el éxito del enviado
      // es señal PRIMARIA de hero. Lo leemos del v2_signals
      // (efficiency_shipped_pct) — fuente de verdad post-classifier.
      sell_through_shipped_pct: v2
        ? typeof v2.efficiency_shipped_pct === 'number'
          ? (v2.efficiency_shipped_pct as number)
          : null
        : null,
    };
    // First emit the in-season verdict (always, when triggers fire).
    next = {
      ...appendAmplifyWinnerAction(next, amplifySignals),
      modulator_notes: next.modulator_notes,
    };
    // Then conditionally emit the next-season sequel brief — gated by
    // days_in_store >= 28 (the 4-week validation window). Pass the
    // resolved [{name, hex}] palette so the chips render with correct
    // color for moodboard names not in the catalog (terracota, oliva,
    // lavanda etc.).
    const proposedColorsForNextSeason = resolveColorStory(
      briefCtx.color_story ?? [],
      taxonomyNameToHex
    );
    next = {
      ...appendAmplifyNextSeasonAction(next, {
        ...amplifySignals,
        brief_colors: proposedColorsForNextSeason,
        days_in_store: daysInStore,
        // v2 fast-track: héroes estructurales inequívocos (top-5 RNK +
        // aportación ≥20% + rotación sana) no esperan los 28 días de
        // validación canónicos.
        family_contribution_score:
          v2 ? (v2.family_contribution_score as number | null) ?? null : null,
        rotation_health_score:
          v2 ? (v2.rotation_health_score as number | null) ?? null : null,
      }),
      modulator_notes: next.modulator_notes,
    };

    // v2 — Gates 3 (AMPLIAR DISTRIBUCIÓN) y 4 (ACELERAR ENTRADA).
    // Solo disparan cuando hay señales v2 persistidas (orchestrator re-run
    // con F2). Para runs legacy, los nuevos appenders no-op silenciosamente.
    if (v2) {
      // Leer stock_available / stock_pending / cd2_available directos
      // desde inventoryByPid (no están en SkuVerdictInput).
      const inv = (inventoryByPid.get(v.product_fact_id) ?? {}) as Record<string, any>;
      const stockAvailable = typeof inv.stock_available === 'number'
        ? inv.stock_available
        : null;
      const stockPending = typeof inv.stock_pending === 'number'
        ? inv.stock_pending
        : null;
      const cd2Available = typeof inv.cd2_available === 'number'
        ? inv.cd2_available
        : null;
      // Gate 3 · AMPLIAR DISTRIBUCIÓN
      next = {
        ...appendAmplifyDistributionAction(
          next,
          {
            fleet_coverage_score: (v2.fleet_coverage_score as number | null) ?? null,
            demand_score: amplifySignals.demand_score,
            family_contribution_score:
              (v2.family_contribution_score as number | null) ?? null,
            can_replenish_now: Boolean(v2.can_replenish_now),
            distribution_lift_capacity_stores:
              (v2.distribution_lift_capacity_stores as number | null) ?? null,
            returns_vs_baseline_score:
              (v2.returns_vs_baseline_score as number | null) ?? null,
            cd2_pool_strength: (v2.cd2_pool_strength as number | null) ?? null,
            stock_available: stockAvailable,
            cd2_available: cd2Available,
          },
          identity
        ),
        modulator_notes: next.modulator_notes,
      };
      // Gate 4 · ACELERAR ENTRADA
      next = {
        ...appendPullForwardIntakeAction(
          next,
          {
            stockout_risk_score:
              typeof anyEvidence.stockout_risk_score === 'number'
                ? (anyEvidence.stockout_risk_score as number)
                : null,
            stock_pending: stockPending,
            demand_score: amplifySignals.demand_score,
            family_contribution_score:
              (v2.family_contribution_score as number | null) ?? null,
            pipeline_arrival_runway_days:
              (v2.pipeline_arrival_runway_days as number | null) ?? null,
            velocity_7d: vel,
            // Felipe 2026-05-18 caso Bomber 5247/600 — rotura logística
            // bypassa todos los thresholds normales. Detecta cuando el
            // pipeline pendiente tiene fecha de entrada vencida.
            is_logistic_rupture: Boolean(v2.is_logistic_rupture),
            logistic_rupture_days_overdue:
              typeof v2.logistic_rupture_days_overdue === 'number'
                ? (v2.logistic_rupture_days_overdue as number)
                : null,
            sell_through_shipped_pct:
              typeof v2.efficiency_shipped_pct === 'number'
                ? (v2.efficiency_shipped_pct as number)
                : null,
          },
          identity
        ),
        modulator_notes: next.modulator_notes,
      };

      // P0-J · D9 INVESTIGATE por triggers absolutos (returns≥25%,
      // cannibalization>0.5, compra inflada, datos imposibles).
      next = {
        ...appendInvestigateAbsoluteTriggers(next, v2, identity),
        modulator_notes: next.modulator_notes,
      };

      // P0-C · Hero fallback por ranking absoluto cuando demand_score
      // normalizado salía bajo y el sistema dejaba de emitir hero stack.
      const isUnitsTopDecile = (() => {
        if (vel == null) return false;
        const top10threshold = unitsTopDecileThreshold;
        return top10threshold != null && vel >= top10threshold;
      })();
      next = {
        ...appendHeroFallback(
          next,
          v2,
          pdfRankByPid.get(v.product_fact_id) ?? null,
          velocityRankByPid.get(v.product_fact_id) ?? null,
          isUnitsTopDecile,
          identity
        ),
        modulator_notes: next.modulator_notes,
      };
    }

    // v2 — Enriquecer rationale del verbo REPOSICIÓN URGENTE con
    // contexto de cobertura vs lead_time (Felipe 2026-05-18 cardinal).
    // Si el SKU tiene replenish y hay señales v2, reescribimos el
    // rationale para que el comprador VEA por qué se considera urgente
    // ("cobertura 3 días vs lead time 15 días → ratio 0.20 = urgente").
    // El verbo en sí ya está disparado (vía generateSkuCandidates con
    // stockout_suppressed); este enrichment solo mejora el mensaje.
    if (v2 && (v2.is_urgent_replenish || v2.is_critical_replenish)) {
      const coberturaDays = v2.cobertura_days_now as number | null;
      const coberturaRatio = v2.cobertura_ratio_lead_time as number | null;
      const isCritical = Boolean(v2.is_critical_replenish);
      const pipelineRunway = v2.pipeline_arrival_runway_days as number | null;
      const leadTimeDays = coberturaRatio != null && coberturaDays != null && coberturaRatio > 0
        ? Math.round(coberturaDays / coberturaRatio)
        : null;
      next = {
        ...next,
        actions: next.actions.map((a) => {
          if (a.action !== 'replenish') return a;
          const urgencyLabel = isCritical ? 'CRÍTICA (rotura inminente)' : 'urgente';
          const coberturaPhrase =
            coberturaDays != null && leadTimeDays != null
              ? `Cobertura actual de ${coberturaDays.toFixed(1)} días vs lead time ${leadTimeDays} días → reposición ${urgencyLabel}.`
              : `Reposición ${urgencyLabel} detectada por rotura de stock.`;
          const pipelinePhrase =
            pipelineRunway != null && pipelineRunway < (leadTimeDays ?? 14) * 2
              ? ` El pipeline pendiente tardaría ${Math.round(pipelineRunway)} días en llegar al ritmo actual — no llegará a tiempo para cubrir el hueco.`
              : '';
          return {
            ...a,
            rationale: coberturaPhrase + pipelinePhrase,
          };
        }),
      };
    }

    return next;
  });

  // Find a Zara RNK PDF among the sources. ONLY emit pdf_signed_url when
  // the source is actually a PDF — for Shopify XLSX bundles or CSV
  // uploads we leave it null and the viewer falls back to the SKU panel
  // without trying to render anything as PDF (else pdfjs throws
  // "Invalid PDF structure"). Felipe 2026-05-19 bug fix.
  const pdfSource = sources.find(
    (s) =>
      s.source_format === 'zara_rnk_pdf' && s.storage_path && s.storage_path.length > 0
  );
  // El source_format primario manda el copy: si es zara_rnk_pdf, dejamos
  // "del RNK Zara" / "filosofía Zara" intactos. Para cualquier otro
  // (shopify_csv_xlsx, erp_csv, etc.) los neutralizamos.
  const primarySourceFormat: string | null =
    pdfSource?.source_format ?? sources[0]?.source_format ?? null;
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
  //
  // 2026-05-17 (spec v1) — enrich each verdict with six_right + owner
  // derived from the action via VERDICT_SIX_RIGHT and VERDICT_OWNER maps
  // in sku-verdict-resolver.ts. The UI surfaces these fields as the
  // "Six Right anchor" + "Owner" pills on each action card. Spec source:
  // memory/product-spec_aimily-in-season-2026-05-17.md §4.
  // v2 — Aplicar reglas de exclusión cruzada ANTES de enrichVerdict.
  // Garantiza que verbos lógicamente incompatibles no coexistan en el
  // mismo SKU (e.g., MATAR + AMPLIAR DIST, REPOSICIÓN URGENTE +
  // REPONER MAX VENTA). Ver applyExclusionRules() arriba para reglas.
  // v2_signals map para pasarle a applyExclusionRules (Felipe caso Bomber).
  const v2SignalsByPid = new Map<string, Record<string, unknown> | null>();
  for (const [pid, sc] of Array.from(scoresByPid.entries())) {
    v2SignalsByPid.set(pid, sc.v2 ?? null);
  }
  const afterExclusions = modulated.map((v) => applyExclusionRules(v, v2SignalsByPid));
  const enriched = afterExclusions.map(enrichVerdict);
  const modulatedByPid = new Map(enriched.map((m) => [m.product_fact_id, m]));

  // v2 (2026-05-18 spec §8.2) — Computar los 4 escenarios comerciales
  // aplicando los diales (threshold/magnitude/confidence) sobre el verdict
  // base de cada SKU. Cardinal: ningún escenario elimina decisiones, las
  // gradualiza. El motor genera el universo permisivo (la `enriched`
  // base ≈ Balanceada con appenders) y los diales filtran/escalan por
  // escenario.
  const scenarioStacksByPid = new Map<string, Record<ScenarioId, SkuVerdict>>();
  for (const baseVerdict of enriched) {
    const v2 = (scoresByPid.get(baseVerdict.product_fact_id)?.v2 ?? null) as Record<string, unknown> | null;
    const customMix = (constraint?.action_mix as Record<string, number> | null | undefined) ?? null;
    const perScenario: Record<ScenarioId, SkuVerdict> = {
      conservar_margen: applyScenarioToVerdict(baseVerdict, getDialesForScenario('conservar_margen'), v2),
      balanceada: applyScenarioToVerdict(baseVerdict, getDialesForScenario('balanceada'), v2),
      maximizar_venta: applyScenarioToVerdict(baseVerdict, getDialesForScenario('maximizar_venta'), v2),
      tu_mezcla: applyScenarioToVerdict(baseVerdict, getDialesForScenario('tu_mezcla', customMix), v2),
    };
    scenarioStacksByPid.set(baseVerdict.product_fact_id, perScenario);
  }

  // v2 (§8.3) — Cargar locks del usuario para este run. Cada lock fija
  // un SKU a un escenario específico, sobrescribiendo el toggle global.
  const { data: userLocksRows } = await supabaseAdmin
    .from('strategy_user_sku_selections')
    .select('product_fact_id, chosen_scenario, locked_by, locked_at')
    .eq('run_id', runId)
    .is('unlocked_at', null);
  const userLocksByPid = new Map<string, { chosen_scenario: ScenarioId; locked_at: string }>();
  for (const row of (userLocksRows || []) as Array<{ product_fact_id: string; chosen_scenario: string; locked_at: string }>) {
    if (
      row.chosen_scenario === 'conservar_margen' ||
      row.chosen_scenario === 'balanceada' ||
      row.chosen_scenario === 'maximizar_venta' ||
      row.chosen_scenario === 'tu_mezcla'
    ) {
      userLocksByPid.set(row.product_fact_id, {
        chosen_scenario: row.chosen_scenario,
        locked_at: row.locked_at,
      });
    }
  }
  // Today's date for days_in_store. Production: would come from the run's
  // observation_date. For dogfood: today's run.
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(todayIso).getTime();
  const skus = products.map((p, idx) => {
    const v = modulatedByPid.get(p.id);
    const baseInput = inputs.get(p.id);
    const score = scoresByPid.get(p.id);
    // Compute days_in_store from activation_date when available, else
    // fall back to days since observation_date (Zara RNK ingests as
    // observation_date = the report date).
    const activationDate = (p as { activation_date?: string | null }).activation_date ?? null;
    const observationDate = (p as { observation_date?: string | null }).observation_date ?? null;
    const anchorDate = activationDate ?? observationDate;
    const daysInStore = anchorDate
      ? Math.max(0, Math.floor((todayMs - new Date(anchorDate).getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    // total_sold approximation for SKUs without explicit total_sold in
    // efficiency_facts: velocity_7d × (days_in_store / 7). Reasonable for
    // short-lived fast-fashion SKUs (Caro et al. 2010 — Zara store-level
    // life cycle is 5-6 weeks). Marks GMROI as 'tenant' source since the
    // velocity is tenant-provided.
    const totalSoldApprox =
      baseInput?.velocity_7d != null && daysInStore != null
        ? baseInput.velocity_7d * (daysInStore / 7)
        : null;
    // Retailer profile: heuristic on family_code prefix. V26 corpus =
    // Zara → 'zara_fast_fashion'. Future: read from tenant settings.
    const retailerProfile: 'zara_fast_fashion' | 'mango_mid_market' | 'shopify_smb' | 'generic' =
      (p.family_code ?? '').startsWith('W.') ? 'zara_fast_fashion' : 'generic';
    const headlineKpis: HeadlineKpis = computeHeadlineKpis({
      pvp: p.pvp ?? null,
      cost_estimate: (p.cost_estimate as number | null) ?? null,
      margin_pct_list: (p.margin_pct_list as number | null) ?? null,
      velocity_7d: baseInput?.velocity_7d ?? null,
      total_sold: totalSoldApprox,
      total_bought: null,
      sell_through_bought_pct: score?.sell_through_bought_pct ?? null,
      returns_pct: score?.returns_pct ?? null,
      pipeline_total: baseInput?.pipeline_total ?? null,
      stock_total: baseInput?.stock_total ?? null,
      days_in_store: daysInStore,
      supplier_lead_time_days: null,        // synthetic from retailer profile (Zara = 15d)
      planned_str_curve: null,              // synthetic linear ramp
      retailer_profile: retailerProfile,
    });
    // v2 — KPIs comerciales del comprador desde classifier_traces.v2_signals
    // (segunda fila bajo los 5 KPIs cabecera financieros).
    const v2sig = (score?.v2 ?? null) as Record<string, unknown> | null;
    const numOrNullVal = (key: string): number | null => {
      const val = v2sig ? v2sig[key] : undefined;
      return typeof val === 'number' ? val : null;
    };
    const contribution = numOrNullVal('family_contribution_score');
    const dailyActivation = numOrNullVal('daily_activation_score');
    const headroom = numOrNullVal('capacity_headroom');
    const commercialKpis = v2sig
      ? {
          rotation_aj_7d: numOrNullVal('rotation_aj_7d_observed'),
          family_contribution_pct: contribution != null ? contribution * 100 : null,
          daily_activation_pct: dailyActivation != null ? dailyActivation * 100 : null,
          capacity_headroom_pct: headroom != null ? headroom * 100 : null,
        }
      : undefined;
    // v2 (§8.2) — Por SKU exponemos las 4 stacks (uno por escenario)
    // para que el frontend pueda toggler sin re-llamadas. La key `actions`
    // se mantiene como compatibilidad — apunta a la 'balanceada' (default
    // del toggle global al cargar).
    const scenarioStacks = scenarioStacksByPid.get(p.id);
    // Felipe sprint Shopify lane 2026-05-19 · neutralizar rationale strings
    // que mencionan "Zara"/"RNK" cuando la fuente NO es zara_rnk_pdf. Esto
    // mantiene el copy retailer-agnostic (Shopify, ERP, etc.) sin tocar el
    // resolver. Ver lib/strategy/neutralize-source-copy.ts.
    const sourceFmt = primarySourceFormat;
    const neutralizeActions = (actions: any[]) =>
      actions.map((a) => ({
        ...a,
        rationale: neutralizeRationale(a?.rationale ?? '', sourceFmt),
      }));
    const verdictsByScenario = scenarioStacks
      ? {
          conservar_margen: neutralizeActions(scenarioStacks.conservar_margen.actions ?? []),
          balanceada: neutralizeActions(scenarioStacks.balanceada.actions ?? []),
          maximizar_venta: neutralizeActions(scenarioStacks.maximizar_venta.actions ?? []),
          tu_mezcla: neutralizeActions(scenarioStacks.tu_mezcla.actions ?? []),
        }
      : null;
    const userLock = userLocksByPid.get(p.id) ?? null;
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
      days_in_store: daysInStore,
      // Felipe 2026-05-19 noche — Surface returns_pct directly on the SKU row
      // so the ranking table can colour-code the "Devol." column. Was being
      // computed and threaded into headline_kpis but the actual % was lost
      // to the renderer.
      returns_pct: score?.returns_pct ?? null,
      // Felipe 2026-05-19 sprint Shopify lane: si el parser populó la URL
      // de la foto del producto (Shopify Products CSV), el frontend la usa
      // directamente para Aimily Design sin recortar PDF. Null para Zara.
      product_image_url: (p as { product_image_url?: string | null }).product_image_url ?? null,
      target_rotation_days: v?.target_rotation_days ?? 4,
      current_stock_days: v?.current_stock_days ?? null,
      // Legacy: keep `actions` pointing to balanceada (= toggle default)
      actions: verdictsByScenario?.balanceada ?? v?.actions ?? [],
      // v2 — full per-scenario stacks
      verdicts_by_scenario: verdictsByScenario,
      user_lock: userLock,
      modulator_notes: v?.modulator_notes ?? [],
      headline_kpis: headlineKpis,
      commercial_kpis: commercialKpis,
    };
  });

  // Summary for the page header.
  // Legacy `action_counts` apunta a Balanceada (default toggle).
  // v2: `action_counts_by_scenario` permite que el filtro UI se ajuste
  // cuando el usuario cambia escenario.
  const actionCounts: Record<string, number> = {};
  for (const sku of skus) {
    for (const a of sku.actions) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    }
  }
  const scenarioIds: ScenarioId[] = ['conservar_margen', 'balanceada', 'maximizar_venta', 'tu_mezcla'];
  const actionCountsByScenario: Record<ScenarioId, Record<string, number>> = {
    conservar_margen: {},
    balanceada: {},
    maximizar_venta: {},
    tu_mezcla: {},
  };
  for (const sid of scenarioIds) {
    for (const sku of skus) {
      const stack = sku.verdicts_by_scenario?.[sid] ?? [];
      for (const a of stack) {
        actionCountsByScenario[sid][a.action] = (actionCountsByScenario[sid][a.action] || 0) + 1;
      }
    }
  }
  // SKUs decididos = los que tienen lock activo.
  const lockedSkusCount = skus.filter((s) => s.user_lock != null).length;

  // Felipe 2026-05-19 noche — User-initiated seed model (NOT auto-mat).
  // The In-Season feedback loop materializes seeds only when the user
  // explicitly clicks "Añadir a semillas" on a verdict pill (see
  // POST /api/strategy/seeds). Auto-materialization was tried + rolled back
  // because it filled the pool with the engine's permissive universe, not
  // with what the merch actually wants to develop.
  // See memory/architecture_in-season-feedback-loop.md §2 (revised).

  return NextResponse.json({
    run_id: runId,
    tenant_id: run.tenant_id,
    source_id: pdfSource?.id ?? null,
    pdf_storage_path: pdfSource?.storage_path ?? null,
    pdf_signed_url: pdfSignedUrl,
    source_format: primarySourceFormat,
    target_rotation_days_default: DEFAULT_TARGET_ROTATION_DAYS,
    archetype_id: archetype.archetype_id,
    target_buy_budget_eur: budget.target_buy_budget_eur,
    skus,
    summary: {
      total_skus: skus.length,
      action_counts: actionCounts as Record<SkuVerdictAction, number>,
      // v2 § 8.2 — counts por escenario para que el filtro de la UI
      // muestre los conteos correctos al cambiar el toggle global.
      action_counts_by_scenario: actionCountsByScenario as Record<ScenarioId, Record<SkuVerdictAction, number>>,
      // v2 §8.3 — totales del plan en construcción
      locked_skus: lockedSkusCount,
      pending_skus: skus.length - lockedSkusCount,
    },
  });
}
