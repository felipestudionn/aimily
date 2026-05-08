'use client';

/**
 * 02.1 Estrategia de Compra · ScenariosContent
 *
 * Sprint B.1 (2026-05-08) — fully rewritten under the canonical
 * Block-1 pattern (drop SegmentedPill · archetype-first kick-off ·
 * Sonnet propose · multi-axis editor · "+ Más" deepen · canonical
 * confirm bar writes to merchandising.strategy.*).
 *
 * Flow:
 *   archetypes  → click → editor (pre-filled from Block 1) → confirm
 *
 * Persistence:
 *   - Short-term cache: parent's cardData['scenarios'].data (workspace)
 *   - Canonical: /api/strategy-confirm writes to CIS at confirm time
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { Loader2, Check, RefreshCw, ArrowLeft, ArrowRight, Plus, Sparkles, Building2, Compass, Target, Calendar, DollarSign, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanonicalActionBar } from '@/components/workspace/CanonicalActionBar';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ArchetypeBenchmark {
  brand: string;
  skus: number;
  investment_eur: number;
  y1_sales_eur: number;
  year?: string;
}

export interface ScenarioArchetype {
  id: 'A' | 'B' | 'C' | 'D';
  name: string;
  narrative: string;
  sku_range: { min: number; max: number };
  investment_range: { min: number; max: number };
  y1_sales_range: { min: number; max: number };
  drop_count: number;
  marketing_pct: number;
  best_for: string;
  benchmarks: ArchetypeBenchmark[];
}

interface PriceTier {
  min: number;
  max: number;
  anchored_by: string[];
}

interface FamilySubcat {
  name: string;
  count: number;
  evidence: string;
}

interface PrefilledFamily {
  name: string;
  count: number;
  subcategories: FamilySubcat[];
}

export interface PrefilledEditor {
  archetype_id: 'A' | 'B' | 'C' | 'D';
  archetype_name?: string;
  sku_count: number;
  investment_split: { production: number; marketing: number; total: number };
  pricing_tiers: { entry: PriceTier; core: PriceTier; hero: PriceTier };
  families: PrefilledFamily[];
  drops: { count: number; suggested_names?: string[] };
  sales_target_y1: number;
  target_margin_pct: number;
}

type Phase = 'archetypes' | 'editor' | 'confirmed';

interface ScenariosData {
  phase?: Phase;
  archetypes?: ScenarioArchetype[];
  archetypes_at?: string;
  chosen_archetype?: ScenarioArchetype;
  editor?: PrefilledEditor;
  /* legacy 02.1 fields (pre-Sprint-B.1) — kept readable for migration */
  scenarios?: unknown;
  selectedScenarioId?: string | null;
}

