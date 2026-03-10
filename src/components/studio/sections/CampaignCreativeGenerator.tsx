'use client';

import { useState } from 'react';
import {
  Megaphone,
  Sparkles,
  Loader2,
  Heart,
  Download,
  Image,
  ChevronDown,
} from 'lucide-react';
import type { AiGeneration } from '@/types/studio';
import { FORMAT_PRESETS, type FormatPreset } from '@/types/studio';
import { useAuth } from '@/contexts/AuthContext';

interface CampaignCreativeGeneratorProps {
  collectionId: string;
  generations: AiGeneration[];
  allGenerations: AiGeneration[];
  onGenerate: (gen: Partial<AiGeneration>) => Promise<AiGeneration | null>;
  onUpdate: (id: string, updates: Partial<AiGeneration>) => Promise<AiGeneration | null>;
  onToggleFavorite: (id: string) => Promise<AiGeneration | null>;
  onRefetch: () => void;
}

export function CampaignCreativeGenerator({
  collectionId,
  generations,
  allGenerations,
  onGenerate,
  onUpdate,
  onToggleFavorite,
  onRefetch,
}: CampaignCreativeGeneratorProps) {
  const { user } = useAuth();
  const [selectedFormat, setSelectedFormat] = useState<FormatPreset>(FORMAT_PRESETS[0]);
  const [sourceImage, setSourceImage] = useState<string>('');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  // Get completed renders to use as source images
  const completedRenders = allGenerations.filter(
    (g) => g.status === 'completed' && g.output_data?.images?.length
  );

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setError(null);

    try {
      const prompt = [
        `Fashion campaign creative for ${selectedFormat.name}`,
        headline ? `Headline: "${headline}"` : '',
        subheadline ? `Subheadline: "${subheadline}"` : '',
        `${selectedFormat.width}x${selectedFormat.height} format`,
        'Professional ad creative, high-end fashion brand, clean typography',
      ].filter(Boolean).join('. ');

      const genRecord = await onGenerate({
        user_id: user.id,
        generation_type: 'ad_creative',
        prompt,
        model_used: 'flux-2-pro',
        status: 'processing',
        input_data: {
          format: selectedFormat.id,
          width: selectedFormat.width,
          height: selectedFormat.height,
          garment_image_url: sourceImage || undefined,
          headline,
          subheadline,
        },
      });

      if (!genRecord) throw new Error('Failed to create generation record');

      const res = await fetch('/api/ai/fal/product-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: sourceImage || undefined,
          prompt,
          width: selectedFormat.width,
          height: selectedFormat.height,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const result = await res.json();

      await onUpdate(genRecord.id, {
        status: 'completed',
        output_data: { images: result.images || [] },
        completed_at: new Date().toISOString(),
      });

      onRefetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Controls */}
        <div className="col-span-4 space-y-4">
          {/* Format Presets */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Format</label>
            <div className="space-y-2">
              {FORMAT_PRESETS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                    selectedFormat.id === f.id
                      ? 'bg-purple-50 border border-purple-200 text-purple-700'
                      : 'border border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="text-xs opacity-60">{f.width}x{f.height}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Source Image */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source Image</label>
            {sourceImage ? (
              <div className="relative">
                <img src={sourceImage} alt="Source" className="w-full rounded-lg object-cover aspect-square" />
                <button
                  onClick={() => setSourceImage('')}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full text-xs"
                >
                  x
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowSourcePicker(!showSourcePicker)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300"
                >
                  Choose from renders...
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showSourcePicker && completedRenders.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {completedRenders.slice(0, 12).map((g) => {
                        const img = g.output_data?.images?.[0];
                        if (!img) return null;
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSourceImage(img.url);
                              setShowSourcePicker(false);
                            }}
                            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-400 transition-colors"
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Text Overlay */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Text Overlay</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Headline (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
            <input
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="Subheadline (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Creative
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="col-span-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4 min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Campaign Creatives</h3>
              <span className="text-xs text-gray-400">{generations.length} creatives</span>
            </div>

            {generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Megaphone className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No campaign creatives yet</p>
                <p className="text-xs mt-1">Select a format and generate your first ad creative</p>
              </div>
            ) : (
              <div className="columns-2 gap-4 space-y-4">
                {generations.map((gen) => {
                  const images = gen.output_data?.images || [];
                  if (gen.status === 'processing') {
                    return (
                      <div key={gen.id} className="break-inside-avoid aspect-square bg-gray-50 rounded-xl flex items-center justify-center mb-4">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      </div>
                    );
                  }
                  return images.map((img, idx) => (
                    <div key={`${gen.id}-${idx}`} className="break-inside-avoid relative group mb-4">
                      <img src={img.url} alt={gen.prompt} className="w-full rounded-xl object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-end opacity-0 group-hover:opacity-100">
                        <div className="w-full p-3 flex items-center justify-between">
                          <span className="text-white text-xs font-medium">
                            {gen.input_data?.format || 'Creative'}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onToggleFavorite(gen.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                gen.is_favorite ? 'bg-pink-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              <Heart className="h-3.5 w-3.5" fill={gen.is_favorite ? 'currentColor' : 'none'} />
                            </button>
                            <a
                              href={img.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
