/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug]/runs/[runId] — analysis run detail.

   The corona of Aimily Strategy. Shows:
     - Run status + algorithm version + coverage
     - Family ROI scoreboard
     - Top recommendation candidates with 6 confidence dimensions
     - Scenarios row (base / creative_amplified / risk_minimized / kill_heavy)
     - Backtest scorecard (precision/recall per category)
     - LLM-generated learnings narrative
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStrategyDictForUser } from '@/lib/strategy/server-i18n';
import { RunActionsClient } from './RunActionsClient';
import { AllocateReplenishmentTrigger } from './AllocateReplenishmentTrigger';
import { RunScenariosEditor } from './RunScenariosEditor';
import { BUY_STRATEGY_ARCHETYPES, type BuyStrategyArchetypeId } from '@/lib/strategy/sales-archetypes';
import {
  CheckCircle2,
  Clock3,
  AlertCircle,
  PlayCircle,
  UploadCloud,
  Activity,
  Brain,
  FileSearch,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string; runId: string }>;
}

// Icons + Tailwind classes stay invariant; labels come from the active
// locale's dict resolved server-side from user.user_metadata.language.
const STATUS_VISUAL: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pending: { icon: Clock3, className: 'bg-carbon/[0.06] text-carbon/60' },
  ingesting: { icon: UploadCloud, className: 'bg-blue-50 text-blue-700' },
  scoring: { icon: PlayCircle, className: 'bg-amber-50 text-amber-700' },
  recommending: { icon: PlayCircle, className: 'bg-amber-50 text-amber-700' },
  complete: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' },
  failed: { icon: AlertCircle, className: 'bg-red-50 text-red-700' },
};

