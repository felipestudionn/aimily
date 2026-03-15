'use client';

import { useState } from 'react';
import { Search, Loader2, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getColorValue, getContrastColor, parseColorString, parseTrendString } from '@/lib/image-utils';
import type { TrendExploration, SelectedTrends } from '@/types/creative';
import { useLanguage } from '@/contexts/LanguageContext';

interface TrendExplorerProps {
  selectedTrends: SelectedTrends;
  onToggleTrend: (type: 'colors' | 'trends' | 'items', value: string) => void;
}

export function TrendExplorer({ selectedTrends, onToggleTrend }: TrendExplorerProps) {
  const { language } = useLanguage();
  const [trendQuery, setTrendQuery] = useState('');
  const [trendExploration, setTrendExploration] = useState<TrendExploration | null>(null);
  const [exploringTrend, setExploringTrend] = useState(false);

  const exploreTrend = async () => {
    if (!trendQuery.trim()) return;
    setExploringTrend(true);
    try {
      const response = await fetch('/api/ai/explore-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trendQuery, language }),
      });
      if (response.ok) {
        const data = await response.json();
        setTrendExploration(data);
      }
    } catch (error) {
      console.error('Error exploring trend:', error);
    } finally {
      setExploringTrend(false);
    }
  };

  const addExplorationToSelection = () => {
    if (!trendExploration) return;
    trendExploration.keyColors.forEach((c) => {
      if (!selectedTrends.colors.includes(c)) onToggleTrend('colors', c);
    });
    trendExploration.keyTrends.forEach((t) => {
      if (!selectedTrends.trends.includes(t)) onToggleTrend('trends', t);
    });
    trendExploration.keyItems.forEach((i) => {
      if (!selectedTrends.items.includes(i)) onToggleTrend('items', i);
    });
  };

  return (
    <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Explore Trends</h3>
              <p className="text-sm text-muted-foreground">Deep dive into any aesthetic or trend</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex gap-3">
        <Input
          placeholder="e.g., Quiet Luxury, Gorpcore, Y2K, Coquette, Boho..."
          value={trendQuery}
          onChange={(e) => setTrendQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && exploreTrend()}
          className="flex-1 h-12 text-base rounded-xl border-slate-200"
        />
        <Button
          onClick={exploreTrend}
          disabled={exploringTrend || !trendQuery.trim()}
          className="h-12 px-6 rounded-xl"
        >
          {exploringTrend ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              Explore
            </>
          )}
        </Button>
      </div>

      {/* Exploration Results */}
      {trendExploration && (
        <div className="space-y-8 pt-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h4 className="text-xl font-bold text-slate-900">
                Deep Dive: {trendExploration.query}
              </h4>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                {trendExploration.description}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={addExplorationToSelection}
              className="rounded-full px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add All to Selection
            </Button>
          </div>

          {/* Colors */}
          <ColorGrid
            colors={trendExploration.keyColors}
            selectedColors={selectedTrends.colors}
            onToggle={(color) => onToggleTrend('colors', color)}
          />

          {/* Trends */}
          <TrendCardGrid
            title="Key Trends"
            items={trendExploration.keyTrends}
            selectedItems={selectedTrends.trends}
            onToggle={(trend) => onToggleTrend('trends', trend)}
            variant="primary"
          />

          {/* Items */}
          <TrendCardGrid
            title="Key Items"
            items={trendExploration.keyItems}
            selectedItems={selectedTrends.items}
            onToggle={(item) => onToggleTrend('items', item)}
            variant="dark"
          />
        </div>
      )}
    </div>
  );
}

/* ── Shared sub-components ── */

export function ColorGrid({
  colors,
  selectedColors,
  onToggle,
}: {
  colors: string[];
  selectedColors: string[];
  onToggle: (color: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Key Colors
        </h4>
        <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {colors.map((color, i) => {
          const { colorName, colorCode, colorDescription } = parseColorString(color);
          const bgColor = getColorValue(colorName);
          const textColor = bgColor ? getContrastColor(bgColor) : undefined;
          const isSelected = selectedColors.includes(color);

          return (
            <div
              key={i}
              onClick={() => onToggle(color)}
              className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              <div
                className="h-20 relative"
                style={{ backgroundColor: bgColor || '#f5f5f5' }}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-white/30">
                    <Check
                      className="h-3 w-3"
                      style={{ color: textColor || '#333' }}
                    />
                  </div>
                )}
                {colorCode && (
                  <div className="absolute bottom-2 left-3">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20"
                      style={{ color: textColor || '#333' }}
                    >
                      {colorCode}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white border-t">
                <h5 className="font-semibold text-sm text-slate-900">{colorName}</h5>
                {colorDescription && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {colorDescription}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendCardGrid({
  title,
  items,
  selectedItems,
  onToggle,
  variant = 'primary',
}: {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  variant?: 'primary' | 'dark';
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h4>
        <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const isSelected = selectedItems.includes(item);
          const { title: itemTitle, description } = parseTrendString(item);

          const selectedClass =
            variant === 'primary'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-slate-900 text-white border-slate-900';
          const unselectedClass = 'bg-white hover:bg-slate-50 border-slate-200';

          return (
            <div
              key={i}
              onClick={() => onToggle(item)}
              className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-lg border ${
                isSelected ? selectedClass : unselectedClass
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <h5
                    className={`font-bold text-base leading-tight ${
                      isSelected ? '' : 'text-slate-900'
                    }`}
                  >
                    {itemTitle}
                  </h5>
                  {description && (
                    <p
                      className={`text-sm leading-relaxed ${
                        isSelected
                          ? variant === 'primary'
                            ? 'text-primary-foreground/80'
                            : 'text-white/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {description}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <div className="p-1 rounded-full bg-white/20 flex-shrink-0 mt-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
