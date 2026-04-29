'use client';
import { useTranslation } from '@/i18n';

import { useState } from 'react';
import { Sparkles, Loader2, Check, RefreshCw, Users, DollarSign, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ScenarioMode = 'free' | 'assisted' | 'ai';

export interface ScenarioFamily {
  name: string;
  count: number;
  description?: string;
}

export interface ScenarioPriceArch {
  min: number;
  max: number;
  avg: number;
  tier?: string;
}

export interface ScenarioFinancials {
  productionBudget?: number;
  marketingBudget?: number;
  totalInvestment: number;
  firstYearSalesTarget: number;
  targetMargin?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  skuCount: number;
  families: ScenarioFamily[];
  priceArchitecture: ScenarioPriceArch;
  financials: ScenarioFinancials;
  timeline: string;
  bestFor: string;
}

interface MarketInsights {
  competitorLandscape?: string;
  priceBenchmarks?: string;
  trendContext?: string;
  marketOpportunity?: string;
}

interface ScenariosData {
  targetSkus?: number | null;
  targetBudget?: number | null;
  direction?: string;
  scenarios?: Scenario[];
  marketInsights?: MarketInsights;
  recommendation?: string;
  selectedScenarioId?: string | null;
  generatedAt?: string;
}

interface Props {
  mode: ScenarioMode;
  data: ScenariosData;
  onChange: (next: ScenariosData) => void;
  collectionContext: { collectionPlanId: string; productCategory?: string; collectionName?: string };
  language?: string;
}

/* ═══ UI ═══ */

function AnchorCard({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-[20px] p-8 md:p-12 min-h-[320px] flex flex-col transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-carbon/[0.06]">
      <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-6">{label}</div>
      <div className="flex-1 flex flex-col justify-center">{children}</div>
      {description && (
        <p className="text-[12px] text-carbon/40 mt-6 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

function ScenarioCard({
  scenario,
  selected,
  onSelect,
}: {
  scenario: Scenario;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[440px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${
        selected ? 'ring-2 ring-carbon shadow-[0_8px_32px_rgba(0,0,0,0.08)]' : 'ring-1 ring-carbon/[0.06]'
      }`}
    >
      {selected && (
        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-carbon text-white flex items-center justify-center">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}

      <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
        {scenario.id}
      </div>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
        {scenario.name}
      </h3>
      <p className="text-[13px] text-carbon/55 leading-relaxed mb-5">{scenario.description}</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">SKUs</div>
            <div className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">{scenario.skuCount}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <DollarSign className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">{(t.fieldLabels as Record<string, string>)?.investment || "Investment"}</div>
            <div className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              €{(scenario.financials.totalInvestment / 1000).toFixed(0)}K
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Users className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">Y1 Sales</div>
            <div className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              €{(scenario.financials.firstYearSalesTarget / 1000).toFixed(0)}K
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">{(t.fieldLabels as Record<string, string>)?.price || "Price"}</div>
            <div className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              €{scenario.priceArchitecture.min}–{scenario.priceArchitecture.max}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-carbon/[0.06]">
        <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-2">{(t.fieldLabels as Record<string, string>)?.families || "Families"}</div>
        <div className="flex flex-wrap gap-1.5">
          {scenario.families.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/70">
              <span className="font-semibold">{f.count}</span>
              <span>{f.name}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-1.5">{(t.fieldLabels as Record<string, string>)?.bestFor || "Best for"}</div>
        <p className="text-[12px] text-carbon/55 leading-relaxed">{scenario.bestFor}</p>
      </div>
    </button>
  );
}

/* ═══ Main ═══ */

export function ScenariosContent({ mode, data, onChange, collectionContext, language = 'en' }: Props) {
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenarios = data.scenarios || [];
  const selectedId = data.selectedScenarioId || null;
  const hasScenarios = scenarios.length > 0;

  const updateInput = (patch: Partial<ScenariosData>) => onChange({ ...data, ...patch });

  const persistDecision = async (scenario: Scenario) => {
    try {
      await fetch('/api/collection-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          domain: 'merchandising',
          subdomain: 'range_plan',
          key: 'scenario_selected',
          value: scenario,
          valueType: 'object',
          rationale: `User selected scenario ${scenario.id} (${scenario.name}) from Merchandising Scenarios block`,
          confidence: 'confirmed',
          source: 'user_input',
          sourceComponent: 'ScenariosContent',
        }),
      });
    } catch (err) {
      console.error('[Scenarios] recordDecision failed:', err);
    }
  };

  const handleSelect = (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    onChange({ ...data, selectedScenarioId: scenarioId });
    persistDecision(scenario);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/merchandising/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          targetSkus: mode === 'assisted' ? data.targetSkus || null : null,
          targetBudget: mode === 'assisted' ? data.targetBudget || null : null,
          direction: mode === 'assisted' ? data.direction || '' : '',
          language,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Network error' }));
        setError(err.error || 'Failed to generate scenarios');
        return;
      }
      const { result } = await res.json();
      onChange({
        ...data,
        scenarios: result.scenarios || [],
        marketInsights: result.marketInsights,
        recommendation: result.recommendation,
        generatedAt: new Date().toISOString(),
        selectedScenarioId: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── 3 anchor cards (shared by Free + Assisted) ─── */
  const anchorCards = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <AnchorCard label="Target SKUs" description="How many styles do you want in this collection?">
        <input
          type="number"
          value={data.targetSkus || ''}
          onChange={(e) => updateInput({ targetSkus: Number(e.target.value) || null })}
          placeholder="—"
          className="bg-transparent border-0 outline-none text-[56px] md:text-[72px] font-semibold text-carbon tracking-[-0.045em] leading-[0.9] placeholder:text-carbon/15 w-full focus:text-carbon"
        />
        <div className="text-[13px] text-carbon/40 mt-2 tracking-[-0.01em]">styles</div>
      </AnchorCard>

      <AnchorCard label="Target Investment" description="Total euros you can commit to this collection.">
        <div className="flex items-baseline gap-2">
          <span className="text-[40px] md:text-[56px] font-semibold text-carbon/25 tracking-[-0.04em] leading-none">€</span>
          <input
            type="number"
            value={data.targetBudget || ''}
            onChange={(e) => updateInput({ targetBudget: Number(e.target.value) || null })}
            placeholder="—"
            className="flex-1 bg-transparent border-0 outline-none text-[56px] md:text-[72px] font-semibold text-carbon tracking-[-0.045em] leading-[0.9] placeholder:text-carbon/15 w-full focus:text-carbon min-w-0"
          />
        </div>
        <div className="text-[13px] text-carbon/40 mt-2 tracking-[-0.01em]">total investment</div>
      </AnchorCard>

      <AnchorCard label="Direction" description="Constraints or focus aimily should respect (optional).">
        <textarea
          value={data.direction || ''}
          onChange={(e) => updateInput({ direction: e.target.value })}
          placeholder="e.g. DTC-first, Europe only, 2 drops, focus on footwear…"
          rows={4}
          className="bg-transparent border-0 outline-none text-[18px] md:text-[20px] font-medium text-carbon tracking-[-0.02em] leading-[1.35] placeholder:text-carbon/20 w-full resize-none focus:text-carbon"
        />
      </AnchorCard>
    </div>
  );

  /* ─── Free mode: only manual anchors, no AI ─── */
  if (mode === 'free') {
    return (
      <div className="max-w-[1400px] mx-auto">
        {anchorCards}
        <p className="text-[12px] text-carbon/40 mt-6 text-center">
          In Free mode your anchors pre-fill the next blocks directly. Switch to Assisted or AI Proposal to have aimily propose 3 scenarios from your collection intelligence.
        </p>
      </div>
    );
  }

  /* ─── Assisted / AI Proposal ─── */
  return (
    <div className="max-w-[1400px] mx-auto">
      {!hasScenarios && !loading && (
        <>
          {mode === 'assisted' && (
            <>
              {anchorCards}
              <p className="text-[13px] text-carbon/50 text-center mt-6 mb-6 max-w-[700px] mx-auto leading-relaxed">
                Give aimily your target scale. She&apos;ll build 3 scenarios around your anchors, grounded in your Brand DNA, Consumer and Market Research.
              </p>
            </>
          )}
          {mode === 'ai' && (
            <div className="max-w-[700px] mx-auto text-center mb-8">
              <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-4">AI Proposal</div>
              <h3 className="text-[28px] md:text-[36px] font-semibold text-carbon tracking-[-0.035em] leading-tight mb-4">
                Three strategic scenarios, generated from your CIS
              </h3>
              <p className="text-[14px] text-carbon/55 leading-relaxed">
                aimily reads your Brand DNA, Consumer, Vibe, Moodboard and Market Research to infer the appropriate collection scale and propose 3 strategic paths — Focused Start, Balanced, and Full Capsule.
              </p>
            </div>
          )}
          <div className="flex justify-center mt-4">
            <Button onClick={handleGenerate} disabled={loading} className="rounded-full px-7 py-5 text-[13px]">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              {mode === 'assisted' ? 'Generate 3 scenarios' : 'Generate from CIS'}
            </Button>
          </div>
        </>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
          <p className="text-[13px] text-carbon/50">{(t.scenarios as Record<string, string>)?.buildingScenarios || "Reading your CIS and building 3 strategic scenarios…"}</p>
        </div>
      )}

      {error && (
        <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
          {error}
        </div>
      )}

      {hasScenarios && !loading && (
        <div className="flex flex-col gap-6">
          {data.marketInsights?.marketOpportunity && (
            <div className="bg-carbon/[0.02] border border-carbon/[0.06] rounded-[14px] p-5 max-w-[900px] mx-auto text-center">
              <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-2">{(t.fieldLabels as Record<string, string>)?.marketOpportunity || "Market opportunity"}</div>
              <p className="text-[14px] text-carbon/70 leading-relaxed italic">
                {data.marketInsights.marketOpportunity}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} selected={selectedId === s.id} onSelect={() => handleSelect(s.id)} />
            ))}
          </div>

          {data.recommendation && (
            <div className="max-w-[900px] mx-auto text-center py-2">
              <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1">aimily recommends</div>
              <p className="text-[13px] text-carbon/60 italic leading-relaxed">{data.recommendation}</p>
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="ghost" onClick={handleGenerate} disabled={loading} className="rounded-full text-[12px] text-carbon/50 hover:text-carbon">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Regenerate scenarios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
