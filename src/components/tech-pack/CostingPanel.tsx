'use client';

/**
 * <CostingPanel>
 *
 * Phase 2 BOM-driven costing panel — sits in the Tech Pack header.
 * Recomputes landed cost on every BOM edit + lets the user adjust
 * overhead / freight / duties / target margin. Persists the derived
 * breakdown to collection_skus.cost_breakdown.
 *
 * Visual structure (compact, fits in the header):
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  [Margin gauge — green/amber/red]    [Target vs Current]   │
 *   │                                                             │
 *   │  Materials €X · Labor €Y · Overhead €Z · Freight €F · Duties│
 *   │  → Total landed €T   PVP €P   Margin XX% (target YY%)       │
 *   │                                                             │
 *   │  [⚡ AI Margin Protection — N suggestions]  (only if needed)│
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Differentiator vs Centric/FlexPLM:
 *   - <500ms recalc (pure function in-browser)
 *   - AI suggests material substitutions when margin < target (Phase
 *     2.4 endpoint integration)
 *   - Source-of-truth toggle ('bom' / 'manual') to lock the cost when
 *     the user has a final number from the factory
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, Lock, Unlock, Loader2, TrendingDown, Wand2 } from 'lucide-react';
import {
  recalculateCostBreakdown,
  marginSeverity,
  shouldOfferMarginProtection,
  DEFAULT_FACTORY_RATE_BY_REGION,
  DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU,
  DEFAULT_LABOR_HOURS_BY_CATEGORY,
  DEFAULT_FREIGHT_EUR_BY_ORIGIN,
  type BomLine,
  type CostBreakdown,
  type AiSubstitutionSuggestion,
} from '@/lib/costing/landed-cost';

interface CostingPanelProps {
  /** SKU id — used by the AI suggest endpoint. */
  skuId: string;
  /** Selling price (EUR). */
  pvp: number;
  /** Existing cost (manual canonical value). Used as the manual_override. */
  costManual: number;
  /** BOM lines from tech_pack_data.bom.lines. */
  bomLines: BomLine[];
  /** Existing cost_breakdown jsonb (or empty object). */
  initial?: Partial<CostBreakdown>;
  /** Called when the user edits any factor — persist to BD. */
  onChange: (breakdown: CostBreakdown) => void;
  /** Optional CIS-derived target margin (read by the parent). */
  defaultTargetMarginPct?: number;
  /** Optional sourcing region for default rate / duties (e.g. 'CN'). */
  sourcingRegion?: string;
  /** SKU category — drives labor-hour defaults (apparel ≠ footwear ≠ accessories). */
  category?: 'ROPA' | 'CALZADO' | 'ACCESORIOS';
}

