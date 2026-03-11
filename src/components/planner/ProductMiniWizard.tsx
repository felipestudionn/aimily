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
  Check,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoodboardUploader } from '@/components/creative/MoodboardUploader';
import { InsightsPanel } from '@/components/creative/InsightsPanel';
import { TrendExplorer, ColorGrid, TrendCardGrid } from '@/components/creative/TrendExplorer';
import { PinterestImporter } from '@/components/creative/PinterestImporter';
import { MarketTrendsPanel } from '@/components/creative/MarketTrendsPanel';
import { getColorValue, getContrastColor } from '@/lib/image-utils';
import type { MoodImage, MoodboardAnalysis, SelectedTrends } from '@/types/creative';
import type { CollectionPlan, SetupData } from '@/types/planner';

/* ── City / Neighborhood types ── */
interface NeighborhoodGarment { name: string; mentions: number; isNew: boolean; rank: number; }
interface NeighborhoodStyle { name: string; mentions: number; isNew: boolean; }
interface NeighborhoodBrand { name: string; mentions: number; type: string; }
interface NeighborhoodSpot { name: string; mentions: number; }
interface MicroTrend { name: string; description: string; confidence: number; }
interface NeighborhoodData {
  city: string;
  neighborhood: string;
  garments: NeighborhoodGarment[];
  styles: NeighborhoodStyle[];
  brands: NeighborhoodBrand[];
  localSpots: NeighborhoodSpot[];
  microTrends: MicroTrend[];
}
interface CityTrendsResponse {
  neighborhoods: NeighborhoodData[];
  tiktokTrends: { hashtag: string; total_plays: number; total_likes: number; post_count: number; neighborhood?: string; top_related_hashtags?: string[] }[];
  period: string;
  hasProcessedData: boolean;
}

interface ProductMiniWizardProps {
  plan: CollectionPlan;
  onComplete: () => void;
}

