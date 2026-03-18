'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Lock, ShoppingBag, DollarSign, Store, Calculator, LayoutGrid, X, Loader2, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const addFamily = () => onChange({ ...data, families: [...families, { name: '', subcategories: [''] }] });
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
                  <input value={fam.name} onChange={(e) => updateFamilyName(fi, e.target.value)} className="w-full px-3 py-2 text-sm font-medium text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
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
          {/* Copy + Generate button — hidden only when editing a selected proposal */}
          {!((data.selectedProposal as number | null) !== null && (data.editingProposal as boolean)) && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm text-carbon/80 leading-relaxed">
                  Aimily will analyze your entire creative brief — consumer profiles, collection vibe, brand DNA, market research, and seasonal trends — to propose <strong>three product family structures</strong> ranked by market opportunity.
                </p>
                <p className="text-xs text-carbon/50 leading-relaxed">
                  Each structure is a different strategic approach to your collection, showing which categories have the highest potential for commercial success based on your creative direction.
                </p>
              </div>
              <button
                onClick={async () => {
                  setGenerating(true); setError(null);
                  const { result, error: err } = await generateMerch('families-proposals', { reference: '', ...collectionContext }, language);
                  if (err) { setError(err); setGenerating(false); return; }
                  const parsed = result as { proposals: Array<{ title: string; description: string; families: Family[] }> };
                  onChange({ ...data, proposals: parsed.proposals || [], selectedProposal: null, editingProposal: false });
                  setGenerating(false);
                }}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {(data.proposals as Array<unknown>)?.length ? 'Regenerate Proposals' : 'Propose Family Structures'}
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Proposals — pick one */}
          {(data.proposals as Array<{ title: string; description: string; families: Family[] }>)?.length > 0 && (data.selectedProposal as number | null) === null && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">{t.merchandising.selectOneStructure}</p>
              {(data.proposals as Array<{ title: string; description: string; families: Family[] }>).map((p, i) => (
                <button
                  key={i}
                  onClick={() => onChange({ ...data, selectedProposal: i, families: p.families, editingProposal: true })}
                  className="w-full text-left p-5 border border-carbon/[0.08] hover:border-carbon/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-carbon">{p.title}</span>
                    <span className="text-xs tracking-[0.1em] uppercase text-carbon/40 opacity-0 group-hover:opacity-100 transition-opacity">{t.merchandising.select}</span>
                  </div>
                  <div className="text-xs text-carbon/70 mb-2">{p.description}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.families.map((f, j) => (
                      <span key={j} className="px-2 py-0.5 text-xs bg-carbon/[0.04] text-carbon/60">{f.name} ({f.subcategories.length})</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected — editable families */}
          {(data.selectedProposal as number | null) !== null && (data.editingProposal as boolean) && (
            <div className="space-y-4 border border-carbon/20 p-5 bg-carbon/[0.02]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
                  {t.merchandising.editFamilies}
                </p>
                <button
                  onClick={() => onChange({ ...data, selectedProposal: null, editingProposal: false, families: [] })}
                  className="text-xs tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors"
                >
                  {t.merchandising.chooseAnother}
                </button>
              </div>
              {families.map((fam, fi) => (
                <div key={fi} className="border border-carbon/[0.08] p-4 space-y-2 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      value={fam.name}
                      onChange={(e) => updateFamilyName(fi, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-carbon bg-white border border-carbon/[0.12] focus:border-carbon/30 focus:outline-none transition-colors"
                    />
                    <button onClick={() => removeFamily(fi)} className="text-carbon/30 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="flex items-center gap-2 ml-4">
                      <span className="text-carbon/20 text-xs">{'\u2514'}</span>
                      <input
                        value={sub}
                        onChange={(e) => updateSubcategory(fi, si, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm text-carbon bg-white border border-carbon/[0.12] focus:border-carbon/30 focus:outline-none transition-colors"
                      />
                      <button onClick={() => removeSubcategory(fi, si)} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addSubcategory(fi)} className="ml-4 text-xs text-carbon/40 hover:text-carbon/60 flex items-center gap-1"><Plus className="h-3 w-3" /> {t.merchandising.addSubcategory}</button>
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
  type PricingRow = { family: string; subcategories: { name: string; minPrice: number; maxPrice: number }[] };
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
          {mode === 'assisted' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.pricingDirection}</label>
              <textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder={t.merchandising.pricingDirectionPlaceholder}
                className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
              />
            </div>
          )}
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const apiType = mode === 'assisted' ? 'pricing-assisted' : 'pricing-proposals';
              const { result, error: err } = await generateMerch(apiType, {
                families: familiesStr,
                direction: (data.direction as string) || '',
                ...collectionContext,
              }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { pricing: PricingRow[] };
              onChange({ ...data, pricing: parsed.pricing || [] });
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
  const channels = (data.channels as string[]) || [];
  const customChannels = (data.customChannels as string[]) || [];
  type Market = { name: string; region: string; opportunity: string; rationale: string; entryStrategy?: string };
  const markets = (data.markets as Market[]) || [];

  const toggleChannel = (ch: string) => {
    onChange({ ...data, channels: channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch] });
  };

  return (
    <div className="space-y-6">
      {/* Channels — always manual selection */}
      <div>
        <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-3 block">{t.merchandising.distributionChannels}</label>
        <div className="flex gap-3">
          {['DTC', 'Wholesale'].map(ch => (
            <button key={ch} onClick={() => toggleChannel(ch)} className={`px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase border transition-all ${channels.includes(ch) ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.08] text-carbon/50 hover:border-carbon/20'}`}>
              {ch}
            </button>
          ))}
          <button
            onClick={() => onChange({ ...data, customChannels: [...customChannels, ''] })}
            className="px-4 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase border border-dashed border-carbon/[0.12] text-carbon/40 hover:text-carbon/60"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {customChannels.map((ch, i) => (
          <div key={i} className="flex items-center gap-2 mt-2">
            <input value={ch} onChange={(e) => { const u = [...customChannels]; u[i] = e.target.value; onChange({ ...data, customChannels: u }); }}
              placeholder={t.merchandising.customChannelPlaceholder} className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
            <button onClick={() => onChange({ ...data, customChannels: customChannels.filter((_, j) => j !== i) })} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
          </div>
        ))}
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
              const { result, error: err } = await generateMerch(apiType, { direction: (data.direction as string) || '', ...collectionContext }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { channels: string[]; customChannels: string[]; markets: Market[] };
              onChange({ ...data, channels: parsed.channels || channels, customChannels: parsed.customChannels || [], markets: parsed.markets || [] });
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
            <div className="space-y-2 pt-2">
              {markets.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border border-carbon/[0.08]">
                  <div className={`px-2 py-0.5 text-xs font-medium uppercase shrink-0 ${m.opportunity === 'high' ? 'bg-carbon text-crema' : 'bg-carbon/[0.06] text-carbon/50'}`}>{m.opportunity}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-carbon">{m.name} <span className="text-carbon/40 font-normal">{'\u00B7'} {m.region}</span></div>
                    <div className="text-xs text-carbon/60 mt-0.5">{m.rationale}</div>
                    {m.entryStrategy && <div className="text-[11px] text-carbon/40 mt-1 italic">Entry: {m.entryStrategy}</div>}
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
          {mode === 'assisted' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.merchandising.financialDirection}</label>
              <textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder={t.merchandising.financialDirectionPlaceholder}
                className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
              />
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
              const parsed = result as { salesTarget: number; targetMargin: number; avgDiscount: number; sellThroughMonths: number; segmentation: { type: Seg[]; newness: Seg[] }; rationale?: string };
              onChange({
                ...data,
                salesTarget: parsed.salesTarget, targetMargin: parsed.targetMargin,
                avgDiscount: parsed.avgDiscount, sellThroughMonths: parsed.sellThroughMonths,
                typeSegmentation: parsed.segmentation?.type || typeSeg,
                newnessSegmentation: parsed.segmentation?.newness || newnessSeg,
                rationale: parsed.rationale,
              });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {mode === 'assisted' ? t.merchandising.suggestBudget : t.merchandising.generateFinancialPlan}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {(data.salesTarget as number) > 0 && (
            <div className="space-y-4 pt-2 border-t border-carbon/[0.06]">
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

export default function MerchandisingPage() {
  const { id } = useParams();
  const collectionId = id as string;
  const router = useRouter();
  const t = useTranslation();
  const { language } = useLanguage();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
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
  const channelsStr = ((cardData.channels?.data?.channels as string[]) || []).join(', ') + ' | Markets: ' + ((cardData.channels?.data?.markets as Array<{ name: string }>) || []).map(m => m.name).join(', ');

  if (persistLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/30" />
      </div>
    );
  }

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

        {/* Validation Progress */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-10 overflow-x-auto max-w-full">
          {MERCH_CARDS.map((card, idx) => {
            const state = getCardState(card.id);
            return (
              <div key={card.id} className="flex items-center gap-2">
                <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium transition-all ${
                  state.confirmed ? 'bg-carbon text-crema' : isLocked(card) ? 'bg-carbon/[0.04] text-carbon/20' : 'bg-carbon/[0.06] text-carbon/40'
                }`}>
                  {state.confirmed ? '✓' : isLocked(card) ? <Lock className="h-2.5 w-2.5" /> : idx + 1}
                </div>
                <span className={`text-[10px] sm:text-[11px] font-medium tracking-[0.05em] uppercase ${state.confirmed ? 'text-carbon' : 'text-carbon/30'}`}>{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</span>
                {idx < MERCH_CARDS.length - 1 && <ArrowRight className="h-3 w-3 text-carbon/15 ml-2" />}
              </div>
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
              <div className="flex-1 bg-white border border-carbon/[0.06] overflow-hidden flex flex-col" style={{ animation: 'expandIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards', minHeight: 'calc(100vh - 260px)' }}>
                {(() => {
                  const card = MERCH_CARDS.find((c) => c.id === expandedCard);
                  if (!card) return null;
                  const Icon = card.icon;
                  const state = getCardState(card.id);
                  return (
                    <div className="p-4 sm:p-5 md:p-10 lg:p-12 flex flex-col h-full min-h-[inherit]">
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

                      {/* Mode Pills */}
                      <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
                        {INPUT_MODE_IDS.map((modeId) => (
                          <button key={modeId} onClick={() => updateCardData(card.id, { mode: modeId })}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium tracking-[0.1em] uppercase border transition-all ${state.mode === modeId ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.08] text-carbon/50 hover:text-carbon/70 hover:border-carbon/20'}`}>
                            {t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string}
                          </button>
                        ))}
                        <span className="hidden sm:inline text-xs text-carbon/60 ml-2">{t.merchandising[INPUT_MODE_KEYS[state.mode].desc as keyof typeof t.merchandising] as string}</span>
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
                    className={`group relative bg-white p-5 sm:p-10 lg:p-12 transition-all duration-300 overflow-hidden border flex flex-col min-h-[180px] sm:min-h-[240px] md:min-h-[320px] ${
                      locked ? 'border-carbon/[0.04] opacity-50 cursor-not-allowed' : state.confirmed ? 'border-carbon/[0.12] bg-carbon/[0.01] cursor-pointer hover:shadow-lg' : 'border-carbon/[0.06] cursor-pointer hover:shadow-lg'
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
                      <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2">
                        {INPUT_MODE_IDS.map((modeId) => (
                          <span key={modeId} className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/50">{t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string}</span>
                        ))}
                      </div>
                    )}
                    <div className={`mt-4 sm:mt-6 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors ${
                      locked ? 'bg-carbon/[0.04] text-carbon/20' : state.confirmed ? 'bg-carbon/[0.06] text-carbon/40 group-hover:bg-carbon/[0.1]' : 'bg-carbon text-crema group-hover:bg-carbon/90'
                    }`}>
                      {locked ? (<><Lock className="h-3 w-3" /> {t.merchandising.requires} {card.lockedBy ? t.merchandising[(language === 'es' ? CARD_KEYS[card.lockedBy].nameEs : CARD_KEYS[card.lockedBy].name) as keyof typeof t.merchandising] as string : ''}</>) :
                        state.confirmed ? (<>{t.merchandising.edit} <ArrowRight className="h-3.5 w-3.5" /></>) : Object.keys(state.data || {}).length > 0 ? (<>{t.merchandising.continueAction} <ArrowRight className="h-3.5 w-3.5" /></>) : (<>{t.merchandising.start} <ArrowRight className="h-3.5 w-3.5" /></>)}
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
              Your merchandising plan<br />is <span className="italic">complete</span>.
            </h2>

            <p className="text-sm sm:text-base font-light text-crema/60 leading-relaxed max-w-lg mx-auto mb-4" style={{ animation: 'fadeIn 0.6s ease-out 1.3s both' }}>
              Families, pricing, channels, budget — the commercial architecture is set.
              Your collection has structure now. Time to build it.
            </p>

            <p className="text-xs text-crema/30 italic mb-10" style={{ animation: 'fadeIn 0.6s ease-out 1.5s both' }}>
              Strategy without execution is a daydream. You have both.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fadeIn 0.6s ease-out 1.8s both' }}>
              <button
                onClick={() => router.push(`/collection/${collectionId}/product`)}
                className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-white transition-colors"
              >
                Open Collection Builder <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push(`/collection/${collectionId}`)}
                className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/50 border border-crema/15 hover:text-crema/80 hover:border-crema/30 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setShowCelebration(false)}
              className="mt-8 text-[10px] tracking-[0.1em] uppercase text-crema/20 hover:text-crema/40 transition-colors"
            >
              Stay here and keep editing
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes expandIn {
          0% { opacity: 0; transform: scale(0.92) translateY(-8px); max-height: 400px; }
          40% { opacity: 1; transform: scale(1) translateY(0); max-height: 400px; }
          100% { opacity: 1; transform: scale(1) translateY(0); max-height: 2000px; }
        }
        @keyframes gridIn {
          0% { opacity: 0; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
