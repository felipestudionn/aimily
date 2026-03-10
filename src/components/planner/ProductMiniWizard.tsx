'use client';

import { useState, useCallback, useEffect } from 'react';
import { BlockWizard, WizardStep } from '@/components/wizard/BlockWizard';
import { SelectStep } from '@/components/wizard/steps/SelectStep';
import { MultiSelectStep } from '@/components/wizard/steps/MultiSelectStep';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';
import {
  Sparkles,
  Loader2,
  DollarSign,
  TrendingUp,
  Target,
  Plus,
  X,
} from 'lucide-react';
import type { CollectionPlan, SetupData } from '@/types/planner';

interface ProductMiniWizardProps {
  plan: CollectionPlan;
  onComplete: () => void;
}

export function ProductMiniWizard({ plan, onComplete }: ProductMiniWizardProps) {
  // ─── Form State ──────────────────────────────────────────
  const [wantCreative, setWantCreative] = useState<boolean | null>(null);
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

  // AI generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<SetupData | null>(null);
  const [genError, setGenError] = useState('');

  // Budget
  const [budgetSalesTarget, setBudgetSalesTarget] = useState(0);
  const [budgetMargin, setBudgetMargin] = useState(0);
  const [isSavingSKUs, setIsSavingSKUs] = useState(false);

  // Load creative data from localStorage if exists
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

  // Pre-fill season from Level 1 wizard
  useEffect(() => {
    if (plan.season) setSeason(plan.season);
  }, [plan.season]);

  // Pre-fill SKU count from collection size
  useEffect(() => {
    const sd = plan.setup_data as any;
    if (sd?.collectionSize === 'capsule') setSkuCount('10-20');
    else if (sd?.collectionSize === 'medium') setSkuCount('21-50');
    else if (sd?.collectionSize === 'full') setSkuCount('51-100');
  }, [plan.setup_data]);

  // ─── AI Generation ──────────────────────────────────────
  const generatePlan = useCallback(async () => {
    setIsGenerating(true);
    setGenError('');
    try {
      // Build creative context
      const ctxParts: string[] = [];
      if (creativeData.keyColors.length)
        ctxParts.push(`Key colors: ${creativeData.keyColors.join(', ')}`);
      if (creativeData.keyTrends.length)
        ctxParts.push(`Key trends: ${creativeData.keyTrends.join(', ')}`);
      if (creativeData.keyItems.length)
        ctxParts.push(`Key items: ${creativeData.keyItems.join(', ')}`);

      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetConsumer:
            targetConsumer === 'custom' ? customConsumer : targetConsumer,
          season: season === 'custom' ? customSeason : season,
          skuCount: skuCount === 'custom' ? customSkuCount : skuCount,
          priceMin,
          priceMax,
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
  }, [
    targetConsumer,
    customConsumer,
    season,
    customSeason,
    skuCount,
    customSkuCount,
    priceMin,
    priceMax,
    categories,
    creativeData,
  ]);

  // ─── Save & Generate SKUs ──────────────────────────────
  const handleConfirmBudget = useCallback(async () => {
    if (!generatedPlan) return;
    setIsSavingSKUs(true);
    try {
      const updatedSetupData: SetupData = {
        ...generatedPlan,
        totalSalesTarget: budgetSalesTarget,
        targetMargin: budgetMargin,
      };

      // Update collection_plan setup_data
      await fetch(`/api/planner/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_data: updatedSetupData }),
      });

      // Generate SKUs
      const skuRes = await fetch('/api/ai/generate-skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupData: updatedSetupData,
          count: updatedSetupData.expectedSkus,
        }),
      });

      if (skuRes.ok) {
        const { skus: suggestedSkus } = await skuRes.json();
        for (const suggested of suggestedSkus) {
          const margin =
            ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;
          await fetch('/api/skus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collection_plan_id: plan.id,
              name: suggested.name,
              family:
                suggested.family ||
                updatedSetupData.productFamilies[0]?.name ||
                'General',
              category: updatedSetupData.productCategory || 'ROPA',
              type: suggested.type || 'REVENUE',
              channel: 'DTC',
              drop_number: suggested.drop || 1,
              pvp: suggested.pvp,
              cost: suggested.cost,
              discount: 0,
              final_price: suggested.pvp,
              buy_units: suggested.suggestedUnits,
              sale_percentage: 60,
              expected_sales: suggested.expectedSales,
              margin: Math.round(margin * 100) / 100,
              launch_date: new Date().toISOString().split('T')[0],
            }),
          });
        }
      }

      // Mark workspace as configured
      await fetch(`/api/planner/${plan.id}/workspace-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'product', configured: true }),
      });

      // Persist creative data
      if (
        creativeData.keyColors.length ||
        creativeData.keyTrends.length ||
        creativeData.keyItems.length
      ) {
        window.localStorage.setItem(
          'aimily_creative_data',
          JSON.stringify({
            keyColors: creativeData.keyColors,
            keyTrends: creativeData.keyTrends,
            keyItems: creativeData.keyItems,
          })
        );
      }

      onComplete();
    } catch (err) {
      console.error('Error saving:', err);
      // Still complete — user can fix data later
      onComplete();
    } finally {
      setIsSavingSKUs(false);
    }
  }, [generatedPlan, budgetSalesTarget, budgetMargin, plan.id, creativeData, onComplete]);

  const handleSkipBudget = useCallback(async () => {
    // Save the generated setup_data without SKUs
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
    setCreativeData((prev) => ({
      ...prev,
      [field]: [...prev[field], val],
      [inputField]: '',
    }));
  };

  const removeTag = (field: 'keyColors' | 'keyTrends' | 'keyItems', index: number) => {
    setCreativeData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const addCustomCat = () => {
    const val = customCategory.trim();
    if (!val) return;
    setCategories((prev) => new Set(prev).add(val));
    setCustomCategory('');
  };

  // ─── Build Steps ────────────────────────────────────────
  const steps: WizardStep[] = [];

  // Step 0: Creative Input (optional)
  steps.push({
    id: 'creative-ask',
    autoAdvance: true,
    render: (onNext) => (
      <YesNoStep
        title="Want to start with inspiration?"
        subtitle="Add colors, trends, and key items to guide the AI"
        yesLabel="Yes"
        noLabel="Skip"
        onAnswer={(yes) => {
          setWantCreative(yes);
          onNext();
        }}
      />
    ),
  });

  // Step 1: Creative details (conditional — only if wantCreative)
  if (wantCreative) {
    steps.push({
      id: 'creative-details',
      canAdvance:
        creativeData.keyColors.length > 0 ||
        creativeData.keyTrends.length > 0 ||
        creativeData.keyItems.length > 0,
      render: () => (
        <FormStep title="Your Creative Direction" subtitle="Add at least one color, trend, or key item">
          <div className="space-y-6">
            {/* Key Colors */}
            <div>
              <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 block">
                Key Colors
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={creativeData.newColor}
                  onChange={(e) =>
                    setCreativeData((p) => ({ ...p, newColor: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addTag('keyColors', 'newColor'))
                  }
                  placeholder="e.g., Sage green"
                  className="flex-1 px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none"
                />
                <button
                  onClick={() => addTag('keyColors', 'newColor')}
                  className="px-3 py-2 border border-gris/30 hover:bg-carbon hover:text-crema transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {creativeData.keyColors.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-carbon/10 text-texto text-xs"
                  >
                    {c}
                    <button onClick={() => removeTag('keyColors', i)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Key Trends */}
            <div>
              <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 block">
                Key Trends
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={creativeData.newTrend}
                  onChange={(e) =>
                    setCreativeData((p) => ({ ...p, newTrend: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addTag('keyTrends', 'newTrend'))
                  }
                  placeholder="e.g., Quiet luxury"
                  className="flex-1 px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none"
                />
                <button
                  onClick={() => addTag('keyTrends', 'newTrend')}
                  className="px-3 py-2 border border-gris/30 hover:bg-carbon hover:text-crema transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {creativeData.keyTrends.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-carbon/10 text-texto text-xs"
                  >
                    {t}
                    <button onClick={() => removeTag('keyTrends', i)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Key Items */}
            <div>
              <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 block">
                Key Items
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={creativeData.newItem}
                  onChange={(e) =>
                    setCreativeData((p) => ({ ...p, newItem: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addTag('keyItems', 'newItem'))
                  }
                  placeholder="e.g., Oversized blazer"
                  className="flex-1 px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none"
                />
                <button
                  onClick={() => addTag('keyItems', 'newItem')}
                  className="px-3 py-2 border border-gris/30 hover:bg-carbon hover:text-crema transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {creativeData.keyItems.map((it, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-carbon/10 text-texto text-xs"
                  >
                    {it}
                    <button onClick={() => removeTag('keyItems', i)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FormStep>
      ),
    });
  }

  // Step 2: Target Consumer
  steps.push({
    id: 'target-consumer',
    autoAdvance: true,
    render: (onNext) => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
          Who is your target customer?
        </h1>
        <p className="text-texto/40 text-sm mb-14">Select or describe your own</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {['Gen Z', 'Millennials', 'Gen X', 'Baby Boomers'].map((c) => (
            <button
              key={c}
              onClick={() => {
                setTargetConsumer(c);
                onNext();
              }}
              className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
                targetConsumer === c
                  ? 'bg-carbon text-crema'
                  : 'border border-gris/30 text-texto hover:border-carbon'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {/* Custom option */}
        <button
          onClick={() => setTargetConsumer('custom')}
          className={`mt-3 w-full max-w-xs py-4 text-sm font-medium tracking-[0.1em] uppercase transition-all ${
            targetConsumer === 'custom'
              ? 'bg-carbon text-crema'
              : 'border border-gris/30 text-texto hover:border-carbon'
          }`}
        >
          <Plus className="inline h-4 w-4 mr-2" />
          Custom
        </button>
        {targetConsumer === 'custom' && (
          <div className="mt-4 w-full max-w-xs">
            <textarea
              value={customConsumer}
              onChange={(e) => setCustomConsumer(e.target.value)}
              placeholder="Describe your target consumer..."
              className="w-full px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none min-h-[80px]"
              autoFocus
            />
            <button
              onClick={() => customConsumer.trim() && onNext()}
              disabled={!customConsumer.trim()}
              className="mt-3 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20 transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    ),
  });

  // Step 3: Season (pre-filled from Level 1)
  steps.push({
    id: 'season',
    autoAdvance: true,
    render: (onNext) => {
      // If already set from Level 1, auto-advance
      if (plan.season && season === plan.season) {
        return (
          <div className="flex flex-col items-center animate-fade-in-up">
            <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
              Season / Selling Period
            </h1>
            <p className="text-texto/40 text-sm mb-14">
              Pre-filled from your collection setup
            </p>
            <div className="w-full max-w-xs">
              <div className="py-6 text-center bg-carbon text-crema text-sm font-medium tracking-[0.15em] uppercase">
                {plan.season}
              </div>
              <button
                onClick={onNext}
                className="mt-6 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase"
              >
                Continue
              </button>
            </div>
          </div>
        );
      }

      const seasons = [
        'Spring/Summer 2027',
        'Fall/Winter 2026/27',
        'Resort 2027',
        'Holiday 2026',
      ];
      return (
        <div className="flex flex-col items-center animate-fade-in-up">
          <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
            Season / Selling Period
          </h1>
          <p className="text-texto/40 text-sm mb-14">Which season are you planning for?</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSeason(s);
                  onNext();
                }}
                className="py-6 text-sm font-medium tracking-[0.15em] uppercase border border-gris/30 text-texto hover:border-carbon transition-all"
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSeason('custom')}
            className={`mt-3 w-full max-w-xs py-4 text-sm font-medium tracking-[0.1em] uppercase transition-all ${
              season === 'custom'
                ? 'bg-carbon text-crema'
                : 'border border-gris/30 text-texto hover:border-carbon'
            }`}
          >
            <Plus className="inline h-4 w-4 mr-2" />
            Custom
          </button>
          {season === 'custom' && (
            <div className="mt-4 w-full max-w-xs">
              <input
                type="text"
                value={customSeason}
                onChange={(e) => setCustomSeason(e.target.value)}
                placeholder="e.g., Back to School 2027"
                className="w-full px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none"
                autoFocus
              />
              <button
                onClick={() => customSeason.trim() && onNext()}
                disabled={!customSeason.trim()}
                className="mt-3 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      );
    },
  });

  // Step 4: Number of SKUs (pre-filled from collection size)
  steps.push({
    id: 'sku-count',
    autoAdvance: true,
    render: (onNext) => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
          How many products?
        </h1>
        <p className="text-texto/40 text-sm mb-14">Number of SKUs in this collection</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { id: '10-20', label: '10–20', sub: 'Capsule' },
            { id: '21-50', label: '21–50', sub: 'Medium' },
            { id: '51-100', label: '51–100', sub: 'Full' },
            { id: '100+', label: '100+', sub: 'Large' },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setSkuCount(o.id);
                onNext();
              }}
              className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
                skuCount === o.id
                  ? 'bg-carbon text-crema'
                  : 'border border-gris/30 text-texto hover:border-carbon'
              }`}
            >
              {o.label}
              <span className="block text-[10px] mt-1 font-normal tracking-normal normal-case opacity-50">
                {o.sub}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setSkuCount('custom')}
          className={`mt-3 w-full max-w-xs py-4 text-sm font-medium tracking-[0.1em] uppercase transition-all ${
            skuCount === 'custom'
              ? 'bg-carbon text-crema'
              : 'border border-gris/30 text-texto hover:border-carbon'
          }`}
        >
          <Plus className="inline h-4 w-4 mr-2" />
          Exact number
        </button>
        {skuCount === 'custom' && (
          <div className="mt-4 w-full max-w-xs">
            <input
              type="number"
              value={customSkuCount}
              onChange={(e) => setCustomSkuCount(e.target.value)}
              placeholder="Enter exact SKU count"
              className="w-full px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none text-center"
              autoFocus
            />
            <button
              onClick={() => customSkuCount.trim() && onNext()}
              disabled={!customSkuCount.trim()}
              className="mt-3 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    ),
  });

  // Step 5: Price Range
  steps.push({
    id: 'price-range',
    canAdvance: !!(priceMin && priceMax),
    render: () => (
      <FormStep title="Price Range" subtitle="Min and max retail prices for your collection">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 block">
                Min Price (€)
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-3 text-lg text-center border border-gris/30 bg-transparent focus:border-carbon outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 block">
                Max Price (€)
              </label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="350"
                className="w-full px-3 py-3 text-lg text-center border border-gris/30 bg-transparent focus:border-carbon outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 block">
              Strategy Notes (optional)
            </label>
            <textarea
              value={priceNotes}
              onChange={(e) => setPriceNotes(e.target.value)}
              placeholder="e.g., Premium pricing for sustainable items..."
              className="w-full px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none min-h-[60px]"
            />
          </div>
        </div>
      </FormStep>
    ),
  });

  // Step 6: Product Categories (multi-select)
  const defaultCategories = [
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Footwear',
    'Accessories',
    'Activewear',
    'Denim',
  ];

  steps.push({
    id: 'categories',
    canAdvance: categories.size > 0,
    render: () => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
          Product Categories
        </h1>
        <p className="text-texto/40 text-sm mb-14">
          Select all that apply
        </p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {defaultCategories.map((cat) => {
            const sel = categories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`py-5 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
                  sel
                    ? 'bg-carbon text-crema'
                    : 'border border-gris/30 text-texto hover:border-carbon'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {/* Custom categories */}
        <div className="mt-4 w-full max-w-md flex gap-2">
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && (e.preventDefault(), addCustomCat())
            }
            placeholder="Add custom category..."
            className="flex-1 px-3 py-2 text-sm border border-gris/30 bg-transparent focus:border-carbon outline-none"
          />
          <button
            onClick={addCustomCat}
            disabled={!customCategory.trim()}
            className="px-4 py-2 border border-gris/30 hover:bg-carbon hover:text-crema transition-colors disabled:opacity-20"
          >
            Add
          </button>
        </div>
        {/* Show custom category tags */}
        {Array.from(categories).filter((c) => !defaultCategories.includes(c)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 w-full max-w-md">
            {Array.from(categories)
              .filter((c) => !defaultCategories.includes(c))
              .map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-carbon/10 text-texto text-xs"
                >
                  {c}
                  <button onClick={() => toggleCategory(c)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>
    ),
  });

  // Step 7: AI Generation (auto-trigger on entry)
  steps.push({
    id: 'ai-generate',
    canAdvance: !!generatedPlan,
    render: () => {
      // Auto-trigger generation
      if (!generatedPlan && !isGenerating && !genError) {
        // Use setTimeout to avoid setState during render
        setTimeout(generatePlan, 100);
      }

      return (
        <div className="flex flex-col items-center animate-fade-in-up">
          {isGenerating && (
            <>
              <Loader2 className="h-10 w-10 text-carbon animate-spin mb-6" />
              <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
                Generating your framework
              </h1>
              <p className="text-texto/40 text-sm">
                AI is building your collection strategy...
              </p>
            </>
          )}

          {genError && (
            <>
              <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
                Something went wrong
              </h1>
              <p className="text-error text-sm mb-6">{genError}</p>
              <button
                onClick={generatePlan}
                className="px-8 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase"
              >
                Try Again
              </button>
            </>
          )}

          {generatedPlan && (
            <>
              <Sparkles className="h-8 w-8 text-carbon mb-4" />
              <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
                Your Collection Framework
              </h1>
              <p className="text-texto/40 text-sm mb-10">
                AI-generated strategic plan
              </p>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
                <div className="border border-gris/30 p-4 text-center">
                  <div className="text-2xl font-light text-texto">
                    {generatedPlan.expectedSkus}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-texto/40 mt-1">
                    SKUs
                  </div>
                </div>
                <div className="border border-gris/30 p-4 text-center">
                  <div className="text-2xl font-light text-texto">
                    €{generatedPlan.avgPriceTarget}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-texto/40 mt-1">
                    Avg Price
                  </div>
                </div>
                <div className="border border-gris/30 p-4 text-center">
                  <div className="text-2xl font-light text-texto">
                    {generatedPlan.productFamilies?.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-texto/40 mt-1">
                    Families
                  </div>
                </div>
              </div>

              {/* Product mix */}
              <div className="w-full max-w-md space-y-3">
                <h2 className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50">
                  Product Mix
                </h2>
                {generatedPlan.productFamilies?.map((f) => (
                  <div key={f.name} className="space-y-1">
                    <div className="flex justify-between text-sm text-texto">
                      <span>{f.name}</span>
                      <span className="text-texto/50">{f.percentage}%</span>
                    </div>
                    <div className="w-full h-1 bg-gris/20">
                      <div
                        className="h-1 bg-carbon transition-all"
                        style={{ width: `${f.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    },
  });

  // Step 8: Budget Confirmation
  steps.push({
    id: 'budget',
    canAdvance: false, // We use custom buttons
    render: () => (
      <div className="flex flex-col items-center animate-fade-in-up">
        <Target className="h-8 w-8 text-carbon mb-4" />
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
          Confirm Your Budget
        </h1>
        <p className="text-texto/40 text-sm mb-10">
          Set targets, then we generate your SKUs
        </p>

        <div className="w-full max-w-md space-y-6">
          {/* Sales Target */}
          <div>
            <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              Total Sales Target (€)
            </label>
            <input
              type="number"
              value={budgetSalesTarget}
              onChange={(e) => setBudgetSalesTarget(Number(e.target.value))}
              className="w-full px-3 py-3 text-lg text-center border border-gris/30 bg-transparent focus:border-carbon outline-none"
            />
            {generatedPlan && (
              <p className="text-[10px] text-texto/30 mt-1 text-center">
                AI suggested: €{generatedPlan.totalSalesTarget.toLocaleString()}
              </p>
            )}
          </div>

          {/* Target Margin */}
          <div>
            <label className="text-xs font-medium tracking-[0.1em] uppercase text-texto/50 mb-2 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Target Margin (%)
            </label>
            <input
              type="number"
              value={budgetMargin}
              onChange={(e) => setBudgetMargin(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full px-3 py-3 text-lg text-center border border-gris/30 bg-transparent focus:border-carbon outline-none"
            />
            {generatedPlan && (
              <p className="text-[10px] text-texto/30 mt-1 text-center">
                AI suggested: {generatedPlan.targetMargin}%
              </p>
            )}
          </div>

          {/* Strategy summary */}
          {generatedPlan && (
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-gris/20 p-3 text-center">
                <div className="text-lg font-light">{generatedPlan.expectedSkus}</div>
                <div className="text-[10px] uppercase text-texto/30">SKUs</div>
              </div>
              <div className="border border-gris/20 p-3 text-center">
                <div className="text-lg font-light">€{generatedPlan.avgPriceTarget}</div>
                <div className="text-[10px] uppercase text-texto/30">Avg Price</div>
              </div>
              <div className="border border-gris/20 p-3 text-center">
                <div className="text-lg font-light">{generatedPlan.dropsCount}</div>
                <div className="text-[10px] uppercase text-texto/30">Drops</div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSkipBudget}
              className="flex-1 py-3 text-sm font-medium tracking-[0.1em] uppercase border border-gris/30 text-texto hover:border-carbon transition-colors"
            >
              Skip & Build Manually
            </button>
            <button
              onClick={handleConfirmBudget}
              disabled={isSavingSKUs || budgetSalesTarget <= 0}
              className="flex-1 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase disabled:opacity-20 transition-colors inline-flex items-center justify-center gap-2"
            >
              {isSavingSKUs ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Confirm & Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    ),
  });

  return (
    <BlockWizard
      steps={steps}
      onComplete={onComplete}
      header={
        <div className="fixed top-20 right-6 z-50">
          <span className="text-[10px] tracking-[0.15em] uppercase text-texto/30">
            Product Setup
          </span>
        </div>
      }
    />
  );
}
