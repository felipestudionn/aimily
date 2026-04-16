'use client';

/* ═══════════════════════════════════════════════════════════════════
   FinancialPlanContent — pre-business plan for a collection.

   Composition screen: reads the scenario selected in Buying Strategy,
   the pricing architecture, the channel mix and the drop cadence, and
   turns them into an investor-grade business plan with KPI hero +
   four chapters (Investment / Revenue / Margin / Cash curve).

   The user only owns four assumption fields plus a marketing status.
   Every other number is derived by computeFinancialPlan().
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import {
  DEFAULT_INPUTS,
  type FinancialPlanInputs,
  type FinancialPlanSources,
  type FinancialPlanNarrative,
} from '@/lib/financial-plan/types';
import { computeFinancialPlan, emptySources, formatEur, formatPct } from '@/lib/financial-plan/compute';

export type FinancialPlanMode = 'free' | 'assisted' | 'ai';

interface StoredData {
  inputs?: FinancialPlanInputs;
  narrative?: FinancialPlanNarrative;
  generatedAt?: string;
  generatedBy?: 'user' | 'ai';
}

interface Props {
  mode: FinancialPlanMode;
  data: StoredData;
  onChange: (next: StoredData) => void;
  collectionContext: {
    collectionPlanId: string;
    productCategory?: string;
    collectionName?: string;
  };
  language?: string;
}

export function FinancialPlanContent({ mode, data, onChange, collectionContext, language = 'en' }: Props) {
  const [sources, setSources] = useState<FinancialPlanSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputs = data.inputs ?? DEFAULT_INPUTS;
  const narrative = data.narrative;

  /* Fetch sources on mount (selected scenario + pricing + channels + drops) */
  useEffect(() => {
    let cancelled = false;
    setLoadingSources(true);
    fetch(`/api/financial-plan/sources?planId=${collectionContext.collectionPlanId}`)
      .then(r => r.json())
      .then(({ sources: src }) => { if (!cancelled) setSources(src ?? emptySources()); })
      .catch(() => { if (!cancelled) setSources(emptySources()); })
      .finally(() => { if (!cancelled) setLoadingSources(false); });
    return () => { cancelled = true; };
  }, [collectionContext.collectionPlanId]);

  const derived = useMemo(
    () => computeFinancialPlan(inputs, sources ?? emptySources()),
    [inputs, sources],
  );

  const updateInputs = (patch: Partial<FinancialPlanInputs>) => {
    onChange({ ...data, inputs: { ...inputs, ...patch } });
  };
  const updateAssumptions = (patch: Partial<FinancialPlanInputs['assumptions']>) => {
    updateInputs({ assumptions: { ...inputs.assumptions, ...patch } });
  };
  const updateMarketing = (patch: Partial<FinancialPlanInputs['marketing']>) => {
    updateInputs({ marketing: { ...inputs.marketing, ...patch } });
  };

  /* ═══ Empty state — no scenario selected yet ═══ */
  if (loadingSources) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-carbon/30" />
      </div>
    );
  }

  if (!sources?.scenarioId) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="max-w-[520px] text-center bg-white rounded-[20px] p-14 border border-carbon/[0.06]">
          <AlertCircle className="h-6 w-6 text-carbon/30 mx-auto mb-5" />
          <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
            Select a buying strategy first
          </h3>
          <p className="text-[14px] text-carbon/50 leading-[1.6]">
            Financial Plan reads from the scenario you pick in Buying Strategy.
            Choose one there, then come back to see the pre-business plan compose.
          </p>
        </div>
      </div>
    );
  }

  const marketingPending = inputs.marketing.status === 'pending';

  /* ═══ Actions ═══ */

  const handleGenerateNarrative = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/merch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'financial-plan-narrative',
          language,
          collectionPlanId: collectionContext.collectionPlanId,
          input: {
            scenarioName: sources.scenarioName || '',
            totalInvestment: String(Math.round(derived.kpis.totalInvestment)),
            expectedRevenue: String(Math.round(derived.kpis.expectedRevenue)),
            grossMarginPct: String(derived.kpis.grossMarginPct),
            roi: String((derived.kpis.roi * 100).toFixed(1)),
            paybackMonths: String(Math.round(derived.kpis.paybackMonths)),
            marketingStatus: inputs.marketing.status,
            marketingAssumed: String(Math.round(derived.investment.marketingAssumed)),
            fullPriceSellThrough: String(inputs.assumptions.fullPriceSellThrough),
            selectedScenario: inputs.selectedScenario,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
      const { result } = await res.json();
      onChange({
        ...data,
        narrative: result as FinancialPlanNarrative,
        generatedAt: new Date().toISOString(),
        generatedBy: 'ai',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCommitToCIS = async () => {
    setError(null);
    try {
      await fetch('/api/collection-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          domain: 'merchandising',
          subdomain: 'financial_plan',
          key: 'pre_business_plan',
          value: { inputs, sources, derived, narrative, generatedAt: data.generatedAt },
          valueType: 'object',
          rationale: `Pre-business plan confirmed — €${Math.round(derived.kpis.totalInvestment).toLocaleString()} investment → €${Math.round(derived.kpis.expectedRevenue).toLocaleString()} revenue at ${derived.kpis.grossMarginPct}% margin.`,
          confidence: 'confirmed',
          source: 'user_input',
          sourceComponent: 'FinancialPlanContent',
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  /* ═══ Render ═══ */

  return (
    <div className="space-y-5">
      {/* ── KPI ribbon — 5 stats in one card ────────────────────────── */}
      <div className="bg-white rounded-[20px] p-10 md:p-12 grid grid-cols-2 md:grid-cols-5 gap-6">
        <Stat label="Total investment" value={formatEur(derived.kpis.totalInvestment, { compact: true })}
              pending={marketingPending} />
        <Stat label="Expected revenue" value={formatEur(derived.kpis.expectedRevenue, { compact: true })} />
        <Stat label="Gross margin" value={formatPct(derived.kpis.grossMarginPct)} />
        <Stat label="ROI" value={formatPct(derived.kpis.roi * 100)} accent />
        <Stat label="Payback" value={`${Math.round(derived.kpis.paybackMonths)} mo`} />
      </div>

      {/* ── 4 chapter cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InvestmentCard inputs={inputs} derived={derived} />
        <RevenueCard inputs={inputs} derived={derived} onChangeSelected={(s) => updateInputs({ selectedScenario: s })} />
        <MarginCard derived={derived} pending={marketingPending} />
        <CashCurveCard cashCurve={derived.cashCurve} />
      </div>

      {/* ── Inputs row — assumptions + marketing placeholder ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AssumptionsCard
          assumptions={inputs.assumptions}
          onChange={updateAssumptions}
        />
        <MarketingCard
          marketing={inputs.marketing}
          onChange={updateMarketing}
          targetRevenue={derived.revenue.selected}
        />
      </div>

      {/* ── AI narrative + commit ───────────────────────────────────── */}
      <div className="bg-white rounded-[20px] p-10 md:p-14">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-3">
              Business thesis
            </div>
            <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-2">
              {narrative?.headline || 'Generate the business narrative'}
            </h3>
            <p className="text-[14px] text-carbon/50 leading-[1.6] max-w-[720px]">
              {narrative?.thesis || 'A 60-80 word thesis that an investor or partner would read on the presentation deck. Explains the plan, the assumptions, and why the numbers hold.'}
            </p>
          </div>
          <Button
            onClick={handleGenerateNarrative}
            disabled={generating}
            className="rounded-full shrink-0"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
            {narrative ? 'Regenerate' : 'Generate'}
          </Button>
        </div>

        {narrative?.marketingNote && (
          <div className="mt-5 px-4 py-3 rounded-[12px] bg-citronella/10 text-[13px] text-carbon/70 border border-citronella/20">
            <strong className="font-semibold">Marketing pending:</strong> {narrative.marketingNote}
          </div>
        )}

        {narrative && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 pt-6 border-t border-carbon/[0.06]">
            <div>
              <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
                Key assumptions
              </div>
              <ul className="space-y-2">
                {narrative.assumptions.map((a, i) => (
                  <li key={i} className="text-[13px] text-carbon/60 leading-[1.6] flex gap-2">
                    <span className="text-carbon/25">·</span>{a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
                Risks
              </div>
              <ul className="space-y-2">
                {narrative.risks.map((r, i) => (
                  <li key={i} className="text-[13px] text-carbon/60 leading-[1.6] flex gap-2">
                    <span className="text-carbon/25">·</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}

        {narrative && (
          <div className="flex justify-end mt-6 pt-6 border-t border-carbon/[0.06]">
            <Button variant="outline" onClick={handleCommitToCIS} className="rounded-full">
              Save to Collection Intelligence
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════ */

function Stat({ label, value, pending, accent }: { label: string; value: string; pending?: boolean; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/35 mb-3 flex items-center gap-1.5">
        {label}
        {pending && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-citronella/15 text-[9px] font-semibold text-carbon/70">ASSUMED</span>}
      </div>
      <div className={`text-[32px] md:text-[40px] font-bold tracking-[-0.04em] leading-none ${accent ? 'text-carbon' : 'text-carbon'}`}>
        {value}
      </div>
    </div>
  );
}

function InvestmentCard({ inputs, derived }: { inputs: FinancialPlanInputs; derived: ReturnType<typeof computeFinancialPlan> }) {
  const { production, development, marketingAssumed, workingCapital, totalWithAssumedMarketing } = derived.investment;
  const marketingPending = inputs.marketing.status === 'pending';
  const rows: { label: string; value: number; pending?: boolean }[] = [
    { label: 'Production (COGS)', value: production },
    { label: 'Development & sampling', value: development },
    { label: 'Marketing', value: marketingAssumed, pending: marketingPending },
    { label: 'Working capital', value: workingCapital },
  ];
  const total = totalWithAssumedMarketing;

  return (
    <ChapterCard number="01" title="Investment" subtitle="Where the euros go">
      <div className="space-y-3 mt-6">
        {rows.map(r => {
          const pct = total > 0 ? (r.value / total) * 100 : 0;
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[13px] text-carbon/70 flex items-center gap-1.5">
                  {r.label}
                  {r.pending && <span className="inline-flex px-1.5 py-0.5 rounded-full bg-citronella/15 text-[9px] font-semibold text-carbon/70">PENDING</span>}
                </span>
                <span className="text-[14px] font-semibold text-carbon tabular-nums">{formatEur(r.value, { compact: true })}</span>
              </div>
              <div className="h-[4px] rounded-full bg-carbon/[0.04] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${r.pending ? 'bg-citronella/60' : 'bg-carbon/70'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        <div className="pt-4 mt-4 border-t border-carbon/[0.06] flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-carbon">Total</span>
          <span className="text-[20px] font-bold text-carbon tabular-nums">{formatEur(total, { compact: true })}</span>
        </div>
      </div>
    </ChapterCard>
  );
}

function RevenueCard({ inputs, derived, onChangeSelected }: {
  inputs: FinancialPlanInputs;
  derived: ReturnType<typeof computeFinancialPlan>;
  onChangeSelected: (s: FinancialPlanInputs['selectedScenario']) => void;
}) {
  const scenarios: { id: FinancialPlanInputs['selectedScenario']; label: string; value: number; hint: string }[] = [
    { id: 'conservative', label: 'Conservative', value: derived.revenue.conservative, hint: 'Lower sell-through' },
    { id: 'target', label: 'Target', value: derived.revenue.target, hint: 'Base case' },
    { id: 'stretch', label: 'Stretch', value: derived.revenue.stretch, hint: 'Strong season' },
  ];
  return (
    <ChapterCard number="02" title="Revenue projection" subtitle="Three scenarios · pick a commitment">
      <div className="space-y-3 mt-6">
        {scenarios.map(s => {
          const selected = inputs.selectedScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChangeSelected(s.id)}
              className={`w-full text-left px-5 py-4 rounded-[16px] transition-all duration-200 border ${
                selected ? 'bg-carbon text-white border-carbon' : 'bg-white border-carbon/[0.06] hover:bg-carbon/[0.02]'
              }`}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className={`text-[13px] font-semibold tracking-[-0.01em] ${selected ? 'text-white' : 'text-carbon'}`}>{s.label}</span>
                <span className={`text-[18px] font-bold tabular-nums tracking-[-0.02em] ${selected ? 'text-white' : 'text-carbon'}`}>
                  {formatEur(s.value, { compact: true })}
                </span>
              </div>
              <div className={`text-[11px] ${selected ? 'text-white/60' : 'text-carbon/45'}`}>{s.hint}</div>
            </button>
          );
        })}
      </div>
    </ChapterCard>
  );
}

function MarginCard({ derived, pending }: { derived: ReturnType<typeof computeFinancialPlan>; pending: boolean }) {
  return (
    <ChapterCard number="03" title="Margin story" subtitle="Gross → contribution">
      <div className="space-y-5 mt-6">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[13px] text-carbon/70">Gross margin</span>
            <span className="text-[18px] font-bold text-carbon tabular-nums">{formatEur(derived.margin.grossMargin, { compact: true })}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-carbon/40">after COGS</span>
            <span className="text-[12px] font-semibold text-carbon/60 tabular-nums">{formatPct(derived.margin.grossMarginPct)}</span>
          </div>
        </div>
        <div className="h-[1px] bg-carbon/[0.06]" />
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[13px] text-carbon/70 flex items-center gap-1.5">
              Contribution margin
              {pending && <span className="inline-flex px-1.5 py-0.5 rounded-full bg-citronella/15 text-[9px] font-semibold text-carbon/70">ASSUMED</span>}
            </span>
            <span className="text-[18px] font-bold text-carbon tabular-nums">{formatEur(derived.margin.contributionMargin, { compact: true })}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-carbon/40">after marketing</span>
            <span className="text-[12px] font-semibold text-carbon/60 tabular-nums">{formatPct(derived.margin.contributionMarginPct)}</span>
          </div>
        </div>
        <div className="pt-3 mt-1 border-t border-carbon/[0.06] flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-carbon/40" />
          <span className="text-[12px] text-carbon/50">
            ROI {formatPct(derived.kpis.roi * 100)} · payback {Math.round(derived.kpis.paybackMonths)} months
          </span>
        </div>
      </div>
    </ChapterCard>
  );
}

function CashCurveCard({ cashCurve }: { cashCurve: { month: number; cashOut: number; cashIn: number; net: number }[] }) {
  const chartData = cashCurve.map(p => ({ month: `M${p.month}`, net: Math.round(p.net), cashOut: Math.round(p.cashOut), cashIn: Math.round(p.cashIn) }));
  return (
    <ChapterCard number="04" title="Cash curve" subtitle="Cumulative net over 12 months">
      <div className="mt-6 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#00000060' }} axisLine={{ stroke: '#00000015' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#00000060' }} axisLine={false} tickLine={false}
                   tickFormatter={(v) => Math.abs(v) >= 1000 ? `€${(v / 1000).toFixed(0)}K` : `€${v}`} width={50} />
            <Tooltip
              formatter={(value: number) => formatEur(value, { compact: true })}
              labelFormatter={(l) => `Month ${l.replace('M', '')}`}
              contentStyle={{ background: '#fff', border: '1px solid #00000010', borderRadius: 12, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="net" stroke="#000" strokeWidth={2} fill="url(#netFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChapterCard>
  );
}

function AssumptionsCard({ assumptions, onChange }: {
  assumptions: FinancialPlanInputs['assumptions'];
  onChange: (patch: Partial<FinancialPlanInputs['assumptions']>) => void;
}) {
  const rows: { key: keyof typeof assumptions; label: string; suffix: string; min: number; max: number; hint: string }[] = [
    { key: 'fullPriceSellThrough', label: 'Full-price sell-through', suffix: '%', min: 30, max: 90, hint: 'How much of the buy sells before markdown.' },
    { key: 'markdownDepth', label: 'Markdown depth', suffix: '%', min: 10, max: 60, hint: 'Discount on the remainder.' },
    { key: 'developmentCostPct', label: 'Development cost', suffix: '% of production', min: 3, max: 25, hint: 'Samples, tech packs, fittings.' },
    { key: 'workingCapitalWeeks', label: 'Working capital', suffix: 'weeks', min: 0, max: 20, hint: 'Inventory sitting before sell-through.' },
  ];
  return (
    <div className="bg-white rounded-[20px] p-10 md:p-12">
      <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-3">Assumptions</div>
      <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-6">The four levers you own</h3>
      <div className="space-y-5">
        {rows.map(r => (
          <div key={r.key}>
            <div className="flex items-baseline justify-between mb-2">
              <Label className="text-[13px] text-carbon/70">{r.label}</Label>
              <span className="text-[15px] font-bold text-carbon tabular-nums">
                {assumptions[r.key]}<span className="text-[11px] font-semibold text-carbon/40 ml-0.5">{r.suffix}</span>
              </span>
            </div>
            <Slider
              value={[assumptions[r.key]]}
              min={r.min}
              max={r.max}
              step={1}
              onValueChange={([v]) => onChange({ [r.key]: v } as Partial<typeof assumptions>)}
              className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-carbon [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-2"
            />
            <p className="text-[11px] text-carbon/40 mt-1.5">{r.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketingCard({ marketing, onChange, targetRevenue }: {
  marketing: FinancialPlanInputs['marketing'];
  onChange: (patch: Partial<FinancialPlanInputs['marketing']>) => void;
  targetRevenue: number;
}) {
  const pending = marketing.status === 'pending';
  return (
    <div className={`rounded-[20px] p-10 md:p-12 transition-colors ${pending ? 'bg-citronella/[0.08] border border-citronella/30' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/35">Marketing investment</div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
          pending ? 'bg-citronella/30 text-carbon' : 'bg-carbon text-white'
        }`}>
          {pending ? 'PENDING' : 'COMMITTED'}
        </span>
      </div>
      <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-6">
        {pending ? 'Budget still to be decided' : 'Budget locked in'}
      </h3>

      {pending ? (
        <div className="space-y-5">
          <p className="text-[13px] text-carbon/60 leading-[1.6]">
            Until you commit a number, margin math assumes marketing runs at
            <strong className="font-semibold text-carbon"> {marketing.assumedPctOfRevenue}%</strong> of target revenue
            (≈ {formatEur(targetRevenue * marketing.assumedPctOfRevenue / 100, { compact: true })}).
          </p>
          <div>
            <Label className="text-[13px] text-carbon/70 mb-2 block">Assumed % of revenue</Label>
            <Slider
              value={[marketing.assumedPctOfRevenue]}
              min={3}
              max={20}
              step={1}
              onValueChange={([v]) => onChange({ assumedPctOfRevenue: v })}
              className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-carbon/40 [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-2"
            />
            <div className="text-[14px] font-bold text-carbon mt-2 tabular-nums">
              {marketing.assumedPctOfRevenue}% <span className="text-[11px] font-semibold text-carbon/40">of revenue</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-full w-full"
            onClick={() => onChange({ status: 'set', investment: Math.round(targetRevenue * marketing.assumedPctOfRevenue / 100) })}
          >
            Commit a number
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Input
            type="number"
            value={marketing.investment ?? ''}
            onChange={(e) => onChange({ investment: Number(e.target.value) || 0 })}
            className="text-[36px] font-bold text-carbon tabular-nums tracking-[-0.03em] bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
            placeholder="0"
          />
          <div className="text-[11px] text-carbon/40">EUR committed to marketing</div>
          <Button
            variant="outline"
            className="rounded-full w-full"
            onClick={() => onChange({ status: 'pending', investment: null })}
          >
            Move back to pending
          </Button>
        </div>
      )}
    </div>
  );
}

function ChapterCard({ number, title, subtitle, children }: {
  number: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[20px] p-10 md:p-12 min-h-[420px] flex flex-col">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[46px] font-bold text-carbon/[0.06] leading-none tracking-[-0.04em]">{number}.</span>
        <div>
          <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight">{title}</h3>
          <p className="text-[12px] text-carbon/40 mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
