/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug]/runs/[runId]/decision-pack — printable decision pack.

   Customer-facing pilot deliverable per BP §10 ("Season Performance
   Intelligence Pack"). User clicks "Print" / Cmd+P → Save as PDF, gets a
   clean A4 multi-page report:

     1. Cover page — tenant + run metadata + headline
     2. Executive summary (LLM learnings narrative)
     3. Family scoreboard
     4. Top recommendations (with 6 confidence dims)
     5. Scenarios comparison
     6. Backtest scorecard (when available)

   Print-optimised: white bg, tight typography, page-break-inside controls,
   no nav chrome. Server component, full data SSR'd.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStrategyDictForUser } from '@/lib/strategy/server-i18n';
import {
  humanizeEvidence,
  resolveCandidateIdentity,
} from '@/lib/strategy/recommendation-presenter';
import { DecisionPackPrintTrigger } from './DecisionPackPrintTrigger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string; runId: string }>;
}

export default async function DecisionPackPage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const dict = getStrategyDictForUser(user);
  const ACTION_LABELS = dict.strategy.run.actions as Record<string, string>;
  const evidenceLabels = dict.strategy.run.evidence;
  const dp = dict.strategy.decisionPack;
  const rs = dict.strategy.run.sections;

  const { tenantSlug, runId } = await params;
  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select(
      'id, tenant_id, name, run_status, created_at, scoring_completed_at, recommending_completed_at, data_coverage_summary, algorithm_version_id, source_set_ids'
    )
    .eq('id', runId)
    .eq('tenant_id', tenant.id)
    .single();
  if (!run) notFound();

  const [families, candidates, scenarios, backtest, algoVer, sources] = await Promise.all([
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
      .order('is_default', { ascending: false }),
    supabaseAdmin
      .from('strategy_backtests')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_algorithm_versions')
      .select('version')
      .eq('id', run.algorithm_version_id)
      .single(),
    supabaseAdmin
      .from('strategy_sources')
      .select('season, source_format, observation_date, record_count')
      .in('id', (run.source_set_ids as string[]) || []),
  ]);

  // Hydrate product / lineage / color taxonomy so cards render names not UUIDs
  // (same pattern as run-detail/page.tsx). Without these the resolver falls
  // back to short UUIDs + "details unavailable" — still better than dumping
  // a full 36-char ref into the headline.
  const candidateRows = candidates.data || [];
  const skuIds = Array.from(
    new Set(
      candidateRows.filter((c: any) => c.scope === 'sku').map((c: any) => c.scope_ref as string)
    )
  );
  const lineageIds = Array.from(
    new Set(
      candidateRows
        .filter((c: any) => c.scope === 'color' || c.scope === 'lineage')
        .map((c: any) => (c.scope_ref as string).split('#')[0])
    )
  );
  const [productIdRes, lineageIdRes, colorTaxRes] = await Promise.all([
    skuIds.length > 0
      ? supabaseAdmin
          .from('strategy_product_facts')
          .select('id, model_ref, color_ref, product_name, family_code, pvp')
          .in('id', skuIds)
      : Promise.resolve({ data: [] as any[] }),
    lineageIds.length > 0
      ? supabaseAdmin
          .from('strategy_sku_identity_graph')
          .select('id, canonical_id, display_name')
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
    ((colorTaxRes && (colorTaxRes as any).data?.mapping?.code_to_name) || {}) as Record<string, string>
  );

  const coverage = (run.data_coverage_summary || {}) as any;
  const learningsNarrative = coverage.learnings_narrative as string | undefined;
  const creativeApplication = coverage.creative_application as string | undefined;

  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4 portrait; margin: 18mm 16mm; }
            @media print {
              .no-print { display: none !important; }
              .page-break-before { page-break-before: always; }
              .page-break-inside-avoid { page-break-inside: avoid; }
              body { background: white !important; }
              .decision-pack { background: white !important; padding: 0 !important; }
              .decision-pack h1, .decision-pack h2, .decision-pack h3 { color: black !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            }
          `,
        }}
      />

      {/* Print trigger toolbar (hidden on print) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2 bg-white shadow-lg rounded-full px-4 py-2 border border-carbon/10">
        <Link
          href={`/strategy/${tenant.slug}/runs/${run.id}`}
          className="text-[12px] text-carbon/60 hover:text-carbon px-3 py-1"
        >
          ← Back to run
        </Link>
        <DecisionPackPrintTrigger />
      </div>

      <main className="decision-pack bg-white min-h-screen text-carbon font-sans" style={{ maxWidth: '210mm', margin: '0 auto', padding: '12mm 8mm' }}>
        {/* ─── Cover ─── */}
        <section className="page-break-inside-avoid" style={{ paddingTop: '14mm' }}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-carbon/40 mb-3">
            Aimily Strategy · Season Performance Intelligence Pack
          </p>
          <h1 className="text-[38px] font-medium tracking-[-0.03em] leading-[1.1] mb-3">
            {run.name || `Strategic Review · ${new Date(run.created_at).toLocaleDateString()}`}
          </h1>
          <p className="text-[14px] text-carbon/60 mb-8 leading-[1.6]">
            Forensic decision pack for <strong>{tenant.display_name}</strong>. Evidence-backed
            carryover / kill / resize / recolor / markdown / investigate recommendations,
            grounded in the season&apos;s actual SKU performance.
          </p>
          <div className="border-t border-b border-carbon/10 py-5 grid grid-cols-3 gap-6 text-[11px] uppercase tracking-[0.08em] text-carbon/50">
            <div>
              <div className="text-[18px] font-medium text-carbon tracking-[-0.02em] normal-case">
                {coverage.sku_count ?? '—'}
              </div>
              <div className="mt-1">{dp.skusScored}</div>
            </div>
            <div>
              <div className="text-[18px] font-medium text-carbon tracking-[-0.02em] normal-case">
                {coverage.family_count ?? '—'}
              </div>
              <div className="mt-1">{dp.familiesAnalysed}</div>
            </div>
            <div>
              <div className="text-[18px] font-medium text-carbon tracking-[-0.02em] normal-case">
                {coverage.lineages_count ?? '—'}
              </div>
              <div className="mt-1">{dp.lineagesTracked}</div>
            </div>
          </div>
          <p className="mt-6 text-[11px] text-carbon/40 leading-[1.5]">
            Generated {generatedAt} · algorithm v{algoVer.data?.version || '1.0.0'} ·{' '}
            {(sources.data || []).length} source feed{(sources.data || []).length === 1 ? '' : 's'}.
          </p>
          {(sources.data || []).length > 0 && (
            <ul className="mt-2 text-[10px] text-carbon/40 leading-[1.5]">
              {(sources.data || []).map((s: any, i: number) => (
                <li key={i}>
                  · {s.season} · {s.source_format} · {s.record_count} records · obs{' '}
                  {new Date(s.observation_date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ─── Executive summary ─── */}
        {learningsNarrative && (
          <section className="page-break-before" style={{ paddingTop: '8mm' }}>
            <h2 className="text-[22px] font-medium tracking-[-0.02em] mb-3">{dp.executiveSummary}</h2>
            <p className="text-[10px] uppercase tracking-[0.08em] text-carbon/40 mb-4">
              {rs.whatDataSays}
            </p>
            <div className="text-[12px] text-carbon/80 leading-[1.7] whitespace-pre-line">
              {learningsNarrative}
            </div>
            {creativeApplication && (
              <>
                <p className="mt-7 text-[10px] uppercase tracking-[0.08em] text-carbon/40 mb-4">
                  {rs.howCreativeModulated}
                </p>
                <div className="text-[12px] text-carbon/80 leading-[1.7] whitespace-pre-line">
                  {creativeApplication}
                </div>
              </>
            )}
          </section>
        )}

        {/* ─── Scenarios ─── */}
        {scenarios.data && scenarios.data.length > 0 && (
          <section className="page-break-before" style={{ paddingTop: '8mm' }}>
            <h2 className="text-[22px] font-medium tracking-[-0.02em] mb-3">{dp.scenarios}</h2>
            <p className="text-[11px] text-carbon/50 mb-5 leading-[1.5]">
              Each scenario is a deterministic assembly of recommendation candidates honouring
              Bucket A constraints. Pick one as the base; deviations are logged in the run.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {scenarios.data.map((s: any) => (
                <article
                  key={s.id}
                  className="page-break-inside-avoid border border-carbon/12 rounded-[12px] p-5"
                >
                  <p className="text-[9px] uppercase tracking-[0.1em] text-carbon/40 mb-2">
                    {s.scenario_type?.replace(/_/g, ' ')}
                  </p>
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] mb-3">{s.name}</h3>
                  <p className="text-[10px] text-carbon/60 leading-[1.55] mb-4 line-clamp-6 whitespace-pre-line">
                    {s.description}
                  </p>
                  <dl className="space-y-1 text-[10px]">
                    <Row label={rs.skus} value={(s.predicted_sku_count ?? 0).toString()} />
                    <Row label={rs.revenue} value={eur(s.total_predicted_revenue)} />
                    <Row label={rs.margin} value={eur(s.total_predicted_margin)} />
                    <Row label={rs.buyBudget} value={eur(s.total_predicted_buy_budget)} />
                    {s.creative_application_summary && (
                      <li className="text-[9px] text-carbon/50 italic mt-2 pt-2 border-t border-carbon/06">
                        {s.creative_application_summary}
                      </li>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ─── Family scoreboard ─── */}
        {families.data && families.data.length > 0 && (
          <section className="page-break-before" style={{ paddingTop: '8mm' }}>
            <h2 className="text-[22px] font-medium tracking-[-0.02em] mb-3">{dp.familyScoreboard}</h2>
            <p className="text-[11px] text-carbon/50 mb-5 leading-[1.5]">
              Heroes / dogs / saturation per family. ROI is post-returns, post-markdown.
            </p>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-carbon/15">
                  <th className="text-left py-2 pr-3 text-[9px] uppercase tracking-[0.08em] text-carbon/50">Family</th>
                  <th className="text-right py-2 px-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">SKUs</th>
                  <th className="text-right py-2 px-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">Heroes</th>
                  <th className="text-right py-2 px-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">Dogs</th>
                  <th className="text-right py-2 px-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">ROI</th>
                  <th className="text-right py-2 px-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">{dp.returnsCol}</th>
                  <th className="text-right py-2 px-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">{dp.saturationCol}</th>
                  <th className="text-right py-2 pl-2 text-[9px] uppercase tracking-[0.08em] text-carbon/50">Share</th>
                </tr>
              </thead>
              <tbody>
                {families.data.map((f: any) => (
                  <tr key={f.id} className="border-b border-carbon/06">
                    <td className="py-1.5 pr-3 font-medium">{f.family_code}</td>
                    <td className="text-right py-1.5 px-2">{f.sku_count}</td>
                    <td className="text-right py-1.5 px-2 font-semibold" style={{ color: '#047857' }}>
                      {f.hero_count}
                    </td>
                    <td className="text-right py-1.5 px-2" style={{ color: '#b91c1c' }}>
                      {f.dog_count}
                    </td>
                    <td className="text-right py-1.5 px-2">{num(f.family_roi)}</td>
                    <td className="text-right py-1.5 px-2">{pct(f.return_drag_score)}</td>
                    <td className="text-right py-1.5 px-2">{pct(f.saturation_score)}</td>
                    <td className="text-right py-1.5 pl-2">{pct(f.share_of_wallet_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ─── Top recommendations ─── */}
        {candidates.data && candidates.data.length > 0 && (
          <section className="page-break-before" style={{ paddingTop: '8mm' }}>
            <h2 className="text-[22px] font-medium tracking-[-0.02em] mb-3">{dp.topRecommendations}</h2>
            <p className="text-[11px] text-carbon/50 mb-5 leading-[1.5]">
              {dp.topRecommendationsIntro}
            </p>
            <div className="space-y-3">
              {candidates.data.slice(0, 12).map((c: any) => {
                const identity = resolveCandidateIdentity(c, productById, lineageById, colorCodeMap, evidenceLabels);
                const evidenceRows = humanizeEvidence((c.evidence || {}) as Record<string, unknown>, evidenceLabels, ACTION_LABELS);
                return (
                <article
                  key={c.id}
                  className="page-break-inside-avoid border border-carbon/12 rounded-[10px] p-4"
                >
                  <header className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-carbon/40 mb-0.5">
                        {c.scope}
                        {identity.family ? ` · ${identity.family}` : ''}
                      </p>
                      <p className="text-[12px] font-semibold truncate" title={identity.headline}>
                        {identity.headline}
                      </p>
                      {identity.sub && (
                        <p className={`text-[10px] mt-0.5 truncate ${identity.subIsCode ? 'text-carbon/40 font-mono' : 'text-carbon/55'}`}>
                          {identity.sub}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.08em]"
                        style={{
                          background:
                            (c.confidence_action ?? 0) >= 0.75
                              ? '#d1fae5'
                              : (c.confidence_action ?? 0) >= 0.5
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            (c.confidence_action ?? 0) >= 0.75
                              ? '#047857'
                              : (c.confidence_action ?? 0) >= 0.5
                              ? '#b45309'
                              : '#b91c1c',
                        }}
                      >
                        {ACTION_LABELS[c.action_type] || c.action_type} ·{' '}
                        {pct(c.confidence_action)}
                      </span>
                    </div>
                  </header>
                  {evidenceRows.length > 0 && (
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
                      {evidenceRows.map((row) => (
                        <li key={row.key} className="flex items-baseline justify-between gap-2">
                          <span className="text-carbon/45 truncate">{row.label}</span>
                          <span
                            className={`font-medium tabular-nums text-right ${
                              row.tone === 'good'
                                ? 'text-emerald-700'
                                : row.tone === 'bad'
                                ? 'text-red-700'
                                : 'text-carbon/80'
                            }`}
                          >
                            {row.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {Array.isArray(c.assumptions) && c.assumptions.length > 0 && (
                    <ul className="mt-2 text-[9px] text-carbon/55 space-y-0.5">
                      {c.assumptions.map((a: string, i: number) => (
                        <li key={i}>· {a}</li>
                      ))}
                    </ul>
                  )}
                  {c.data_sufficiency_warning && (
                    <p className="mt-2 text-[9px] text-amber-700 italic">
                      ⚠ {c.data_sufficiency_warning}
                    </p>
                  )}
                </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Backtest ─── */}
        {backtest.data && (
          <section className="page-break-before" style={{ paddingTop: '8mm' }}>
            <h2 className="text-[22px] font-medium tracking-[-0.02em] mb-3">{dp.backtestScorecard}</h2>
            <p className="text-[11px] text-carbon/50 mb-5 leading-[1.5]">
              Trained on{' '}
              <span className="font-mono">{(backtest.data.train_season_tags || []).join(', ')}</span>;
              tested against actual outcomes in{' '}
              <span className="font-mono">{backtest.data.test_season_tag}</span>. This is the
              calibration that earns the right to recommend next season.
            </p>
            {backtest.data.scorecard_summary?.skipped ? (
              <p className="text-[11px] text-amber-700 italic">
                {backtest.data.scorecard_summary.skipped}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                <Stat label={rs.heroPrecision} value={backtest.data.precision_heroes} />
                <Stat label={rs.dogPrecision} value={backtest.data.precision_dogs} />
                <Stat label={rs.carryoverPrecision} value={backtest.data.precision_carryover} />
                <Stat label="Return-trap catch" value={backtest.data.return_trap_catch_rate} />
              </div>
            )}
          </section>
        )}

        {/* ─── Methodology footer ─── */}
        <section className="page-break-before" style={{ paddingTop: '8mm' }}>
          <h2 className="text-[22px] font-medium tracking-[-0.02em] mb-3">{dp.methodology}</h2>
          <div className="text-[11px] text-carbon/70 leading-[1.65] space-y-3">
            <p>
              <strong>Deterministic-first.</strong> All scores come from 10 versioned, auditable
              classifiers running over the normalised SKU performance facts. The LLM only
              translates the structured scores into narrative — it never calculates.
            </p>
            <p>
              <strong>Six confidence dimensions, never one.</strong> Every recommendation surfaces
              data-completeness, identity, demand, margin, creative-fit, and action confidence so
              you see exactly where the signal is strong vs thin.
            </p>
            <p>
              <strong>Insufficient-evidence verdicts are a feature.</strong> When data coverage,
              identity or demand confidence is below threshold the engine refuses to issue a
              strong recommendation. Calibrated uncertainty over confident guessing.
            </p>
            <p>
              <strong>Algorithm versioning.</strong> This run pinned to algorithm v
              {algoVer.data?.version || '1.0.0'}. Every score, candidate, and scenario reproduces
              exactly with this version. Newer algorithm versions create new analysis runs; older
              runs are never mutated.
            </p>
            <p>
              <strong>Reproducibility.</strong> The full evidence trail per recommendation lives
              in the run record. Customer audits can request the raw scorecards, classifier
              traces, and source feed metadata at any point.
            </p>
          </div>
          <p className="mt-8 text-[9px] text-carbon/40 leading-[1.5]">
            Confidential. Generated for {tenant.display_name} only. © Aimily Strategy. Not for
            public distribution.
          </p>
        </section>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between text-[10px]">
      <span className="text-carbon/50">{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-[26px] font-medium tracking-[-0.02em]">{pct(value)}</div>
      <div className="text-[9px] uppercase tracking-[0.08em] text-carbon/40 mt-1">{label}</div>
    </div>
  );
}

function num(v: any): string {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

function pct(v: any): string {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

function eur(v: any): string {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `€${(n / 1e3).toFixed(1)}K`;
  return `€${n.toFixed(0)}`;
}

function formatEvidence(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(
    ([, v]) => v != null && typeof v !== 'object'
  );
  if (entries.length === 0) return '';
  return entries
    .slice(0, 8)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === 'number' ? (Number.isInteger(v) ? v : Number(v).toFixed(3)) : v}`
    )
    .join('   ·   ');
}
