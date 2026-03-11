'use client';

import { useState, useCallback, useEffect } from 'react';
import { BlockWizard, WizardStep } from '@/components/wizard/BlockWizard';
import { FormStep } from '@/components/wizard/steps/FormStep';
import {
  Sparkles,
  Loader2,
  DollarSign,
  TrendingUp,
  Target,
  Plus,
  X,
  Search,
  ImageIcon,
} from 'lucide-react';
import { MoodboardUploader } from '@/components/creative/MoodboardUploader';
import type { MoodImage, MoodboardAnalysis } from '@/types/creative';
import type { CollectionPlan, SetupData } from '@/types/planner';

interface ProductMiniWizardProps {
  plan: CollectionPlan;
  onComplete: () => void;
}

export function ProductMiniWizard({ plan, onComplete }: ProductMiniWizardProps) {
  // ─── Creative State ──────────────────────────────────────
  const [moodImages, setMoodImages] = useState<MoodImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MoodboardAnalysis | null>(null);
  const [creativeTab, setCreativeTab] = useState<'moodboard' | 'trends' | 'manual'>('moodboard');
  const [trendQuery, setTrendQuery] = useState('');
  const [isExploring, setIsExploring] = useState(false);

  const [creativeData, setCreativeData] = useState({
    keyColors: [] as string[],
    keyTrends: [] as string[],
    keyItems: [] as string[],
    newColor: '',
    newTrend: '',
    newItem: '',
  });

  const [targetConsumer, setTargetConsumer] = useState('');
  const [customConsumer, setCustomConsumer] = useState('');

  const [season, setSeason] = useState('');
  const [customSeason, setCustomSeason] = useState('');

  const [skuCount, setSkuCount] = useState('');
  const [customSkuCount, setCustomSkuCount] = useState('');

  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceNotes, setPriceNotes] = useState('');

  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [customCategory, setCustomCategory] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<SetupData | null>(null);
  const [genError, setGenError] = useState('');

  const [budgetSalesTarget, setBudgetSalesTarget] = useState(0);
  const [budgetMargin, setBudgetMargin] = useState(0);
  const [isSavingSKUs, setIsSavingSKUs] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('aimily_creative_data');
      if (raw) {
        const d = JSON.parse(raw);
        setCreativeData((prev) => ({
          ...prev,
          keyColors: d.keyColors || [],
          keyTrends: d.keyTrends || [],
          keyItems: d.keyItems || [],
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (plan.season) setSeason(plan.season);
  }, [plan.season]);

  useEffect(() => {
    const sd = plan.setup_data as any;
    if (sd?.collectionSize === 'capsule') setSkuCount('10-20');
    else if (sd?.collectionSize === 'medium') setSkuCount('21-50');
    else if (sd?.collectionSize === 'full') setSkuCount('51-100');
  }, [plan.setup_data]);

  // ─── Moodboard Analysis ───────────────────────────────────
  const analyzeMoodboard = useCallback(async () => {
    if (moodImages.length === 0) return;
    setIsAnalyzing(true);
    try {
      const imageData = await Promise.all(
        moodImages.map(async (img) => {
          const response = await fetch(img.src);
          const blob = await response.blob();
          return new Promise<{ base64: string; mimeType: string }>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split(',')[1];
              resolve({ base64, mimeType: blob.type || 'image/jpeg' });
            };
            reader.readAsDataURL(blob);
          });
        })
      );

      const res = await fetch('/api/ai/analyze-moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imageData }),
      });

      if (res.ok) {
        const analysis = (await res.json()) as MoodboardAnalysis;
        setAnalysisResult(analysis);
        setCreativeData((prev) => ({
          ...prev,
          keyColors: Array.from(new Set([...prev.keyColors, ...(analysis.keyColors || [])])),
          keyTrends: Array.from(new Set([...prev.keyTrends, ...(analysis.keyTrends || [])])),
          keyItems: Array.from(new Set([...prev.keyItems, ...(analysis.keyItems || [])])),
        }));
      }
    } catch (err) {
      console.error('Moodboard analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [moodImages]);

  // ─── Trend Explorer ───────────────────────────────────────
  const exploreTrend = useCallback(async () => {
    if (!trendQuery.trim()) return;
    setIsExploring(true);
    try {
      const res = await fetch('/api/ai/explore-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trendQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreativeData((prev) => ({
          ...prev,
          keyColors: Array.from(new Set([...prev.keyColors, ...(data.keyColors || [])])),
          keyTrends: Array.from(new Set([...prev.keyTrends, ...(data.keyTrends || [])])),
          keyItems: Array.from(new Set([...prev.keyItems, ...(data.keyItems || [])])),
        }));
        setTrendQuery('');
      }
    } catch (err) {
      console.error('Trend exploration error:', err);
    } finally {
      setIsExploring(false);
    }
  }, [trendQuery]);

  // ─── AI Generation ──────────────────────────────────────
  const generatePlan = useCallback(async () => {
    setIsGenerating(true);
    setGenError('');
    try {
      const ctxParts: string[] = [];
      if (creativeData.keyColors.length) ctxParts.push(`Key colors: ${creativeData.keyColors.join(', ')}`);
      if (creativeData.keyTrends.length) ctxParts.push(`Key trends: ${creativeData.keyTrends.join(', ')}`);
      if (creativeData.keyItems.length) ctxParts.push(`Key items: ${creativeData.keyItems.join(', ')}`);
      if (analysisResult?.moodDescription) ctxParts.push(`Mood: ${analysisResult.moodDescription}`);

      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetConsumer: targetConsumer === 'custom' ? customConsumer : targetConsumer,
          season: season === 'custom' ? customSeason : season,
          skuCount: skuCount === 'custom' ? customSkuCount : skuCount,
          priceMin, priceMax,
          categories: Array.from(categories),
          location: 'Shoreditch',
          userMoodboardContext: ctxParts.length ? ctxParts.join('. ') : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate plan');
      const data = (await res.json()) as SetupData;
      setGeneratedPlan(data);
      setBudgetSalesTarget(data.totalSalesTarget);
      setBudgetMargin(data.targetMargin);
    } catch (err: any) {
      setGenError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [targetConsumer, customConsumer, season, customSeason, skuCount, customSkuCount, priceMin, priceMax, categories, creativeData, analysisResult]);

  // ─── Save & Generate SKUs ──────────────────────────────
  const handleConfirmBudget = useCallback(async () => {
    if (!generatedPlan) return;
    setIsSavingSKUs(true);
    try {
      const updatedSetupData: SetupData = { ...generatedPlan, totalSalesTarget: budgetSalesTarget, targetMargin: budgetMargin };

      await fetch(`/api/planner/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_data: updatedSetupData }),
      });

      const skuRes = await fetch('/api/ai/generate-skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupData: updatedSetupData, count: updatedSetupData.expectedSkus }),
      });

      if (skuRes.ok) {
        const { skus: suggestedSkus } = await skuRes.json();
        for (const suggested of suggestedSkus) {
          const margin = ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;
          await fetch('/api/skus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collection_plan_id: plan.id, name: suggested.name,
              family: suggested.family || updatedSetupData.productFamilies[0]?.name || 'General',
              category: updatedSetupData.productCategory || 'ROPA', type: suggested.type || 'REVENUE',
              channel: 'DTC', drop_number: suggested.drop || 1, pvp: suggested.pvp, cost: suggested.cost,
              discount: 0, final_price: suggested.pvp, buy_units: suggested.suggestedUnits,
              sale_percentage: 60, expected_sales: suggested.expectedSales,
              margin: Math.round(margin * 100) / 100, launch_date: new Date().toISOString().split('T')[0],
            }),
          });
        }
      }

      await fetch(`/api/planner/${plan.id}/workspace-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'product', configured: true }),
      });

      if (creativeData.keyColors.length || creativeData.keyTrends.length || creativeData.keyItems.length) {
        window.localStorage.setItem('aimily_creative_data', JSON.stringify({
          keyColors: creativeData.keyColors, keyTrends: creativeData.keyTrends, keyItems: creativeData.keyItems,
        }));
      }

      onComplete();
    } catch (err) {
      console.error('Error saving:', err);
      onComplete();
    } finally {
      setIsSavingSKUs(false);
    }
  }, [generatedPlan, budgetSalesTarget, budgetMargin, plan.id, creativeData, onComplete]);

  const handleSkipBudget = useCallback(async () => {
    if (generatedPlan) {
      await fetch(`/api/planner/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_data: generatedPlan }),
      }).catch(() => {});
    }
    await fetch(`/api/planner/${plan.id}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'product', configured: true }),
    }).catch(() => {});
    onComplete();
  }, [generatedPlan, plan.id, onComplete]);

  // ─── Helpers ────────────────────────────────────────────
  const addTag = (field: 'keyColors' | 'keyTrends' | 'keyItems', inputField: 'newColor' | 'newTrend' | 'newItem') => {
    const val = creativeData[inputField].trim();
    if (!val) return;
    setCreativeData((prev) => ({ ...prev, [field]: [...prev[field], val], [inputField]: '' }));
  };

  const removeTag = (field: 'keyColors' | 'keyTrends' | 'keyItems', index: number) => {
    setCreativeData((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
  };

  const addCustomCat = () => {
    const val = customCategory.trim();
    if (!val) return;
    setCategories((prev) => new Set(prev).add(val));
    setCustomCategory('');
  };

  const hasCreativeInput = creativeData.keyColors.length > 0 || creativeData.keyTrends.length > 0 || creativeData.keyItems.length > 0;

  // ─── Build Steps ────────────────────────────────────────
  const steps: WizardStep[] = [];

  // Step 0: Creative Direction — Rich with moodboard + trends + manual
  steps.push({
    id: 'creative-direction',
    canAdvance: true,
    render: () => (
      <div className="animate-fade-in-up w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Creative Direction</h1>
          <p className="text-texto/40 text-sm">Upload a moodboard, explore trends, or add your vision manually</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-neutral-200">
          {([
            { id: 'moodboard' as const, label: 'Moodboard', icon: ImageIcon },
            { id: 'trends' as const, label: 'Explore Trends', icon: Search },
            { id: 'manual' as const, label: 'Manual', icon: Plus },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCreativeTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-[11px] font-medium tracking-[0.08em] uppercase transition-all border-b-2 -mb-px ${
                creativeTab === tab.id ? 'border-carbon text-texto' : 'border-transparent text-texto/30 hover:text-texto/60'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Moodboard Tab */}
        {creativeTab === 'moodboard' && (
          <div className="space-y-4">
            <MoodboardUploader images={moodImages} onImagesChange={setMoodImages} isAnalyzing={isAnalyzing} onAnalyze={analyzeMoodboard} compact />
            {moodImages.length > 0 && !analysisResult && (
              <button
                onClick={analyzeMoodboard}
                disabled={isAnalyzing}
                className="w-full py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.1em] uppercase flex items-center justify-center gap-2 disabled:opacity-30 transition-colors"
              >
                {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing your moodboard...</>) : (<><Sparkles className="h-4 w-4" />Analyze with AI</>)}
              </button>
            )}
            {analysisResult && (
              <div className="bg-neutral-50 border border-neutral-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-texto/50" />
                  <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/60">AI Analysis</span>
                </div>
                {analysisResult.moodDescription && (
                  <p className="text-sm text-texto/60 italic leading-relaxed">{analysisResult.moodDescription}</p>
                )}
                <div className="text-[10px] text-texto/30">Colors, trends, and items have been added to your selection below.</div>
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {creativeTab === 'trends' && (
          <div className="space-y-4">
            <p className="text-sm text-texto/40">Search any aesthetic, style, or trend — AI will extract colors, trends, and key items.</p>
            <div className="flex gap-2">
              <input
                type="text" value={trendQuery} onChange={(e) => setTrendQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), exploreTrend())}
                placeholder="e.g., Quiet Luxury, Gorpcore, Y2K, Boho..."
                className="flex-1 px-4 py-3 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none"
              />
              <button
                onClick={exploreTrend} disabled={isExploring || !trendQuery.trim()}
                className="px-5 py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.1em] uppercase flex items-center gap-2 disabled:opacity-30 transition-colors"
              >
                {isExploring ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-3.5 w-3.5" />Explore</>}
              </button>
            </div>
          </div>
        )}

        {/* Manual Tab */}
        {creativeTab === 'manual' && (
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 block">Key Colors</label>
              <div className="flex gap-2">
                <input type="text" value={creativeData.newColor} onChange={(e) => setCreativeData((p) => ({ ...p, newColor: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('keyColors', 'newColor'))} placeholder="e.g., Sage green" className="flex-1 px-3 py-2.5 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none" />
                <button onClick={() => addTag('keyColors', 'newColor')} className="px-3 py-2.5 border border-neutral-200 hover:bg-carbon hover:text-crema transition-colors"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 block">Key Trends</label>
              <div className="flex gap-2">
                <input type="text" value={creativeData.newTrend} onChange={(e) => setCreativeData((p) => ({ ...p, newTrend: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('keyTrends', 'newTrend'))} placeholder="e.g., Quiet luxury" className="flex-1 px-3 py-2.5 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none" />
                <button onClick={() => addTag('keyTrends', 'newTrend')} className="px-3 py-2.5 border border-neutral-200 hover:bg-carbon hover:text-crema transition-colors"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 block">Key Items</label>
              <div className="flex gap-2">
                <input type="text" value={creativeData.newItem} onChange={(e) => setCreativeData((p) => ({ ...p, newItem: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('keyItems', 'newItem'))} placeholder="e.g., Oversized blazer" className="flex-1 px-3 py-2.5 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none" />
                <button onClick={() => addTag('keyItems', 'newItem')} className="px-3 py-2.5 border border-neutral-200 hover:bg-carbon hover:text-crema transition-colors"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Collected Tags — always visible */}
        {hasCreativeInput && (
          <div className="mt-8 pt-6 border-t border-neutral-100 space-y-3">
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-texto/30">Your Selection</span>
            {creativeData.keyColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {creativeData.keyColors.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-texto text-[11px]">
                    {c}<button onClick={() => removeTag('keyColors', i)} className="ml-0.5 text-texto/30 hover:text-texto"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {creativeData.keyTrends.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {creativeData.keyTrends.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-carbon/5 text-texto text-[11px]">
                    {t}<button onClick={() => removeTag('keyTrends', i)} className="ml-0.5 text-texto/30 hover:text-texto"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {creativeData.keyItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {creativeData.keyItems.map((it, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-carbon/[0.08] text-texto text-[11px]">
                    {it}<button onClick={() => removeTag('keyItems', i)} className="ml-0.5 text-texto/30 hover:text-texto"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    ),
  });

  // Step 1: Target Consumer
  steps.push({
    id: 'target-consumer',
    autoAdvance: true,
    render: (onNext) => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Who is your target customer?</h1>
        <p className="text-texto/40 text-sm mb-14">Select or describe your own</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {['Gen Z', 'Millennials', 'Gen X', 'Baby Boomers'].map((c) => (
            <button key={c} onClick={() => { setTargetConsumer(c); onNext(); }}
              className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${targetConsumer === c ? 'bg-carbon text-crema' : 'border border-neutral-200 text-texto hover:border-carbon'}`}>{c}</button>
          ))}
        </div>
        <button onClick={() => setTargetConsumer('custom')}
          className={`mt-3 w-full max-w-xs py-4 text-sm font-medium tracking-[0.1em] uppercase transition-all ${targetConsumer === 'custom' ? 'bg-carbon text-crema' : 'border border-neutral-200 text-texto hover:border-carbon'}`}>
          <Plus className="inline h-4 w-4 mr-2" />Custom
        </button>
        {targetConsumer === 'custom' && (
          <div className="mt-4 w-full max-w-xs">
            <textarea value={customConsumer} onChange={(e) => setCustomConsumer(e.target.value)} placeholder="Describe your target consumer..." className="w-full px-3 py-2 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none min-h-[80px]" autoFocus />
            <button onClick={() => customConsumer.trim() && onNext()} disabled={!customConsumer.trim()} className="mt-3 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20 transition-colors">Continue</button>
          </div>
        )}
      </div>
    ),
  });

  // Step 2: Season
  steps.push({
    id: 'season',
    autoAdvance: true,
    render: (onNext) => {
      if (plan.season && season === plan.season) {
        return (
          <div className="flex flex-col items-center animate-fade-in-up">
            <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Season / Selling Period</h1>
            <p className="text-texto/40 text-sm mb-14">Pre-filled from your collection setup</p>
            <div className="w-full max-w-xs">
              <div className="py-6 text-center bg-carbon text-crema text-sm font-medium tracking-[0.15em] uppercase">{plan.season}</div>
              <button onClick={onNext} className="mt-6 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase">Continue</button>
            </div>
          </div>
        );
      }
      const seasons = ['Spring/Summer 2027', 'Fall/Winter 2026/27', 'Resort 2027', 'Holiday 2026'];
      return (
        <div className="flex flex-col items-center animate-fade-in-up">
          <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Season / Selling Period</h1>
          <p className="text-texto/40 text-sm mb-14">Which season are you planning for?</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {seasons.map((s) => (
              <button key={s} onClick={() => { setSeason(s); onNext(); }} className="py-6 text-sm font-medium tracking-[0.15em] uppercase border border-neutral-200 text-texto hover:border-carbon transition-all">{s}</button>
            ))}
          </div>
          <button onClick={() => setSeason('custom')} className={`mt-3 w-full max-w-xs py-4 text-sm font-medium tracking-[0.1em] uppercase transition-all ${season === 'custom' ? 'bg-carbon text-crema' : 'border border-neutral-200 text-texto hover:border-carbon'}`}>
            <Plus className="inline h-4 w-4 mr-2" />Custom
          </button>
          {season === 'custom' && (
            <div className="mt-4 w-full max-w-xs">
              <input type="text" value={customSeason} onChange={(e) => setCustomSeason(e.target.value)} placeholder="e.g., Back to School 2027" className="w-full px-3 py-2 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none" autoFocus />
              <button onClick={() => customSeason.trim() && onNext()} disabled={!customSeason.trim()} className="mt-3 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20">Continue</button>
            </div>
          )}
        </div>
      );
    },
  });

  // Step 3: SKU Count
  steps.push({
    id: 'sku-count',
    autoAdvance: true,
    render: (onNext) => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">How many products?</h1>
        <p className="text-texto/40 text-sm mb-14">Number of SKUs in this collection</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {[{ id: '10-20', label: '10\u201320', sub: 'Capsule' }, { id: '21-50', label: '21\u201350', sub: 'Medium' }, { id: '51-100', label: '51\u2013100', sub: 'Full' }, { id: '100+', label: '100+', sub: 'Large' }].map((o) => (
            <button key={o.id} onClick={() => { setSkuCount(o.id); onNext(); }}
              className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${skuCount === o.id ? 'bg-carbon text-crema' : 'border border-neutral-200 text-texto hover:border-carbon'}`}>
              {o.label}<span className="block text-[10px] mt-1 font-normal tracking-normal normal-case opacity-50">{o.sub}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setSkuCount('custom')} className={`mt-3 w-full max-w-xs py-4 text-sm font-medium tracking-[0.1em] uppercase transition-all ${skuCount === 'custom' ? 'bg-carbon text-crema' : 'border border-neutral-200 text-texto hover:border-carbon'}`}>
          <Plus className="inline h-4 w-4 mr-2" />Exact number
        </button>
        {skuCount === 'custom' && (
          <div className="mt-4 w-full max-w-xs">
            <input type="number" value={customSkuCount} onChange={(e) => setCustomSkuCount(e.target.value)} placeholder="Enter exact SKU count" className="w-full px-3 py-2 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none text-center" autoFocus />
            <button onClick={() => customSkuCount.trim() && onNext()} disabled={!customSkuCount.trim()} className="mt-3 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20">Continue</button>
          </div>
        )}
      </div>
    ),
  });

  // Step 4: Price Range
  steps.push({
    id: 'price-range',
    canAdvance: !!(priceMin && priceMax),
    render: () => (
      <FormStep title="Price Range" subtitle="Min and max retail prices for your collection">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 block">Min Price (&euro;)</label>
              <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="50" className="w-full px-3 py-3 text-lg text-center border border-neutral-200 bg-white focus:border-carbon outline-none" autoFocus />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 block">Max Price (&euro;)</label>
              <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="350" className="w-full px-3 py-3 text-lg text-center border border-neutral-200 bg-white focus:border-carbon outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 block">Strategy Notes (optional)</label>
            <textarea value={priceNotes} onChange={(e) => setPriceNotes(e.target.value)} placeholder="e.g., Premium pricing for sustainable items..." className="w-full px-3 py-2 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none min-h-[60px]" />
          </div>
        </div>
      </FormStep>
    ),
  });

  // Step 5: Product Categories
  const defaultCategories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Footwear', 'Accessories', 'Activewear', 'Denim'];
  steps.push({
    id: 'categories',
    canAdvance: categories.size > 0,
    render: () => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Product Categories</h1>
        <p className="text-texto/40 text-sm mb-14">Select all that apply</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {defaultCategories.map((cat) => (
            <button key={cat} onClick={() => toggleCategory(cat)}
              className={`py-5 text-sm font-medium tracking-[0.15em] uppercase transition-all ${categories.has(cat) ? 'bg-carbon text-crema' : 'border border-neutral-200 text-texto hover:border-carbon'}`}>{cat}</button>
          ))}
        </div>
        <div className="mt-4 w-full max-w-md flex gap-2">
          <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCat())} placeholder="Add custom category..." className="flex-1 px-3 py-2 text-sm border border-neutral-200 bg-white focus:border-carbon outline-none" />
          <button onClick={addCustomCat} disabled={!customCategory.trim()} className="px-4 py-2 border border-neutral-200 hover:bg-carbon hover:text-crema transition-colors disabled:opacity-20">Add</button>
        </div>
        {Array.from(categories).filter((c) => !defaultCategories.includes(c)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 w-full max-w-md">
            {Array.from(categories).filter((c) => !defaultCategories.includes(c)).map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 text-texto text-xs">{c}<button onClick={() => toggleCategory(c)}><X className="h-3 w-3" /></button></span>
            ))}
          </div>
        )}
      </div>
    ),
  });

  // Step 6: AI Generation
  steps.push({
    id: 'ai-generate',
    canAdvance: !!generatedPlan,
    render: () => {
      if (!generatedPlan && !isGenerating && !genError) { setTimeout(generatePlan, 100); }
      return (
        <div className="flex flex-col items-center animate-fade-in-up">
          {isGenerating && (<><Loader2 className="h-10 w-10 text-carbon animate-spin mb-6" /><h1 className="text-3xl font-light text-texto tracking-tight mb-2">Generating your framework</h1><p className="text-texto/40 text-sm">AI is building your collection strategy...</p></>)}
          {genError && (<><h1 className="text-3xl font-light text-texto tracking-tight mb-2">Something went wrong</h1><p className="text-error text-sm mb-6">{genError}</p><button onClick={generatePlan} className="px-8 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase">Try Again</button></>)}
          {generatedPlan && (<>
            <Sparkles className="h-8 w-8 text-carbon mb-4" />
            <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Your Collection Framework</h1>
            <p className="text-texto/40 text-sm mb-10">AI-generated strategic plan</p>
            <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
              <div className="border border-neutral-200 p-4 text-center"><div className="text-2xl font-light text-texto">{generatedPlan.expectedSkus}</div><div className="text-[10px] uppercase tracking-[0.1em] text-texto/40 mt-1">SKUs</div></div>
              <div className="border border-neutral-200 p-4 text-center"><div className="text-2xl font-light text-texto">&euro;{generatedPlan.avgPriceTarget}</div><div className="text-[10px] uppercase tracking-[0.1em] text-texto/40 mt-1">Avg Price</div></div>
              <div className="border border-neutral-200 p-4 text-center"><div className="text-2xl font-light text-texto">{generatedPlan.productFamilies?.length}</div><div className="text-[10px] uppercase tracking-[0.1em] text-texto/40 mt-1">Families</div></div>
            </div>
            <div className="w-full max-w-md space-y-3">
              <h2 className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40">Product Mix</h2>
              {generatedPlan.productFamilies?.map((f) => (
                <div key={f.name} className="space-y-1"><div className="flex justify-between text-sm text-texto"><span>{f.name}</span><span className="text-texto/50">{f.percentage}%</span></div><div className="w-full h-1 bg-neutral-100"><div className="h-1 bg-carbon transition-all" style={{ width: `${f.percentage}%` }} /></div></div>
              ))}
            </div>
          </>)}
        </div>
      );
    },
  });

  // Step 7: Budget Confirmation
  steps.push({
    id: 'budget',
    canAdvance: false,
    render: () => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <Target className="h-8 w-8 text-carbon mb-4" />
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Confirm Your Budget</h1>
        <p className="text-texto/40 text-sm mb-10">Set targets, then we generate your SKUs</p>
        <div className="w-full max-w-md space-y-6">
          <div>
            <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" />Total Sales Target (&euro;)</label>
            <input type="number" value={budgetSalesTarget} onChange={(e) => setBudgetSalesTarget(Number(e.target.value))} className="w-full px-3 py-3 text-lg text-center border border-neutral-200 bg-white focus:border-carbon outline-none" />
            {generatedPlan && <p className="text-[10px] text-texto/30 mt-1 text-center">AI suggested: &euro;{generatedPlan.totalSalesTarget.toLocaleString()}</p>}
          </div>
          <div>
            <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-texto/40 mb-2 flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" />Target Margin (%)</label>
            <input type="number" value={budgetMargin} onChange={(e) => setBudgetMargin(Number(e.target.value))} min={0} max={100} className="w-full px-3 py-3 text-lg text-center border border-neutral-200 bg-white focus:border-carbon outline-none" />
            {generatedPlan && <p className="text-[10px] text-texto/30 mt-1 text-center">AI suggested: {generatedPlan.targetMargin}%</p>}
          </div>
          {generatedPlan && (
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-neutral-100 p-3 text-center"><div className="text-lg font-light">{generatedPlan.expectedSkus}</div><div className="text-[10px] uppercase text-texto/30">SKUs</div></div>
              <div className="border border-neutral-100 p-3 text-center"><div className="text-lg font-light">&euro;{generatedPlan.avgPriceTarget}</div><div className="text-[10px] uppercase text-texto/30">Avg Price</div></div>
              <div className="border border-neutral-100 p-3 text-center"><div className="text-lg font-light">{generatedPlan.dropsCount}</div><div className="text-[10px] uppercase text-texto/30">Drops</div></div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button onClick={handleSkipBudget} className="flex-1 py-3 text-sm font-medium tracking-[0.1em] uppercase border border-neutral-200 text-texto hover:border-carbon transition-colors">Skip & Build Manually</button>
            <button onClick={handleConfirmBudget} disabled={isSavingSKUs || budgetSalesTarget <= 0} className="flex-1 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20 transition-colors inline-flex items-center justify-center gap-2">
              {isSavingSKUs ? (<><Loader2 className="h-4 w-4 animate-spin" />Generating...</>) : (<><Sparkles className="h-4 w-4" />Confirm & Generate</>)}
            </button>
          </div>
        </div>
      </div>
    ),
  });

  return <BlockWizard steps={steps} onComplete={onComplete} />;
}
