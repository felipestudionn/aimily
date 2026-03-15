'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorGrid, TrendCardGrid } from './TrendExplorer';
import type { MarketTrends, SelectedTrends } from '@/types/creative';
import { useLanguage } from '@/contexts/LanguageContext';

interface MarketTrendsPanelProps {
  selectedTrends: SelectedTrends;
  onToggleTrend: (type: 'colors' | 'trends' | 'items', value: string) => void;
}

export function MarketTrendsPanel({
  selectedTrends,
  onToggleTrend,
}: MarketTrendsPanelProps) {
  const { language } = useLanguage();
  const [marketTrends, setMarketTrends] = useState<MarketTrends | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMarketTrends = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/market-trends?language=${language}`);
      if (response.ok) {
        const data = await response.json();
        setMarketTrends(data);
      }
    } catch (error) {
      console.error('Error loading market trends:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Macro Trends</h3>
              <p className="text-sm text-muted-foreground">
                SS26 &amp; Pre-Fall 2026 Runway Intelligence
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={loadMarketTrends}
          disabled={loading}
          variant="outline"
          className="gap-2 rounded-full px-6"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {marketTrends ? 'Refresh' : 'Load Trends'}
        </Button>
      </div>

      {marketTrends ? (
        <div className="space-y-8">
          <ColorGrid
            colors={marketTrends.keyColors}
            selectedColors={selectedTrends.colors}
            onToggle={(color) => onToggleTrend('colors', color)}
          />
          <TrendCardGrid
            title="Key Trends"
            items={marketTrends.keyTrends}
            selectedItems={selectedTrends.trends}
            onToggle={(trend) => onToggleTrend('trends', trend)}
            variant="primary"
          />
          <TrendCardGrid
            title="Key Items"
            items={marketTrends.keyItems}
            selectedItems={selectedTrends.items}
            onToggle={(item) => onToggleTrend('items', item)}
            variant="dark"
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Load the latest runway trends from SS26 &amp; Pre-Fall 2026
          </p>
        </div>
      )}
    </div>
  );
}