interface Props {
  data: ScenariosData;
  onChange: (next: ScenariosData) => void;
  onConfirmed?: () => void;
  collectionContext: { collectionPlanId: string; productCategory?: string; collectionName?: string };
  language?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M€`
  : n >= 1000 ? `${Math.round(n / 1000)}K€`
  : `${n}€`;

const fmtRange = (r: { min: number; max: number }) => `${fmtEur(r.min)}–${fmtEur(r.max)}`;

// ── Archetype Card (kick-off display) ──────────────────────────────────────

function ArchetypeCard({
  archetype,
  onSelect,
  loading,
}: {
  archetype: ScenarioArchetype;
  onSelect: () => void;
  loading: boolean;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[480px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-carbon/[0.06] disabled:opacity-50 disabled:cursor-wait"
    >
      <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
        {labels.archetypeLabel || 'Escenario'} {archetype.id}
      </div>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
        {archetype.name}
      </h3>
      <p className="text-[13px] text-carbon/55 leading-relaxed mb-5">
        {archetype.narrative}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">SKUs</div>
            <div className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {archetype.sku_range.min}–{archetype.sku_range.max}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <DollarSign className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">{labels.investment || 'Inversión'}</div>
            <div className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {fmtRange(archetype.investment_range)}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Building2 className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">{labels.y1Sales || 'Ventas Y1'}</div>
            <div className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {fmtRange(archetype.y1_sales_range)}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">{labels.drops || 'Drops'}</div>
            <div className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {archetype.drop_count}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-carbon/[0.06] mb-4">
        <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-2">
          {labels.benchmarksY1 || 'Marcas similares en Y1'}
        </div>
        <div className="space-y-1.5">
          {archetype.benchmarks.map((b, i) => (
            <div key={i} className="text-[12px] text-carbon/70 leading-snug">
              <span className="font-medium">{b.brand}</span>
              <span className="text-carbon/50">
                {' · '}
                {b.skus} SKUs
                {' · '}
                {fmtEur(b.investment_eur)} inv
                {' · '}
                {fmtEur(b.y1_sales_eur)} Y1
                {b.year ? ` (${b.year})` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-carbon/[0.06]">
        <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-1.5">
          {labels.bestFor || 'Mejor para'}
        </div>
        <p className="text-[12px] text-carbon/55 leading-relaxed">{archetype.best_for}</p>
      </div>

      <div className="mt-5 flex items-center justify-end text-[12px] font-semibold text-carbon group-hover:gap-2 transition-all gap-1.5">
        <span>{labels.workOnThis || 'Trabajar en este escenario'}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

// ── Editor (chosen archetype detailed view) ────────────────────────────────

function EditorAxisCard({
  title,
  description,
  axis,
  onDeepen,
  deepening,
  children,
}: {
  title: string;
  description?: string;
  axis: string;
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const isLoading = deepening === axis;
  return (
    <div className="bg-white rounded-[20px] p-8 ring-1 ring-carbon/[0.06]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">{title}</h4>
          {description && <p className="text-[12px] text-carbon/50 mt-1">{description}</p>}
        </div>
        {onDeepen && (
          <button
            type="button"
            onClick={() => onDeepen(axis)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/60 hover:bg-carbon/[0.04] disabled:opacity-50 transition-colors shrink-0"
          >
            {isLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Plus className="h-3 w-3" />}
            {labels.deepenAxis || '+ Más'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function VolumeCard({ editor, onChange, onDeepen, deepening }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  return (
    <EditorAxisCard
      title={labels.volume || 'Volumen total'}
      description={labels.volumeDesc || 'Número objetivo de SKUs en la colección.'}
      axis="volume"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      <div className="flex items-baseline gap-3 mt-2">
        <input
          type="number"
          value={editor.sku_count || 0}
          onChange={(e) => onChange({ ...editor, sku_count: Math.max(0, Number(e.target.value) || 0) })}
          className="bg-transparent border-0 outline-none text-[40px] font-semibold text-carbon tracking-[-0.04em] leading-none w-[110px] focus:text-carbon"
        />
        <span className="text-[14px] text-carbon/40 tracking-[-0.01em]">SKUs</span>
      </div>
    </EditorAxisCard>
  );
}

function PricingCard({ editor, onChange, onDeepen, deepening }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const tiers: Array<['entry' | 'core' | 'hero', string]> = [
    ['entry', labels.tierEntry || 'Entry'],
    ['core', labels.tierCore || 'Core'],
    ['hero', labels.tierHero || 'Hero'],
  ];
  const updateTier = (key: 'entry' | 'core' | 'hero', patch: Partial<PriceTier>) => {
    onChange({
      ...editor,
      pricing_tiers: {
        ...editor.pricing_tiers,
        [key]: { ...editor.pricing_tiers[key], ...patch },
      },
    });
  };
  return (
    <EditorAxisCard
      title={labels.pricing || 'Arquitectura de precios'}
      description={labels.pricingDesc || 'Tres tiers anclados a tus competidores directos.'}
      axis="pricing"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      <div className="space-y-4 mt-3">
        {tiers.map(([key, label]) => {
          const tier = editor.pricing_tiers[key];
          return (
            <div key={key} className="border-t border-carbon/[0.06] pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/40">{label}</span>
                <div className="flex items-baseline gap-1.5 text-[14px] text-carbon font-medium">
                  <span className="text-carbon/40">€</span>
                  <input
                    type="number"
                    value={tier.min || 0}
                    onChange={(e) => updateTier(key, { min: Math.max(0, Number(e.target.value) || 0) })}
                    className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[64px] outline-none focus:bg-carbon/[0.06]"
                  />
                  <span className="text-carbon/30">–</span>
                  <input
                    type="number"
                    value={tier.max || 0}
                    onChange={(e) => updateTier(key, { max: Math.max(0, Number(e.target.value) || 0) })}
                    className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[64px] outline-none focus:bg-carbon/[0.06]"
                  />
                </div>
              </div>
              {tier.anchored_by?.length > 0 && (
                <div className="text-[11px] text-carbon/45 leading-snug">
                  {labels.anchoredBy || 'Anclado a'}: {tier.anchored_by.join(' · ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EditorAxisCard>
  );
}

function FamiliesCard({ editor, onChange, onDeepen, deepening }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const updateFamily = (idx: number, patch: Partial<PrefilledFamily>) => {
    const next = [...editor.families];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...editor, families: next });
  };
  const updateSubcat = (fIdx: number, sIdx: number, patch: Partial<FamilySubcat>) => {
    const next = [...editor.families];
    const subs = [...next[fIdx].subcategories];
    subs[sIdx] = { ...subs[sIdx], ...patch };
    next[fIdx] = { ...next[fIdx], subcategories: subs };
    onChange({ ...editor, families: next });
  };
  return (
    <EditorAxisCard
      title={labels.families || 'Familias y subcategorías'}
      description={labels.familiesDesc || 'Tus familias top-level y los tipos de producto que llevarán.'}
      axis="families"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      <div className="space-y-5 mt-3">
        {editor.families.map((f, fi) => (
          <div key={fi} className="border-t border-carbon/[0.06] pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <input
                type="text"
                value={f.name}
                onChange={(e) => updateFamily(fi, { name: e.target.value })}
                className="text-[15px] font-semibold text-carbon bg-transparent outline-none flex-1 focus:bg-carbon/[0.03] rounded px-1 -mx-1 py-0.5"
              />
              <div className="flex items-baseline gap-1 text-[13px]">
                <input
                  type="number"
                  value={f.count || 0}
                  onChange={(e) => updateFamily(fi, { count: Math.max(0, Number(e.target.value) || 0) })}
                  className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[44px] text-carbon font-medium outline-none focus:bg-carbon/[0.06]"
                />
                <span className="text-carbon/40 text-[12px]">SKUs</span>
              </div>
            </div>
            <div className="space-y-1.5 pl-3 border-l border-carbon/[0.08]">
              {f.subcategories.map((s, si) => (
                <div key={si} className="flex items-center gap-2 text-[12px]">
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => updateSubcat(fi, si, { name: e.target.value })}
                    className="text-carbon/80 bg-transparent outline-none flex-1 focus:bg-carbon/[0.03] rounded px-1 -mx-1"
                  />
                  <input
                    type="number"
                    value={s.count || 0}
                    onChange={(e) => updateSubcat(fi, si, { count: Math.max(0, Number(e.target.value) || 0) })}
                    className="bg-carbon/[0.03] rounded-md px-1.5 py-0.5 w-[40px] text-carbon outline-none focus:bg-carbon/[0.06] tabular-nums"
                  />
                  {s.evidence && (
                    <span className="text-[10px] text-carbon/40 italic max-w-[160px] truncate" title={s.evidence}>
                      {s.evidence}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </EditorAxisCard>
  );
}

function InvestmentCard({ editor, onChange }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const update = (patch: Partial<PrefilledEditor['investment_split']>) => {
    const next = { ...editor.investment_split, ...patch };
    next.total = (next.production || 0) + (next.marketing || 0);
    onChange({ ...editor, investment_split: next });
  };
  return (
    <EditorAxisCard
      title={labels.investmentSplit || 'Inversión'}
      description={labels.investmentSplitDesc || 'Producción + marketing + ventas Y1.'}
      axis="investment"
    >
      <div className="space-y-3 mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-carbon/60">{labels.production || 'Producción'}</span>
          <div className="flex items-baseline gap-1 text-[14px] text-carbon font-medium">
            <span className="text-carbon/40">€</span>
            <input
              type="number"
              value={editor.investment_split.production || 0}
              onChange={(e) => update({ production: Math.max(0, Number(e.target.value) || 0) })}
              className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[100px] outline-none focus:bg-carbon/[0.06] tabular-nums"
            />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-carbon/60">{labels.marketing || 'Marketing'}</span>
          <div className="flex items-baseline gap-1 text-[14px] text-carbon font-medium">
            <span className="text-carbon/40">€</span>
            <input
              type="number"
              value={editor.investment_split.marketing || 0}
              onChange={(e) => update({ marketing: Math.max(0, Number(e.target.value) || 0) })}
              className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[100px] outline-none focus:bg-carbon/[0.06] tabular-nums"
            />
          </div>
        </div>
        <div className="flex items-baseline justify-between border-t border-carbon/[0.06] pt-3">
          <span className="text-[12px] text-carbon/60 font-semibold">{labels.total || 'Total'}</span>
          <span className="text-[16px] text-carbon font-semibold tabular-nums">
            {fmtEur(editor.investment_split.total || 0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-carbon/60">{labels.salesTargetY1 || 'Ventas Y1 target'}</span>
          <div className="flex items-baseline gap-1 text-[14px] text-carbon font-medium">
            <span className="text-carbon/40">€</span>
            <input
              type="number"
              value={editor.sales_target_y1 || 0}
              onChange={(e) => onChange({ ...editor, sales_target_y1: Math.max(0, Number(e.target.value) || 0) })}
              className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[120px] outline-none focus:bg-carbon/[0.06] tabular-nums"
            />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-carbon/60">{labels.targetMargin || 'Margen objetivo'}</span>
          <div className="flex items-baseline gap-1 text-[14px] text-carbon font-medium">
            <input
              type="number"
              value={editor.target_margin_pct || 0}
              onChange={(e) => onChange({ ...editor, target_margin_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[64px] outline-none focus:bg-carbon/[0.06] tabular-nums"
            />
            <span className="text-carbon/40">%</span>
          </div>
        </div>
      </div>
    </EditorAxisCard>
  );
}

function DropsCard({ editor, onChange, onDeepen, deepening }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const names = editor.drops.suggested_names || [];
  const updateName = (i: number, value: string) => {
    const next = [...names];
    next[i] = value;
    onChange({ ...editor, drops: { ...editor.drops, suggested_names: next } });
  };
  return (
    <EditorAxisCard
      title={labels.dropCalendar || 'Calendario de drops'}
      description={labels.dropCalendarDesc || 'Cuántos drops y con qué nombre lanzarás la colección.'}
      axis="drops"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      <div className="space-y-3 mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-carbon/60">{labels.dropsCount || 'Número de drops'}</span>
          <input
            type="number"
            min={1}
            max={6}
            value={editor.drops.count || 1}
            onChange={(e) => onChange({ ...editor, drops: { ...editor.drops, count: Math.max(1, Math.min(6, Number(e.target.value) || 1)) } })}
            className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[44px] text-[14px] text-carbon font-medium outline-none focus:bg-carbon/[0.06] tabular-nums"
          />
        </div>
        {Array.from({ length: editor.drops.count || 1 }).map((_, i) => (
          <div key={i} className="flex items-baseline gap-2 text-[13px]">
            <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/40 shrink-0">
              Drop {String(i + 1).padStart(2, '0')}
            </span>
            <input
              type="text"
              value={names[i] || ''}
              placeholder={labels.dropNamePlaceholder || 'Nombre del drop'}
              onChange={(e) => updateName(i, e.target.value)}
              className="text-carbon/80 bg-carbon/[0.03] rounded-md px-2 py-1 flex-1 outline-none focus:bg-carbon/[0.06] placeholder:text-carbon/30"
            />
          </div>
        ))}
      </div>
    </EditorAxisCard>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ScenariosContent({ data, onChange, onConfirmed, collectionContext, language = 'es' }: Props) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};

  const phase: Phase = data.phase || 'archetypes';
  const archetypes = data.archetypes || [];

  const [loadingArchetypes, setLoadingArchetypes] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState<string | null>(null);
  const [deepening, setDeepening] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load archetypes if missing on first mount
  const fetchArchetypes = useCallback(async () => {
    setLoadingArchetypes(true);
    setError(null);
    try {
      const res = await fetch('/api/scenarios-archetypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId, language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || labels.errLoadArchetypes || 'No se pudieron generar los escenarios');
        return;
      }
      const { result } = await res.json();
      const list = (result?.archetypes as ScenarioArchetype[] | undefined) || [];
      if (list.length !== 4) {
        setError(labels.errBadArchetypes || 'Respuesta inesperada del modelo');
        return;
      }
      onChange({
        ...data,
        phase: 'archetypes',
        archetypes: list,
        archetypes_at: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : (labels.errLoadArchetypes || 'Error inesperado'));
    } finally {
      setLoadingArchetypes(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionContext.collectionPlanId, language, data.phase, archetypes.length]);

  useEffect(() => {
    if (phase === 'archetypes' && archetypes.length === 0 && !loadingArchetypes) {
      fetchArchetypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click an archetype → fetch editor prefill
  const handleSelectArchetype = useCallback(async (archetype: ScenarioArchetype) => {
    setLoadingPrefill(archetype.id);
    setError(null);
    try {
      const res = await fetch('/api/ai/scenarios-prefill-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId, archetype, language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || labels.errPrefill || 'No se pudo construir el editor');
        return;
      }
      const { result } = await res.json();
      const editor = result as PrefilledEditor;
      editor.archetype_id = archetype.id;
      editor.archetype_name = archetype.name;
      onChange({
        ...data,
        phase: 'editor',
        chosen_archetype: archetype,
        editor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : (labels.errPrefill || 'Error inesperado'));
    } finally {
      setLoadingPrefill(null);
    }
  }, [collectionContext.collectionPlanId, language, data, onChange, labels]);

  // Edit working state in editor
  const handleEditorChange = useCallback((editor: PrefilledEditor) => {
    onChange({ ...data, editor });
  }, [data, onChange]);

  // Deepen one axis
  const handleDeepen = useCallback(async (axis: string) => {
    if (!data.editor || !data.chosen_archetype) return;
    setDeepening(axis);
    setError(null);
    try {
      const res = await fetch('/api/ai/scenarios-deepen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          archetype: data.chosen_archetype,
          currentEditor: data.editor,
          axis,
          language,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || labels.errDeepen || 'No se pudo refinar el eje');
        return;
      }
      const { result } = await res.json();
      const merged: PrefilledEditor = { ...data.editor };
      if (axis === 'volume' && result.sku_count !== undefined) {
        merged.sku_count = result.sku_count;
        if (Array.isArray(result.families)) merged.families = result.families;
      } else if (axis === 'pricing' && result.pricing_tiers) {
        merged.pricing_tiers = { ...merged.pricing_tiers, ...result.pricing_tiers };
      } else if (axis === 'families' && Array.isArray(result.families)) {
        merged.families = result.families;
      } else if (axis === 'drops' && result.drops) {
        merged.drops = { ...merged.drops, ...result.drops };
      }
      // narrative axis returns strategic_narratives — surface for future B.1.x;
      // we don't merge into the prefill state directly here.
      onChange({ ...data, editor: merged });
    } catch (err) {
      setError(err instanceof Error ? err.message : (labels.errDeepen || 'Error inesperado'));
    } finally {
      setDeepening(null);
    }
  }, [collectionContext.collectionPlanId, language, data, onChange, labels]);

  const handleBackToArchetypes = useCallback(() => {
    onChange({ ...data, phase: 'archetypes', chosen_archetype: undefined, editor: undefined });
  }, [data, onChange]);

  const handleConfirm = useCallback(async () => {
    if (!data.editor || !archetypes.length) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/strategy-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          archetypesSeen: archetypes,
          chosen: data.editor,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || labels.errConfirm || 'No se pudo confirmar la estrategia');
        return;
      }
      onChange({ ...data, phase: 'confirmed' });
      onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : (labels.errConfirm || 'Error inesperado'));
    } finally {
      setConfirming(false);
    }
  }, [collectionContext.collectionPlanId, data, archetypes, onChange, onConfirmed, labels]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingArchetypes && archetypes.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
        <p className="text-[13px] text-carbon/55 italic">
          {labels.loadingArchetypes || 'Aimily está leyendo el mercado y proponiendo cuatro escenarios reales para tu primer año…'}
        </p>
      </div>
    );
  }

  if (error && archetypes.length === 0 && phase === 'archetypes') {
    return (
      <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-5 text-[13px] text-red-800 flex items-start gap-3">
        <span className="flex-1">{error}</span>
        <Button onClick={fetchArchetypes} variant="ghost" size="sm" className="rounded-full">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          {labels.retry || 'Reintentar'}
        </Button>
      </div>
    );
  }

  // Phase: archetypes (4 cards)
  if (phase === 'archetypes' || !data.editor) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="max-w-[700px] mx-auto text-center mb-10">
          <p className="text-[14px] text-carbon/55 leading-relaxed italic">
            {labels.archetypesIntro || 'Cuatro estrategias de compra reales para tu primer año. Elige la que mejor encaje con tu ambición y tus recursos — luego trabajamos juntos los detalles.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {archetypes.map(a => (
            <ArchetypeCard
              key={a.id}
              archetype={a}
              loading={loadingPrefill === a.id}
              onSelect={() => handleSelectArchetype(a)}
            />
          ))}
        </div>

        {error && (
          <div className="max-w-[700px] mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchArchetypes}
            disabled={loadingArchetypes}
            className="rounded-full text-[12px] text-carbon/50 hover:text-carbon"
          >
            {loadingArchetypes ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
            {labels.regenerateArchetypes || 'Regenerar escenarios'}
          </Button>
        </div>
      </div>
    );
  }

  // Phase: editor (chosen archetype + multi-axis edit)
  const editor = data.editor;
  const chosen = data.chosen_archetype;
  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Working scenario header — short context line + back link */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackToArchetypes}
          className="inline-flex items-center gap-1.5 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {labels.backToArchetypes || 'Cambiar escenario'}
        </button>
        {chosen && (
          <div className="text-right">
            <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
              {labels.workingOn || 'Trabajando con escenario'} {chosen.id}
            </div>
            <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
              {chosen.name}
            </div>
          </div>
        )}
      </div>

      {/* Multi-axis editor grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <VolumeCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} />
        <InvestmentCard editor={editor} onChange={handleEditorChange} />
        <PricingCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} />
        <DropsCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} />
        <div className="lg:col-span-2">
          <FamiliesCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} />
        </div>
      </div>

      {error && (
        <div className="max-w-[700px] mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
          {error}
        </div>
      )}

      <CanonicalActionBar
        onModify={handleBackToArchetypes}
        onConfirm={handleConfirm}
        modifyLabel={labels.changeArchetype || 'Cambiar escenario'}
        confirmLabel={
          phase === 'confirmed'
            ? (labels.confirmedShort || 'Confirmado')
            : (labels.confirmStrategy || 'Confirmar Estrategia')
        }
        confirmDisabled={phase === 'confirmed'}
        loading={confirming}
      />
    </div>
  );
}
