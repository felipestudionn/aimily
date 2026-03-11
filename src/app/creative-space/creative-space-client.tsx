'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Check,
  X,
  Loader2,
  Sparkles,
  Lock,
  TrendingUp,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { saveCreativeSpaceData, type CreativeSpaceData } from '@/lib/data-sync';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { imageToBase64, getColorValue, getContrastColor } from '@/lib/image-utils';
import { MoodboardUploader } from '@/components/creative/MoodboardUploader';
import { InsightsPanel } from '@/components/creative/InsightsPanel';
import { TrendExplorer, ColorGrid, TrendCardGrid } from '@/components/creative/TrendExplorer';
import { PinterestImporter } from '@/components/creative/PinterestImporter';
import { MarketTrendsPanel } from '@/components/creative/MarketTrendsPanel';
import type {
  MoodImage,
  MoodboardAnalysis,
  SelectedTrends,
} from '@/types/creative';

/* ── City / Neighborhood types (page-specific) ── */

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

interface Signal {
  id: string;
  signal_name: string;
  signal_type?: string;
  composite_score?: number;
  acceleration_factor?: number;
  platforms_present?: number;
  reddit_mentions?: number;
  pinterest_pin_count?: number;
  youtube_total_views?: number;
  location?: string;
}

interface CreativeSpaceClientProps {
  signals?: Signal[];
}