export function ProductMiniWizard({ plan, onComplete }: ProductMiniWizardProps) {
  // ─── Creative State ──────────────────────────────────────
  const [moodImages, setMoodImages] = useState<MoodImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MoodboardAnalysis | null>(null);

  // Shared trend selection (used by MarketTrends, TrendExplorer, Live Signals)
  const [selectedTrends, setSelectedTrends] = useState<SelectedTrends>({
    colors: [],
    trends: [],
    items: [],
  });

  // City Trends / Street Intelligence
  const [cityTrends, setCityTrends] = useState<CityTrendsResponse | null>(null);
  const [loadingCityTrends, setLoadingCityTrends] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('London');
  const [selectedCityTrends, setSelectedCityTrends] = useState<string[]>([]);

  // Wizard form state
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
  const [budgetSalesTarget, setBudgetSalesTarget] = useState(0);
  const [budgetMargin, setBudgetMargin] = useState(0);
  const [isSavingSKUs, setIsSavingSKUs] = useState(false);

  // Load saved creative data
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('aimily_creative_data');
      if (raw) {
        const d = JSON.parse(raw);
        setSelectedTrends((prev) => ({
          colors: d.keyColors || prev.colors,
          trends: d.keyTrends || prev.trends,
          items: d.keyItems || prev.items,
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

  // ─── Toggle Handlers ───────────────────────────────────
  const toggleTrendSelection = useCallback(
    (type: 'colors' | 'trends' | 'items', value: string) => {
      setSelectedTrends((prev) => ({
        ...prev,
        [type]: prev[type].includes(value)
          ? prev[type].filter((v) => v !== value)
          : [...prev[type], value],
      }));
    },
    []
  );

  const toggleCityTrendSelection = (trendName: string) => {
    setSelectedCityTrends((prev) =>
      prev.includes(trendName) ? prev.filter((t) => t !== trendName) : [...prev, trendName]
    );
  };

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
        // Merge analysis into selected trends
        setSelectedTrends((prev) => ({
          colors: Array.from(new Set([...prev.colors, ...(analysis.keyColors || [])])),
          trends: Array.from(new Set([...prev.trends, ...(analysis.keyTrends || [])])),
          items: Array.from(new Set([...prev.items, ...(analysis.keyItems || [])])),
        }));
      }
    } catch (err) {
      console.error('Moodboard analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [moodImages]);

  // ─── Pinterest Import ───────────────────────────────────
  const handlePinterestImport = useCallback(
    (newImages: MoodImage[]) => {
      setMoodImages((prev) => {
        const existingIds = new Set(prev.map((img) => img.id));
        const unique = newImages.filter((img) => !existingIds.has(img.id));
        return [...prev, ...unique];
      });
    },
    []
  );

  // ─── City Trends ───────────────────────────────────────
  const loadCityTrends = async () => {
    setLoadingCityTrends(true);
    try {
      const response = await fetch('/api/city-trends');
      if (response.ok) {
        const data = await response.json();
        setCityTrends(data);
        if (data.neighborhoods?.length > 0) {
          const found = data.neighborhoods.find((n: NeighborhoodData) => n.neighborhood === selectedCity);
          if (!found) setSelectedCity(data.neighborhoods[0].neighborhood);
        }
      }
    } catch (error) {
      console.error('Error loading city trends:', error);
    } finally {
      setLoadingCityTrends(false);
    }
  };

  const currentNeighborhoodData = cityTrends?.neighborhoods?.find(
    (n: NeighborhoodData) => n.neighborhood === selectedCity
  );

  // ─── AI Generation ──────────────────────────────────────
  const generatePlan = useCallback(async () => {
    setIsGenerating(true);
    setGenError('');
    try {
      const ctxParts: string[] = [];
      if (selectedTrends.colors.length) ctxParts.push(`Key colors: ${selectedTrends.colors.join(', ')}`);
      if (selectedTrends.trends.length) ctxParts.push(`Key trends: ${selectedTrends.trends.join(', ')}`);
      if (selectedTrends.items.length) ctxParts.push(`Key items: ${selectedTrends.items.join(', ')}`);
      if (analysisResult?.moodDescription) ctxParts.push(`Mood: ${analysisResult.moodDescription}`);
      if (analysisResult?.keyBrands?.length) ctxParts.push(`Reference brands: ${analysisResult.keyBrands.join(', ')}`);
      if (analysisResult?.keyMaterials?.length) ctxParts.push(`Key materials: ${analysisResult.keyMaterials.join(', ')}`);

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
  }, [targetConsumer, customConsumer, season, customSeason, skuCount, customSkuCount, priceMin, priceMax, categories, selectedTrends, analysisResult]);

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

      // Save creative data for later use
      if (selectedTrends.colors.length || selectedTrends.trends.length || selectedTrends.items.length) {
        window.localStorage.setItem('aimily_creative_data', JSON.stringify({
          keyColors: selectedTrends.colors, keyTrends: selectedTrends.trends, keyItems: selectedTrends.items,
        }));
      }

      onComplete();
    } catch (err) {
      console.error('Error saving:', err);
      onComplete();
    } finally {
      setIsSavingSKUs(false);
    }
  }, [generatedPlan, budgetSalesTarget, budgetMargin, plan.id, selectedTrends, onComplete]);

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
  const toggleCategory = (cat: string) => {
    setCategories((prev) => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
  };

  const addCustomCat = () => {
    const val = customCategory.trim();
    if (!val) return;
    setCategories((prev) => new Set(prev).add(val));
    setCustomCategory('');
  };

  const hasCreativeInput = selectedTrends.colors.length > 0 || selectedTrends.trends.length > 0 || selectedTrends.items.length > 0 || moodImages.length > 0;

  // ─── Build Steps ────────────────────────────────────────
  const steps: WizardStep[] = [];

  // Step 0: Creative Direction — FULL Creative Space experience
  steps.push({
    id: 'creative-direction',
    canAdvance: true,
    wide: true,
    render: () => (
      <div className="animate-fade-in-up space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Creative Direction</h1>
          <p className="text-texto/40 text-sm">Build your moodboard, explore trends, and define your collection&apos;s creative identity</p>
        </div>

        {/* ─── Section 1: Moodboard + Pinterest ─── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Moodboard */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-texto/40">Moodboard</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent" />
            </div>
            <MoodboardUploader
              images={moodImages}
              onImagesChange={setMoodImages}
              isAnalyzing={isAnalyzing}
              onAnalyze={analyzeMoodboard}
              compact
            />
            {moodImages.length > 0 && !analysisResult && (
              <button
                onClick={analyzeMoodboard}
                disabled={isAnalyzing}
                className="w-full py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.1em] uppercase flex items-center justify-center gap-2 disabled:opacity-30 transition-colors"
              >
                {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing your moodboard...</>) : (<><Sparkles className="h-4 w-4" />Analyze with AI</>)}
              </button>
            )}
          </div>

          {/* Pinterest */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-texto/40">Pinterest</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent" />
            </div>
            <PinterestImporter onImportImages={handlePinterestImport} compact />
          </div>
        </div>

        {/* ─── AI Analysis Results ─── */}
        {analysisResult && (
          <InsightsPanel
            analysis={analysisResult}
            onAnalysisChange={setAnalysisResult}
          />
        )}

        {/* ─── Section 2: AI Trend Intelligence ─── */}
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <h2 className="text-2xl font-light text-texto tracking-tight mb-1">AI Trend Intelligence</h2>
            <p className="text-texto/40 text-sm">Discover trends from multiple sources to inform your collection</p>
          </div>

          {/* Macro Trends */}
          <MarketTrendsPanel
            selectedTrends={selectedTrends}
            onToggleTrend={toggleTrendSelection}
          />

          {/* Explore Specific Trends */}
          <TrendExplorer
            selectedTrends={selectedTrends}
            onToggleTrend={toggleTrendSelection}
          />

          {/* ─── Live Signals ─── */}
          <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Live Signals</h3>
                    <p className="text-sm text-muted-foreground">Real-time trends from Shoreditch &middot; Reddit, YouTube &amp; Pinterest</p>
                  </div>
                </div>
              </div>
            </div>

            <ColorGrid
              colors={['Warm Beige', 'Olive Green', 'Electric Blue', 'Camel']}
              selectedColors={selectedTrends.colors}
              onToggle={(color) => toggleTrendSelection('colors', color)}
            />

            <TrendCardGrid
              title="Key Trends"
              items={[
                'Oversized Tailoring: Relaxed blazers and wide-leg trousers dominating Reddit fashion discussions',
                'Gorpcore Evolution: Technical outdoor wear meets urban style, trending across YouTube fashion channels',
                'Y2K Revival: Low-rise, butterfly clips, and metallic fabrics resurging on Pinterest boards',
              ]}
              selectedItems={selectedTrends.trends}
              onToggle={(trend) => toggleTrendSelection('trends', trend)}
              variant="primary"
            />

            <TrendCardGrid
              title="Key Items"
              items={[
                'Utility Vests: Functional layering piece trending in street style',
                'Cargo Pants: Relaxed fit with multiple pockets, Reddit favorite',
                'Bomber Jackets: Classic silhouette with modern updates',
                'Platform Sandals: Chunky soles dominating Pinterest searches',
              ]}
              selectedItems={selectedTrends.items}
              onToggle={(item) => toggleTrendSelection('items', item)}
              variant="dark"
            />
          </div>

          {/* ─── Street Intelligence ─── */}
          <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/10">
                    <MapPin className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Street Intelligence</h3>
                    <p className="text-sm text-muted-foreground">Real-time trends from fashion neighborhoods &middot; TikTok</p>
                  </div>
                </div>
              </div>
              <Button onClick={loadCityTrends} disabled={loadingCityTrends} variant="outline" className="gap-2 rounded-full px-6">
                {loadingCityTrends ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {cityTrends ? 'Refresh' : 'Load'}
              </Button>
            </div>

            {cityTrends && cityTrends.neighborhoods && cityTrends.neighborhoods.length > 0 ? (
              <>
                {/* Neighborhood Selector */}
                <div className="flex flex-wrap gap-2">
                  {cityTrends.neighborhoods.map((n: NeighborhoodData) => (
                    <button
                      key={n.neighborhood}
                      onClick={() => setSelectedCity(n.neighborhood)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCity === n.neighborhood
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'
                      }`}
                    >
                      {n.neighborhood}
                      <span className="opacity-70 ml-1">&middot; {n.city}</span>
                    </button>
                  ))}
                </div>

                {currentNeighborhoodData && (
                  <div className="space-y-8">
                    {/* Micro-Trends */}
                    {currentNeighborhoodData.microTrends?.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Emerging Micro-Trends</h4>
                          <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                        </div>
                        <div className="grid gap-4">
                          {currentNeighborhoodData.microTrends.map((mt: MicroTrend, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => toggleCityTrendSelection(`${selectedCity}:micro:${mt.name}`)}
                              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                                selectedCityTrends.includes(`${selectedCity}:micro:${mt.name}`)
                                  ? 'bg-violet-50 border-violet-300'
                                  : 'bg-white border-slate-200 hover:border-violet-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-semibold text-slate-800">{mt.name}</h5>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full" style={{ width: `${mt.confidence}%` }} />
                                  </div>
                                  <span className="text-xs text-violet-600 font-bold">{mt.confidence}%</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{mt.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Garments */}
                    {currentNeighborhoodData.garments?.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Rising Garments</h4>
                          <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentNeighborhoodData.garments.slice(0, 12).map((g: NeighborhoodGarment, idx: number) => {
                            const isSelected = selectedCityTrends.includes(`${selectedCity}:garment:${g.name}`);
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleCityTrendSelection(`${selectedCity}:garment:${g.name}`)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-violet-300'
                                }`}
                              >
                                {g.name}
                                {g.isNew && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">NEW</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Styles + Brands grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {currentNeighborhoodData.styles?.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Aesthetics</h4>
                          <div className="space-y-2">
                            {currentNeighborhoodData.styles.slice(0, 6).map((s: NeighborhoodStyle, idx: number) => {
                              const isSelected = selectedCityTrends.includes(`${selectedCity}:style:${s.name}`);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleCityTrendSelection(`${selectedCity}:style:${s.name}`)}
                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                    isSelected ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 hover:border-violet-200'
                                  }`}
                                >
                                  <span className={`font-medium ${isSelected ? '' : 'text-slate-800'}`}>{s.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs ${isSelected ? 'text-violet-200' : 'text-slate-500'}`}>{s.mentions} mentions</span>
                                    {s.isNew && <span className={`text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>NEW</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {currentNeighborhoodData.brands?.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Brands Mentioned</h4>
                          <div className="space-y-2">
                            {currentNeighborhoodData.brands.slice(0, 6).map((b: NeighborhoodBrand, idx: number) => {
                              const isSelected = selectedCityTrends.includes(`${selectedCity}:brand:${b.name}`);
                              const typeColors: Record<string, string> = {
                                'streetwear': 'bg-pink-100 text-pink-700',
                                'vintage': 'bg-amber-100 text-amber-700',
                                'luxury': 'bg-purple-100 text-purple-700',
                                'concept store': 'bg-blue-100 text-blue-700',
                                'emerging-designer': 'bg-green-100 text-green-700',
                              };
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleCityTrendSelection(`${selectedCity}:brand:${b.name}`)}
                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                    isSelected ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 hover:border-violet-200'
                                  }`}
                                >
                                  <span className={`font-medium ${isSelected ? '' : 'text-slate-800'}`}>{b.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : typeColors[b.type] || 'bg-slate-100 text-slate-600'}`}>
                                    {b.type}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Local Spots */}
                    {currentNeighborhoodData.localSpots?.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Local Hotspots</h4>
                          <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentNeighborhoodData.localSpots.map((spot: NeighborhoodSpot, idx: number) => (
                            <div key={idx} className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700 flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              {spot.name}
                              <span className="text-xs text-slate-400">{spot.mentions}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected City Trends */}
                {selectedCityTrends.length > 0 && (
                  <div className="pt-6 border-t">
                    <h4 className="font-semibold flex items-center gap-2 mb-3 text-violet-600">
                      <Check className="h-4 w-4" />
                      Selected for Collection ({selectedCityTrends.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCityTrends.map((trend, i) => {
                        const parts = trend.split(':');
                        const displayName = parts.length >= 3 ? parts[2] : trend;
                        return (
                          <Badge key={i} className="bg-violet-600 hover:bg-violet-700">
                            {displayName}
                            <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleCityTrendSelection(trend); }} />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Week {cityTrends.period} &middot; Powered by TikTok + Gemini AI
                </p>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 mb-4">
                  <MapPin className="h-8 w-8 text-violet-600" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Discover Street Intelligence</h4>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Real-time trends from Shoreditch, Le Marais, Williamsburg, Harajuku, Kreuzberg &amp; Hongdae.
                </p>
                <Button onClick={loadCityTrends} disabled={loadingCityTrends} className="bg-violet-600 hover:bg-violet-700">
                  {loadingCityTrends ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                  Load Street Intelligence
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Your Selection Summary ─── */}
        {(selectedTrends.colors.length > 0 || selectedTrends.trends.length > 0 || selectedTrends.items.length > 0) && (
          <div className="rounded-lg border bg-card p-6 sticky bottom-4 shadow-lg">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <Check className="h-4 w-4 text-primary" />
              Your Trend Selection
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              {selectedTrends.colors.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Colors ({selectedTrends.colors.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.colors.map((color, i) => {
                      const bgColor = getColorValue(color);
                      const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                      return (
                        <Badge key={i} className="border" style={bgColor ? { backgroundColor: bgColor, color: textColor, borderColor: bgColor } : {}}>
                          {color}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('colors', color)} />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedTrends.trends.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Trends ({selectedTrends.trends.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.trends.map((trend, i) => (
                      <Badge key={i} className="bg-primary">{trend}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('trends', trend)} /></Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedTrends.items.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Items ({selectedTrends.items.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.items.map((item, i) => (
                      <Badge key={i} className="bg-primary">{item}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('items', item)} /></Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
