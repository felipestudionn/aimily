'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Lock, ShoppingBag, DollarSign, Store, Calculator, LayoutGrid, X, Loader2, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';

/* ─── AI generation helper ─── */
async function generateMerch(
  type: string,
  input: Record<string, string>,
): Promise<{ result: unknown; error?: string }> {
  const res = await fetch('/api/ai/merch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input }),
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
  name: string;
  nameEs: string;
  description: string;
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
  { id: 'families', name: 'Product Families', nameEs: 'Familias de Producto', description: 'Define main categories and sub-categories — the foundation for your collection structure.', icon: ShoppingBag },
  { id: 'pricing', name: 'Pricing', nameEs: 'Pricing', description: 'Set min/max price ranges per family and sub-category. AI pre-fills based on consumer & market.', icon: DollarSign, lockedBy: 'families' },
  { id: 'channels', name: 'Channels & Markets', nameEs: 'Canales y Mercados', description: 'Distribution channels (DTC, Wholesale) and target markets with AI opportunity analysis.', icon: Store },
  { id: 'budget', name: 'Budget & Financials', nameEs: 'Budget y Financieros', description: 'Sales target, margins, discounts, sell-through months, and product segmentation.', icon: Calculator },
];

const INPUT_MODES: { id: InputMode; label: string; description: string }[] = [
  { id: 'free', label: 'Libre', description: 'You fill everything manually' },
  { id: 'assisted', label: 'Asistido', description: 'Give direction, AI complements' },
  { id: 'ai', label: 'Propuesta IA', description: 'Minimal input, AI generates proposals' },
];

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
                  placeholder="Family name (e.g. Footwear, Apparel...)"
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none"
                />
                <button onClick={() => removeFamily(fi)} className="text-carbon/30 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
              {fam.subcategories.map((sub, si) => (
                <div key={si} className="flex items-center gap-2 ml-6">
                  <span className="text-carbon/20 text-xs">└</span>
                  <input
                    value={sub}
                    onChange={(e) => updateSubcategory(fi, si, e.target.value)}
                    placeholder="Subcategory..."
                    className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none"
                  />
                  <button onClick={() => removeSubcategory(fi, si)} className="text-carbon/20 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <button onClick={() => addSubcategory(fi)} className="ml-6 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40 hover:text-carbon/60 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add subcategory
              </button>
            </div>
          ))}
          <button onClick={addFamily} className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase border border-dashed border-carbon/[0.12] text-carbon/40 hover:text-carbon/60 hover:border-carbon/20 transition-colors w-full justify-center">
            <Plus className="h-3.5 w-3.5" /> Add Family
          </button>
        </div>
      )}

      {mode === 'assisted' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Direction</label>
            <textarea
              value={(data.direction as string) || ''}
              onChange={(e) => onChange({ ...data, direction: e.target.value })}
              placeholder="e.g. 'Focus on footwear with 3-4 categories, minimal apparel, no accessories' or 'Full range brand with focus on knitwear and outerwear'..."
              className="w-full h-28 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const { result, error: err } = await generateMerch('families-assisted', { direction: (data.direction as string) || '', ...collectionContext });
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { families: Family[] };
              onChange({ ...data, families: parsed.families || [] });
              setGenerating(false);
            }}
            disabled={generating || !(data.direction as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Suggest Families
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {/* Show editable result */}
          {families.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">AI Suggestion <span className="text-carbon/40">(editable)</span></label>
              {families.map((fam, fi) => (
                <div key={fi} className="border border-carbon/[0.08] p-4 space-y-2">
                  <input value={fam.name} onChange={(e) => updateFamilyName(fi, e.target.value)} className="w-full px-3 py-2 text-sm font-medium text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="flex items-center gap-2 ml-4">
                      <span className="text-carbon/20 text-xs">└</span>
                      <input value={sub} onChange={(e) => updateSubcategory(fi, si, e.target.value)} className="flex-1 px-3 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                      <button onClick={() => removeSubcategory(fi, si)} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addSubcategory(fi)} className="ml-4 text-[10px] text-carbon/40 hover:text-carbon/60 flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Minimal Reference</label>
            <input
              type="text"
              value={(data.reference as string) || ''}
              onChange={(e) => onChange({ ...data, reference: e.target.value })}
              placeholder="e.g. 'complete footwear brand' or 'streetwear with accessories'..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const { result, error: err } = await generateMerch('families-proposals', { reference: (data.reference as string) || '', ...collectionContext });
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { proposals: Array<{ title: string; description: string; families: Family[] }> };
              onChange({ ...data, proposals: parsed.proposals || [], selectedProposal: null });
              setGenerating(false);
            }}
            disabled={generating || !(data.reference as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate Family Structures
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {(data.proposals as Array<{ title: string; description: string; families: Family[] }>)?.map((p, i) => (
            <button
              key={i}
              onClick={() => onChange({ ...data, selectedProposal: i, families: p.families })}
              className={`w-full text-left p-5 border transition-all ${(data.selectedProposal as number) === i ? 'border-carbon bg-carbon/[0.03]' : 'border-carbon/[0.08] hover:border-carbon/20'}`}
            >
              <div className="text-sm font-medium text-carbon mb-1">{p.title}</div>
              <div className="text-xs text-carbon/70 mb-2">{p.description}</div>
              <div className="flex flex-wrap gap-1.5">
                {p.families.map((f, j) => (
                  <span key={j} className="px-2 py-0.5 text-[10px] bg-carbon/[0.04] text-carbon/60">{f.name} ({f.subcategories.length})</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PricingContent({ mode, data, onChange, collectionContext, familiesData }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesData: Family[];
}) {
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
                  <span className="text-[10px] text-carbon/30">Min €</span>
                  <input type="number" value={sub.minPrice || ''} onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                  <span className="text-[10px] text-carbon/30">Max €</span>
                  <input type="number" value={sub.maxPrice || ''} onChange={(e) => updatePrice(fi, si, 'maxPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                </div>
              ))}
            </div>
          ))}
          {pricing.length === 0 && <p className="text-xs text-carbon/40">Validate Families first to see pricing rows.</p>}
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          {mode === 'assisted' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Pricing Direction</label>
              <textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder="e.g. 'Premium positioning, 20% above market average' or 'Accessible entry prices, competitive mid-range'..."
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
              });
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { pricing: PricingRow[] };
              onChange({ ...data, pricing: parsed.pricing || [] });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {mode === 'assisted' ? 'Suggest Pricing' : 'Generate Pricing Matrix'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {/* Show editable result */}
          {pricing.length > 0 && (
            <div className="space-y-4 pt-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">AI Pricing <span className="text-carbon/40">(editable)</span></label>
              {pricing.map((fam, fi) => (
                <div key={fi} className="space-y-2">
                  <div className="text-xs font-semibold tracking-[0.1em] uppercase text-carbon">{fam.family}</div>
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="flex items-center gap-3 ml-4">
                      <span className="text-sm text-carbon/60 w-40 truncate">{sub.name}</span>
                      <span className="text-[10px] text-carbon/30">Min €</span>
                      <input type="number" value={sub.minPrice || ''} onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))} className="w-20 px-2 py-1.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                      <span className="text-[10px] text-carbon/30">Max €</span>
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channels = (data.channels as string[]) || [];
  const customChannels = (data.customChannels as string[]) || [];
  type Market = { name: string; region: string; opportunity: string; rationale: string };
  const markets = (data.markets as Market[]) || [];

  const toggleChannel = (ch: string) => {
    onChange({ ...data, channels: channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch] });
  };

  return (
    <div className="space-y-6">
      {/* Channels — always manual selection */}
      <div>
        <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-3 block">Distribution Channels</label>
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
              placeholder="Custom channel..." className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
            <button onClick={() => onChange({ ...data, customChannels: customChannels.filter((_, j) => j !== i) })} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
          </div>
        ))}
      </div>

      {/* Markets — depends on mode */}
      {mode === 'free' && (
        <div>
          <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Target Markets</label>
          {markets.map((m, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input value={m.name} onChange={(e) => { const u = [...markets]; u[i] = { ...u[i], name: e.target.value }; onChange({ ...data, markets: u }); }}
                placeholder="Market name..." className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
              <input value={m.region} onChange={(e) => { const u = [...markets]; u[i] = { ...u[i], region: e.target.value }; onChange({ ...data, markets: u }); }}
                placeholder="Region..." className="w-32 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
              <button onClick={() => onChange({ ...data, markets: markets.filter((_, j) => j !== i) })} className="text-carbon/20 hover:text-red-500"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...data, markets: [...markets, { name: '', region: '', opportunity: 'medium', rationale: '' }] })}
            className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40 hover:text-carbon/60 flex items-center gap-1 mt-1"><Plus className="h-3 w-3" /> Add market</button>
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          {mode === 'assisted' && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Market Direction</label>
              <textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder="e.g. 'European focus, starting with Spain and France' or 'Global brand, key US and Asian markets'..."
                className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed placeholder:text-carbon/40"
              />
            </div>
          )}
          <button
            onClick={async () => {
              setGenerating(true); setError(null);
              const apiType = mode === 'assisted' ? 'channels-assisted' : 'channels-proposals';
              const { result, error: err } = await generateMerch(apiType, { direction: (data.direction as string) || '', ...collectionContext });
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { channels: string[]; customChannels: string[]; markets: Market[] };
              onChange({ ...data, channels: parsed.channels || channels, customChannels: parsed.customChannels || [], markets: parsed.markets || [] });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {mode === 'assisted' ? 'Suggest Markets' : 'Recommend Markets'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {markets.length > 0 && (
            <div className="space-y-2 pt-2">
              {markets.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border border-carbon/[0.08]">
                  <div className={`px-2 py-0.5 text-[10px] font-medium uppercase ${m.opportunity === 'high' ? 'bg-carbon text-crema' : 'bg-carbon/[0.06] text-carbon/50'}`}>{m.opportunity}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-carbon">{m.name} <span className="text-carbon/40 font-normal">· {m.region}</span></div>
                    <div className="text-xs text-carbon/60 mt-0.5">{m.rationale}</div>
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type Seg = { name: string; percentage: number };
  const typeSeg = (data.typeSegmentation as Seg[]) || [{ name: 'Revenue', percentage: 60 }, { name: 'Image', percentage: 20 }, { name: 'Entry', percentage: 20 }];
  const newnessSeg = (data.newnessSegmentation as Seg[]) || [{ name: 'Newness', percentage: 70 }, { name: 'Carry-Over', percentage: 30 }];

  const fields = [
    { key: 'salesTarget', label: 'Sales Target (€)', type: 'number' as const, placeholder: 'e.g. 500000' },
    { key: 'targetMargin', label: 'Target Margin (%)', type: 'number' as const, placeholder: 'e.g. 55' },
    { key: 'avgDiscount', label: 'Avg. Discount (%)', type: 'number' as const, placeholder: 'e.g. 15' },
    { key: 'sellThroughMonths', label: 'Sell-Through Months', type: 'number' as const, placeholder: 'e.g. 6' },
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
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Product Type Segmentation</label>
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
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Newness Segmentation</label>
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
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">Financial Direction</label>
              <textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder="e.g. 'Conservative budget, high margin focus' or 'Aggressive growth, willing to accept lower margins'..."
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
              });
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
            {mode === 'assisted' ? 'Suggest Budget' : 'Generate Financial Plan'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {(data.salesTarget as number) > 0 && (
            <div className="space-y-4 pt-2 border-t border-carbon/[0.06]">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon">AI Financial Plan <span className="text-carbon/40">(editable)</span></label>
              {(data.rationale as string) && <p className="text-xs text-carbon/60 italic">{data.rationale as string}</p>}
              <div className="grid grid-cols-2 gap-4">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40 mb-1 block">{f.label}</label>
                    <input type={f.type} value={(data[f.key] as number) || ''} onChange={(e) => onChange({ ...data, [f.key]: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none" />
                  </div>
                ))}
              </div>
              <div className="flex gap-6">
                <div>
                  <label className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40 mb-1 block">Product Type</label>
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
                  <label className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40 mb-1 block">Newness</label>
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
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

  // Fetch collection context + creative input for AI prompts
  useEffect(() => {
    const supabase = createClient();
    supabase.from('collection_plans').select('name, season').eq('id', collectionId).single().then(({ data }) => {
      if (data) setCollectionContext(prev => ({ ...prev, collectionName: data.name || '', season: data.season || '' }));
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
    handleCollapse();
  }, [updateCardData, handleCollapse]);

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
      <div className="px-8 md:px-12 lg:px-16 py-12">
        {/* Header */}
        <div className="mb-10">
          <button onClick={() => router.push(`/collection/${id}`)} className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2">
            <ArrowLeft className="h-3 w-3" /> Overview
          </button>
          <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            Merchandising & <span className="italic">Planning</span>
          </h2>
          <p className="text-sm text-carbon/60 mt-2 max-w-lg">
            Define product families, pricing, channels, and budget. Validate all four cards to unlock the Collection Builder.
          </p>
        </div>

        {/* Validation Progress */}
        <div className="flex items-center gap-4 mb-10">
          {MERCH_CARDS.map((card, idx) => {
            const state = getCardState(card.id);
            return (
              <div key={card.id} className="flex items-center gap-2">
                <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-medium transition-all ${
                  state.confirmed ? 'bg-carbon text-crema' : isLocked(card) ? 'bg-carbon/[0.04] text-carbon/20' : 'bg-carbon/[0.06] text-carbon/40'
                }`}>
                  {state.confirmed ? '✓' : isLocked(card) ? <Lock className="h-2.5 w-2.5" /> : idx + 1}
                </div>
                <span className={`text-[11px] font-medium tracking-[0.05em] uppercase ${state.confirmed ? 'text-carbon' : 'text-carbon/30'}`}>{card.nameEs}</span>
                {idx < MERCH_CARDS.length - 1 && <ArrowRight className="h-3 w-3 text-carbon/15 ml-2" />}
              </div>
            );
          })}
        </div>

        <div className="relative">
          {/* ─── EXPANDED VIEW ─── */}
          {expandedCard && (
            <div className="flex gap-4">
              {/* Collapsed sidebar icons */}
              <div className="flex flex-col gap-3 pt-1 w-14 shrink-0">
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
                      title={card.name}
                    >
                      {locked ? <Lock className="h-3.5 w-3.5 text-carbon/15" /> : state.confirmed ? <Check className="h-4 w-4 text-carbon/60" /> : <Icon className="h-4 w-4 text-carbon/35 group-hover/icon:text-carbon/60 transition-colors" />}
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-carbon text-crema text-[10px] tracking-wide whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">{card.name}</div>
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
                    <div className="p-10 lg:p-12 flex flex-col h-full min-h-[inherit]">
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center"><Icon className="h-5 w-5 text-carbon/50" /></div>
                          <div>
                            <h3 className="text-xl font-light text-carbon tracking-tight">{card.name}</h3>
                            <p className="text-xs text-carbon/70 mt-0.5">{card.description}</p>
                          </div>
                        </div>
                        <button onClick={handleCollapse} className="w-9 h-9 flex items-center justify-center text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.04] transition-all"><X className="h-4 w-4" /></button>
                      </div>

                      {/* Mode Pills */}
                      <div className="flex items-center gap-2 mb-8">
                        {INPUT_MODES.map((m) => (
                          <button key={m.id} onClick={() => updateCardData(card.id, { mode: m.id })}
                            className={`px-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase border transition-all ${state.mode === m.id ? 'border-carbon bg-carbon text-crema' : 'border-carbon/[0.08] text-carbon/50 hover:text-carbon/70 hover:border-carbon/20'}`}>
                            {m.label}
                          </button>
                        ))}
                        <span className="text-[10px] text-carbon/60 ml-2">{INPUT_MODES.find((m) => m.id === state.mode)?.description}</span>
                      </div>

                      <div className="flex-1">
                        <ExpandedCardContent
                          cardId={card.id} mode={state.mode} data={state.data}
                          onChange={(newData) => updateCardData(card.id, { data: newData })}
                          collectionContext={collectionContext} familiesData={familiesData}
                          familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr}
                        />
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-carbon/[0.06]">
                        <button onClick={handleCollapse} className="text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/50 hover:text-carbon transition-colors">← Back to grid</button>
                        <button onClick={() => handleConfirm(card.id)} className="flex items-center gap-2 px-8 py-3 text-[11px] font-medium tracking-[0.15em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors">
                          <Check className="h-3.5 w-3.5" /> Validate & Continue
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
                    className={`group relative bg-white p-10 lg:p-12 transition-all duration-300 overflow-hidden border flex flex-col min-h-[320px] ${
                      locked ? 'border-carbon/[0.04] opacity-50 cursor-not-allowed' : state.confirmed ? 'border-carbon/[0.12] bg-carbon/[0.01] cursor-pointer hover:shadow-lg' : 'border-carbon/[0.06] cursor-pointer hover:shadow-lg'
                    }`}
                  >
                    {state.confirmed && <div className="absolute top-0 left-0 right-0 h-[3px] bg-carbon" />}
                    {state.confirmed && <div className="absolute top-5 right-5 w-7 h-7 bg-carbon flex items-center justify-center"><Check className="h-3.5 w-3.5 text-crema" /></div>}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className={`w-10 h-10 flex items-center justify-center mb-4 ${locked ? 'bg-carbon/[0.02]' : 'bg-carbon/[0.04]'}`}>
                          {locked ? <Lock className="h-5 w-5 text-carbon/20" /> : <Icon className="h-5 w-5 text-carbon/50" />}
                        </div>
                        <h3 className="text-xl font-light text-carbon tracking-tight">{card.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-carbon/70 leading-relaxed flex-1">{card.description}</p>
                    {!locked && (
                      <div className="mt-6 flex items-center gap-2">
                        {INPUT_MODES.map((m) => (
                          <span key={m.id} className="px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/50">{m.label}</span>
                        ))}
                      </div>
                    )}
                    <div className={`mt-6 flex items-center justify-center gap-2 py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                      locked ? 'bg-carbon/[0.04] text-carbon/20' : state.confirmed ? 'bg-carbon/[0.06] text-carbon/40 group-hover:bg-carbon/[0.1]' : 'bg-carbon text-crema group-hover:bg-carbon/90'
                    }`}>
                      {locked ? (<><Lock className="h-3 w-3" /> Requires {MERCH_CARDS.find(c => c.id === card.lockedBy)?.nameEs}</>) :
                        state.confirmed ? (<>Edit <ArrowRight className="h-3.5 w-3.5" /></>) : (<>Start <ArrowRight className="h-3.5 w-3.5" /></>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collection Builder CTA */}
        {!expandedCard && (
          <div className={`mt-8 p-8 border transition-all ${allValidated ? 'bg-white border-carbon/[0.06] hover:shadow-lg cursor-pointer' : 'bg-carbon/[0.02] border-carbon/[0.04] cursor-not-allowed'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 flex items-center justify-center ${allValidated ? 'bg-carbon/[0.04]' : 'bg-carbon/[0.02]'}`}>
                  {allValidated ? <LayoutGrid className="h-6 w-6 text-carbon/50" /> : <Lock className="h-5 w-5 text-carbon/15" />}
                </div>
                <div>
                  <h3 className={`text-xl font-light tracking-tight ${allValidated ? 'text-carbon' : 'text-carbon/25'}`}>Collection Builder</h3>
                  <p className={`text-sm mt-1 ${allValidated ? 'text-carbon/60' : 'text-carbon/15'}`}>
                    {allValidated ? 'All cards validated — build your SKU collection' : 'Validate all 4 cards above to unlock'}
                  </p>
                </div>
              </div>
              {allValidated && (
                <button onClick={() => router.push(`/collection/${id}/product`)} className="flex items-center gap-2 bg-carbon text-crema py-3 px-6 text-[11px] font-medium uppercase tracking-[0.15em] hover:bg-carbon/90 transition-colors">
                  Open Builder <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