export default async function RunDetailPage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const dict = getStrategyDictForUser(user);
  const STATUS_META = Object.fromEntries(
    Object.entries(STATUS_VISUAL).map(([k, v]) => [
      k,
      {
        label: (dict.strategy.run.status as Record<string, string>)[k] ?? k,
        icon: v.icon,
        className: v.className,
      },
    ])
  ) as Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }>;
  const ACTION_LABELS = dict.strategy.run.actions as Record<string, string>;

  const { tenantSlug, runId } = await params;

  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select(
      'id, tenant_id, name, run_status, created_at, scoring_completed_at, recommending_completed_at, data_coverage_summary, error_log, algorithm_version_id, constraint_id, creative_brief_id, source_set_ids'
    )
    .eq('id', runId)
    .eq('tenant_id', tenant.id)
    .single();
  if (!run) notFound();

  // Pull constraint's chosen_archetype_id so the inline scenario editor
  // can seed its default action mix from the archetype's defaults.
  let runArchetypeDefaults = BUY_STRATEGY_ARCHETYPES[1].default_action_mix; // fallback B
  if (run.constraint_id) {
    const { data: cRow } = await supabaseAdmin
      .from('strategy_constraints')
      .select('chosen_archetype_id, action_mix')
      .eq('id', run.constraint_id)
      .maybeSingle();
    const aid = cRow?.chosen_archetype_id as BuyStrategyArchetypeId | null;
    if (aid) {
      const arch = BUY_STRATEGY_ARCHETYPES.find((a) => a.id === aid);
      if (arch) runArchetypeDefaults = arch.default_action_mix;
    }
    if (cRow?.action_mix && typeof cRow.action_mix === 'object') {
      const mix = cRow.action_mix as Record<string, number>;
      if (
        typeof mix.replenish_pct === 'number' &&
        typeof mix.new_sku_proposal_pct === 'number' &&
        typeof mix.family_extension_pct === 'number' &&
        typeof mix.kill_pct === 'number'
      ) {
        runArchetypeDefaults = {
          replenish_pct: mix.replenish_pct,
          new_sku_proposal_pct: mix.new_sku_proposal_pct,
          family_extension_pct: mix.family_extension_pct,
          kill_pct: mix.kill_pct,
        };
      }
    }
  }

  const [algoVer, families, candidates, scenarios, backtest, palettesRes, allocationsRes] = await Promise.all([
    supabaseAdmin
      .from('strategy_algorithm_versions')
      .select('version, thresholds')
      .eq('id', run.algorithm_version_id)
      .single(),
    supabaseAdmin
      .from('strategy_family_scores')
      .select('*')
      .eq('run_id', runId)
      .order('share_of_wallet_pct', { ascending: false }),
    supabaseAdmin
      .from('strategy_recommendation_candidates')
      .select('*')
      .eq('run_id', runId)
      .order('confidence_action', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('strategy_scenarios')
      .select('*')
      .eq('run_id', runId)
      .order('is_selected', { ascending: false })
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('strategy_backtests')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_recommended_palettes')
      .select('id, family_code, palette, created_at')
      .eq('run_id', runId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('strategy_replenishment_allocations')
      .select('scenario_id, product_fact_id, recommended_buy_units, projected_cost, ranking_score, score_components, justification')
      .eq('run_id', runId)
      .order('ranking_score', { ascending: false }),
  ]);
  const palettes = palettesRes.data || [];
  const allocations = (allocationsRes as any).data || [];

  // Build a product_fact_id → identity lookup so SKU + color candidates
  // render with product_name + model_ref + color, not opaque UUIDs.
  // For sku scope: scope_ref IS the product_fact_id.
  // For color scope: scope_ref is `<lineage_id>#<color_ref>` — we lookup
  // the lineage and render its display_name + the color.
  const skuIds = Array.from(
    new Set(
      (candidates.data || [])
        .filter((c: any) => c.scope === 'sku')
        .map((c: any) => c.scope_ref as string)
    )
  );
  const lineageIds = Array.from(
    new Set(
      (candidates.data || [])
        .filter((c: any) => c.scope === 'color' || c.scope === 'lineage')
        .map((c: any) => (c.scope_ref as string).split('#')[0])
    )
  );
  const [productIdRes, lineageIdRes, colorTaxRes] = await Promise.all([
    skuIds.length > 0
      ? supabaseAdmin
          .from('strategy_product_facts')
          .select('id, model_ref, color_ref, product_name, family_code, pvp, markup_pct')
          .in('id', skuIds)
      : Promise.resolve({ data: [] as any[] }),
    lineageIds.length > 0
      ? supabaseAdmin
          .from('strategy_sku_identity_graph')
          .select('id, canonical_id, display_name, variant_color_codes')
          .in('id', lineageIds)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin
      .from('strategy_taxonomies')
      .select('mapping')
      .eq('tenant_id', tenant.id)
      .eq('taxonomy_kind', 'color')
      .eq('is_active', true)
      .maybeSingle(),
  ]);
  const productById = new Map<string, any>(
    (productIdRes.data || []).map((p: any) => [p.id, p])
  );
  const lineageById = new Map<string, any>(
    (lineageIdRes.data || []).map((l: any) => [l.id, l])
  );
  const colorCodeMap = (
    ((colorTaxRes && (colorTaxRes as any).data?.mapping?.code_to_name) || {}) as Record<
      string,
      string
    >
  );

  const meta = STATUS_META[run.run_status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  const coverage = (run.data_coverage_summary || {}) as any;
  const learningsNarrative = coverage.learnings_narrative as string | undefined;
  const creativeApplication = coverage.creative_application as string | undefined;
  const softWarnings = Array.isArray(coverage.warnings)
    ? (coverage.warnings as unknown[]).filter((w): w is string => typeof w === 'string')
    : [];

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[2200px]">
        <Link
          href={`/strategy/${tenant.slug}`}
          className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em] mb-3 inline-block"
        >
          ← {tenant.display_name}
        </Link>

        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] ${meta.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {meta.label}
              </span>
              <span className="text-[11px] text-carbon/35 uppercase tracking-[0.08em]">
                Algo v{algoVer.data?.version || 'unknown'}
              </span>
            </div>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              {run.name || `Run · ${new Date(run.created_at).toLocaleString()}`}
            </h1>
            <p className="mt-3 text-[14px] text-carbon/50">
              {coverage.sku_count ?? '—'} SKUs · {coverage.family_count ?? '—'} families ·{' '}
              {coverage.lineages_count ?? '—'} lineages
            </p>
          </div>

          <RunActionsClient
            runId={run.id}
            runStatus={run.run_status}
            hasBacktest={!!backtest.data}
            tenantSlug={tenant.slug}
            familyCodes={(families.data || []).map((f: any) => f.family_code as string)}
          />
        </header>

        {run.run_status === 'failed' && (run.error_log as any[])?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-[16px] p-6 mb-8">
            <h2 className="text-[14px] font-semibold text-red-700 mb-2">Run failed</h2>
            <pre className="text-[12px] text-red-700 whitespace-pre-wrap font-mono">
              {JSON.stringify(run.error_log, null, 2)}
            </pre>
          </div>
        )}

        {softWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[16px] p-5 mb-8">
            <h2 className="text-[13px] font-semibold text-amber-900 mb-2 uppercase tracking-[0.08em]">
              Coverage warnings
            </h2>
            <ul className="text-[13px] text-amber-800 space-y-1.5 leading-[1.5]">
              {softWarnings.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* LLM narratives */}
        {(learningsNarrative || creativeApplication) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            {learningsNarrative && (
              <NarrativeCard
                icon={Brain}
                title={dict.strategy.run.sections.whatDataSays}
                markdown={learningsNarrative}
              />
            )}
            {creativeApplication && (
              <NarrativeCard
                icon={FileSearch}
                title={dict.strategy.run.sections.howCreativeModulated}
                markdown={creativeApplication}
              />
            )}
          </section>
        )}

        {/* Scenarios · editable inline */}
        {scenarios.data && scenarios.data.length > 0 && (
          <RunScenariosEditor
            tenantSlug={tenant.slug}
            runId={run.id}
            scenarios={(scenarios.data as any[]).map((s) => ({
              id: s.id,
              name: s.name,
              scenario_type: s.scenario_type,
              description: s.description ?? null,
              is_selected: !!s.is_selected,
              is_default: !!s.is_default,
              parent_scenario_id: s.parent_scenario_id ?? null,
              total_predicted_revenue: s.total_predicted_revenue != null ? Number(s.total_predicted_revenue) : null,
              total_predicted_margin: s.total_predicted_margin != null ? Number(s.total_predicted_margin) : null,
              total_predicted_buy_budget: s.total_predicted_buy_budget != null ? Number(s.total_predicted_buy_budget) : null,
              predicted_sku_count: s.predicted_sku_count ?? null,
              custom_action_mix:
                (s.constraint_satisfaction_summary as any)?.custom_action_mix ?? null,
            }))}
            defaultMix={runArchetypeDefaults}
          />
        )}

        {/* Family scoreboard */}
        {families.data && families.data.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-5">
              Family scoreboard
            </h2>
            <div className="bg-white rounded-[20px] p-6 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] text-carbon/50 uppercase tracking-[0.08em] border-b border-carbon/[0.06]">
                    <th className="text-left py-3 pr-4">Family</th>
                    <th className="text-right py-3 px-3">SKUs</th>
                    <th className="text-right py-3 px-3">Heroes</th>
                    <th className="text-right py-3 px-3">Dogs</th>
                    <th className="text-right py-3 px-3">ROI</th>
                    <th className="text-right py-3 px-3">Returns drag</th>
                    <th className="text-right py-3 px-3">Saturation</th>
                    <th className="text-right py-3 pl-3">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {families.data.map((f: any) => (
                    <tr key={f.id} className="border-b border-carbon/[0.04]">
                      <td className="py-3 pr-4 text-carbon font-medium">{f.family_code}</td>
                      <td className="text-right py-3 px-3 text-carbon/70">{f.sku_count}</td>
                      <td className="text-right py-3 px-3 text-emerald-700 font-semibold">
                        {f.hero_count}
                      </td>
                      <td className="text-right py-3 px-3 text-red-700">{f.dog_count}</td>
                      <td className="text-right py-3 px-3 text-carbon/80">
                        {f.family_roi != null ? Number(f.family_roi).toFixed(2) : '—'}
                      </td>
                      <td className="text-right py-3 px-3 text-carbon/70">
                        {f.return_drag_score != null
                          ? `${(Number(f.return_drag_score) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="text-right py-3 px-3 text-carbon/70">
                        {f.saturation_score != null
                          ? `${(Number(f.saturation_score) * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td className="text-right py-3 pl-3 text-carbon/70">
                        {f.share_of_wallet_pct != null
                          ? `${(Number(f.share_of_wallet_pct) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Generative recommendations (Paso 2): new SKUs + family extensions */}
        {(() => {
          const generativeCandidates = (candidates.data || []).filter(
            (c: any) => c.action_type === 'new_sku_proposal' || c.action_type === 'family_extension'
          );
          if (generativeCandidates.length === 0) return null;
          return (
            <section className="mb-8">
              <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-2">
                Generative recommendations
              </h2>
              <p className="text-[12px] text-carbon/50 mb-5 max-w-2xl leading-[1.5]">
                New SKU concepts extending portfolio winners + family-extension archetypes,
                synthesized from current run data × active creative brief × tenant brand DNA.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {generativeCandidates.map((c: any) => (
                  <RecommendationCard actionLabels={ACTION_LABELS}
                    key={c.id}
                    candidate={c}
                    productById={productById}
                    lineageById={lineageById}
                    colorCodeMap={colorCodeMap}
                  />
                ))}
              </div>
            </section>
          );
        })()}

        {/* Replenishment allocations (Paso 3) */}
        {allocations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-2">
              Replenishment allocation
            </h2>
            <p className="text-[12px] text-carbon/50 mb-5 max-w-2xl leading-[1.5]">
              Per-scenario buy units distributed by ranking_score = demand × runway × (1−returns) ×
              creative_alignment × (1−lead_time_penalty). SKUs with supplier lead time exceeding
              seasonal runway are excluded as <em>late_to_market</em> and surface a tension flag.
            </p>
            <div className="space-y-5">
              {(scenarios.data || []).map((s: any) => {
                const scenAllocs = allocations.filter((a: any) => a.scenario_id === s.id);
                if (scenAllocs.length === 0) return null;
                const allocated = scenAllocs.filter((a: any) => a.recommended_buy_units > 0);
                const excluded = scenAllocs.filter(
                  (a: any) => (a.score_components?.excluded_reason ?? null) != null
                );
                const totalUnits = allocated.reduce(
                  (acc: number, a: any) => acc + (Number(a.recommended_buy_units) || 0),
                  0
                );
                const totalCost = scenAllocs.reduce(
                  (acc: number, a: any) => acc + (Number(a.projected_cost) || 0),
                  0
                );
                return (
                  <div key={s.id} className="bg-white rounded-[20px] p-6 md:p-8">
                    <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                      <div>
                        <p className="text-[11px] text-carbon/40 uppercase tracking-[0.08em] mb-1">
                          {s.scenario_type.replace(/_/g, ' ')}
                        </p>
                        <h3 className="text-[16px] font-semibold text-carbon tracking-[-0.02em]">
                          {s.name}
                        </h3>
                      </div>
                      <div className="text-[12px] text-carbon/60">
                        <strong>{allocated.length}</strong> SKUs · {totalUnits.toLocaleString()} units · €{formatCompact(totalCost)}
                        {excluded.length > 0 && (
                          <span className="ml-3 text-red-700">
                            {excluded.length} excluded
                          </span>
                        )}
                      </div>
                    </header>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-[10px] text-carbon/50 uppercase tracking-[0.08em] border-b border-carbon/[0.06]">
                            <th className="text-left py-2 pr-3">SKU</th>
                            <th className="text-right py-2 px-2">Units</th>
                            <th className="text-right py-2 px-2">Cost</th>
                            <th className="text-right py-2 px-2">Score</th>
                            <th className="text-right py-2 px-2">Runway</th>
                            <th className="text-right py-2 px-2">Lead penalty</th>
                            <th className="text-right py-2 pl-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenAllocs.slice(0, 25).map((a: any) => {
                            const p = productById.get(a.product_fact_id);
                            const sc = a.score_components || {};
                            const excludedReason = sc.excluded_reason as string | null;
                            return (
                              <tr key={a.product_fact_id} className="border-b border-carbon/[0.04]">
                                <td className="py-1.5 pr-3 text-carbon">
                                  <div className="font-medium truncate max-w-[280px]">
                                    {p?.product_name || p?.model_ref || a.product_fact_id.slice(0, 8)}
                                  </div>
                                  {p?.model_ref && (
                                    <div className="text-[10px] text-carbon/45 font-mono">
                                      {p.model_ref}
                                    </div>
                                  )}
                                </td>
                                <td className="text-right py-1.5 px-2 text-carbon font-semibold">
                                  {Number(a.recommended_buy_units || 0).toLocaleString()}
                                </td>
                                <td className="text-right py-1.5 px-2 text-carbon/70">
                                  {a.projected_cost != null ? `€${formatCompact(Number(a.projected_cost))}` : '—'}
                                </td>
                                <td className="text-right py-1.5 px-2 text-carbon/60">
                                  {a.ranking_score != null ? Number(a.ranking_score).toFixed(3) : '—'}
                                </td>
                                <td className="text-right py-1.5 px-2 text-carbon/60">
                                  {sc.deliverable_days != null ? `${sc.deliverable_days}d` : '—'}
                                </td>
                                <td className="text-right py-1.5 px-2 text-carbon/60">
                                  {sc.lead_time_penalty != null ? `${Math.round(Number(sc.lead_time_penalty) * 100)}%` : '—'}
                                </td>
                                <td className="text-right py-1.5 pl-2">
                                  {excludedReason ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] bg-red-50 text-red-700">
                                      {excludedReason.replace(/_/g, ' ')}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 text-[11px]">✓ allocated</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recommended palettes (Paso 2) */}
        {palettes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-2">
              Recommended palettes
            </h2>
            <p className="text-[12px] text-carbon/50 mb-5 max-w-2xl leading-[1.5]">
              5-7 colors per family grounded in current winners × brand DNA × Perplexity color
              trend signals. Each color carries a DNA alignment tag (tight / aligned / bridge /
              tension).
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {palettes.map((p: any) => (
                <PaletteCard key={p.id} palette={p} />
              ))}
            </div>
          </section>
        )}

        {/* Top deterministic recommendations */}
        {(() => {
          const deterministic = (candidates.data || []).filter(
            (c: any) => c.action_type !== 'new_sku_proposal' && c.action_type !== 'family_extension'
          );
          if (deterministic.length === 0) return null;
          return (
            <section className="mb-8">
              <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-5">
                Top recommendations
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {deterministic.map((c: any) => (
                  <RecommendationCard actionLabels={ACTION_LABELS}
                    key={c.id}
                    candidate={c}
                    productById={productById}
                    lineageById={lineageById}
                    colorCodeMap={colorCodeMap}
                  />
                ))}
              </div>
            </section>
          );
        })()}

        {/* Backtest scorecard */}
        {backtest.data && (
          <section className="mb-8">
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-carbon/60" />
              Backtest scorecard
            </h2>
            <BacktestCard data={backtest.data} />
          </section>
        )}
      </div>
    </main>
  );
}

function ScenarioCard({
  scenario,
  tenantSlug: _tenantSlug,
  runId,
  allocationsCount,
  allocationsBudget,
}: {
  scenario: any;
  tenantSlug: string;
  runId: string;
  allocationsCount: number;
  allocationsBudget: number;
}) {
  const isSelected = scenario.is_selected;
  return (
    <div
      className={`bg-white rounded-[20px] p-6 md:p-8 transition-all ${
        isSelected ? 'ring-2 ring-carbon/20' : ''
      }`}
    >
      <p className="text-[11px] text-carbon/40 uppercase tracking-[0.08em] mb-2">
        {scenario.scenario_type.replace(/_/g, ' ')}
      </p>
      <h3 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mb-3 leading-[1.2]">
        {scenario.name}
      </h3>
      <p className="text-[12px] text-carbon/50 leading-[1.5] mb-5 line-clamp-3">
        {scenario.description}
      </p>
      <dl className="space-y-1.5 text-[12px]">
        <Metric label="SKUs" value={scenario.predicted_sku_count?.toLocaleString() ?? '—'} />
        <Metric
          label="Revenue"
          value={
            scenario.total_predicted_revenue != null
              ? `€${formatCompact(Number(scenario.total_predicted_revenue))}`
              : '—'
          }
        />
        <Metric
          label="Margin"
          value={
            scenario.total_predicted_margin != null
              ? `€${formatCompact(Number(scenario.total_predicted_margin))}`
              : '—'
          }
        />
        <Metric
          label="Buy budget"
          value={
            scenario.total_predicted_buy_budget != null
              ? `€${formatCompact(Number(scenario.total_predicted_buy_budget))}`
              : '—'
          }
        />
      </dl>
      {scenario.creative_application_summary && (
        <p className="mt-5 text-[11px] text-carbon/40 italic">
          {scenario.creative_application_summary}
        </p>
      )}
      {allocationsCount > 0 && (
        <p className="mt-3 text-[11px] text-carbon/60">
          <strong>{allocationsCount}</strong> SKUs allocated · spend €{formatCompact(allocationsBudget)}
        </p>
      )}
      <AllocateReplenishmentTrigger
        runId={runId}
        scenarioId={scenario.id}
        allocationsCount={allocationsCount}
      />
    </div>
  );
}

function RecommendationCard({
  candidate,
  productById,
  lineageById,
  colorCodeMap,
  actionLabels,
}: {
  candidate: any;
  productById: Map<string, any>;
  lineageById: Map<string, any>;
  colorCodeMap: Record<string, string>;
  actionLabels: Record<string, string>;
}) {
  const evidence = (candidate.evidence || {}) as Record<string, unknown>;
  const counter = (candidate.counter_evidence || {}) as Record<string, unknown>;
  const assumptions = (candidate.assumptions || []) as string[];
  const actionLabel = actionLabels[candidate.action_type] || candidate.action_type;
  const confidence = Number(candidate.confidence_action) || 0;
  const confidenceClass =
    confidence >= 0.75
      ? 'bg-emerald-50 text-emerald-700'
      : confidence >= 0.5
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700';

  // Resolve visual identity (product name + model_ref + color name) so the
  // card header is human-readable, not a UUID. Falls back gracefully when
  // a lookup misses or for non-sku/color scopes.
  const identity = resolveCandidateIdentity(candidate, productById, lineageById, colorCodeMap);

  // 6 confidence dimensions per Codex P1 fix — render the breakdown that
  // the BP §9 value prop hinges on. NULL creative_fit means "no brief".
  const dims: Array<{ key: string; label: string; value: number | null }> = [
    { key: 'data_completeness', label: 'Data', value: candidate.confidence_data_completeness != null ? Number(candidate.confidence_data_completeness) : null },
    { key: 'identity', label: 'Identity', value: candidate.confidence_identity != null ? Number(candidate.confidence_identity) : null },
    { key: 'demand', label: 'Demand', value: candidate.confidence_demand != null ? Number(candidate.confidence_demand) : null },
    { key: 'margin', label: 'Margin', value: candidate.confidence_margin != null ? Number(candidate.confidence_margin) : null },
    { key: 'creative_fit', label: 'Creative fit', value: candidate.confidence_creative_fit != null ? Number(candidate.confidence_creative_fit) : null },
    { key: 'action', label: 'Action', value: confidence },
  ];

  return (
    <article className="bg-white rounded-[20px] p-6 md:p-8">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex gap-3 items-start flex-1 min-w-0">
          {/* Visual thumbnail slot — placeholder until image_url is on facts */}
          <div
            className="flex-shrink-0 w-14 h-14 rounded-[10px] bg-carbon/[0.06] flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-[10px] uppercase tracking-[0.08em] text-carbon/35">
              {candidate.scope === 'sku' ? 'SKU' : candidate.scope === 'color' ? 'COL' : candidate.scope.slice(0, 3).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-carbon/40 uppercase tracking-[0.08em] mb-1">
              {candidate.scope}
              {identity.family ? ` · ${identity.family}` : ''}
            </p>
            <h3 className="text-[15px] font-semibold text-carbon leading-tight truncate" title={identity.headline}>
              {identity.headline}
            </h3>
            {identity.sub && (
              <p className="text-[11px] text-carbon/50 font-mono mt-1 truncate" title={identity.sub}>
                {identity.sub}
              </p>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] ${confidenceClass}`}>
          {actionLabel} · {(confidence * 100).toFixed(0)}%
        </span>
      </header>

      {/* Confidence dimensions breakdown */}
      <section className="mb-4">
        <p className="text-[11px] text-carbon/50 uppercase tracking-[0.08em] mb-2">
          Confidence breakdown · 6 dimensions
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {dims.map((d) => (
            <div key={d.key} className="bg-carbon/[0.03] rounded-[8px] p-2">
              <div className="text-[10px] text-carbon/40 uppercase tracking-[0.06em] truncate">
                {d.label}
              </div>
              <div
                className={`text-[13px] font-semibold mt-0.5 ${
                  d.value == null
                    ? 'text-carbon/30'
                    : d.value >= 0.7
                    ? 'text-emerald-700'
                    : d.value >= 0.4
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {d.value == null ? '—' : `${Math.round(d.value * 100)}%`}
              </div>
            </div>
          ))}
        </div>
      </section>

      {candidate.data_sufficiency_warning && (
        <p className="text-[12px] text-amber-700 bg-amber-50 px-3 py-2 rounded-[8px] mb-4">
          ⚠️ {candidate.data_sufficiency_warning}
        </p>
      )}

      <section className="mb-3">
        <p className="text-[11px] text-carbon/50 uppercase tracking-[0.08em] mb-1">Evidence</p>
        <pre className="text-[12px] text-carbon/70 bg-carbon/[0.03] rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {formatEvidence(evidence)}
        </pre>
      </section>

      {Object.keys(counter).length > 0 && (
        <section className="mb-3">
          <p className="text-[11px] text-carbon/50 uppercase tracking-[0.08em] mb-1">Counter-evidence</p>
          <pre className="text-[12px] text-carbon/60 bg-carbon/[0.03] rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {formatEvidence(counter)}
          </pre>
        </section>
      )}

      {assumptions.length > 0 && (
        <section>
          <p className="text-[11px] text-carbon/50 uppercase tracking-[0.08em] mb-1">Assumptions</p>
          <ul className="text-[12px] text-carbon/60 space-y-1">
            {assumptions.map((a, i) => (
              <li key={i}>· {a}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function BacktestCard({ data }: { data: any }) {
  return (
    <div className="bg-white rounded-[20px] p-8">
      <p className="text-[12px] text-carbon/50 mb-5">
        Trained on <span className="font-mono text-carbon">{(data.train_season_tags || []).join(', ')}</span>
        {' · '} Tested on <span className="font-mono text-carbon">{data.test_season_tag}</span>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <BacktestMetric label="Hero precision" value={data.precision_heroes} />
        <BacktestMetric label="Dog precision" value={data.precision_dogs} />
        <BacktestMetric label="Carryover precision" value={data.precision_carryover} />
        <BacktestMetric label="Return-trap catch" value={data.return_trap_catch_rate} />
      </div>
      {data.scorecard_summary?.skipped && (
        <p className="mt-5 text-[12px] text-amber-700 italic">
          {data.scorecard_summary.skipped}
        </p>
      )}
    </div>
  );
}

function BacktestMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-[28px] font-semibold text-carbon tracking-[-0.02em]">
        {value != null ? `${(Number(value) * 100).toFixed(0)}%` : '—'}
      </p>
      <p className="text-[11px] text-carbon/40 uppercase tracking-[0.08em] mt-1">{label}</p>
    </div>
  );
}

function NarrativeCard({
  icon: Icon,
  title,
  markdown,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  markdown: string;
}) {
  return (
    <div className="bg-white rounded-[20px] p-8 md:p-10">
      <Icon className="h-5 w-5 text-carbon/60 mb-4" />
      <h3 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mb-4">{title}</h3>
      <div className="text-[13px] text-carbon/70 leading-[1.7] whitespace-pre-line">
        {markdown}
      </div>
    </div>
  );
}

function PaletteCard({ palette }: { palette: any }) {
  const colors = (palette.palette?.colors || []) as Array<{
    name: string;
    hex: string;
    confidence?: number;
    dna_alignment?: 'tight' | 'aligned' | 'bridge' | 'tension';
    rationale?: string;
    source_winner_product_name?: string;
    tension?: string;
  }>;
  const briefAlignment = palette.palette?.brief_alignment ?? null;
  return (
    <article className="bg-white rounded-[20px] p-6 md:p-8">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] text-carbon/40 uppercase tracking-[0.08em] mb-1">
            Palette
          </p>
          <h3 className="text-[16px] font-semibold text-carbon font-mono break-all">
            {palette.family_code}
          </h3>
        </div>
        {briefAlignment != null && (
          <span className="text-[11px] text-carbon/50">
            Brief alignment {Math.round(Number(briefAlignment) * 100)}%
          </span>
        )}
      </header>
      <div className="grid grid-cols-1 gap-2">
        {colors.map((c, i) => {
          const alignmentTone =
            c.dna_alignment === 'tight'
              ? 'text-emerald-700 bg-emerald-50'
              : c.dna_alignment === 'aligned'
              ? 'text-emerald-700 bg-emerald-50/60'
              : c.dna_alignment === 'bridge'
              ? 'text-amber-700 bg-amber-50'
              : c.dna_alignment === 'tension'
              ? 'text-red-700 bg-red-50'
              : 'text-carbon/60 bg-carbon/[0.04]';
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-2 rounded-[10px] bg-carbon/[0.02]"
            >
              <span
                className="flex-shrink-0 w-10 h-10 rounded-[8px] border border-carbon/[0.06]"
                style={{ backgroundColor: c.hex }}
                aria-label={c.hex}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-carbon">{c.name}</span>
                  <span className="text-[11px] text-carbon/40 font-mono">{c.hex}</span>
                  {c.dna_alignment && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] ${alignmentTone}`}
                    >
                      {c.dna_alignment}
                    </span>
                  )}
                  {typeof c.confidence === 'number' && (
                    <span className="text-[11px] text-carbon/50">
                      {Math.round(c.confidence * 100)}%
                    </span>
                  )}
                </div>
                {c.rationale && (
                  <p className="text-[11px] text-carbon/55 leading-[1.5] mt-0.5">
                    {c.rationale}
                  </p>
                )}
                {c.source_winner_product_name && (
                  <p className="text-[11px] text-carbon/40 mt-0.5">
                    Extends winner: {c.source_winner_product_name}
                  </p>
                )}
                {c.tension && (
                  <p className="text-[11px] text-red-700 mt-0.5">⚠ {c.tension}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-carbon/50">{label}</span>
      <span className="text-carbon font-semibold">{value}</span>
    </div>
  );
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

interface CandidateIdentity {
  headline: string;
  sub: string | null;
  family: string | null;
}

/**
 * Turn a recommendation_candidate into a human-readable identity for the
 * card header. SKU candidates resolve via productById; color candidates
 * resolve via lineageById + colorCodeMap; family/archetype use the raw ref.
 */
function resolveCandidateIdentity(
  candidate: { scope: string; scope_ref: string },
  productById: Map<string, any>,
  lineageById: Map<string, any>,
  colorCodeMap: Record<string, string>
): CandidateIdentity {
  if (candidate.scope === 'sku') {
    const p = productById.get(candidate.scope_ref);
    if (p) {
      const colorName =
        p.color_ref && colorCodeMap[p.color_ref]
          ? colorCodeMap[p.color_ref].replace(/_/g, ' ')
          : p.color_ref;
      return {
        headline: p.product_name || p.model_ref,
        sub: `${p.model_ref}${colorName ? ` · ${colorName}` : ''}${p.pvp ? ` · €${Number(p.pvp).toFixed(2)}` : ''}`,
        family: p.family_code || null,
      };
    }
    return { headline: candidate.scope_ref, sub: null, family: null };
  }
  if (candidate.scope === 'color') {
    const [lineageId, colorRef] = candidate.scope_ref.split('#');
    const lineage = lineageById.get(lineageId);
    const colorName =
      colorRef && colorCodeMap[colorRef]
        ? colorCodeMap[colorRef].replace(/_/g, ' ')
        : colorRef;
    if (lineage) {
      return {
        headline: lineage.display_name || lineage.canonical_id,
        sub: `Lineage ${lineage.canonical_id} · ${colorName}`,
        family: null,
      };
    }
    return { headline: candidate.scope_ref, sub: null, family: null };
  }
  if (candidate.scope === 'lineage') {
    const lineage = lineageById.get(candidate.scope_ref);
    if (lineage) {
      return {
        headline: lineage.display_name || lineage.canonical_id,
        sub: `Lineage ${lineage.canonical_id}`,
        family: null,
      };
    }
  }
  return { headline: candidate.scope_ref, sub: null, family: null };
}

function formatEvidence(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(([, v]) => v != null && typeof v !== 'object');
  if (entries.length === 0) return JSON.stringify(obj, null, 2).slice(0, 300);
  return entries.map(([k, v]) => `${k}: ${typeof v === 'number' ? (Number.isInteger(v) ? v : (v as number).toFixed(3)) : v}`).join('\n');
}
