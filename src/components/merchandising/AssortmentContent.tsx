'use client';

/**
 * 02.2 Surtido & Precios · AssortmentContent
 *
 * Sprint B.2 (2026-05-08) — fully rewritten under the canonical Block 1
 * pattern. Reads `merchandising.families.list` seeded by the 02.1
 * confirm and lets the user refine each family's subcategorías + per-
 * subcategory pricing in the gold-standard 4-col Family Card grid.
 *
 * Flow:
 *   load CIS → grid (gold-standard) → inline edit → confirm
 *
 * Anti-leak: pricing benchmarks remain anchored to
 * market_competitors_input.competitors[] (set when scenarios-prefill
 * built the global tiers in 02.1). 02.2 doesn't re-call AI here — it
 * exposes the seeded structure and lets the user refine.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { Loader2, Plus, Trash2, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CanonicalActionBar } from '@/components/workspace/CanonicalActionBar';

// ── Types ──────────────────────────────────────────────────────────────────

interface Subcategory {
  name: string;
  count: number;
  evidence?: string;
}

interface Family {
  name: string;
  count: number;
  subcategories: Subcategory[];
}

interface PriceTier {
  min: number;
  max: number;
  anchored_by?: string[];
}

interface PricingTiers {
  entry: PriceTier;
  core: PriceTier;
  hero: PriceTier;
}

interface SubPrice {
  min: number;
  max: number;
}

interface Props {
  collectionContext: { collectionPlanId: string; collectionName?: string };
  language?: string;
  basePath: string;
}

// ── Format helpers (mirrors ScenariosContent for visual unity) ─────────────

const localeFor = (lang: string) => (lang === 'en' ? 'en-US' : 'es-ES');

function fmtNum(n: number | null | undefined, locale: string): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(locale).format(n);
}

function parseNum(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const FAMILY_ACCENTS = [
  '#b6c8c7', // sea foam
  '#c5caa8', // moss
  '#fff4ce', // citronella
  '#f1efed', // linen
  '#001519', // midnight
];
const FAMILY_ACCENT_TEXT = ['#000', '#000', '#000', '#000', '#fff'];

const subKey = (familyName: string, subName: string) => `${familyName}__${subName}`;

// ── Distribution dashboard (consistent with 02.1) ──────────────────────────

function DistributionBar({ families, locale }: { families: Family[]; locale: string }) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const total = families.reduce((s, f) => s + (f.count || 0), 0) || 1;
  return (
    <div className="bg-white rounded-[16px] p-5 border border-carbon/[0.06] mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.distribution || 'Distribución'}
        </span>
        <span className="text-[24px] font-semibold text-carbon tabular-nums tracking-[-0.02em]">
          {fmtNum(total, locale)}
          <span className="text-[12px] font-normal text-carbon/40 ml-1.5">SKUs</span>
        </span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-carbon/[0.04] mb-3">
        {families.map((f, i) => {
          const pct = ((f.count || 0) / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              style={{ width: `${pct}%`, backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
              title={`${f.name}: ${f.count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {families.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[12px] text-carbon/65">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: FAMILY_ACCENTS[i % FAMILY_ACCENTS.length] }}
            />
            <span className="truncate max-w-[160px]">{f.name}</span>
            <span className="text-carbon/30">·</span>
            <span className="text-carbon font-medium tabular-nums">{fmtNum(f.count, locale)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Family Card (gold-standard 4-col, per design-components-canonical.md §Family Card) ──

function FamilyCard({
  family,
  index,
  locale,
  prices,
  onUpdateName,
  onUpdateCount,
  onUpdateSubcat,
  onAddSubcat,
  onRemoveSubcat,
  onSetSubPrice,
  onRemoveFamily,
}: {
  family: Family;
  index: number;
  locale: string;
  prices: Record<string, SubPrice>;
  onUpdateName: (name: string) => void;
  onUpdateCount: (n: number) => void;
  onUpdateSubcat: (i: number, patch: Partial<Subcategory>) => void;
  onAddSubcat: () => void;
  onRemoveSubcat: (i: number) => void;
  onSetSubPrice: (subName: string, patch: Partial<SubPrice>) => void;
  onRemoveFamily: () => void;
}) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const accent = FAMILY_ACCENTS[index % FAMILY_ACCENTS.length];
  const accentText = FAMILY_ACCENT_TEXT[index % FAMILY_ACCENT_TEXT.length];
  const initial = (family.name?.trim()[0] || '?').toUpperCase();

  return (
    <div
      className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
    >
      {/* Header — avatar + family name + SKU count */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0"
          style={{ backgroundColor: accent, color: accentText }}
        >
          {initial}
        </div>
        <input
          type="text"
          value={family.name}
          onChange={(e) => onUpdateName(e.target.value)}
          placeholder={labels.familyNamePlaceholder || 'Nombre familia'}
          className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] bg-transparent border-0 outline-none flex-1 placeholder:text-carbon/15 focus:bg-carbon/[0.03] rounded px-2 -mx-2 py-1"
        />
      </div>
      <div className="inline-flex items-baseline gap-1.5 rounded-full bg-carbon/[0.04] px-3 py-1.5 w-fit mb-7">
        <input
          type="text"
          inputMode="numeric"
          value={fmtNum(family.count || 0, locale)}
          onChange={(e) => onUpdateCount(Math.max(0, parseNum(e.target.value)))}
          className="w-[40px] text-center text-[15px] font-semibold text-carbon tabular-nums outline-none bg-transparent"
        />
        <span className="text-[10px] tracking-[0.08em] uppercase text-carbon/45 font-medium">SKUs</span>
      </div>

      {/* Subcategories with inline pricing */}
      <div className="space-y-2.5 flex-1">
        {family.subcategories.map((sub, si) => {
          const k = subKey(family.name, sub.name);
          const price = prices[k] || { min: 0, max: 0 };
          return (
            <div
              key={si}
              className="group/row rounded-[12px] border border-carbon/[0.06] hover:border-carbon/[0.15] transition-colors px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => onUpdateSubcat(si, { name: e.target.value })}
                  placeholder={labels.subcategoryPlaceholder || 'Subcategoría'}
                  className="flex-1 h-7 text-[14px] text-carbon bg-transparent border-0 outline-none p-0 placeholder:text-carbon/25 font-medium"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtNum(sub.count || 0, locale)}
                  onChange={(e) => onUpdateSubcat(si, { count: Math.max(0, parseNum(e.target.value)) })}
                  className="w-[40px] text-[12px] text-carbon font-medium text-right tabular-nums bg-transparent outline-none focus:bg-carbon/[0.04] rounded px-1"
                />
                <button
                  type="button"
                  onClick={() => onRemoveSubcat(si)}
                  className="rounded-full h-5 w-5 text-carbon/15 hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 flex items-center justify-center"
                  title="Eliminar subcategoría"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>

              {/* Pricing row */}
              <div className="flex items-center gap-1.5 pl-3.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={price.min ? fmtNum(price.min, locale) : ''}
                  onChange={(e) => onSetSubPrice(sub.name, { min: parseNum(e.target.value) })}
                  placeholder="min"
                  className="w-[64px] h-6 rounded-full text-[11px] text-carbon/70 text-center bg-carbon/[0.03] border-0 outline-none focus:bg-carbon/[0.06] tabular-nums placeholder:text-carbon/25"
                />
                <span className="text-[10px] text-carbon/20">–</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price.max ? fmtNum(price.max, locale) : ''}
                  onChange={(e) => onSetSubPrice(sub.name, { max: parseNum(e.target.value) })}
                  placeholder="max"
                  className="w-[64px] h-6 rounded-full text-[11px] text-carbon/70 text-center bg-carbon/[0.03] border-0 outline-none focus:bg-carbon/[0.06] tabular-nums placeholder:text-carbon/25"
                />
                <span className="text-[10px] text-carbon/30">€</span>
                {sub.evidence && (
                  <span className="text-[10px] text-carbon/40 italic ml-2 truncate" title={sub.evidence}>
                    {sub.evidence}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAddSubcat}
          className="rounded-full h-7 px-3 text-[12px] text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.03] inline-flex items-center transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          {(t.merchandising as Record<string, string>)?.addSubcategory || 'Añadir subcategoría'}
        </button>
      </div>

      {/* Delete family — bottom right, only on hover */}
      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={onRemoveFamily}
          className="rounded-full h-8 w-8 text-carbon/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Eliminar familia"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AssortmentContent({ collectionContext, language = 'es', basePath }: Props) {
  const t = useTranslation();
  const labels = (t.scenarios as Record<string, string>) || {};
  const locale = localeFor(language);

  const [loading, setLoading] = useState(true);
  const [hasStrategy, setHasStrategy] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTiers | null>(null);
  const [subPrices, setSubPrices] = useState<Record<string, SubPrice>>({});
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial CIS load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/families-load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) setError(err.error || 'No se pudo cargar el surtido.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setHasStrategy(!!data.has_strategy);
        setFamilies((data.families as Family[]) || []);
        setPricingTiers((data.pricing_tiers as PricingTiers | null) || null);

        // Seed subcategory prices from the global tier midpoints when
        // there's no per-subcat override yet (so the first render has
        // sensible defaults to refine).
        if (data.pricing_tiers && Array.isArray(data.families)) {
          const tiers = data.pricing_tiers as PricingTiers;
          const seed: Record<string, SubPrice> = {};
          for (const fam of data.families as Family[]) {
            for (const sub of fam.subcategories || []) {
              seed[subKey(fam.name, sub.name)] = {
                min: tiers.core?.min || 0,
                max: tiers.core?.max || 0,
              };
            }
          }
          setSubPrices(seed);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [collectionContext.collectionPlanId]);

  const updateFamily = useCallback((idx: number, patch: Partial<Family>) => {
    setFamilies(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  const updateSubcat = useCallback((fIdx: number, sIdx: number, patch: Partial<Subcategory>) => {
    setFamilies(prev => {
      const next = [...prev];
      const subs = [...next[fIdx].subcategories];
      const oldName = subs[sIdx].name;
      subs[sIdx] = { ...subs[sIdx], ...patch };
      next[fIdx] = { ...next[fIdx], subcategories: subs };
      // Carry the price entry over when the subcategory is renamed
      if (patch.name && patch.name !== oldName) {
        setSubPrices(p => {
          const oldKey = subKey(next[fIdx].name, oldName);
          const newKey = subKey(next[fIdx].name, patch.name!);
          if (p[oldKey]) {
            const out = { ...p };
            out[newKey] = p[oldKey];
            delete out[oldKey];
            return out;
          }
          return p;
        });
      }
      return next;
    });
  }, []);

  const addSubcat = useCallback((fIdx: number) => {
    setFamilies(prev => {
      const next = [...prev];
      const subs = [...next[fIdx].subcategories, { name: '', count: 0, evidence: '' }];
      next[fIdx] = { ...next[fIdx], subcategories: subs };
      return next;
    });
  }, []);

  const removeSubcat = useCallback((fIdx: number, sIdx: number) => {
    setFamilies(prev => {
      const next = [...prev];
      const subs = next[fIdx].subcategories.filter((_, i) => i !== sIdx);
      next[fIdx] = { ...next[fIdx], subcategories: subs };
      return next;
    });
  }, []);

  const setSubPriceFor = useCallback((familyName: string, subName: string, patch: Partial<SubPrice>) => {
    setSubPrices(prev => {
      const k = subKey(familyName, subName);
      const cur = prev[k] || { min: 0, max: 0 };
      return { ...prev, [k]: { ...cur, ...patch } };
    });
  }, []);

  const addFamily = useCallback(() => {
    setFamilies(prev => [...prev, { name: '', count: 0, subcategories: [] }]);
  }, []);

  const removeFamily = useCallback((idx: number) => {
    setFamilies(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/families-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: collectionContext.collectionPlanId,
          families,
          pricing_tiers: pricingTiers,
          subcategory_prices: subPrices,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'No se pudo confirmar.');
        return;
      }
      // Navigate to next mini-block
      window.location.href = `${basePath}?block=channels`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setConfirming(false);
    }
  }, [collectionContext.collectionPlanId, families, pricingTiers, subPrices, basePath]);

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
        <p className="text-[13px] text-carbon/55 italic">
          {labels.loadingFamilies || 'Cargando tu surtido…'}
        </p>
      </div>
    );
  }

  // Empty state — strategy not yet confirmed
  if (!hasStrategy && families.length === 0) {
    return (
      <div className="max-w-[640px] mx-auto bg-white rounded-[20px] p-10 md:p-14 border border-carbon/[0.06] text-center">
        <div className="w-12 h-12 rounded-full bg-carbon/[0.04] flex items-center justify-center mx-auto mb-5">
          <ArrowLeft className="h-5 w-5 text-carbon/45" />
        </div>
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
          {labels.assortmentEmptyTitle || 'Define primero la estrategia de compra'}
        </h3>
        <p className="text-[14px] text-carbon/55 leading-relaxed mb-6">
          {labels.assortmentEmptyDesc || 'El surtido se construye a partir de la estrategia que elijas. Cuando confirmes 02.1 Estrategia de Compra, las familias y precios aparecerán aquí pre-poblados desde tu Block 1.'}
        </p>
        <Link
          href={`${basePath}?block=scenarios`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {labels.goToStrategy || 'Ir a Estrategia de Compra'}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {error && (
        <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800 mb-5">
          {error}
        </div>
      )}

      {/* Distribution dashboard */}
      {families.length > 0 && <DistributionBar families={families} locale={locale} />}

      {/* Gold-standard 4-col Family Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {families.map((fam, fi) => (
          <FamilyCard
            key={fi}
            family={fam}
            index={fi}
            locale={locale}
            prices={subPrices}
            onUpdateName={(name) => updateFamily(fi, { name })}
            onUpdateCount={(count) => updateFamily(fi, { count })}
            onUpdateSubcat={(si, patch) => updateSubcat(fi, si, patch)}
            onAddSubcat={() => addSubcat(fi)}
            onRemoveSubcat={(si) => removeSubcat(fi, si)}
            onSetSubPrice={(subName, patch) => setSubPriceFor(fam.name, subName, patch)}
            onRemoveFamily={() => removeFamily(fi)}
          />
        ))}
      </div>

      {/* Add family CTA */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="outline"
          onClick={addFamily}
          className="rounded-full border-dashed text-carbon/45 hover:text-carbon"
        >
          <Plus className="h-3.5 w-3.5 mr-2" />
          {labels.addFamily || 'Añadir familia'}
        </Button>
      </div>

      <CanonicalActionBar
        onModify={() => { window.history.back(); }}
        onConfirm={handleConfirm}
        modifyLabel={labels.backLabel || 'Atrás'}
        confirmLabel={labels.confirmAssortment || 'Confirmar y continuar a Distribución'}
        confirmDisabled={families.length === 0}
        loading={confirming}
      />
    </div>
  );
}
