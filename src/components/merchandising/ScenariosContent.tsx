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
  /**
   * Base path for the collection's merchandising area (e.g.
   * `/collection/<id>/merchandising`). After /api/strategy-confirm
   * succeeds we navigate to `<basePath>?block=families` so the user
   * lands directly on 02.2 Surtido & Precios with their seeded data.
   * Optional for back-compat; if missing, no navigation happens.
   */
  basePath?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M€`
  : n >= 1000 ? `${Math.round(n / 1000)}K€`
  : `${n}€`;

const fmtRange = (r: { min: number; max: number }) => `${fmtEur(r.min)}–${fmtEur(r.max)}`;

/**
 * Locale-aware thousand-separator formatter for numeric inputs/outputs.
 * Spanish/European locales use "." as thousand separator (420.000),
 * English uses "," (420,000). Inputs that wrap this become type=text
 * because <input type=number> strips separators on every keystroke.
 */
const localeFor = (lang: string) => (lang === 'en' ? 'en-US' : 'es-ES');

function fmtNum(n: number | null | undefined, locale: string): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(locale).format(n);
}

function parseNum(s: string): number {
  if (!s) return 0;
  // Strip every non-digit (negative sign kept for completeness, though
  // counts never go negative in this UI).
  const cleaned = s.replace(/[^\d-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

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

  // Cap benchmarks to 4 and render names only (the per-brand SKUs/inv/Y1
  // metrics were ficha-técnica-dense and broke row alignment between cards
  // because each archetype has a different number of benchmarks). The
  // headline metrics already live in the stats grid above — readers can
  // see them at a glance without scanning four lines of small text.
  const topBrands = archetype.benchmarks.slice(0, 4);
  const overflowBrands = Math.max(0, archetype.benchmarks.length - topBrands.length);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[560px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-carbon/[0.06] disabled:opacity-50 disabled:cursor-wait"
    >
      {/* Header — fixed-height block so the 4 cards share the same Y-axis
          for every section below. The previous layout flowed narratives of
          varying length (2–5 lines) which pushed everything underneath out
          of alignment between cards. */}
      <div className="min-h-[120px] mb-6">
        <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
          {labels.archetypeLabel || 'Escenario'} {archetype.id}
        </div>
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
          {archetype.name}
        </h3>
      </div>

      {/* Stats 2×2 — already fixed height, just isolated for clarity */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 mb-7">
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

      {/* Marcas similares — editorial inline, fixed height. Same pattern
          we use in Sales Strategy archetypes — names only, calm typography. */}
      <div className="pt-5 border-t border-carbon/[0.06] mb-6 min-h-[90px]">
        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-2.5">
          {labels.benchmarksY1 || 'Marcas similares en Y1'}
        </div>
        <p className="text-[13px] text-carbon/70 leading-[1.5] tracking-[-0.01em]">
          {topBrands.map((b) => b.brand).join(' · ')}
          {overflowBrands > 0 && (
            <span className="text-carbon/30"> · +{overflowBrands}</span>
          )}
        </p>
      </div>

      {/* Mejor para — capped to 3 lines so a verbose archetype can't push
          the CTA out of vertical alignment. */}
      <div className="pt-5 border-t border-carbon/[0.06] mb-6 min-h-[100px]">
        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-2">
          {labels.bestFor || 'Mejor para'}
        </div>
        <p className="text-[12px] text-carbon/55 leading-[1.6] line-clamp-3">
          {archetype.best_for}
        </p>
      </div>

      <div className="flex-1" />

      {/* CTA pill centered (gold standard) — replaces the tiny right-aligned
          "Trabajar en este escenario" link, which read more as a footnote
          than a decision. */}
      <div className="flex justify-center mt-2">
        <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all bg-carbon text-white group-hover:bg-carbon/90">
          {labels.workOnThis || 'Trabajar en este escenario'}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
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

function VolumeCard({ editor, onChange, onDeepen, deepening, archetype, language }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
  archetype?: ScenarioArchetype;
  language: string;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const locale = localeFor(language);

  // Volume is the live sum of family counts — single source of truth.
  // Editing the total below proportionally rescales each family count
  // so the math always stays balanced.
  const total = editor.families.reduce((s, f) => s + (f.count || 0), 0) || editor.sku_count || 0;
  const min = archetype?.sku_range?.min ?? 8;
  const max = archetype?.sku_range?.max ?? 60;
  const pct = max === min ? 50 : Math.max(0, Math.min(100, ((total - min) / (max - min)) * 100));
  const inRange = total >= min && total <= max;

  const rescale = (newTotal: number) => {
    if (newTotal <= 0 || total === 0) {
      onChange({ ...editor, sku_count: Math.max(0, newTotal) });
      return;
    }
    const ratio = newTotal / total;
    const families = editor.families.map(f => {
      const newFamily = Math.max(0, Math.round((f.count || 0) * ratio));
      const subRatio = (f.count || 0) === 0 ? 1 : newFamily / (f.count || 1);
      return {
        ...f,
        count: newFamily,
        subcategories: f.subcategories.map(s => ({
          ...s,
          count: Math.max(0, Math.round((s.count || 0) * subRatio)),
        })),
      };
    });
    onChange({ ...editor, families, sku_count: newTotal });
  };

  return (
    <EditorAxisCard
      title={labels.skuCount || 'Número de SKUs'}
      description={labels.skuCountDesc || 'Cuántos productos compondrán la colección.'}
      axis="volume"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      {/* Big number — single anchor stat, no redundancies */}
      <div className="flex items-baseline gap-3 mt-2 mb-6">
        <input
          type="text"
          inputMode="numeric"
          value={fmtNum(total, locale)}
          onChange={(e) => rescale(parseNum(e.target.value))}
          className="bg-transparent border-0 outline-none text-[64px] font-semibold text-carbon tracking-[-0.04em] leading-none w-[200px] focus:text-carbon tabular-nums"
        />
        <span className="text-[16px] text-carbon/45 tracking-[-0.01em]">SKUs</span>
      </div>

      {/* Archetype range bar */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/35 mb-1.5">
          <span>{labels.archetypeMin || 'Mín archetype'} · {fmtNum(min, locale)}</span>
          <span className={inRange ? 'text-carbon/55' : 'text-orange-600'}>
            {inRange ? (labels.inRange || 'En rango') : (labels.outOfRange || 'Fuera de rango')}
          </span>
          <span>{fmtNum(max, locale)} · {labels.archetypeMax || 'Máx'}</span>
        </div>
        <div className="relative h-2 rounded-full bg-carbon/[0.06]">
          <div className="absolute inset-y-0 left-0 bg-carbon/15 rounded-full" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-carbon ring-4 ring-shade transition-all"
            style={{ left: `calc(${pct}% - 7px)` }}
          />
        </div>
      </div>

      {/* Family distribution mini-bar */}
      {editor.families.length > 0 && total > 0 && (
        <div>
          <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/35 mb-2">
            {labels.byFamily || 'Por familia'}
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-carbon/[0.04]">
            {editor.families.map((f, i) => {
              const w = ((f.count || 0) / total) * 100;
              if (w === 0) return null;
              return (
                <div
                  key={i}
                  style={{ width: `${w}%`, backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
                />
              );
            })}
          </div>
        </div>
      )}
    </EditorAxisCard>
  );
}

function PricingCard({ editor, onChange, onDeepen, deepening, language }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
  language: string;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const locale = localeFor(language);
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

  const tierAvg = (tier: PriceTier) => Math.round(((tier.min || 0) + (tier.max || 0)) / 2);
  const heroMax = editor.pricing_tiers.hero.max || 1;

  // Implied avg PVP across the three tiers (assumes even SKU split — Block 3
  // solver will refine when SKUs are distributed per tier).
  const avgPvp = Math.round(
    (tierAvg(editor.pricing_tiers.entry) + tierAvg(editor.pricing_tiers.core) + tierAvg(editor.pricing_tiers.hero)) / 3,
  );

  return (
    <EditorAxisCard
      title={labels.pricing || 'Arquitectura de precios'}
      description={labels.pricingDesc || 'Tres tiers anclados a tus competidores directos.'}
      axis="pricing"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      {/* Avg pill at top */}
      <div className="flex items-baseline justify-between mb-5 mt-2">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.avgPrice || 'PVP medio'}
        </span>
        <span className="text-[24px] font-semibold text-carbon tabular-nums tracking-[-0.02em]">
          €{fmtNum(avgPvp, locale)}
        </span>
      </div>

      {/* 3 vertical bars proportional to tier avg */}
      <div className="grid grid-cols-3 gap-3 mb-5 h-[150px]">
        {tiers.map(([key, label], i) => {
          const tier = editor.pricing_tiers[key];
          const avg = tierAvg(tier);
          const heightPct = (avg / heroMax) * 100;
          const accent = FAMILY_ACCENTS[i % FAMILY_ACCENTS.length];
          return (
            <div key={key} className="relative flex flex-col justify-end">
              {/* Bar */}
              <div
                className="rounded-t-[10px] transition-all duration-500 ease-out flex items-end justify-center pb-2"
                style={{
                  height: `${Math.max(10, heightPct)}%`,
                  backgroundColor: accent,
                }}
                title={`${label}: €${fmtNum(tier.min, locale)}–€${fmtNum(tier.max, locale)} · avg €${fmtNum(avg, locale)}`}
              >
                <span className="text-[11px] font-semibold text-carbon/70 tabular-nums">€{fmtNum(avg, locale)}</span>
              </div>
              {/* Footer label */}
              <div className="mt-2 text-center">
                <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/45">{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editable rows + anchored brands */}
      <div className="space-y-3 pt-3 border-t border-carbon/[0.06]">
        {tiers.map(([key, label], i) => {
          const tier = editor.pricing_tiers[key];
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/55">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
                  />
                  {label}
                </span>
                <div className="flex items-baseline gap-1.5 text-[13px] text-carbon font-medium">
                  <span className="text-carbon/40">€</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtNum(tier.min || 0, locale)}
                    onChange={(e) => updateTier(key, { min: Math.max(0, parseNum(e.target.value)) })}
                    className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[80px] outline-none focus:bg-carbon/[0.06] tabular-nums"
                  />
                  <span className="text-carbon/30">–</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtNum(tier.max || 0, locale)}
                    onChange={(e) => updateTier(key, { max: Math.max(0, parseNum(e.target.value)) })}
                    className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[80px] outline-none focus:bg-carbon/[0.06] tabular-nums"
                  />
                </div>
              </div>
              {tier.anchored_by?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tier.anchored_by.map((brand, bi) => (
                    <span
                      key={bi}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/65 leading-snug"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EditorAxisCard>
  );
}

/**
 * Family accents — soft tones from the Aimily accent palette, rotated
 * per family so the user reads each family as a distinct "lane" in the
 * distribution bar and the avatars below.
 */
const FAMILY_ACCENTS = [
  '#b6c8c7', // sea foam
  '#c5caa8', // moss
  '#fff4ce', // citronella
  '#f1efed', // linen
  '#001519', // midnight (text white on this one)
];
const FAMILY_ACCENT_TEXT = ['#000', '#000', '#000', '#000', '#fff'];

function FamiliesCard({ editor, onChange, onDeepen, deepening }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const total = editor.families.reduce((s, f) => s + (f.count || 0), 0) || 1;

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
      {/* ── Distribution dashboard ─────────────────────────────── */}
      <div className="bg-shade rounded-[14px] p-5 mb-6 border border-carbon/[0.04]">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
            {labels.distribution || 'Distribución'}
          </span>
          <span className="text-[24px] font-semibold text-carbon tabular-nums tracking-[-0.02em]">
            {total}
            <span className="text-[12px] font-normal text-carbon/40 ml-1.5">SKUs</span>
          </span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-carbon/[0.04] mb-3">
          {editor.families.map((f, i) => {
            const pct = ((f.count || 0) / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={i}
                className="transition-opacity hover:opacity-90"
                style={{ width: `${pct}%`, backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
                title={`${f.name}: ${f.count}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {editor.families.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[12px] text-carbon/65">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
              />
              <span className="truncate max-w-[160px]">{f.name}</span>
              <span className="text-carbon/30">·</span>
              <span className="text-carbon font-medium tabular-nums">{f.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Family blocks ──────────────────────────────────────── */}
      <div className="space-y-6">
        {editor.families.map((f, fi) => {
          const accent = FAMILY_ACCENTS[fi % FAMILY_ACCENTS.length];
          const accentText = FAMILY_ACCENT_TEXT[fi % FAMILY_ACCENT_TEXT.length];
          const initial = (f.name?.trim()[0] || '?').toUpperCase();
          const subTotal = f.subcategories.reduce((s, sc) => s + (sc.count || 0), 0);
          return (
            <div key={fi} className="relative">
              {/* Family header — avatar + editable name + count badge */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  {initial}
                </div>
                <input
                  type="text"
                  value={f.name}
                  onChange={(e) => updateFamily(fi, { name: e.target.value })}
                  className="text-[18px] font-semibold text-carbon tracking-[-0.02em] bg-transparent outline-none flex-1 focus:bg-carbon/[0.03] rounded px-2 -mx-2 py-1"
                />
                <div className="inline-flex items-baseline gap-1.5 rounded-full bg-carbon/[0.04] px-3 py-1.5 shrink-0">
                  <input
                    type="number"
                    value={f.count || 0}
                    onChange={(e) => updateFamily(fi, { count: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-[36px] text-center text-[15px] font-semibold text-carbon tabular-nums outline-none bg-transparent"
                  />
                  <span className="text-[10px] tracking-[0.08em] uppercase text-carbon/45 font-medium">SKUs</span>
                </div>
              </div>

              {/* Subcategory chip rows */}
              <div className="pl-13 space-y-2" style={{ paddingLeft: '52px' }}>
                {f.subcategories.map((s, si) => (
                  <div
                    key={si}
                    className="group rounded-[14px] bg-white border border-carbon/[0.06] hover:border-carbon/[0.15] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all px-4 py-3 flex items-start gap-3"
                  >
                    {/* Visual count dots */}
                    <div className="flex flex-wrap gap-1 max-w-[60px] pt-1.5 shrink-0">
                      {Array.from({ length: Math.min(s.count || 0, 8) }).map((_, di) => (
                        <span
                          key={di}
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: accent }}
                        />
                      ))}
                      {(s.count || 0) > 8 && (
                        <span className="text-[10px] text-carbon/45 leading-none mt-0.5 ml-0.5">+{s.count - 8}</span>
                      )}
                      {!(s.count > 0) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-carbon/[0.12]" />
                      )}
                    </div>

                    {/* Name + evidence */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateSubcat(fi, si, { name: e.target.value })}
                        className="text-[13px] font-medium text-carbon bg-transparent outline-none w-full focus:bg-carbon/[0.03] rounded px-1 -mx-1"
                      />
                      {s.evidence && (
                        <p
                          className="text-[11px] text-carbon/45 italic mt-1 leading-snug truncate group-hover:whitespace-normal group-hover:overflow-visible"
                          title={s.evidence}
                        >
                          {s.evidence}
                        </p>
                      )}
                    </div>

                    {/* Count input */}
                    <input
                      type="number"
                      value={s.count || 0}
                      onChange={(e) => updateSubcat(fi, si, { count: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-[44px] text-center text-[13px] font-medium text-carbon tabular-nums bg-carbon/[0.03] rounded-md py-1.5 outline-none focus:bg-carbon/[0.06] shrink-0"
                    />
                  </div>
                ))}
              </div>

              {/* Sub-total hint when the family count diverges from sum-of-subs */}
              {subTotal !== f.count && f.subcategories.length > 0 && (
                <div className="mt-2 pl-13 text-[10px] text-carbon/40 italic" style={{ paddingLeft: '52px' }}>
                  {(labels.subTotalMismatch || 'Las subcategorías suman {sub}; la familia indica {fam}.')
                    .replace('{sub}', String(subTotal))
                    .replace('{fam}', String(f.count))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EditorAxisCard>
  );
}

function InvestmentCard({ editor, onChange, language }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  language: string;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const locale = localeFor(language);
  const update = (patch: Partial<PrefilledEditor['investment_split']>) => {
    const next = { ...editor.investment_split, ...patch };
    next.total = (next.production || 0) + (next.marketing || 0);
    onChange({ ...editor, investment_split: next });
  };

  const total = editor.investment_split.total || ((editor.investment_split.production || 0) + (editor.investment_split.marketing || 0));
  const prod = editor.investment_split.production || 0;
  const mktg = editor.investment_split.marketing || 0;
  const prodPct = total > 0 ? (prod / total) * 100 : 0;
  const salesY1 = editor.sales_target_y1 || 0;
  const roiX = total > 0 ? (salesY1 / total) : 0;
  const margin = editor.target_margin_pct || 0;

  // Donut: production = sea-foam segment, marketing = moss segment
  const RADIUS = 56;
  const STROKE = 14;
  const C = 2 * Math.PI * RADIUS;
  const prodLen = (prodPct / 100) * C;
  const mktgLen = C - prodLen;

  return (
    <EditorAxisCard
      title={labels.investmentSplit || 'Inversión'}
      description={labels.investmentSplitDesc || 'Producción + marketing + ventas Y1.'}
      axis="investment"
    >
      {/* Donut + total */}
      <div className="flex items-center gap-5 mt-2 mb-5">
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
            <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={STROKE} />
            {/* Production arc */}
            <circle
              cx="70" cy="70" r={RADIUS} fill="none" stroke="#b6c8c7" strokeWidth={STROKE}
              strokeDasharray={`${prodLen} ${C - prodLen}`} strokeDashoffset="0" strokeLinecap="butt"
              className="transition-all duration-500"
            />
            {/* Marketing arc */}
            <circle
              cx="70" cy="70" r={RADIUS} fill="none" stroke="#c5caa8" strokeWidth={STROKE}
              strokeDasharray={`${mktgLen} ${C - mktgLen}`} strokeDashoffset={-prodLen} strokeLinecap="butt"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[20px] font-semibold text-carbon tabular-nums tracking-[-0.02em] leading-none">
              {fmtEur(total)}
            </div>
            <div className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 mt-1">
              {labels.totalShort || 'total'}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          <div>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#b6c8c7' }} />
              <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/45 flex-1">
                {labels.production || 'Producción'}
              </span>
              <span className="text-[10px] text-carbon/40 tabular-nums">{Math.round(prodPct)}%</span>
            </div>
            <div className="flex items-baseline gap-1 text-[14px] text-carbon font-medium pl-3.5">
              <span className="text-carbon/40">€</span>
              <input
                type="text"
                inputMode="numeric"
                value={fmtNum(prod, locale)}
                onChange={(e) => update({ production: Math.max(0, parseNum(e.target.value)) })}
                className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[100px] outline-none focus:bg-carbon/[0.06] tabular-nums"
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#c5caa8' }} />
              <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/45 flex-1">
                {labels.marketing || 'Marketing'}
              </span>
              <span className="text-[10px] text-carbon/40 tabular-nums">{Math.round(100 - prodPct)}%</span>
            </div>
            <div className="flex items-baseline gap-1 text-[14px] text-carbon font-medium pl-3.5">
              <span className="text-carbon/40">€</span>
              <input
                type="text"
                inputMode="numeric"
                value={fmtNum(mktg, locale)}
                onChange={(e) => update({ marketing: Math.max(0, parseNum(e.target.value)) })}
                className="bg-carbon/[0.03] rounded-md px-2 py-0.5 w-[100px] outline-none focus:bg-carbon/[0.06] tabular-nums"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Y1 target + margin + implied ROI */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-carbon/[0.06]">
        <div className="bg-shade rounded-[12px] p-3.5">
          <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-1.5">
            {labels.salesTargetY1 || 'Ventas Y1'}
          </div>
          <div className="flex items-baseline gap-1 text-carbon font-semibold">
            <span className="text-carbon/40 text-[12px]">€</span>
            <input
              type="text"
              inputMode="numeric"
              value={fmtNum(salesY1, locale)}
              onChange={(e) => onChange({ ...editor, sales_target_y1: Math.max(0, parseNum(e.target.value)) })}
              className="text-[18px] tabular-nums bg-transparent outline-none w-full focus:bg-carbon/[0.04] rounded px-1 -mx-1 tracking-[-0.02em]"
            />
          </div>
          {roiX > 0 && (
            <div className="text-[10px] text-carbon/45 italic mt-1.5">
              {(labels.roiHint || '{x}× sobre la inversión').replace('{x}', roiX.toFixed(1))}
            </div>
          )}
        </div>
        <div className="bg-shade rounded-[12px] p-3.5">
          <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-1.5">
            {labels.targetMargin || 'Margen objetivo'}
          </div>
          <div className="flex items-baseline gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={fmtNum(margin, locale)}
              onChange={(e) => onChange({ ...editor, target_margin_pct: Math.max(0, Math.min(100, parseNum(e.target.value))) })}
              className="text-[18px] font-semibold text-carbon tabular-nums bg-transparent outline-none w-[60px] focus:bg-carbon/[0.04] rounded px-1 -mx-1 tracking-[-0.02em]"
            />
            <span className="text-carbon/40 text-[14px]">%</span>
          </div>
          {/* Margin bar */}
          <div className="mt-2 h-1.5 rounded-full bg-carbon/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, margin)}%`,
                backgroundColor: margin >= 60 ? '#c5caa8' : margin >= 45 ? '#fff4ce' : '#f1efed',
              }}
            />
          </div>
        </div>
      </div>
    </EditorAxisCard>
  );
}

function DropsCard({ editor, onChange, onDeepen, deepening, language }: {
  editor: PrefilledEditor;
  onChange: (e: PrefilledEditor) => void;
  onDeepen: (axis: string) => void;
  deepening: string | null;
  language: string;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const locale = localeFor(language);
  const names = editor.drops.suggested_names || [];
  const dropCount = Math.max(1, editor.drops.count || 1);
  const totalSkus = editor.families.reduce((s, f) => s + (f.count || 0), 0) || editor.sku_count || 0;

  // SKU split per drop — even by default, with the remainder going to
  // the earliest drops so the sum still equals total. Surface each
  // drop's count clearly per Felipe's feedback.
  const skusPerDrop = Array.from({ length: dropCount }).map((_, i) => {
    const base = Math.floor(totalSkus / dropCount);
    const remainder = totalSkus - base * dropCount;
    return base + (i < remainder ? 1 : 0);
  });

  const updateName = (i: number, value: string) => {
    const next = [...names];
    next[i] = value;
    onChange({ ...editor, drops: { ...editor.drops, suggested_names: next } });
  };
  const updateCount = (n: number) => {
    onChange({ ...editor, drops: { ...editor.drops, count: Math.max(1, Math.min(6, n)) } });
  };

  return (
    <EditorAxisCard
      title={labels.dropCalendar || 'Calendario de drops'}
      description={labels.dropCalendarDesc || 'Cuántos drops y cuántos SKUs lleva cada uno.'}
      axis="drops"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      {/* Top: drop count stepper */}
      <div className="flex items-center gap-1.5 mt-2 mb-6">
        <button
          type="button"
          onClick={() => updateCount(dropCount - 1)}
          disabled={dropCount <= 1}
          className="w-7 h-7 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] text-carbon/60 disabled:opacity-30 disabled:cursor-not-allowed text-[14px] leading-none flex items-center justify-center"
        >−</button>
        <span className="text-[28px] font-semibold text-carbon tabular-nums tracking-[-0.02em] leading-none w-[36px] text-center">
          {dropCount}
        </span>
        <button
          type="button"
          onClick={() => updateCount(dropCount + 1)}
          disabled={dropCount >= 6}
          className="w-7 h-7 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] text-carbon/60 disabled:opacity-30 disabled:cursor-not-allowed text-[14px] leading-none flex items-center justify-center"
        >+</button>
        <span className="text-[12px] text-carbon/45 ml-2">{labels.dropsCount || 'drops'}</span>
      </div>

      {/* Horizontal timeline with SKU count badge under each dot */}
      <div className="relative h-[78px] mb-3">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-carbon/15" />
        {Array.from({ length: dropCount }).map((_, i) => {
          const left = dropCount === 1 ? 50 : (i / (dropCount - 1)) * 100;
          const accent = FAMILY_ACCENTS[i % FAMILY_ACCENTS.length];
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${left}%` }}
            >
              <div
                className="w-4 h-4 rounded-full ring-4 ring-shade shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                style={{ backgroundColor: accent }}
              />
              <div className="absolute top-full mt-2 flex flex-col items-center whitespace-nowrap">
                <span className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/50">
                  Drop {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-semibold text-carbon tabular-nums tracking-[-0.02em] mt-0.5">
                  {fmtNum(skusPerDrop[i] || 0, locale)} <span className="text-[10px] font-normal text-carbon/40">SKUs</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop name inputs — show count alongside each */}
      <div className="space-y-2 pt-3 border-t border-carbon/[0.06] mt-6">
        {Array.from({ length: dropCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
            />
            <span className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 shrink-0 w-[52px]">
              Drop {String(i + 1).padStart(2, '0')}
            </span>
            <input
              type="text"
              value={names[i] || ''}
              placeholder={labels.dropNamePlaceholder || 'Nombre del drop'}
              onChange={(e) => updateName(i, e.target.value)}
              className="text-[13px] text-carbon bg-carbon/[0.03] rounded-md px-2.5 py-1.5 flex-1 outline-none focus:bg-carbon/[0.06] placeholder:text-carbon/30"
            />
            <span className="text-[11px] text-carbon/50 tabular-nums shrink-0 px-2.5 py-1.5 bg-carbon/[0.03] rounded-md">
              {fmtNum(skusPerDrop[i] || 0, locale)} SKUs
            </span>
          </div>
        ))}
      </div>
    </EditorAxisCard>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ScenariosContent({ data, onChange, onConfirmed, collectionContext, language = 'es', basePath }: Props) {
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
      // Auto-navigate to 02.2 Surtido & Precios — the seed has landed
      // in CIS, the next mini-block reads it on mount. Without this
      // the user gets stuck on the confirmed editor with no obvious
      // way to advance.
      if (basePath) {
        window.location.href = `${basePath}?block=families`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (labels.errConfirm || 'Error inesperado'));
    } finally {
      setConfirming(false);
    }
  }, [collectionContext.collectionPlanId, data, archetypes, onChange, onConfirmed, labels, basePath]);

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
        <VolumeCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} archetype={chosen} language={language} />
        <InvestmentCard editor={editor} onChange={handleEditorChange} language={language} />
        <PricingCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} language={language} />
        <DropsCard editor={editor} onChange={handleEditorChange} onDeepen={handleDeepen} deepening={deepening} language={language} />
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
