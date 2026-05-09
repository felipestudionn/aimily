'use client';

/**
 * 02.4 Plan Financiero · FinancialPlanContentV2
 *
 * Sprint B.4 (2026-05-09) — canonical pattern, mirrors DistributionContent.
 * Reads CIS strategy + distribution + pricing seeds. Auto-fires propose
 * (deterministic math + Sonnet narrative) on first mount, then exposes
 * a 4-axis dashboard editor:
 *
 *   1. P&L Y1            — 4 big numbers + waterfall (revenue / cogs /
 *                          marketing / net)
 *   2. Cash flow mensual — bar/line chart over 12 months + drop markers
 *   3. Revenue per channel — donut + per-channel rows (units, eff. price)
 *   4. Markdown calendar — start week + initial / deep markdown depth
 *   5. Riesgos & palancas — Sonnet's editorial layer
 *
 * Inputs (target_margin_pct, sales_target_y1, marketing_spend, etc.) are
 * editable inline; recompute() is local + instant.
 *
 * Confirm writes 7-8 CIS keys under merchandising.budget.* and ends Block 2.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { Loader2, ArrowLeft, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CanonicalActionBar } from '@/components/workspace/CanonicalActionBar';
import { computeFinancialPlan, type FinancialInputs, type FinancialPlan } from '@/lib/financial-plan/calculate';
import type { FinancialNarrative } from '@/lib/ai/financial-narrative-prompts';

interface Props {
  collectionContext: { collectionPlanId: string; collectionName?: string };
  language?: string;
  basePath: string;
}

const localeFor = (lang: string) => (lang === 'en' ? 'en-US' : 'es-ES');

function fmtNum(n: number | null | undefined, locale: string): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(locale).format(Math.round(n));
}
function fmtCurrency(n: number | null | undefined, locale: string): string {
  if (n == null || !Number.isFinite(n)) return '€0';
  return '€' + new Intl.NumberFormat(locale).format(Math.round(n));
}
function parseNum(s: string): number {
  const cleaned = s.replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const CHANNEL_ACCENTS: Record<string, string> = {
  dtc_online:    '#b6c8c7',
  dtc_physical:  '#c5caa8',
  wholesale:     '#fff4ce',
  marketplace:   '#f1efed',
};
const ACCENT_DARK = '#001519';

// ── P&L card ───────────────────────────────────────────────────────────────

function PnLCard({
  pnl, inputs, onEditMarginPct, onEditSalesTarget, onEditMarketing, locale,
}: {
  pnl: FinancialPlan['pnl'];
  inputs: FinancialInputs;
  onEditMarginPct: (n: number) => void;
  onEditSalesTarget: (n: number) => void;
  onEditMarketing: (n: number) => void;
  locale: string;
}) {
  const t = useTranslation();
  const labels = (t.financial as Record<string, string>) || {};

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.pnlTitle || 'P&L Y1'}
        </span>
        <span className="text-[11px] text-carbon/40 tabular-nums">
          ROI {pnl.return_on_investment.toFixed(2)}×
        </span>
      </div>

      {/* Revenue (editable) */}
      <div className="mb-4 pb-4 border-b border-carbon/[0.06]">
        <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium mb-1">
          {labels.revenue || 'Revenue Y1'}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] text-carbon/45">€</span>
          <input
            type="text"
            inputMode="numeric"
            value={fmtNum(inputs.sales_target_y1, locale)}
            onChange={(e) => onEditSalesTarget(parseNum(e.target.value))}
            className="text-[28px] font-semibold text-carbon tabular-nums tracking-[-0.02em] bg-transparent outline-none focus:bg-carbon/[0.03] rounded px-1 py-0.5 w-[180px]"
          />
        </div>
      </div>

      {/* Waterfall */}
      <div className="space-y-3">
        <Row label={labels.cogs || 'COGS'} value={`-${fmtCurrency(pnl.cogs, locale)}`} muted />
        <Row label={labels.grossProfit || 'Beneficio bruto'} value={fmtCurrency(pnl.gross_profit, locale)} extra={
          <span className="inline-flex items-baseline gap-1 rounded-full bg-carbon/[0.03] px-2.5 py-1">
            <input
              type="text"
              inputMode="numeric"
              value={inputs.target_margin_pct}
              onChange={(e) => onEditMarginPct(parseNum(e.target.value))}
              className="w-[28px] text-right text-[11px] font-semibold text-carbon tabular-nums bg-transparent outline-none"
            />
            <span className="text-[10px] text-carbon/45">% margen</span>
          </span>
        } />
        <Row label={labels.marketing || 'Marketing'} value={
          <span className="inline-flex items-baseline gap-1">
            <span className="text-[11px] text-carbon/45">-€</span>
            <input
              type="text"
              inputMode="numeric"
              value={fmtNum(inputs.investment.marketing, locale)}
              onChange={(e) => onEditMarketing(parseNum(e.target.value))}
              className="text-[14px] font-semibold text-carbon tabular-nums bg-transparent outline-none focus:bg-carbon/[0.03] rounded px-1 w-[100px] text-right"
            />
          </span>
        } muted />
        <div className="pt-3 border-t border-carbon/[0.06]">
          <Row
            label={labels.netContribution || 'Contribución neta'}
            value={fmtCurrency(pnl.net_contribution, locale)}
            extra={<span className="text-[11px] text-carbon/45 tabular-nums">{pnl.net_margin_pct}%</span>}
            highlight
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false, highlight = false, extra }: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  highlight?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[12px] ${muted ? 'text-carbon/45' : 'text-carbon/65'} ${highlight ? 'font-semibold' : ''}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        {extra}
        <span className={`text-[14px] font-semibold tabular-nums ${highlight ? 'text-carbon' : muted ? 'text-carbon/55' : 'text-carbon'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ── Monthly cash flow card ─────────────────────────────────────────────────

function CashFlowCard({
  monthly, breakEven, locale,
}: {
  monthly: FinancialPlan['monthly_revenue'];
  breakEven: FinancialPlan['break_even'];
  locale: string;
}) {
  const t = useTranslation();
  const labels = (t.financial as Record<string, string>) || {};
  const max = Math.max(1, ...monthly.map(m => m.revenue));
  const W = 460, H = 140, padX = 16, padY = 14;
  const innerW = W - padX * 2, innerH = H - padY * 2;
  const xs = monthly.map((_, i) => padX + (i / (monthly.length - 1)) * innerW);
  const ys = monthly.map(m => padY + innerH * (1 - (m.revenue / max)));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const areaPath = `${path} L${xs[xs.length - 1]},${padY + innerH} L${xs[0]},${padY + innerH} Z`;

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.cashflowTitle || 'Cash flow mensual'}
        </span>
        {breakEven.week ? (
          <span className="text-[11px] text-carbon/40 tabular-nums">
            <TrendingUp className="inline h-3 w-3 mr-1 text-emerald-700" />
            {labels.breakEven || 'Break-even'} {labels.weekShort || 'sem'} {breakEven.week}
          </span>
        ) : (
          <span className="text-[11px] text-amber-700 tabular-nums">{labels.noBreakEven || 'No break-even Y1'}</span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[140px] mb-3">
        {/* Grid */}
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={padX} x2={W - padX} y1={padY + innerH * (1 - g)} y2={padY + innerH * (1 - g)} stroke="rgba(0,0,0,0.04)" strokeDasharray="2 4" />
        ))}
        {/* Area + line */}
        <path d={areaPath} fill={CHANNEL_ACCENTS.dtc_online} fillOpacity="0.35" />
        <path d={path} fill="none" stroke={ACCENT_DARK} strokeWidth="2" />
        {/* Drop markers */}
        {monthly.map((m, i) => m.drop_label ? (
          <g key={i}>
            <line x1={xs[i]} x2={xs[i]} y1={padY} y2={padY + innerH} stroke={ACCENT_DARK} strokeOpacity="0.15" strokeDasharray="3 3" />
            <text x={xs[i]} y={padY - 3} fontSize="9" fill={ACCENT_DARK} fillOpacity="0.55" textAnchor="middle">{m.drop_label}</text>
          </g>
        ) : null)}
        {/* Points */}
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="3" fill={ACCENT_DARK} />
        ))}
      </svg>

      <div className="grid grid-cols-12 gap-1">
        {monthly.map(m => (
          <div key={m.month} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-carbon/40 tabular-nums">M{m.month}</span>
            <span className="text-[10px] font-medium text-carbon/65 tabular-nums truncate" title={fmtCurrency(m.revenue, locale)}>
              {Math.round(m.revenue / 1000)}k
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Channel revenue card ───────────────────────────────────────────────────

function ChannelRevenueCard({
  channels, locale,
}: {
  channels: FinancialPlan['channel_revenue'];
  locale: string;
}) {
  const t = useTranslation();
  const labels = (t.financial as Record<string, string>) || {};
  const total = channels.reduce((s, c) => s + c.revenue, 0) || 1;
  const RADIUS = 50, STROKE = 12;
  const C = 2 * Math.PI * RADIUS;
  let cum = 0;
  const segs = channels.map(c => {
    const pct = c.revenue / total;
    const dasharray = `${C * pct} ${C}`;
    const offset = -cum * C;
    cum += pct;
    return { ...c, dasharray, offset };
  });

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.channelRevenueTitle || 'Revenue por canal'}
        </span>
        <span className="text-[11px] text-carbon/40 tabular-nums">{fmtCurrency(total, locale)}</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="124" height="124" viewBox="0 0 124 124">
            <circle cx="62" cy="62" r={RADIUS} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={STROKE} />
            {segs.map(s => s.revenue > 0 ? (
              <circle
                key={s.channel}
                cx="62" cy="62" r={RADIUS}
                fill="none"
                stroke={CHANNEL_ACCENTS[s.channel] || '#000'}
                strokeWidth={STROKE}
                strokeDasharray={s.dasharray}
                strokeDashoffset={s.offset}
                transform="rotate(-90 62 62)"
              />
            ) : null)}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[14px] font-semibold text-carbon tabular-nums">{channels.reduce((s, c) => s + c.units, 0)}</span>
            <span className="text-[9px] tracking-[0.1em] uppercase text-carbon/40 mt-0.5">{labels.units || 'unidades'}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {channels.map(c => (
            <div key={c.channel} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_ACCENTS[c.channel] || '#000' }} />
              <span className="text-[12px] text-carbon/65 flex-1 truncate">{c.label}</span>
              <span className="text-[11px] text-carbon/40 tabular-nums">{c.units} u</span>
              <span className="text-[12px] font-semibold text-carbon tabular-nums w-[80px] text-right">{fmtCurrency(c.revenue, locale)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Markdown calendar card ─────────────────────────────────────────────────

function MarkdownCard({
  markdown,
}: {
  markdown: FinancialPlan['markdown_calendar'];
}) {
  const t = useTranslation();
  const labels = (t.financial as Record<string, string>) || {};

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.markdownTitle || 'Calendario de markdown'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-[14px] bg-carbon/[0.03] p-4">
          <p className="text-[10px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-1">
            {labels.initialMarkdown || 'Markdown inicial'}
          </p>
          <p className="text-[20px] font-semibold text-carbon tabular-nums">
            -{markdown.initial_markdown_pct}%
          </p>
          <p className="text-[10px] text-carbon/45 mt-1">
            {labels.weekShort || 'Sem'} {markdown.start_week}
          </p>
        </div>
        <div className="rounded-[14px] bg-carbon/[0.03] p-4">
          <p className="text-[10px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-1">
            {labels.deepMarkdown || 'Markdown profundo'}
          </p>
          <p className="text-[20px] font-semibold text-carbon tabular-nums">
            -{markdown.deep_markdown_pct}%
          </p>
          <p className="text-[10px] text-carbon/45 mt-1">
            {labels.weekShort || 'Sem'} {markdown.deep_markdown_week}
          </p>
        </div>
      </div>

      <p className="text-[12px] text-carbon/55 italic leading-relaxed">
        {markdown.rationale}
      </p>
    </div>
  );
}

// ── Risks + Levers card ────────────────────────────────────────────────────

function RisksLeversCard({ narrative }: { narrative: FinancialNarrative }) {
  const t = useTranslation();
  const labels = (t.financial as Record<string, string>) || {};

  const sevColor = (s: 'low' | 'medium' | 'high') =>
    s === 'high' ? 'text-red-700 bg-red-50' :
    s === 'medium' ? 'text-amber-700 bg-amber-50' :
    'text-emerald-700 bg-emerald-50';

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.risksLeversTitle || 'Riesgos · Palancas'}
        </span>
      </div>

      {/* Narrative */}
      {narrative.narrative && (
        <p className="text-[14px] text-carbon/70 leading-relaxed mb-5 italic">
          {narrative.narrative}
        </p>
      )}

      {/* Risks */}
      {narrative.risks.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium mb-2">
            {labels.risks || 'Riesgos'}
          </p>
          <div className="space-y-2.5">
            {narrative.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] shrink-0 mt-0.5 ${sevColor(r.severity)}`}>
                  <AlertCircle className="h-2.5 w-2.5" />
                  {r.severity}
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-carbon mb-0.5">{r.title}</p>
                  <p className="text-[12px] text-carbon/55 leading-relaxed">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Levers */}
      {narrative.levers.length > 0 && (
        <div>
          <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium mb-2">
            {labels.levers || 'Palancas a vigilar'}
          </p>
          <div className="space-y-2">
            {narrative.levers.map((lev, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-carbon/30 mt-2 shrink-0" />
                <div className="flex-1">
                  <span className="text-[13px] font-medium text-carbon">{lev.label}</span>
                  <span className="text-[12px] text-carbon/55 ml-2">— {lev.why_it_matters}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function FinancialPlanContentV2({ collectionContext, language = 'es', basePath }: Props) {
  const t = useTranslation();
  const labels = (t.financial as Record<string, string>) || {};
  const locale = localeFor(language);

  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hasStrategy, setHasStrategy] = useState(false);
  const [hasDistribution, setHasDistribution] = useState(false);
  const [inputs, setInputs] = useState<FinancialInputs | null>(null);
  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  const [narrative, setNarrative] = useState<FinancialNarrative>({ narrative: '', risks: [], levers: [] });
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(async () => {
    setProposing(true);
    setError(null);
    try {
      const res = await fetch('/api/financial-propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId, language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || labels.errPropose || 'No se pudo construir el plan financiero');
        return;
      }
      const { result } = await res.json();
      setInputs(result.inputs as FinancialInputs);
      setPlan(result.plan as FinancialPlan);
      setNarrative((result.narrative as FinancialNarrative) || { narrative: '', risks: [], levers: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setProposing(false);
    }
  }, [collectionContext.collectionPlanId, language, labels]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/financial-load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) setError(err.error || 'No se pudo cargar el plan financiero.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setHasStrategy(!!data.has_strategy);
        setHasDistribution(!!data.has_distribution);
        if (data.has_budget && data.plan && data.inputs) {
          setInputs(data.inputs as FinancialInputs);
          setPlan(data.plan as FinancialPlan);
          if (data.narrative) setNarrative(data.narrative as FinancialNarrative);
        } else if (data.has_strategy && data.has_distribution) {
          setLoading(false);
          await propose();
          return;
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [collectionContext.collectionPlanId, propose]);

  // Recompute on input edit
  const updateInputs = useCallback((patch: Partial<FinancialInputs>) => {
    if (!inputs) return;
    const next = { ...inputs, ...patch };
    // Also patch nested investment if marketing changed
    if (patch.investment) {
      next.investment = { ...inputs.investment, ...patch.investment };
    }
    setInputs(next);
    setPlan(computeFinancialPlan(next));
  }, [inputs]);

  const handleConfirm = useCallback(async () => {
    if (!plan || !inputs) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/financial-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          inputs, plan, narrative,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'No se pudo confirmar.');
        return;
      }
      // Block 2 closed — return to the canonical Block 2 hub (CollectionOverview
      // expanded on merchandising). basePath is `/collection/{id}/merchandising`,
      // we strip the trailing `/merchandising` to land on `/collection/{id}`.
      const collectionRoot = basePath.replace(/\/merchandising$/, '');
      window.location.href = `${collectionRoot}?block=merchandising`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setConfirming(false);
    }
  }, [collectionContext.collectionPlanId, plan, inputs, narrative, basePath]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
        <p className="text-[13px] text-carbon/55 italic">
          {labels.loadingFinancial || 'Cargando tu plan financiero…'}
        </p>
      </div>
    );
  }

  if (!hasStrategy) {
    return EmptyState({
      title: labels.financialEmptyStrategy || 'Define primero la estrategia de compra',
      desc: labels.financialEmptyStrategyDesc || 'El plan financiero se construye sobre tu volumen y tu objetivo Y1. Confirma 02.1 Estrategia y volvemos aquí.',
      cta: labels.goToStrategy || 'Ir a Estrategia de Compra',
      href: `${basePath}?block=scenarios`,
    });
  }
  if (!hasDistribution) {
    return EmptyState({
      title: labels.financialEmptyDistribution || 'Define primero la distribución',
      desc: labels.financialEmptyDistributionDesc || 'El plan financiero necesita el mix de canales y el sell-through. Confirma 02.3 Distribución y volvemos aquí.',
      cta: labels.goToDistribution || 'Ir a Distribución',
      href: `${basePath}?block=channels`,
    });
  }

  if (proposing && !plan) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
        <p className="text-[13px] text-carbon/55 italic">
          {labels.proposingFinancial || 'Aimily está calculando tu P&L Y1, cash flow mensual y vigilando los riesgos del plan…'}
        </p>
      </div>
    );
  }

  if (!plan || !inputs) {
    return (
      <div className="max-w-[640px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-5 text-[13px] text-red-800 flex items-start gap-3">
        <span className="flex-1">{error || 'No se pudo construir el plan financiero.'}</span>
        <Button onClick={propose} variant="ghost" size="sm" className="rounded-full">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          {labels.retry || 'Reintentar'}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Strategy summary header */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-carbon/55">
        <span className="tabular-nums">{fmtNum(inputs.target_sku_count, locale)} SKUs</span>
        <span className="text-carbon/20">·</span>
        <span className="tabular-nums">€{fmtNum(inputs.investment.total, locale)} {labels.invested || 'invertidos'}</span>
        <span className="text-carbon/20">·</span>
        <span className="tabular-nums">{inputs.drops} {inputs.drops === 1 ? (labels.drop || 'drop') : (labels.drops || 'drops')}</span>
        <button
          type="button"
          onClick={propose}
          disabled={proposing}
          className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-carbon/40 hover:text-carbon transition-colors"
        >
          {proposing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {labels.regenerate || 'Regenerar narrativa'}
        </button>
      </div>

      {error && (
        <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800 mb-5">
          {error}
        </div>
      )}

      {/* 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <PnLCard
          pnl={plan.pnl}
          inputs={inputs}
          onEditMarginPct={(target_margin_pct) => updateInputs({ target_margin_pct })}
          onEditSalesTarget={(sales_target_y1) => updateInputs({ sales_target_y1 })}
          onEditMarketing={(marketing) => updateInputs({
            investment: { ...inputs.investment, marketing, total: (inputs.investment.production || 0) + marketing },
          })}
          locale={locale}
        />
        <CashFlowCard monthly={plan.monthly_revenue} breakEven={plan.break_even} locale={locale} />
        <ChannelRevenueCard channels={plan.channel_revenue} locale={locale} />
        <MarkdownCard markdown={plan.markdown_calendar} />
      </div>

      <RisksLeversCard narrative={narrative} />

      <CanonicalActionBar
        onModify={() => { window.history.back(); }}
        onConfirm={handleConfirm}
        modifyLabel={labels.backLabel || 'Atrás'}
        confirmLabel={labels.confirmFinancial || 'Confirmar y cerrar Bloque 2'}
        confirmDisabled={!plan}
        loading={confirming}
      />
    </div>
  );
}

function EmptyState({ title, desc, cta, href }: { title: string; desc: string; cta: string; href: string }) {
  return (
    <div className="max-w-[640px] mx-auto bg-white rounded-[20px] p-10 md:p-14 border border-carbon/[0.06] text-center">
      <div className="w-12 h-12 rounded-full bg-carbon/[0.04] flex items-center justify-center mx-auto mb-5">
        <ArrowLeft className="h-5 w-5 text-carbon/45" />
      </div>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
        {title}
      </h3>
      <p className="text-[14px] text-carbon/55 leading-relaxed mb-6">
        {desc}
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {cta}
      </Link>
    </div>
  );
}