export function CostingPanel({
  skuId,
  pvp,
  costManual,
  bomLines,
  initial,
  onChange,
  defaultTargetMarginPct = 65,
  sourcingRegion = 'default',
  category,
}: CostingPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Editable factors — initialised from the persisted breakdown (or sensible defaults).
  const [factoryRate, setFactoryRate] = useState<number>(
    initial?.labor?.factory_rate ?? (DEFAULT_FACTORY_RATE_BY_REGION[sourcingRegion] ?? DEFAULT_FACTORY_RATE_BY_REGION.default),
  );
  // Industry-typical defaults by category (labor hours) + origin (freight).
  // The previous defaults were 0 across the board, which made every tech
  // pack ship with labor=€0 and freight=€0 — Felipe (2026-05-13): "no
  // estamos presuponiendo nada de trabajo, overhead, freight, duties".
  // Now the panel arrives with realistic mid-points the user can fine-
  // tune. See TYPICAL_COGS_SPLIT_PCT in landed-cost.ts for sources.
  //
  // Stale-zero promotion: legacy SKUs persisted laborHours=0 / freight=0
  // before the defaults shipped. `?? default` only catches undefined, so
  // those stored zeros leaked through and produced 89%+ phantom margins.
  // We now treat 0 as "still on the legacy default" and substitute the
  // industry midpoint, while any explicit non-zero edit stays untouched.
  const defaultLaborHours = DEFAULT_LABOR_HOURS_BY_CATEGORY[category || 'default'] ?? DEFAULT_LABOR_HOURS_BY_CATEGORY.default;
  const defaultFreight = DEFAULT_FREIGHT_EUR_BY_ORIGIN[sourcingRegion] ?? DEFAULT_FREIGHT_EUR_BY_ORIGIN.default;

  const [laborHours, setLaborHours] = useState<number>(
    initial?.labor?.hours && initial.labor.hours > 0 ? initial.labor.hours : defaultLaborHours,
  );
  const [overheadPct, setOverheadPct] = useState<number>(initial?.overhead_pct ?? 15);
  const [freightTotal, setFreightTotal] = useState<number>(
    initial?.freight?.total && initial.freight.total > 0 ? initial.freight.total : defaultFreight,
  );
  const [freightOrigin, setFreightOrigin] = useState<string>(initial?.freight?.origin ?? sourcingRegion);
  const [freightDestination, setFreightDestination] = useState<string>(initial?.freight?.destination ?? 'ES');
  const [freightMethod, setFreightMethod] = useState<'sea' | 'air' | 'rail' | 'road'>(
    initial?.freight?.method ?? 'sea',
  );
  const [dutiesPct, setDutiesPct] = useState<number>(
    initial?.duties_pct ?? (DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU[sourcingRegion] ?? DEFAULT_DUTIES_PCT_BY_ORIGIN_TO_EU.default),
  );
  const [targetMarginPct, setTargetMarginPct] = useState<number>(
    initial?.target_margin_pct ?? defaultTargetMarginPct,
  );
  const [sourceOfTruth, setSourceOfTruth] = useState<'bom' | 'manual'>(
    initial?.materials?.source_of_truth ?? 'bom',
  );

  // Derived breakdown — recomputed on every state change.
  const breakdown = useMemo<CostBreakdown>(() => {
    return recalculateCostBreakdown({
      bomLines,
      manualMaterialOverride: sourceOfTruth === 'manual' ? costManual : null,
      materialSourceOfTruth: sourceOfTruth,
      factoryRate,
      laborHours,
      overheadPct,
      freightOrigin,
      freightDestination,
      freightMethod,
      freightTotal,
      dutiesPct,
      targetMarginPct,
      pvp,
    });
  }, [
    bomLines, sourceOfTruth, costManual, factoryRate, laborHours,
    overheadPct, freightOrigin, freightDestination, freightMethod,
    freightTotal, dutiesPct, targetMarginPct, pvp,
  ]);

  // Persist breakdown on every meaningful change (debounced by parent's saveSection).
  React.useEffect(() => {
    onChange(breakdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdown.total_landed, breakdown.current_margin_pct, sourceOfTruth]);

  const severity = marginSeverity(breakdown);
  const shouldOfferAi = shouldOfferMarginProtection(breakdown);

  // Auto-trigger AI substitution scan ONCE when the variance crosses the
  // protection threshold. The user can still manually re-run with the
  // "Proponer alternativas" button. Guard via ref so we don't fire on
  // every save (each cost edit recomputes the breakdown).
  const autoFiredFor = React.useRef<string>('');
  useEffect(() => {
    if (!shouldOfferAi) return;
    if (breakdown.ai_suggestions && breakdown.ai_suggestions.length > 0) return;
    if (aiBusy) return;
    // Variance signature so we only refire if the variance changes meaningfully.
    const sig = `${skuId}:${Math.round((breakdown.variance_pct || 0) * 10) / 10}`;
    if (autoFiredFor.current === sig) return;
    autoFiredFor.current = sig;
    handleSuggestSubstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOfferAi, breakdown.variance_pct, breakdown.ai_suggestions]);

  const handleSuggestSubstitutions = useCallback(async () => {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/costing/suggest-substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId, bomLines, breakdown }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const { suggestions }: { suggestions: AiSubstitutionSuggestion[] } = await res.json();
      onChange({ ...breakdown, ai_suggestions: suggestions || [] });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setAiBusy(false);
    }
  }, [skuId, bomLines, breakdown, onChange]);

  const sevColors: Record<typeof severity, { ring: string; bar: string; text: string }> = {
    green: { ring: 'ring-[#2d6a4f]/20', bar: 'bg-[#2d6a4f]', text: 'text-[#2d6a4f]' },
    amber: { ring: 'ring-[#c77000]/20', bar: 'bg-[#c77000]', text: 'text-[#c77000]' },
    red:   { ring: 'ring-[#A0463C]/20', bar: 'bg-[#A0463C]', text: 'text-[#A0463C]' },
  };
  const c = sevColors[severity];
  // Gauge width: clamp 0-100% range mapped to a -30 to +30 variance window.
  const gaugePct = Math.min(100, Math.max(0, ((breakdown.current_margin_pct) / 100) * 100));

  return (
    <div className="bg-white rounded-[12px] border border-carbon/[0.08] overflow-hidden">
      {/* Compact header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-carbon/[0.02] transition-colors text-left"
      >
        {/* Margin gauge — dual bar (current vs target) with EUR headroom.
            Felipe (2026-05-14): "tendrían que haber dos barras y verse que
            estamos muy por encima del margen. La diferencia de euros que
            nos faltan también tendría que mostrarse." Two stacked rows
            now: actual margin bar over a thinner target reference bar, so
            the gap reads instantly. The headroom line below states it in
            EUR ("€80 headroom" / "€12 over target") which is more
            actionable than a percentage abstraction. */}
        <div className="shrink-0 flex flex-col gap-1.5 min-w-[180px]">
          <div className="flex items-center gap-2">
            <p className="text-[8px] tracking-[0.15em] uppercase font-semibold text-carbon/40">Margin</p>
            <span className={`text-[12px] font-semibold tabular-nums ${c.text}`}>
              {breakdown.current_margin_pct.toFixed(1)}%
            </span>
            <span className="text-[9px] text-carbon/35 tabular-nums">vs {targetMarginPct}%</span>
          </div>
          <div className="space-y-1">
            <div className={`relative h-1.5 w-full rounded-full bg-carbon/[0.06] ring-1 ${c.ring} overflow-hidden`}>
              <div
                className={`absolute inset-y-0 left-0 ${c.bar} transition-all`}
                style={{ width: `${gaugePct}%` }}
              />
            </div>
            <div className="relative h-1 w-full rounded-full bg-carbon/[0.04] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-carbon/40"
                style={{ width: `${targetMarginPct}%` }}
              />
            </div>
          </div>
          {pvp > 0 && (() => {
            const targetCogs = pvp * (1 - targetMarginPct / 100);
            const headroom = targetCogs - breakdown.total_landed;
            const isOver = headroom < 0;
            return (
              <p className={`text-[10px] tabular-nums leading-tight ${
                isOver ? 'text-[#A0463C]' : 'text-[#2d6a4f]'
              }`}>
                {isOver
                  ? `€${Math.abs(headroom).toFixed(2)} over target`
                  : `€${headroom.toFixed(2)} headroom`}
              </p>
            );
          })()}
        </div>

        {/* Waterfall — inline summary */}
        <div className="flex-1 grid grid-cols-5 gap-2 text-center">
          <Pill label="Materials" value={breakdown.materials.effective} />
          <Pill label="Labor" value={breakdown.labor.total} />
          <Pill label="Overhead" value={breakdown.overhead_total} />
          <Pill label="Freight" value={breakdown.freight.total} />
          <Pill label="Duties" value={breakdown.duties_total} />
        </div>

        {/* Target COGS = pvp × (1 − targetMargin). Compares head-to-head
            with the landed-cost roll-up so the user sees "how far under
            (or over) target are we?" at a glance. */}
        {pvp > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-[8px] tracking-[0.15em] uppercase font-semibold text-carbon/40">Target COGS</p>
            <p className="text-[12px] font-medium tabular-nums text-carbon/60">€{(pvp * (1 - targetMarginPct / 100)).toFixed(2)}</p>
          </div>
        )}

        <div className="shrink-0 text-right">
          <p className="text-[8px] tracking-[0.15em] uppercase font-semibold text-carbon/40">Landed</p>
          <p className={`text-[14px] font-semibold tabular-nums ${pvp > 0 && breakdown.total_landed > pvp * (1 - targetMarginPct / 100) ? 'text-[#A0463C]' : 'text-carbon'}`}>
            €{breakdown.total_landed.toFixed(2)}
          </p>
        </div>

        {shouldOfferAi && !breakdown.ai_suggestions?.length && (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#c77000]/[0.08] text-[10px] font-semibold tracking-[-0.01em] text-[#c77000]">
            <TrendingDown className="h-3 w-3" strokeWidth={2.25} />
            Margin alert
          </span>
        )}

        <ChevronDown className={`shrink-0 h-3.5 w-3.5 text-carbon/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-carbon/[0.06] p-4 space-y-4 bg-carbon/[0.01]">
          {/* Source of truth toggle */}
          <div className="flex items-center gap-3">
            <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/50">Material cost</p>
            <div className="inline-flex rounded-full bg-carbon/[0.04] p-0.5 text-[10px] font-medium">
              <button
                onClick={() => setSourceOfTruth('bom')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  sourceOfTruth === 'bom' ? 'bg-white text-carbon shadow-sm' : 'text-carbon/40 hover:text-carbon/70'
                }`}
              >
                <Unlock className="h-2.5 w-2.5 inline mr-1" />
                BOM-derived (€{breakdown.materials.bom_rolled_up.toFixed(2)})
              </button>
              <button
                onClick={() => setSourceOfTruth('manual')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  sourceOfTruth === 'manual' ? 'bg-white text-carbon shadow-sm' : 'text-carbon/40 hover:text-carbon/70'
                }`}
              >
                <Lock className="h-2.5 w-2.5 inline mr-1" />
                Manual override (€{costManual.toFixed(2)})
              </button>
            </div>
          </div>

          {/* Factor inputs grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FactorInput
              label="Factory rate"
              suffix="€/h"
              value={factoryRate}
              onChange={setFactoryRate}
            />
            <FactorInput
              label="Hours / unit"
              suffix="h"
              value={laborHours}
              onChange={setLaborHours}
              step="0.1"
            />
            <FactorInput
              label="Overhead"
              suffix="%"
              value={overheadPct}
              onChange={setOverheadPct}
            />
            <FactorInput
              label="Freight"
              suffix="€"
              value={freightTotal}
              onChange={setFreightTotal}
            />
            <FactorInput
              label="Duties"
              suffix="%"
              value={dutiesPct}
              onChange={setDutiesPct}
            />
            <FactorInput
              label="Target margin"
              suffix="%"
              value={targetMarginPct}
              onChange={setTargetMarginPct}
            />
            <SelectInput
              label="Origin"
              value={freightOrigin}
              onChange={setFreightOrigin}
              options={['IT', 'PT', 'ES', 'TR', 'TN', 'CN', 'VN', 'IN', 'MX', 'US']}
            />
            <SelectInput
              label="Method"
              value={freightMethod}
              onChange={(v) => setFreightMethod(v as 'sea' | 'air' | 'rail' | 'road')}
              options={['sea', 'air', 'rail', 'road']}
            />
          </div>

          {/* AI Margin Protection action */}
          {shouldOfferAi && (
            <div className="rounded-[10px] border border-[#c77000]/15 bg-[#c77000]/[0.04] p-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <TrendingDown className="h-4 w-4 text-[#c77000]" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-carbon">
                    Margen {Math.abs(breakdown.variance_pct).toFixed(1)}pp por debajo del objetivo
                  </p>
                  <p className="text-[11px] text-carbon/60 mt-0.5 leading-relaxed">
                    Aimily puede revisar el catálogo y proponer alternativas más asequibles dentro del lenguaje de marca.
                  </p>
                  {aiError && (
                    <p className="text-[10px] text-[#A0463C] mt-1">{aiError}</p>
                  )}
                </div>
                <button
                  onClick={handleSuggestSubstitutions}
                  disabled={aiBusy}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon text-white text-[10px] font-semibold tracking-[-0.005em] hover:bg-carbon/90 disabled:opacity-50 transition-colors"
                >
                  {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" strokeWidth={2.25} />}
                  {aiBusy ? 'Analizando…' : 'Proponer alternativas'}
                </button>
              </div>
            </div>
          )}

          {/* Suggestion results */}
          {breakdown.ai_suggestions && breakdown.ai_suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/50">
                AI suggestions ({breakdown.ai_suggestions.length})
              </p>
              {breakdown.ai_suggestions.map((s, i) => (
                <div key={i} className="rounded-[8px] border border-carbon/[0.06] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-carbon">
                        Replace <span className="text-carbon/60">{s.current_material}</span> → {s.proposed_material}
                      </p>
                      {s.proposed_supplier && (
                        <p className="text-[10px] text-carbon/45 mt-0.5">via {s.proposed_supplier}</p>
                      )}
                      <p className="text-[11px] text-carbon/65 mt-1.5 leading-relaxed">{s.rationale}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[12px] font-semibold tabular-nums text-[#2d6a4f]">
                        −€{s.saves_eur.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-carbon/40">+{s.margin_recovers_pct.toFixed(1)}pp margin</p>
                      <span className={`mt-1 inline-block text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        s.aesthetic_match === 'high' ? 'bg-[#2d6a4f]/[0.08] text-[#2d6a4f]' :
                        s.aesthetic_match === 'medium' ? 'bg-[#c77000]/[0.08] text-[#c77000]' :
                        'bg-carbon/[0.04] text-carbon/50'
                      }`}>
                        {s.aesthetic_match} fit
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-1.5 rounded-[6px] bg-carbon/[0.02] border border-carbon/[0.04]">
      <p className="text-[8px] tracking-[0.1em] uppercase text-carbon/30 truncate">{label}</p>
      <p className="text-[11px] font-medium text-carbon/70 tabular-nums">€{value.toFixed(2)}</p>
    </div>
  );
}

function FactorInput({
  label, suffix, value, onChange, step,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] tracking-[0.1em] uppercase font-semibold text-carbon/40">{label}</span>
      <div className="flex items-center gap-1.5 bg-white border border-carbon/[0.08] rounded-[8px] px-2 py-1.5 focus-within:border-carbon/30">
        <input
          type="number"
          step={step ?? '1'}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="flex-1 text-[12px] text-carbon bg-transparent focus:outline-none w-full tabular-nums"
        />
        <span className="text-[10px] text-carbon/35">{suffix}</span>
      </div>
    </label>
  );
}

function SelectInput({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] tracking-[0.1em] uppercase font-semibold text-carbon/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-carbon/[0.08] rounded-[8px] px-2 py-1.5 text-[12px] text-carbon focus:outline-none focus:border-carbon/30"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
