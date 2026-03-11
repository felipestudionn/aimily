'use client';

import { Sparkles, Pencil, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { getColorValue, getContrastColor } from '@/lib/image-utils';
import type { MoodboardAnalysis } from '@/types/creative';

interface InsightsPanelProps {
  analysis: MoodboardAnalysis;
  onAnalysisChange: (analysis: MoodboardAnalysis) => void;
  /** Render without Card wrapper (for embedding in other layouts) */
  compact?: boolean;
}

function InsightSection({
  title,
  items,
  onRemove,
  renderBadge,
}: {
  title: string;
  items: string[];
  onRemove?: (index: number) => void;
  renderBadge?: (item: string, index: number) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-purple-900">{title}</h4>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) =>
          renderBadge ? (
            renderBadge(item, i)
          ) : (
            <Badge key={i} variant="secondary" className="bg-white/80 group">
              {item}
              {onRemove && (
                <X
                  className="h-3 w-3 ml-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(i)}
                />
              )}
            </Badge>
          )
        )}
      </div>
    </div>
  );
}

export function InsightsPanel({
  analysis,
  onAnalysisChange,
  compact = false,
}: InsightsPanelProps) {
  const removeItem = (field: keyof MoodboardAnalysis, index: number) => {
    const arr = analysis[field];
    if (!Array.isArray(arr)) return;
    const updated = [...arr];
    updated.splice(index, 1);
    onAnalysisChange({ ...analysis, [field]: updated });
  };

  const content = (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Colors */}
        <InsightSection
          title="Key Colors"
          items={analysis.keyColors || []}
          onRemove={(i) => removeItem('keyColors', i)}
          renderBadge={(color, i) => {
            const bgColor = getColorValue(color);
            const textColor = bgColor ? getContrastColor(bgColor) : undefined;
            return (
              <Badge
                key={i}
                variant="secondary"
                className="border group"
                style={
                  bgColor
                    ? { backgroundColor: bgColor, color: textColor, borderColor: bgColor }
                    : { backgroundColor: 'rgba(255,255,255,0.8)' }
                }
              >
                {color}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeItem('keyColors', i)}
                />
              </Badge>
            );
          }}
        />

        {/* Trends */}
        <InsightSection
          title="Key Trends"
          items={analysis.keyTrends || []}
          onRemove={(i) => removeItem('keyTrends', i)}
        />

        {/* Brands */}
        <InsightSection
          title="Reference Brands"
          items={analysis.keyBrands || []}
          onRemove={(i) => removeItem('keyBrands', i)}
        />

        {/* Items */}
        <InsightSection
          title="Key Items"
          items={analysis.keyItems || []}
          onRemove={(i) => removeItem('keyItems', i)}
        />

        {/* Materials */}
        <InsightSection
          title="Key Materials"
          items={analysis.keyMaterials || []}
          onRemove={(i) => removeItem('keyMaterials', i)}
        />

        {/* Styles */}
        <InsightSection
          title="Key Styles"
          items={analysis.keyStyles || []}
          onRemove={(i) => removeItem('keyStyles', i)}
        />
      </div>

      {analysis.targetAudience && (
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-sm text-purple-800">
            <span className="font-semibold">Target Audience:</span> {analysis.targetAudience}
          </p>
        </div>
      )}
    </>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <Input
                value={analysis.collectionName || ''}
                onChange={(e) =>
                  onAnalysisChange({ ...analysis, collectionName: e.target.value })
                }
                placeholder="Collection Name"
                className="text-xl font-semibold text-purple-900 bg-transparent border-none hover:bg-white/50 focus:bg-white/80 px-2 py-1 h-auto transition-colors"
              />
              <Pencil className="h-4 w-4 text-purple-400 flex-shrink-0" />
            </div>
            <CardDescription className="mt-1">
              {analysis.moodDescription || 'Insights extracted from your creative direction'}
            </CardDescription>
          </div>
          {analysis.seasonalFit && (
            <Badge className="bg-purple-600 text-white text-sm px-3 py-1 flex-shrink-0">
              {analysis.seasonalFit}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