export function CreativeSpaceClient({ signals = [] }: CreativeSpaceClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Core creative state
  const [images, setImages] = useState<MoodImage[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<MoodboardAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

  // Trend selection state (shared across trend panels)
  const [selectedTrends, setSelectedTrends] = useState<SelectedTrends>({
    colors: [],
    trends: [],
    items: [],
  });

  // Signals state
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);

  // City Trends state
  const [cityTrends, setCityTrends] = useState<CityTrendsResponse | null>(null);
  const [loadingCityTrends, setLoadingCityTrends] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('London');
  const [selectedCityTrends, setSelectedCityTrends] = useState<string[]>([]);

  // Computed values from signals
  const totalSignals = signals.length;
  const totalRedditMentions = signals.reduce((sum, s) => sum + (s.reddit_mentions || 0), 0);
  const totalPinterestPins = signals.reduce((sum, s) => sum + (s.pinterest_pin_count || 0), 0);
  const avgAcceleration = signals.length > 0
    ? signals.reduce((sum, s) => sum + (s.acceleration_factor || 1), 0) / signals.length
    : 1;
  const growthPercent = Math.round((avgAcceleration - 1) * 100);

  // Restore pinterest selected boards from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('aimily_pinterest_selected');
    if (stored) setSelectedBoards(JSON.parse(stored));
  }, []);

  // Save data whenever images or AI analysis change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const summary = {
        count: images.length,
        names: images.map((img) => img.name).slice(0, 20),
      };
      window.localStorage.setItem('aimily_moodboard_summary', JSON.stringify(summary));

      const creativeData: CreativeSpaceData = {
        moodboardImages: images.map((img) => ({
          id: img.id,
          name: img.name,
          url: img.src,
        })),
        keyColors: aiAnalysis?.keyColors || [],
        keyTrends: aiAnalysis?.keyTrends || [],
        keyItems: aiAnalysis?.keyItems || [],
        keyStyles: aiAnalysis?.keyStyles || [],
      };
      saveCreativeSpaceData(creativeData);

      if (selectedBoards.length > 0) {
        localStorage.setItem('aimily_pinterest_selected', JSON.stringify(selectedBoards));
      }
    } catch {
      // ignore storage errors
    }
  }, [images, selectedBoards, aiAnalysis]);

  // Analyze moodboard with AI
  const analyzeMoodboard = useCallback(async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64Images = await Promise.all(images.map((img) => imageToBase64(img.src)));
      const validImages = base64Images.filter(
        (img): img is { base64: string; mimeType: string } => img !== null
      );
      if (validImages.length === 0) return;

      const response = await fetch('/api/ai/analyze-moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: validImages }),
      });
      const data = await response.json();
      if (response.ok && data && (data.keyColors || data.keyTrends || data.keyItems)) {
        setAiAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing moodboard:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [images]);

  // Pinterest import handler — merges imported pins avoiding duplicates
  const handlePinterestImport = useCallback(
    (newImages: MoodImage[]) => {
      setImages((prev) => {
        const existingIds = new Set(prev.map((img) => img.id));
        const unique = newImages.filter((img) => !existingIds.has(img.id));
        return [...prev, ...unique];
      });
    },
    []
  );

  // Toggle trend selection
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

  const toggleSignalSelection = (signalName: string) => {
    setSelectedSignals((prev) =>
      prev.includes(signalName) ? prev.filter((s) => s !== signalName) : [...prev, signalName]
    );
  };

  const toggleCityTrendSelection = (trendName: string) => {
    setSelectedCityTrends((prev) =>
      prev.includes(trendName) ? prev.filter((t) => t !== trendName) : [...prev, trendName]
    );
  };

  // Load City Trends
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

  const hasContent = images.length > 0 || selectedBoards.length > 0;

  /* ── Auth gates ── */

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-3">Sign in to Create</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Create an account or sign in to start building your collection with AI-powered trend insights and moodboard analysis.
          </p>
          <Button size="lg" onClick={() => setShowAuthModal(true)} className="rounded-full px-8">
            <Sparkles className="h-5 w-5 mr-2" />
            Sign In to Get Started
          </Button>
          <p className="text-sm text-muted-foreground mt-4">Free to use · No credit card required</p>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  /* ── Main render ── */

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
            1
          </div>
          <div>
            <h3 className="font-semibold">Step 1: Inspiration</h3>
            <p className="text-sm text-muted-foreground">Build your creative moodboard</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-pink-100 text-pink-700">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Analyzed
        </Badge>
      </div>

      {/* Moodboard */}
      <MoodboardUploader
        images={images}
        onImagesChange={setImages}
        isAnalyzing={isAnalyzing}
        onAnalyze={analyzeMoodboard}
      />

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <InsightsPanel
          analysis={aiAnalysis}
          onAnalysisChange={setAiAnalysis}
        />
      )}

      {/* Pinterest */}
      <PinterestImporter onImportImages={handlePinterestImport} />

      {/* AI Trend Insights */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">AI Trend Insights</h2>
          <p className="text-muted-foreground">
            Discover trends from multiple sources to inform your collection direction.
          </p>
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

        {/* Your Selection */}
        {(selectedTrends.colors.length > 0 || selectedTrends.trends.length > 0 || selectedTrends.items.length > 0) && (
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Check className="h-4 w-4 text-primary" />
              Your Trend Selection
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              {selectedTrends.colors.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Selected Colors ({selectedTrends.colors.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.colors.map((color, i) => {
                      const bgColor = getColorValue(color);
                      const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                      return (
                        <Badge key={i} className="border" style={bgColor ? { backgroundColor: bgColor, color: textColor, borderColor: bgColor } : { backgroundColor: 'hsl(var(--primary))' }}>
                          {color}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('colors', color)} />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedTrends.trends.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Selected Trends ({selectedTrends.trends.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.trends.map((trend, i) => (
                      <Badge key={i} className="bg-primary">{trend}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('trends', trend)} /></Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedTrends.items.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Selected Items ({selectedTrends.items.length})</span>
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

        {/* BLOCK 3: Live Signals */}
        <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Live Signals</h3>
                  <p className="text-sm text-muted-foreground">Real-time trends from Shoreditch · Reddit, YouTube &amp; Pinterest</p>
                </div>
              </div>
            </div>
          </div>

          {/* Static Live Signal Colors */}
          <ColorGrid
            colors={['Warm Beige', 'Olive Green', 'Electric Blue', 'Camel']}
            selectedColors={selectedTrends.colors}
            onToggle={(color) => toggleTrendSelection('colors', color)}
          />

          {/* Static Live Signal Trends */}
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

          {/* Static Live Signal Items */}
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

          {/* Overview Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Signals', value: totalSignals, desc: 'Active emerging signals (last 30 days)' },
              { label: 'Reddit', value: totalRedditMentions, desc: 'Mentions linked to fashion signals' },
              { label: 'Pinterest', value: totalPinterestPins, desc: 'Pins tied to emerging signals' },
              { label: 'Momentum', value: growthPercent > 0 ? `+${growthPercent}%` : 'Stable', desc: 'Average trend acceleration' },
            ].map((card) => (
              <div key={card.label} className="glass-card relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 md:p-6 flex flex-col gap-2">
                  <h3 className="font-semibold">{card.label}</h3>
                  <div className="text-2xl font-bold mt-1">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trending Categories - Selectable */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {signals.length > 0 ? signals.map((signal) => {
              const isSelected = selectedSignals.includes(signal.signal_name);
              const accel = typeof signal.acceleration_factor === 'number'
                ? Math.round((signal.acceleration_factor - 1) * 100) : null;
              const platformsLabel = signal.platforms_present === 3 ? 'Reddit, YouTube, Pinterest'
                : signal.platforms_present === 2 ? 'Multi-platform' : 'Single platform';

              return (
                <div
                  key={signal.id}
                  onClick={() => toggleSignalSelection(signal.signal_name)}
                  className={`rounded-lg border bg-card text-card-foreground shadow-sm p-5 md:p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${
                    isSelected ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                >
                  <div className="absolute top-0 right-0 w-full h-1 aimily-gradient" />
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                        <h3 className="font-semibold">{signal.signal_name}</h3>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                        {accel !== null ? `+${accel}%` : 'Signal'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {signal.signal_type
                        ? `${signal.signal_type} signal with composite score ${Math.round(signal.composite_score || 0)}`
                        : `Composite score ${Math.round(signal.composite_score || 0)} across platforms.`}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Top platforms:</span>
                      <span className="text-muted-foreground">{platformsLabel}</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No live signals available yet. Data will appear once ingested from social platforms.
              </div>
            )}
          </div>

          {/* Selected Signals */}
          {selectedSignals.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-primary" />
                Selected Signals ({selectedSignals.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedSignals.map((signal, i) => (
                  <Badge key={i} className="bg-primary">
                    {signal}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSignalSelection(signal); }} />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BLOCK 4: Street Intelligence */}
        <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10">
                  <MapPin className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Street Intelligence</h3>
                  <p className="text-sm text-muted-foreground">Real-time trends from fashion neighborhoods · TikTok</p>
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
                    <span className="opacity-70 ml-1">· {n.city}</span>
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
                              'vintage market': 'bg-amber-100 text-amber-700',
                              'vintage store': 'bg-amber-100 text-amber-700',
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
                Week {cityTrends.period} · Powered by TikTok + Gemini AI
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

      {/* Continue CTA */}
      <Card className={`border-2 transition-all ${hasContent ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Ready to continue?</h3>
              <p className="text-sm text-muted-foreground">
                {hasContent
                  ? `You have ${images.length} images${aiAnalysis ? ' with AI analysis' : ''}${selectedTrends.colors.length + selectedTrends.trends.length + selectedTrends.items.length > 0 ? ` and ${selectedTrends.colors.length + selectedTrends.trends.length + selectedTrends.items.length} trend selections` : ''}${selectedSignals.length > 0 ? ` and ${selectedSignals.length} live signals` : ''}`
                  : 'Add some images or select Pinterest boards to continue'}
              </p>
            </div>
            <Button
              onClick={() => router.push('/my-collections')}
              disabled={!hasContent}
              size="lg"
              className="gap-2"
            >
              Continue to Strategy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
