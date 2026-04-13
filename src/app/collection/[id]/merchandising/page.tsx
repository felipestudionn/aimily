'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Lock, ShoppingBag, DollarSign, Store, Calculator, LayoutGrid, X, Loader2, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { SegmentedPill } from '@/components/ui/segmented-pill';

/* ─── AI generation helper ─── */
async function generateMerch(
  type: string,
  input: Record<string, string>,
  language?: string,
): Promise<{ result: unknown; error?: string }> {
  const res = await fetch('/api/ai/merch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    return { result: null, error: err.error || 'AI generation failed' };
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   Merchandising & Planning Block — 4 Cards + Collection Builder
   Expand/collapse: click START → card fills grid,
   others collapse to icons. Confirm → back to 2x2.
   ═══════════════════════════════════════════════════════════ */

type InputMode = 'free' | 'assisted' | 'ai';

interface MerchCard {
  id: string;
  icon: React.ElementType;
  lockedBy?: string;
}

interface CardData {
  [cardId: string]: {
    mode: InputMode;
    confirmed: boolean;
    data: Record<string, unknown>;
  };
}

const MERCH_CARDS: MerchCard[] = [
  { id: 'families', icon: ShoppingBag },
  { id: 'pricing', icon: DollarSign, lockedBy: 'families' },
  { id: 'channels', icon: Store },
  { id: 'budget', icon: Calculator },
];

/* Maps card id to its translation keys */
const CARD_KEYS: Record<string, { name: string; nameEs: string; desc: string }> = {
  families: { name: 'productFamilies', nameEs: 'productFamiliesEs', desc: 'productFamiliesDesc' },
  pricing: { name: 'pricing', nameEs: 'pricingEs', desc: 'pricingDesc' },
  channels: { name: 'channelsMarkets', nameEs: 'channelsMarketsEs', desc: 'channelsMarketsDesc' },
  budget: { name: 'budgetFinancials', nameEs: 'budgetFinancialsEs', desc: 'budgetFinancialsDesc' },
};

const INPUT_MODE_IDS: InputMode[] = ['free', 'assisted', 'ai'];
const INPUT_MODE_KEYS: Record<InputMode, { label: string; desc: string }> = {
  free: { label: 'modeFree', desc: 'modeFreeDesc' },
  assisted: { label: 'modeAssisted', desc: 'modeAssistedDesc' },
  ai: { label: 'modeAI', desc: 'modeAIDesc' },
};

/* ─── Family type for structured data ─── */
interface Family {
  name: string;
  subcategories: string[];
  priority?: 'core' | 'strategic' | 'complementary';
}

/* ─── Priority badge + selector ─── */
const PRIORITY_STYLES = {
  core: 'bg-carbon text-crema',
  strategic: 'bg-carbon/[0.15] text-carbon',
  complementary: 'bg-carbon/[0.06] text-carbon/50',
} as const;

const PRIORITY_KEYS = {
  core: 'priorityCore',
  strategic: 'priorityStrategic',
  complementary: 'priorityComplementary',
} as const;

type Priority = 'core' | 'strategic' | 'complementary';

function PriorityBadge({ priority, onCycle }: { priority?: Priority | string; onCycle: () => void }) {
  const t = useTranslation();
  const validPriorities: Priority[] = ['core', 'strategic', 'complementary'];
  const p: Priority = validPriorities.includes(priority as Priority) ? (priority as Priority) : 'core';
  const style = PRIORITY_STYLES[p];
  const label = t.merchandising[PRIORITY_KEYS[p] as keyof typeof t.merchandising] as string;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCycle(); }}
      className={`px-2.5 py-1 text-[10px] font-semibold tracking-[0.05em] uppercase shrink-0 transition-colors hover:opacity-80 ${style}`}
      title="Click to change priority"
    >
      {label}
    </button>
  );
}

function cyclePriority(current?: Priority): Priority {
  const order: Priority[] = ['core', 'strategic', 'complementary'];
  const idx = order.indexOf(current || 'core');
  return order[(idx + 1) % order.length];
}

/* ─── Content Components ─── */

function FamiliesContent({ mode, data, onChange, collectionContext }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const families = (data.families as Family[]) || [];

  const addFamily = () => onChange({ ...data, families: [...families, { name: '', subcategories: [''], priority: 'core' as Priority }] });
  const cycleFamilyPriority = (i: number) => {
    const updated = [...families];
    updated[i] = { ...updated[i], priority: cyclePriority(updated[i].priority) };
    onChange({ ...data, families: updated });
  };
  const removeFamily = (i: number) => onChange({ ...data, families: families.filter((_, j) => j !== i) });
  const updateFamilyName = (i: number, name: string) => {
    const updated = [...families];
    updated[i] = { ...updated[i], name };
    onChange({ ...data, families: updated });
  };
  const addSubcategory = (i: number) => {
    const updated = [...families];
    updated[i] = { ...updated[i], subcategories: [...updated[i].subcategories, ''] };
    onChange({ ...data, families: updated });
  };
  const updateSubcategory = (fi: number, si: number, val: string) => {
    const updated = [...families];
    const subs = [...updated[fi].subcategories];
    subs[si] = val;
    updated[fi] = { ...updated[fi], subcategories: subs };
    onChange({ ...data, families: updated });
  };
  const removeSubcategory = (fi: number, si: number) => {
    const updated = [...families];
    updated[fi] = { ...updated[fi], subcategories: updated[fi].subcategories.filter((_, j) => j !== si) };
    onChange({ ...data, families: updated });
  };

  return (
    <div className="space-y-6">
      {mode === 'free' && (
        <div className="space-y-4">
          {families.map((fam, fi) => (
            <div key={fi} className="border border-carbon/[0.08] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <PriorityBadge priority={fam.priority} onCycle={() => cycleFamilyPriority(fi)} />
                <input
                  value={fam.name}
                  onChange={(e) => updateFamilyName(fi, e.target.value)}
                  placeholder={t.merchandising.familyNamePlaceholder}
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none"
                />
                <button onClick={() => removeFamily(fi)} className="text-carbon/30 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
              {fam.subcategories.map((sub, si) => (
                <div key={si} className="flex items-center gap-2 ml-6">
                  <span className="text-carbon/20 text-xs">{'\u2514'}</span>
                  <input
                    value={sub}
                    onChange={(e) => updateSubcategory(fi, si, e.target.value)}
                    placeholder={t.merchandising.subcategoryPlaceholder}
                    className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none"
                  />
                  <button onClick={() => removeSubcategory(fi, si)} className="text-carbon/20 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <button onClick={() => addSubcategory(fi)} className="ml-6 text-xs font-medium tracking-[0.1em] uppercase text-carbon/40 hover:text-carbon/60 flex items-center gap-1">
                <Plus className="h-3 w-3" /> {t.merchandising.addSubcategory}
              </button>
            </div>
          ))}
          <button onClick={addFamily} className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase border border-dashed border-carbon/[0.12] text-carbon/40 hover:text-carbon/60 hover:border-carbon/20 transition-colors w-full justify-center">
            <Plus className="h-3.5 w-3.5" /> {t.merchandising.addFamily}
          </button>
        </div>
      )}

      {mode === 'assisted' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.direction}</label>
            <textarea
              value={(data.direction as string) || ''}
              onChange={(e) => onChange({ ...data, direction: e.target.value })}
              placeholder={t.merchandising.directionFamiliesPlaceholder}
              className="w-full h-28 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const { result, error: err } = await generateMerch('families-assisted', { direction: (data.direction as string) || '', ...collectionContext }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { families: Family[] };
              onChange({ ...data, families: parsed.families || [] });
              setGenerating(false);
            }}
            disabled={generating || !(data.direction as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t.merchandising.suggestFamilies}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {/* Show editable result */}
          {families.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.aiSuggestion} <span className="text-carbon/40">({t.merchandising.editable})</span></label>
              {families.map((fam, fi) => (
                <div key={fi} className="border border-carbon/[0.08] p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={fam.priority} onCycle={() => cycleFamilyPriority(fi)} />
                    <input value={fam.name} onChange={(e) => updateFamilyName(fi, e.target.value)} className="flex-1 px-3 py-2 text-sm font-medium text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                  </div>
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="flex items-center gap-2 ml-4">
                      <span className="text-carbon/20 text-xs">{'\u2514'}</span>
                      <input value={sub} onChange={(e) => updateSubcategory(fi, si, e.target.value)} className="flex-1 px-3 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                      <button onClick={() => removeSubcategory(fi, si)} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addSubcategory(fi)} className="ml-4 text-xs text-carbon/40 hover:text-carbon/60 flex items-center gap-1"><Plus className="h-3 w-3" /> {t.merchandising.add}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <p className="text-sm text-carbon/60 leading-relaxed">
            {t.merchandising.aiProposalFamilies} <strong>{t.merchandising.aiProposalFamiliesBold}</strong>.
          </p>
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const { result, error: err } = await generateMerch('families-proposals', { ...collectionContext }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { families: Family[] };
              onChange({ ...data, families: parsed.families || [] });
              setGenerating(false);
            }}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {families.length > 0 ? t.merchandising.regenerate : t.merchandising.proposeFamilies}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {/* Editable result — same as Assisted */}
          {families.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.aiSuggestion} <span className="text-carbon/40">({t.merchandising.editable})</span></label>
              {families.map((fam, fi) => (
                <div key={fi} className="border border-carbon/[0.08] p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={fam.priority} onCycle={() => cycleFamilyPriority(fi)} />
                    <input value={fam.name} onChange={(e) => updateFamilyName(fi, e.target.value)} className="flex-1 px-3 py-2 text-sm font-medium text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                    <button onClick={() => removeFamily(fi)} className="text-carbon/30 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="flex items-center gap-2 ml-4">
                      <span className="text-carbon/20 text-xs">{'\u2514'}</span>
                      <input value={sub} onChange={(e) => updateSubcategory(fi, si, e.target.value)} className="flex-1 px-3 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                      <button onClick={() => removeSubcategory(fi, si)} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addSubcategory(fi)} className="ml-4 text-xs text-carbon/40 hover:text-carbon/60 flex items-center gap-1"><Plus className="h-3 w-3" /> {t.merchandising.add}</button>
                </div>
              ))}
              <button onClick={addFamily} className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase border border-dashed border-carbon/[0.12] text-carbon/40 hover:text-carbon/60 hover:border-carbon/20 transition-colors w-full justify-center">
                <Plus className="h-3.5 w-3.5" /> {t.merchandising.addFamily}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PricingContent({ mode, data, onChange, collectionContext, familiesData }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesData: Family[];
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type PricingRow = { family: string; subcategories: { name: string; minPrice: number; maxPrice: number; rationale?: string }[] };
  const pricing = (data.pricing as PricingRow[]) || [];

  const familiesStr = familiesData.map(f => `${f.name}: ${f.subcategories.join(', ')}`).join(' | ');

  // Initialize pricing from families if empty
  const initPricing = () => {
    if (pricing.length === 0 && familiesData.length > 0) {
      onChange({ ...data, pricing: familiesData.map(f => ({ family: f.name, subcategories: f.subcategories.map(s => ({ name: s, minPrice: 0, maxPrice: 0 })) })) });
    }
  };

  useEffect(() => { if (mode === 'free') initPricing(); }, [mode, familiesData.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePrice = (fi: number, si: number, field: 'minPrice' | 'maxPrice', val: number) => {
    const updated = [...pricing];
    const subs = [...updated[fi].subcategories];
    subs[si] = { ...subs[si], [field]: val };
    updated[fi] = { ...updated[fi], subcategories: subs };
    onChange({ ...data, pricing: updated });
  };

  return (
    <div className="space-y-6">
      {mode === 'free' && (
        <div className="space-y-4">
          {pricing.map((fam, fi) => (
            <div key={fi} className="space-y-2">
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-carbon">{fam.family}</div>
              {fam.subcategories.map((sub, si) => (
                <div key={si} className="flex items-center gap-3 ml-4">
                  <span className="text-sm text-carbon/60 w-40 truncate">{sub.name}</span>
                  <span className="text-xs text-carbon/30">{t.merchandising.minPrice}</span>
                  <input type="number" value={sub.minPrice || ''} onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                  <span className="text-xs text-carbon/30">{t.merchandising.maxPrice}</span>
                  <input type="number" value={sub.maxPrice || ''} onChange={(e) => updatePrice(fi, si, 'maxPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                </div>
              ))}
            </div>
          ))}
          {pricing.length === 0 && <p className="text-xs text-carbon/40">{t.merchandising.validateFamiliesFirst}</p>}
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          {mode === 'ai' && !pricing.length && (
            <p className="text-sm text-carbon/60 leading-relaxed">
              {t.merchandising.aiProposalPricing} <strong>{t.merchandising.aiProposalPricingBold}</strong>.
            </p>
          )}
          {mode === 'assisted' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.pricingDirection}</label>
                <textarea
                  value={(data.direction as string) || ''}
                  onChange={(e) => onChange({ ...data, direction: e.target.value })}
                  placeholder={t.merchandising.pricingDirectionPlaceholder}
                  className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.referenceBrands} <span className="text-carbon/40 normal-case tracking-normal font-normal">({t.merchandising.optional})</span></label>
                <input
                  type="text"
                  value={(data.referenceBrands as string) || ''}
                  onChange={(e) => onChange({ ...data, referenceBrands: e.target.value })}
                  placeholder={t.merchandising.referenceBrandsPlaceholder}
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/40"
                />
                <p className="text-[10px] text-carbon/40 mt-1.5">{t.merchandising.referenceBrandsHint}</p>
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const apiType = mode === 'assisted' ? 'pricing-assisted' : 'pricing-proposals';
              const { result, error: err } = await generateMerch(apiType, {
                families: familiesStr,
                direction: (data.direction as string) || '',
                referenceBrands: (data.referenceBrands as string) || '',
                ...collectionContext,
              }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { pricing: PricingRow[]; pricingThesis?: string };
              onChange({ ...data, pricing: parsed.pricing || [], pricingThesis: parsed.pricingThesis || '' });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {mode === 'assisted' ? t.merchandising.suggestPricing : t.merchandising.generatePricingMatrix}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {/* Show editable result */}
          {pricing.length > 0 && (
            <div className="space-y-4 pt-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.aiPricing} <span className="text-carbon/40">({t.merchandising.editable})</span></label>
              {/* Pricing Thesis */}
              {(data.pricingThesis as string) && (
                <div className="p-4 bg-carbon/[0.03] border border-carbon/[0.08]">
                  <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-carbon/40 mb-1.5">{t.merchandising.pricingThesisLabel}</div>
                  <p className="text-sm text-carbon/70 leading-relaxed italic">{data.pricingThesis as string}</p>
                </div>
              )}
              {pricing.map((fam, fi) => (
                <div key={fi} className="space-y-2">
                  <div className="text-xs font-semibold tracking-[0.1em] uppercase text-carbon">{fam.family}</div>
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="ml-4 space-y-0.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-carbon/60 w-40 truncate" title={sub.name}>{sub.name}</span>
                        <span className="text-xs text-carbon/30">{t.merchandising.minPrice}</span>
                        <input type="number" value={sub.minPrice || ''} onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                        <span className="text-xs text-carbon/30">{t.merchandising.maxPrice}</span>
                        <input type="number" value={sub.maxPrice || ''} onChange={(e) => updatePrice(fi, si, 'maxPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                      </div>
                      {sub.rationale && <div className="text-[10px] text-carbon/40 italic ml-0.5">{sub.rationale}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelsContent({ mode, data, onChange, collectionContext }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type ChannelConfig = { enabled: boolean; digital: boolean; physical: boolean };
  const dtc: ChannelConfig = (data.dtc as ChannelConfig) || { enabled: false, digital: false, physical: false };
  const wholesale: ChannelConfig = (data.wholesale as ChannelConfig) || { enabled: false, digital: false, physical: false };
  const toggleMarketSelection = (idx: number) => {
    const updated = [...markets];
    updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
    onChange({ ...data, markets: updated });
  };

  // Legacy compat: migrate old string[] channels to new structure
  const legacyChannels = (data.channels as string[]) || [];
  if (legacyChannels.length > 0 && !data.dtc && !data.wholesale) {
    const hasDtc = legacyChannels.includes('DTC');
    const hasWholesale = legacyChannels.includes('Wholesale');
    if (hasDtc || hasWholesale) {
      onChange({
        ...data,
        dtc: { enabled: hasDtc, digital: hasDtc, physical: false },
        wholesale: { enabled: hasWholesale, digital: hasWholesale, physical: false },
        channels: [],
      });
    }
  }
  type EntryPoint = { label: string; detail: string };
  type Market = { name: string; region: string; opportunity: string; rationale: string; entryStrategy?: string; entryPoints?: EntryPoint[]; selected?: boolean };
  const markets = (data.markets as Market[]) || [];

  const toggleDtc = () => {
    const next = !dtc.enabled;
    onChange({ ...data, dtc: { enabled: next, digital: next, physical: false } });
  };
  const toggleWholesale = () => {
    const next = !wholesale.enabled;
    onChange({ ...data, wholesale: { enabled: next, digital: next, physical: false } });
  };
  const toggleSub = (channel: 'dtc' | 'wholesale', sub: 'digital' | 'physical') => {
    const current = channel === 'dtc' ? dtc : wholesale;
    const updated = { ...current, [sub]: !current[sub] };
    onChange({ ...data, [channel]: updated });
  };

  // Build channels string for API
  const channelsSummary = [
    dtc.enabled ? `DTC (${[dtc.digital ? 'Digital' : '', dtc.physical ? 'Physical' : ''].filter(Boolean).join(' + ') || 'TBD'})` : '',
    wholesale.enabled ? `Wholesale (${[wholesale.digital ? 'Digital' : '', wholesale.physical ? 'Physical' : ''].filter(Boolean).join(' + ') || 'TBD'})` : '',
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* Channel selection — compact row */}
      <div>
        <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-3 block">{t.merchandising.distributionChannels}</label>
        <div className="grid grid-cols-2 gap-3">
          {/* DTC */}
          <div className={`border transition-all ${dtc.enabled ? 'border-carbon/20 bg-carbon/[0.02]' : 'border-carbon/[0.06]'} p-3`}>
            <button onClick={toggleDtc} className="flex items-center gap-2.5 w-full">
              <div className={`w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${dtc.enabled ? 'border-carbon bg-carbon' : 'border-carbon/20'}`}>
                {dtc.enabled && <Check className="h-2.5 w-2.5 text-crema" />}
              </div>
              <span className={`text-xs font-medium ${dtc.enabled ? 'text-carbon' : 'text-carbon/40'}`}>DTC</span>
            </button>
            {dtc.enabled && (
              <div className="flex gap-2 mt-2.5 ml-6">
                <button onClick={() => toggleSub('dtc', 'digital')} className={`px-3 py-1 text-[10px] font-medium tracking-[0.06em] uppercase border transition-all ${dtc.digital ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.1] text-carbon/40 hover:border-carbon/20'}`}>
                  {t.merchandising.digital}
                </button>
                <button onClick={() => toggleSub('dtc', 'physical')} className={`px-3 py-1 text-[10px] font-medium tracking-[0.06em] uppercase border transition-all ${dtc.physical ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.1] text-carbon/40 hover:border-carbon/20'}`}>
                  {t.merchandising.physical}
                </button>
              </div>
            )}
          </div>
          {/* Wholesale */}
          <div className={`border transition-all ${wholesale.enabled ? 'border-carbon/20 bg-carbon/[0.02]' : 'border-carbon/[0.06]'} p-3`}>
            <button onClick={toggleWholesale} className="flex items-center gap-2.5 w-full">
              <div className={`w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${wholesale.enabled ? 'border-carbon bg-carbon' : 'border-carbon/20'}`}>
                {wholesale.enabled && <Check className="h-2.5 w-2.5 text-crema" />}
              </div>
              <span className={`text-xs font-medium ${wholesale.enabled ? 'text-carbon' : 'text-carbon/40'}`}>Wholesale</span>
            </button>
            {wholesale.enabled && (
              <div className="flex gap-2 mt-2.5 ml-6">
                <button onClick={() => toggleSub('wholesale', 'digital')} className={`px-3 py-1 text-[10px] font-medium tracking-[0.06em] uppercase border transition-all ${wholesale.digital ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.1] text-carbon/40 hover:border-carbon/20'}`}>
                  {t.merchandising.digital}
                </button>
                <button onClick={() => toggleSub('wholesale', 'physical')} className={`px-3 py-1 text-[10px] font-medium tracking-[0.06em] uppercase border transition-all ${wholesale.physical ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.1] text-carbon/40 hover:border-carbon/20'}`}>
                  {t.merchandising.physical}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Markets — depends on mode */}
      {mode === 'free' && (
        <div>
          <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.targetMarkets}</label>
          {markets.map((m, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input value={m.name} onChange={(e) => { const u = [...markets]; u[i] = { ...u[i], name: e.target.value }; onChange({ ...data, markets: u }); }}
                placeholder={t.merchandising.marketNamePlaceholder} className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
              <input value={m.region} onChange={(e) => { const u = [...markets]; u[i] = { ...u[i], region: e.target.value }; onChange({ ...data, markets: u }); }}
                placeholder={t.merchandising.regionPlaceholder} className="w-32 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
              <button onClick={() => onChange({ ...data, markets: markets.filter((_, j) => j !== i) })} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...data, markets: [...markets, { name: '', region: '', opportunity: 'medium', rationale: '' }] })}
            className="text-xs font-medium tracking-[0.1em] uppercase text-carbon/40 hover:text-carbon/60 flex items-center gap-1 mt-1"><Plus className="h-3 w-3" /> {t.merchandising.addMarket}</button>
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          {mode === 'ai' && !markets.length && (
            <p className="text-sm text-carbon/60 leading-relaxed">
              {t.merchandising.aiProposalChannels} <strong>{t.merchandising.aiProposalChannelsBold}</strong>.
            </p>
          )}
          {mode === 'assisted' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.marketDirection}</label>
              <textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder={t.merchandising.marketDirectionPlaceholder}
                className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
              />
            </div>
          )}
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const apiType = mode === 'assisted' ? 'channels-assisted' : 'channels-proposals';
              const { result, error: err } = await generateMerch(apiType, { direction: (data.direction as string) || '', channelConfig: channelsSummary, ...collectionContext }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { markets: Market[] };
              const marketsWithSelection = (parsed.markets || []).map(m => ({ ...m, selected: true }));
              onChange({ ...data, markets: marketsWithSelection });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {mode === 'assisted' ? t.merchandising.suggestMarkets : t.merchandising.recommendMarkets}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {markets.length > 0 && (
            <div className="space-y-4 pt-3">
              {/* Selection counter */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-carbon/50">
                  <span className="font-semibold text-carbon">{markets.filter(m => m.selected !== false).length}</span> {t.merchandising.marketsSelected} · {markets.length} {t.merchandising.marketsTotal}
                </p>
              </div>
              {markets.map((m, i) => {
                const isSelected = m.selected !== false;
                const epStyle = (label: string) => {
                  const l = label.toLowerCase();
                  if (l.includes('social') || l.includes('instagram') || l.includes('tiktok')) return { card: 'bg-[#f2ede8] border-[#e0d8ce]', badge: 'bg-[#c4a882] text-white' };
                  if (l.includes('dtc') || l.includes('e-commerce')) return { card: 'bg-[#f5f2ed] border-[#e5ddd2]', badge: 'bg-[#8b7355] text-white' };
                  if (l.includes('wholesale') || l.includes('key account') || l.includes('boutique') || l.includes('department')) return { card: 'bg-[#eef0f3] border-[#d5dae2]', badge: 'bg-[#5a6b7d] text-white' };
                  if (l.includes('showroom') || l.includes('flagship') || l.includes('pop-up')) return { card: 'bg-[#eeecf2] border-[#d8d3e2]', badge: 'bg-[#6b5e7d] text-white' };
                  return { card: 'bg-carbon/[0.03] border-carbon/[0.08]', badge: 'bg-carbon/30 text-white' };
                };
                return (
                  <div
                    key={i}
                    className={`border transition-all cursor-pointer ${isSelected ? 'border-carbon/[0.15] bg-white' : 'border-carbon/[0.06] bg-carbon/[0.01] opacity-50'}`}
                    onClick={() => toggleMarketSelection(i)}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-carbon/[0.05]">
                      <div className={`w-4.5 h-4.5 border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-carbon bg-carbon' : 'border-carbon/20'}`}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-crema" />}
                      </div>
                      <div className={`px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${m.opportunity === 'high' ? 'bg-carbon text-crema' : 'bg-carbon/[0.06] text-carbon/50'}`}>{m.opportunity}</div>
                      <div className="text-sm font-medium text-carbon">{m.name}</div>
                      <span className="text-xs text-carbon/30">{m.region}</span>
                    </div>
                    {/* Body */}
                    <div className="px-5 py-4 space-y-3.5">
                      <p className="text-xs text-carbon/60 leading-relaxed">{m.rationale}</p>
                      {/* Entry points */}
                      {m.entryPoints && m.entryPoints.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/30">{t.merchandising.entryStrategyLabel}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {m.entryPoints.map((ep, j) => {
                              const st = epStyle(ep.label);
                              return (
                                <div key={j} className={`p-3 border ${st.card}`}>
                                  <span className={`inline-block px-2 py-0.5 text-[9px] font-bold tracking-[0.06em] uppercase mb-1.5 ${st.badge}`}>{ep.label}</span>
                                  <p className="text-[11px] text-carbon/60 leading-relaxed">{ep.detail}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : m.entryStrategy ? (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/30">{t.merchandising.entryStrategyLabel}</div>
                          <p className="text-[11px] text-carbon/50 italic leading-relaxed">{m.entryStrategy}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BudgetContent({ mode, data, onChange, collectionContext, familiesStr, pricingStr, channelsStr }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesStr: string; pricingStr: string; channelsStr: string;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type Seg = { name: string; percentage: number };
  const typeSeg = (data.typeSegmentation as Seg[]) || [{ name: 'Revenue', percentage: 60 }, { name: 'Image', percentage: 20 }, { name: 'Entry', percentage: 20 }];
  const newnessSeg = (data.newnessSegmentation as Seg[]) || [{ name: 'Newness', percentage: 70 }, { name: 'Carry-Over', percentage: 30 }];

  const fields = [
    { key: 'salesTarget', label: t.merchandising.salesTarget, type: 'number' as const, placeholder: t.merchandising.salesTargetPlaceholder },
    { key: 'targetMargin', label: t.merchandising.targetMargin, type: 'number' as const, placeholder: t.merchandising.targetMarginPlaceholder },
    { key: 'avgDiscount', label: t.merchandising.avgDiscount, type: 'number' as const, placeholder: t.merchandising.avgDiscountPlaceholder },
    { key: 'sellThroughMonths', label: t.merchandising.sellThroughMonths, type: 'number' as const, placeholder: t.merchandising.sellThroughMonthsPlaceholder },
  ];

  return (
    <div className="space-y-6">
      {mode === 'free' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{f.label}</label>
                <input type={f.type} value={(data[f.key] as number) || ''} onChange={(e) => onChange({ ...data, [f.key]: Number(e.target.value) })}
                  placeholder={f.placeholder} className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/40" />
              </div>
            ))}
          </div>
          {/* Segmentation */}
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.productTypeSegmentation}</label>
            <div className="flex gap-4">
              {typeSeg.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="text-xs text-carbon/60">{s.name}</span>
                  <input type="number" value={s.percentage} onChange={(e) => { const u = [...typeSeg]; u[i] = { ...u[i], percentage: Number(e.target.value) }; onChange({ ...data, typeSegmentation: u }); }}
                    className="w-16 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none text-center" />
                  <span className="text-xs text-carbon/30">%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.newnessSegmentation}</label>
            <div className="flex gap-4">
              {newnessSeg.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="text-xs text-carbon/60">{s.name}</span>
                  <input type="number" value={s.percentage} onChange={(e) => { const u = [...newnessSeg]; u[i] = { ...u[i], percentage: Number(e.target.value) }; onChange({ ...data, newnessSegmentation: u }); }}
                    className="w-16 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none text-center" />
                  <span className="text-xs text-carbon/30">%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          {mode === 'ai' && !(data.salesTarget as number) && (
            <p className="text-sm text-carbon/60 leading-relaxed">
              {t.merchandising.aiProposalBudget} <strong>{t.merchandising.aiProposalBudgetBold}</strong>.
            </p>
          )}
          {mode === 'assisted' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-3 block">{t.merchandising.growthModelLabel}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'dtc-bootstrap', name: 'DTC-First Bootstrap', ref: 'Axel Arigato', revenue: '€100K–300K Y1', mix: '80% DTC', margin: '65%', desc: 'Drop model, community-driven, low fixed costs. Scale online before physical.' },
                    { id: 'wholesale-led', name: 'Wholesale-Led Launch', ref: 'Jacquemus (early)', revenue: '€200K–500K Y1', mix: '60% Wholesale', margin: '50%', desc: 'Showroom-driven, multi-brand retailers, trade shows. Volume from day one.' },
                    { id: 'community-nordic', name: 'Community-Driven', ref: 'Holzweiler / Ganni', revenue: '€150K–400K Y1', mix: '50/50 DTC & WS', margin: '60%', desc: 'Event marketing, scandi hype, 60% CAGR. Balanced growth.' },
                    { id: 'quiet-luxury', name: 'Quiet Luxury', ref: 'COS / The Row', revenue: '€300K–800K Y1', mix: 'Controlled', margin: '70%', desc: 'High ASP, limited distribution, editorial press. Quality over quantity.' },
                    { id: 'collab-hype', name: 'Collab & Hype Engine', ref: 'Aim\u00E9 Leon Dore', revenue: '€200K–600K Y1', mix: 'DTC & Collabs', margin: '60%', desc: 'Limited drops, brand collabs drive traffic and press coverage.' },
                    { id: 'digital-native', name: 'Digital Native Scale', ref: 'Pangaia / Reformation', revenue: '€150K–500K Y1', mix: '90% Digital', margin: '65%', desc: 'Content-led, social-first, sustainability narrative. Low overhead.' },
                    { id: 'accessible-premium', name: 'Accessible Premium', ref: 'Sandro / Maje', revenue: '€400K–1M Y1', mix: 'Omnichannel', margin: '55%', desc: 'Department store anchored, city-center retail, data-driven.' },
                    { id: 'artisan-craft', name: 'Artisan Craft Story', ref: 'HEREU / Loewe Craft', revenue: '€80K–250K Y1', mix: 'Selective', margin: '70%', desc: 'High margin, low volume, press & editorial driven. Heritage narrative.' },
                    { id: 'marketplace-first', name: 'Marketplace Accelerator', ref: 'SSENSE / Farfetch', revenue: '€100K–400K Y1', mix: '70% Marketplace', margin: '45%', desc: 'Marketplace-first, low fixed costs, global reach from day one.' },
                    { id: 'investor-blitz', name: 'Investor-Backed Blitz', ref: 'Holzweiler + Sequoia', revenue: '€500K–2M Y1', mix: 'Aggressive', margin: '55%', desc: 'VC-funded rapid expansion, store rollouts, international from launch.' },
                  ].map((scenario, idx) => {
                    const selected = (data.growthModel as string) === scenario.id;
                    return (
                      <button
                        key={scenario.id}
                        onClick={() => onChange({ ...data, growthModel: selected ? '' : scenario.id, direction: selected ? '' : `Growth model: ${scenario.name} (ref: ${scenario.ref}). ${scenario.desc} Target: ${scenario.revenue}, channel mix: ${scenario.mix}, margin: ${scenario.margin}.` })}
                        className={`text-left border transition-all overflow-hidden ${selected ? 'border-carbon ring-1 ring-carbon/10' : 'border-carbon/[0.06] hover:border-carbon/15'}`}
                      >
                        <div className={`h-[3px] ${selected ? 'bg-carbon' : 'bg-[#e8dfd3]'}`} />
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${selected ? 'border-carbon bg-carbon' : 'border-carbon/20'}`}>
                                {selected && <Check className="h-2.5 w-2.5 text-crema" />}
                              </div>
                              <div>
                                <span className="text-[13px] font-medium text-carbon block leading-tight">{scenario.name}</span>
                                <span className="text-[10px] text-carbon/35 italic">{scenario.ref}</span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 text-[11px] font-semibold tracking-tight shrink-0 bg-[#f5f0e8] text-[#8b7355]">
                              {scenario.revenue.replace(' Y1', '')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2.5 ml-[26px]">
                            <span className="px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] uppercase bg-[#f5f0e8]/70 text-[#8b7355]">{scenario.mix}</span>
                            <span className="px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] uppercase bg-[#f5f0e8]/70 text-[#8b7355]">{scenario.margin} margin</span>
                          </div>
                          <p className="text-[11px] text-carbon/45 leading-relaxed ml-[26px]">{scenario.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const apiType = mode === 'assisted' ? 'budget-assisted' : 'budget-proposals';
              const { result, error: err } = await generateMerch(apiType, {
                families: familiesStr, pricing: pricingStr, channels: channelsStr,
                direction: (data.direction as string) || '', ...collectionContext,
              }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { salesTarget: number; targetMargin: number; avgDiscount: number; sellThroughMonths: number; segmentation: { type: Seg[]; newness: Seg[] }; rationale?: string; selectedModel?: string; selectedModelRef?: string; whyThisModel?: string; risks?: string[]; advantages?: string[]; fineTuning?: string };
              onChange({
                ...data,
                salesTarget: parsed.salesTarget, targetMargin: parsed.targetMargin,
                avgDiscount: parsed.avgDiscount, sellThroughMonths: parsed.sellThroughMonths,
                typeSegmentation: parsed.segmentation?.type || typeSeg,
                newnessSegmentation: parsed.segmentation?.newness || newnessSeg,
                rationale: parsed.rationale,
                selectedModel: parsed.selectedModel, selectedModelRef: parsed.selectedModelRef,
                whyThisModel: parsed.whyThisModel, risks: parsed.risks, advantages: parsed.advantages, fineTuning: parsed.fineTuning,
              });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.growthModel as string))}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {mode === 'assisted' ? t.merchandising.suggestBudget : t.merchandising.generateFinancialPlan}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {(data.salesTarget as number) > 0 && (
            <div className="space-y-4 pt-2 border-t border-carbon/[0.06]">
              {/* Growth model analysis (from AI Proposal) */}
              {(data.selectedModel as string) && (
                <div className="p-4 bg-carbon/[0.03] border border-carbon/[0.08] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase bg-carbon text-crema">{data.selectedModel as string}</span>
                    <span className="text-[11px] text-carbon/40 italic">{data.selectedModelRef as string}</span>
                  </div>
                  {(data.whyThisModel as string) && <p className="text-xs text-carbon/60 leading-relaxed">{data.whyThisModel as string}</p>}
                  {(data.fineTuning as string) && <p className="text-[11px] text-carbon/50 italic">{data.fineTuning as string}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    {(data.advantages as string[])?.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#4a7c59] mb-1.5">{t.merchandising.advantagesLabel}</div>
                        {(data.advantages as string[]).map((a, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1">
                            <span className="text-[10px] text-[#4a7c59] mt-0.5">+</span>
                            <span className="text-[11px] text-carbon/60">{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(data.risks as string[])?.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#9c6644] mb-1.5">{t.merchandising.risksLabel}</div>
                        {(data.risks as string[]).map((r, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1">
                            <span className="text-[10px] text-[#9c6644] mt-0.5">!</span>
                            <span className="text-[11px] text-carbon/60">{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon">{t.merchandising.aiFinancialPlan} <span className="text-carbon/40">({t.merchandising.editable})</span></label>
              {(data.rationale as string) && (
                <textarea
                  value={data.rationale as string}
                  onChange={(e) => onChange({ ...data, rationale: e.target.value })}
                  className="w-full text-xs text-carbon/60 italic bg-transparent border border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.12] focus:outline-none resize-none leading-relaxed px-2 py-1.5 -mx-2 transition-colors"
                  rows={3}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium tracking-[0.1em] uppercase text-carbon/40 mb-1 block">{f.label}</label>
                    <input type={f.type} value={(data[f.key] as number) || ''} onChange={(e) => onChange({ ...data, [f.key]: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                  </div>
                ))}
              </div>
              <div className="flex gap-6">
                <div>
                  <label className="text-xs font-medium tracking-[0.1em] uppercase text-carbon/40 mb-1 block">{t.merchandising.productType}</label>
                  <div className="flex gap-3">
                    {((data.typeSegmentation as Seg[]) || typeSeg).map((s, i) => (
                      <span key={s.name} className="text-xs text-carbon/60">{s.name}: <input type="number" value={s.percentage} onChange={(e) => {
                        const u = [...((data.typeSegmentation as Seg[]) || typeSeg)]; u[i] = { ...u[i], percentage: Number(e.target.value) };
                        onChange({ ...data, typeSegmentation: u });
                      }} className="w-12 px-1 py-0.5 text-xs text-carbon bg-carbon/[0.02] border border-carbon/[0.08] text-center" />%</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium tracking-[0.1em] uppercase text-carbon/40 mb-1 block">{t.merchandising.newness}</label>
                  <div className="flex gap-3">
                    {((data.newnessSegmentation as Seg[]) || newnessSeg).map((s, i) => (
                      <span key={s.name} className="text-xs text-carbon/60">{s.name}: <input type="number" value={s.percentage} onChange={(e) => {
                        const u = [...((data.newnessSegmentation as Seg[]) || newnessSeg)]; u[i] = { ...u[i], percentage: Number(e.target.value) };
                        onChange({ ...data, newnessSegmentation: u });
                      }} className="w-12 px-1 py-0.5 text-xs text-carbon bg-carbon/[0.02] border border-carbon/[0.08] text-center" />%</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Content Router ─── */
function ExpandedCardContent({ cardId, mode, data, onChange, collectionContext, familiesData, familiesStr, pricingStr, channelsStr }: {
  cardId: string; mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesData: Family[]; familiesStr: string; pricingStr: string; channelsStr: string;
}) {
  switch (cardId) {
    case 'families': return <FamiliesContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} />;
    case 'pricing': return <PricingContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} familiesData={familiesData} />;
    case 'channels': return <ChannelsContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} />;
    case 'budget': return <BudgetContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr} />;
    default: return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function MerchandisingPage({ blockParamOverride }: { blockParamOverride?: string | null }) {
  const { id } = useParams();
  const collectionId = id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockParam = blockParamOverride ?? searchParams?.get('block');
  const t = useTranslation();
  const { language } = useLanguage();
  const [expandedCard, setExpandedCard] = useState<string | null>(blockParam || null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [collectionContext, setCollectionContext] = useState<Record<string, string>>({ season: '', collectionName: '', consumer: '', vibe: '', brandDNA: '' });

  // Persist card data to Supabase (auto-save with 1s debounce)
  const { data: persisted, save: persistData, loading: persistLoading } =
    useWorkspaceData<{ cardData: CardData }>(
      collectionId,
      'merchandising',
      { cardData: {} }
    );

  const cardData = persisted.cardData;

  const setCardData = useCallback((updater: CardData | ((prev: CardData) => CardData)) => {
    persistData((prev) => {
      const newCardData = typeof updater === 'function' ? updater(prev.cardData) : updater;
      return { ...prev, cardData: newCardData };
    });
  }, [persistData]);

  // Fetch collection context + creative block data for AI prompts
  useEffect(() => {
    const supabase = createClient();

    // Load collection name + season
    supabase.from('collection_plans').select('name, season').eq('id', collectionId).single().then(({ data }) => {
      if (data) setCollectionContext(prev => ({ ...prev, collectionName: data.name || '', season: data.season || '' }));
    });

    // Load Creative block data (consumer, vibe, brand DNA, trends)
    supabase.from('collection_workspace_data').select('data').eq('collection_plan_id', collectionId).eq('workspace', 'creative').single().then(({ data }) => {
      if (!data?.data) return;
      const creative = data.data as { blockData?: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> };
      const bd = creative.blockData || {};

      // Consumer — extract liked profiles
      const consumerProposals = (bd.consumer?.data?.proposals as Array<{ title: string; desc: string; status: string }>) || [];
      const likedConsumers = consumerProposals.filter(p => p.status === 'liked');
      const consumerText = likedConsumers.map(p => `${p.title}: ${p.desc}`).join('\n\n');

      // Vibe — title + narrative + keywords
      const vibeTitle = (bd.vibe?.data?.vibeTitle as string) || '';
      const vibeNarrative = (bd.vibe?.data?.vibe as string) || '';
      const vibeKeywords = (bd.vibe?.data?.keywords as string) || '';
      const vibeText = [vibeTitle, vibeNarrative, vibeKeywords ? `Keywords: ${vibeKeywords}` : ''].filter(Boolean).join('\n');

      // Brand DNA — name + colors + tone + typography + style
      const brand = bd['brand-dna']?.data || {};
      const brandParts = [
        brand.brandName ? `Brand: ${brand.brandName}` : '',
        (brand.colors as string[])?.length ? `Colors: ${(brand.colors as string[]).join(', ')}` : '',
        brand.tone ? `Tone: ${brand.tone}` : '',
        brand.typography ? `Typography: ${brand.typography}` : '',
        brand.style ? `Visual Identity: ${brand.style}` : '',
      ].filter(Boolean);
      const brandText = brandParts.join('\n');

      // Trends — selected results from all research blocks
      const trendParts: string[] = [];
      for (const blockId of ['global-trends', 'deep-dive', 'live-signals']) {
        const results = (bd[blockId]?.data?.results as Array<{ title: string; brands?: string; desc: string; selected?: boolean }>) || [];
        const selected = results.filter(r => r.selected);
        selected.forEach(r => {
          trendParts.push(`${r.title}${r.brands ? ` (${r.brands})` : ''}: ${r.desc}`);
        });
      }
      const trendsText = trendParts.join('\n\n');

      setCollectionContext(prev => ({
        ...prev,
        consumer: consumerText,
        vibe: vibeText,
        brandDNA: brandText,
        trends: trendsText,
      }));
    });
  }, [collectionId]);

  const getCardState = useCallback((cardId: string) => {
    return cardData[cardId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
  }, [cardData]);

  const updateCardData = useCallback((cardId: string, updates: Partial<CardData[string]>) => {
    setCardData((prev) => {
      const current = prev[cardId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
      return { ...prev, [cardId]: { ...current, ...updates } };
    });
  }, [setCardData]);

  const handleExpand = useCallback((cardId: string) => {
    setIsAnimating(true);
    setExpandedCard(cardId);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsAnimating(true);
    setExpandedCard(null);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  const handleConfirm = useCallback((cardId: string) => {
    updateCardData(cardId, { confirmed: true });
    // Check if all cards will be validated after this confirmation
    const willAllBeValidated = MERCH_CARDS.every((c) =>
      c.id === cardId ? true : (cardData[c.id]?.confirmed ?? false)
    );
    if (willAllBeValidated) {
      setShowCelebration(true);
    }
    handleCollapse();
  }, [updateCardData, handleCollapse, cardData]);

  function isLocked(card: MerchCard): boolean {
    if (!card.lockedBy) return false;
    return !getCardState(card.lockedBy).confirmed;
  }

  const allValidated = MERCH_CARDS.every((c) => getCardState(c.id).confirmed);

  // Accumulated context from confirmed cards
  const familiesData = (cardData.families?.data?.families as Family[]) || [];
  const familiesStr = familiesData.map(f => `${f.name}: ${f.subcategories.join(', ')}`).join(' | ');
  const pricingStr = JSON.stringify(cardData.pricing?.data?.pricing || []);
  const chData = cardData.channels?.data || {};
  const dtcConf = chData.dtc as { enabled?: boolean; digital?: boolean; physical?: boolean } | undefined;
  const wsConf = chData.wholesale as { enabled?: boolean; digital?: boolean; physical?: boolean } | undefined;
  const channelParts = [
    dtcConf?.enabled ? `DTC (${[dtcConf.digital ? 'Digital' : '', dtcConf.physical ? 'Physical' : ''].filter(Boolean).join('+') || 'TBD'})` : '',
    wsConf?.enabled ? `Wholesale (${[wsConf.digital ? 'Digital' : '', wsConf.physical ? 'Physical' : ''].filter(Boolean).join('+') || 'TBD'})` : '',
  ].filter(Boolean);
  const channelsStr = (channelParts.length ? channelParts.join(', ') : (chData.channels as string[] || []).join(', ')) + ' | Markets: ' + ((chData.markets as Array<{ name: string }>) || []).map(m => m.name).join(', ');

  if (persistLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/30" />
      </div>
    );
  }

  /* ── Card name map for clean workspace header ── */
  const m = t.merchandising as Record<string, string>;
  const cardNameMap: Record<string, string> = {
    'families': m[language === 'es' ? CARD_KEYS.families.nameEs : CARD_KEYS.families.name] || 'Families & Pricing',
    'pricing': m[language === 'es' ? CARD_KEYS.pricing.nameEs : CARD_KEYS.pricing.name] || 'Pricing',
    'channels': m[language === 'es' ? CARD_KEYS.channels.nameEs : CARD_KEYS.channels.name] || 'Channels & Markets',
    'budget': m[language === 'es' ? CARD_KEYS.budget.nameEs : CARD_KEYS.budget.name] || 'Budget & Financials',
  };

  /* ═══ CLEAN WORKSPACE VIEW (from sidebar with ?block= param) ═══ */
  if (blockParam && MERCH_CARDS.find(c => c.id === blockParam)) {
    const card = MERCH_CARDS.find(c => c.id === blockParam)!;
    const state = getCardState(card.id);

    return (
      <div className="min-h-[80vh]">
        <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16">
          {/* Header — centered, matches template */}
          <div className="text-center mb-8">
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
              {collectionContext.collectionName || 'Collection'}
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              {cardNameMap[blockParam] || blockParam}
            </h1>
          </div>

          {/* Mode selector — centered below title */}
          <div className="mb-10 flex flex-col items-center gap-3">
            <SegmentedPill
              options={INPUT_MODE_IDS.map((modeId) => ({
                id: modeId,
                label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
              }))}
              value={state.mode}
              onChange={(modeId) => updateCardData(card.id, { mode: modeId })}
              size="md"
            />
            <p className="text-[13px] text-carbon/35 tracking-[-0.01em]">
              {t.merchandising[INPUT_MODE_KEYS[state.mode].desc as keyof typeof t.merchandising] as string}
            </p>
          </div>

          {/* Content — full width for card grid */}
          <ExpandedCardContent
            cardId={card.id} mode={state.mode} data={state.data}
            onChange={(newData) => updateCardData(card.id, { data: newData })}
            collectionContext={collectionContext} familiesData={familiesData}
            familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr}
          />

          {/* Confirm — centered */}
          <div className="mt-16 flex justify-center pt-8 border-t border-carbon/[0.06]">
            <button
              onClick={() => handleConfirm(card.id)}
              className={`inline-flex items-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                state.confirmed
                  ? 'border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04]'
                  : 'bg-carbon text-white hover:bg-carbon/90'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {state.confirmed ? 'Confirmed' : t.merchandising.validateContinue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ LEGACY VIEW (direct access, no blockParam) ═══ */
  return (
    <div className="min-h-[80vh]">
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-10 pl-12 md:pl-0">
          <button onClick={() => router.push(`/collection/${id}`)} className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2">
            <ArrowLeft className="h-3 w-3" /> {t.merchandising.overview}
          </button>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            {t.merchandising.title} <span className="italic">{t.merchandising.titleItalic}</span>
          </h2>
          <p className="text-xs sm:text-sm text-carbon/60 mt-2 max-w-lg">
            {t.merchandising.subtitle}
          </p>
        </div>

        {/* Validation Progress — pill stepper (matches Creative) */}
        <div className="flex items-center gap-0 mb-8 sm:mb-10 border border-carbon/[0.06] w-fit overflow-x-auto max-w-full">
          {MERCH_CARDS.map((card, idx) => {
            const state = getCardState(card.id);
            const locked = isLocked(card);
            const isActive = expandedCard === card.id;
            return (
              <button
                key={card.id}
                onClick={() => { if (!locked && !expandedCard) setExpandedCard(card.id); }}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                  isActive
                    ? 'bg-carbon text-crema'
                    : state.confirmed
                      ? 'bg-white text-carbon/70'
                      : locked
                        ? 'bg-white text-carbon/15 cursor-not-allowed'
                        : expandedCard
                          ? 'bg-white text-carbon/15 cursor-not-allowed'
                          : 'bg-white text-carbon/40 hover:text-carbon/60'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center text-xs shrink-0 ${
                  isActive ? 'bg-white/20' : state.confirmed ? 'bg-carbon text-crema' : 'bg-carbon/[0.06]'
                }`}>
                  {state.confirmed ? <Check className="h-3 w-3" /> : locked ? <Lock className="h-2.5 w-2.5" /> : idx + 1}
                </span>
                <span className="whitespace-nowrap">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          {/* ─── EXPANDED VIEW ─── */}
          {expandedCard && (
            <div className="flex gap-4">
              {/* Collapsed sidebar icons — hidden on mobile */}
              <div className="hidden sm:flex flex-col gap-3 pt-1 w-14 shrink-0">
                {MERCH_CARDS.map((card) => {
                  if (card.id === expandedCard) return null;
                  const Icon = card.icon;
                  const state = getCardState(card.id);
                  const locked = isLocked(card);
                  return (
                    <button
                      key={card.id}
                      onClick={() => { if (!locked) { handleCollapse(); setTimeout(() => handleExpand(card.id), 350); } }}
                      disabled={locked}
                      className={`group/icon relative w-12 h-12 flex items-center justify-center border transition-all duration-300 ${
                        locked ? 'bg-carbon/[0.02] border-carbon/[0.04] cursor-not-allowed'
                        : state.confirmed ? 'bg-carbon/[0.04] border-carbon/[0.12]'
                        : 'bg-white border-carbon/[0.08] hover:border-carbon/20 hover:shadow-sm'
                      }`}
                      title={t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}
                    >
                      {locked ? <Lock className="h-3.5 w-3.5 text-carbon/15" /> : state.confirmed ? <Check className="h-4 w-4 text-carbon/60" /> : <Icon className="h-4 w-4 text-carbon/35 group-hover/icon:text-carbon/60 transition-colors" />}
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-carbon text-crema text-xs tracking-wide whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</div>
                    </button>
                  );
                })}
              </div>

              {/* Expanded content */}
              <div className="flex-1 bg-white border border-carbon/[0.06] overflow-visible flex flex-col" style={{ animation: 'expandIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards', minHeight: 'calc(100vh - 260px)' }}>
                {(() => {
                  const card = MERCH_CARDS.find((c) => c.id === expandedCard);
                  if (!card) return null;
                  const Icon = card.icon;
                  const state = getCardState(card.id);
                  return (
                    <div className="p-4 sm:p-6 md:p-8 flex flex-col h-full min-h-[inherit]">
                      <div className="flex items-start justify-between mb-6 sm:mb-8">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-carbon/[0.04] flex items-center justify-center"><Icon className="h-4 w-4 sm:h-5 sm:w-5 text-carbon/50" /></div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</h3>
                            <p className="text-[11px] sm:text-xs text-carbon/70 mt-0.5">{t.merchandising[CARD_KEYS[card.id].desc as keyof typeof t.merchandising] as string}</p>
                          </div>
                        </div>
                        <button onClick={handleCollapse} className="w-9 h-9 flex items-center justify-center text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.04] transition-all"><X className="h-4 w-4" /></button>
                      </div>

                      {/* Mode Pills — unified segmented control */}
                      <div className="mb-6 sm:mb-8">
                        <SegmentedPill
                          options={INPUT_MODE_IDS.map((modeId) => ({
                            id: modeId,
                            label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
                          }))}
                          value={state.mode}
                          onChange={(modeId) => updateCardData(card.id, { mode: modeId })}
                          description={t.merchandising[INPUT_MODE_KEYS[state.mode].desc as keyof typeof t.merchandising] as string}
                          size="md"
                        />
                      </div>

                      <div className="flex-1">
                        <ExpandedCardContent
                          cardId={card.id} mode={state.mode} data={state.data}
                          onChange={(newData) => updateCardData(card.id, { data: newData })}
                          collectionContext={collectionContext} familiesData={familiesData}
                          familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr}
                        />
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-6 border-t border-carbon/[0.06]">
                        <button onClick={handleCollapse} className="text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/50 hover:text-carbon transition-colors">{t.merchandising.backToGrid}</button>
                        <button onClick={() => handleConfirm(card.id)} className="flex items-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium tracking-[0.1em] sm:tracking-[0.15em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors">
                          <Check className="h-3.5 w-3.5" /> {t.merchandising.validateContinue}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── GRID VIEW (2x2) ─── */}
          {!expandedCard && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={isAnimating ? { animation: 'gridIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' } : undefined}>
              {MERCH_CARDS.map((card) => {
                const Icon = card.icon;
                const locked = isLocked(card);
                const state = getCardState(card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => { if (!locked) handleExpand(card.id); }}
                    className={`group relative bg-white p-5 sm:p-6 md:p-8 transition-all duration-300 overflow-hidden border shadow-sm flex flex-col ${
                      locked ? 'border-carbon/[0.04] opacity-50 cursor-not-allowed' : state.confirmed ? 'border-carbon/[0.12] bg-carbon/[0.01] cursor-pointer hover:shadow-md' : 'border-carbon/[0.06] cursor-pointer hover:shadow-md'
                    }`}
                  >
                    {state.confirmed && <div className="absolute top-0 left-0 right-0 h-[3px] bg-carbon" />}
                    {state.confirmed && <div className="absolute top-5 right-5 w-7 h-7 bg-carbon flex items-center justify-center"><Check className="h-3.5 w-3.5 text-crema" /></div>}
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mb-3 sm:mb-4 ${locked ? 'bg-carbon/[0.02]' : 'bg-carbon/[0.04]'}`}>
                          {locked ? <Lock className="h-5 w-5 text-carbon/20" /> : <Icon className="h-5 w-5 text-carbon/50" />}
                        </div>
                        <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-carbon/70 leading-relaxed flex-1">{t.merchandising[CARD_KEYS[card.id].desc as keyof typeof t.merchandising] as string}</p>
                    {!locked && (
                      <div className="mt-4 sm:mt-6">
                        <SegmentedPill
                          preview
                          options={INPUT_MODE_IDS.map((modeId) => ({
                            id: modeId,
                            label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
                          }))}
                          value={state.mode}
                          onChange={() => {}}
                        />
                      </div>
                    )}
                    <div className="mt-5 flex justify-center">
                    <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-8 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                      locked ? 'bg-carbon/[0.04] text-carbon/20' : state.confirmed ? 'bg-carbon/[0.05] text-carbon/35' : 'bg-carbon text-crema group-hover:bg-carbon/90'
                    }`}>
                      {locked ? (<><Lock className="h-3 w-3" /> {t.merchandising.requires} {card.lockedBy ? t.merchandising[(language === 'es' ? CARD_KEYS[card.lockedBy].nameEs : CARD_KEYS[card.lockedBy].name) as keyof typeof t.merchandising] as string : ''}</>) :
                        state.confirmed ? (<>{t.merchandising.edit} <ArrowRight className="h-3.5 w-3.5" /></>) : Object.keys(state.data || {}).length > 0 ? (<>{t.merchandising.continueAction} <ArrowRight className="h-3.5 w-3.5" /></>) : (<>{t.merchandising.start} <ArrowRight className="h-3.5 w-3.5" /></>)}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collection Builder CTA */}
        {!expandedCard && (
          <div className={`mt-6 sm:mt-8 p-4 sm:p-8 border transition-all ${allValidated ? 'bg-white border-carbon/[0.06] hover:shadow-lg cursor-pointer' : 'bg-carbon/[0.02] border-carbon/[0.04] cursor-not-allowed'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className={`w-12 h-12 flex items-center justify-center ${allValidated ? 'bg-carbon/[0.04]' : 'bg-carbon/[0.02]'}`}>
                  {allValidated ? <LayoutGrid className="h-6 w-6 text-carbon/50" /> : <Lock className="h-5 w-5 text-carbon/15" />}
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-light tracking-tight ${allValidated ? 'text-carbon' : 'text-carbon/25'}`}>{t.merchandising.collectionBuilder}</h3>
                  <p className={`text-sm mt-1 ${allValidated ? 'text-carbon/60' : 'text-carbon/15'}`}>
                    {allValidated ? t.merchandising.allCardsValidated : t.merchandising.validateAllCards}
                  </p>
                </div>
              </div>
              {allValidated && (
                <button onClick={() => router.push(`/collection/${id}/product`)} className="flex items-center gap-2 bg-carbon text-crema py-2.5 sm:py-3 px-4 sm:px-6 text-[11px] font-medium uppercase tracking-[0.15em] hover:bg-carbon/90 transition-colors">
                  {t.merchandising.openBuilder} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ animation: 'fadeIn 0.6s ease-out forwards' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-carbon/95" style={{ animation: 'fadeIn 0.4s ease-out forwards' }} />

          {/* Content */}
          <div className="relative z-10 text-center px-6 max-w-2xl" style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            <div className="w-16 h-16 mx-auto mb-8 border border-crema/20 flex items-center justify-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <Check className="h-7 w-7 text-crema/80" />
            </div>

            <div className="text-[10px] font-medium tracking-[0.4em] uppercase text-crema/30 mb-4" style={{ animation: 'fadeIn 0.6s ease-out 0.8s both' }}>
              {collectionContext.collectionName} · {collectionContext.season}
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-crema tracking-tight leading-[1.1] mb-6" style={{ animation: 'fadeIn 0.6s ease-out 1s both' }}>
              {t.merchandising.celebrationTitle}<br /><span className="italic">{t.merchandising.celebrationTitleItalic}</span>.
            </h2>

            <p className="text-sm sm:text-base font-light text-crema/60 leading-relaxed max-w-lg mx-auto mb-4" style={{ animation: 'fadeIn 0.6s ease-out 1.3s both' }}>
              {t.merchandising.celebrationBody}
            </p>

            <p className="text-xs text-crema/30 italic mb-10" style={{ animation: 'fadeIn 0.6s ease-out 1.5s both' }}>
              {t.merchandising.celebrationQuote}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fadeIn 0.6s ease-out 1.8s both' }}>
              <button
                onClick={() => router.push(`/collection/${collectionId}/product`)}
                className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-white transition-colors"
              >
                {t.merchandising.celebrationCta} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push(`/collection/${collectionId}`)}
                className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/50 border border-crema/15 hover:text-crema/80 hover:border-crema/30 transition-colors"
              >
                {t.merchandising.celebrationBack}
              </button>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setShowCelebration(false)}
              className="mt-8 text-[10px] tracking-[0.1em] uppercase text-crema/20 hover:text-crema/40 transition-colors"
            >
              {t.merchandising.celebrationDismiss}
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes expandIn {
          0% { opacity: 0; transform: scale(0.92) translateY(-8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes gridIn {
          0% { opacity: 0; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
