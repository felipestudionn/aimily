'use client';

import { useState } from 'react';
import {
  Image,
  Sparkles,
  Loader2,
  Star,
  Camera,
  Sun,
  Trees,
  ChevronDown,
  Heart,
  Download,
  RotateCcw,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { AiGeneration, RenderMode } from '@/types/studio';
import { SCENE_OPTIONS } from '@/types/studio';
import { useAuth } from '@/contexts/AuthContext';

const RENDER_MODES: { id: RenderMode; label: string; labelEs: string; icon: React.ElementType; description: string }[] = [
  { id: 'tryon', label: 'On-Model', labelEs: 'Sobre Modelo', icon: Camera, description: 'Product on AI model (FASHN)' },
  { id: 'studio', label: 'Studio Shot', labelEs: 'Foto Estudio', icon: Sun, description: 'Clean product photo (Flux 2)' },
  { id: 'lifestyle', label: 'Lifestyle', labelEs: 'Estilo de Vida', icon: Trees, description: 'Editorial context shot (Flux 2)' },
];

interface ProductRenderGeneratorProps {
  collectionId: string;
  skus: SKU[];
  generations: AiGeneration[];
  onGenerate: (gen: Partial<AiGeneration>) => Promise<AiGeneration | null>;
  onUpdate: (id: string, updates: Partial<AiGeneration>) => Promise<AiGeneration | null>;
  onToggleFavorite: (id: string) => Promise<AiGeneration | null>;
  onRefetch: () => void;
}

export function ProductRenderGenerator({
  collectionId,
  skus,
  generations,
  onGenerate,
  onUpdate,
  onToggleFavorite,
  onRefetch,
}: ProductRenderGeneratorProps) {
  const { user } = useAuth();
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [mode, setMode] = useState<RenderMode>('studio');
  const [scene, setScene] = useState('white-studio');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);

  const handleGenerate = async () => {
    if (!selectedSku || !user) return;
    setGenerating(true);
    setError(null);

    try {
      const imageUrl = selectedSku.reference_image_url || '';
      let endpoint = '/api/ai/fal/product-render';
      let generationType: AiGeneration['generation_type'] = 'product_render';
      let modelUsed = 'flux-2-pro';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any = {};

      if (mode === 'tryon') {
        endpoint = '/api/ai/fal/tryon';
        generationType = 'tryon';
        modelUsed = 'fashn-tryon-v1.6';
        body = { garment_image_url: imageUrl };
      } else if (mode === 'lifestyle') {
        endpoint = '/api/ai/fal/lifestyle';
        generationType = 'lifestyle';
        body = { image_url: imageUrl, scene, prompt: customPrompt || undefined };
      } else {
        body = {
          image_url: imageUrl,
          background: SCENE_OPTIONS.find((s) => s.id === scene)?.label || scene,
          prompt: customPrompt || undefined,
        };
      }

      const prompt = `${RENDER_MODES.find((m) => m.id === mode)?.label} render for ${selectedSku.name}${customPrompt ? ` — ${customPrompt}` : ''}`;

      // Create generation record
      const genRecord = await onGenerate({
        user_id: user.id,
        generation_type: generationType,
        prompt,
        model_used: modelUsed,
        status: 'processing',
        input_data: {
          sku_id: selectedSku.id,
          sku_name: selectedSku.name,
          garment_image_url: imageUrl,
          style: mode,
          scene,
          ...body,
        },
      });

      if (!genRecord) throw new Error('Failed to create generation record');

      // Call fal.ai
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const result = await res.json();

      // Update with results
      await onUpdate(genRecord.id, {
        status: 'completed',
        output_data: {
          images: result.images || [],
          video_url: result.video_url || undefined,
        },
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

  // Filter generations for the selected SKU
  const skuGenerations = selectedSku
    ? generations.filter((g) => g.input_data?.sku_id === selectedSku.id)
    : generations;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Controls */}
        <div className="col-span-4 space-y-4">
          {/* SKU Selector */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select SKU</label>
            <div className="relative">
              <button
                onClick={() => setShowSkuDropdown(!showSkuDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left hover:border-gray-300 transition-colors"
              >
                <span className={selectedSku ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedSku ? selectedSku.name : 'Choose a SKU...'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {showSkuDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {skus.map((sku) => (
                    <button
                      key={sku.id}
                      onClick={() => {
                        setSelectedSku(sku);
                        setShowSkuDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        selectedSku?.id === sku.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{sku.name}</div>
                      <div className="text-xs text-gray-400">{sku.category} — {sku.family}</div>
                    </button>
                  ))}
                  {skus.length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No SKUs found</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reference Image Preview */}
          {selectedSku?.reference_image_url && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reference</label>
              <img
                src={selectedSku.reference_image_url}
                alt={selectedSku.name}
                className="w-full rounded-lg object-cover aspect-square"
              />
            </div>
          )}

          {/* Render Mode */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Generation Mode</label>
            <div className="space-y-2">
              {RENDER_MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-left transition-all ${
                      mode === m.id
                        ? 'bg-purple-50 border border-purple-200 text-purple-700'
                        : 'border border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs opacity-70">{m.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scene (for studio & lifestyle) */}
          {mode !== 'tryon' && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {mode === 'lifestyle' ? 'Scene' : 'Background'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(mode === 'lifestyle'
                  ? SCENE_OPTIONS.filter((s) => !['white-studio', 'marble', 'gradient'].includes(s.id))
                  : SCENE_OPTIONS.filter((s) => ['white-studio', 'marble', 'gradient'].includes(s.id))
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setScene(s.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      scene === s.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Prompt (optional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add specific details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedSku || generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Right: Results Gallery */}
        <div className="col-span-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4 min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {selectedSku ? `${selectedSku.name} — Renders` : 'All Renders'}
              </h3>
              <span className="text-xs text-gray-400">{skuGenerations.length} images</span>
            </div>

            {skuGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Image className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No renders yet</p>
                <p className="text-xs mt-1">Select a SKU and generate your first render</p>
              </div>
            ) : (
              <div className="columns-2 gap-4 space-y-4">
                {skuGenerations.map((gen) => (
                  <GenerationCard
                    key={gen.id}
                    generation={gen}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerationCard({
  generation,
  onToggleFavorite,
}: {
  generation: AiGeneration;
  onToggleFavorite: (id: string) => void;
}) {
  const images = generation.output_data?.images || [];
  const isProcessing = generation.status === 'processing';
  const isFailed = generation.status === 'failed';

  return (
    <div className="break-inside-avoid">
      {isProcessing ? (
        <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Generating...</p>
          </div>
        </div>
      ) : isFailed ? (
        <div className="aspect-square bg-red-50 rounded-xl flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-xs text-red-600 font-medium">Failed</p>
            <p className="text-xs text-red-400 mt-1">{generation.error || 'Unknown error'}</p>
          </div>
        </div>
      ) : (
        images.map((img, idx) => (
          <div key={idx} className="relative group mb-4">
            <img
              src={img.url}
              alt={generation.prompt}
              className="w-full rounded-xl object-cover"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-end opacity-0 group-hover:opacity-100">
              <div className="w-full p-3 flex items-center justify-between">
                <div className="text-white text-xs">
                  <p className="font-medium truncate max-w-[180px]">
                    {generation.input_data?.sku_name || 'Render'}
                  </p>
                  <p className="opacity-70">{generation.model_used}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onToggleFavorite(generation.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      generation.is_favorite
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" fill={generation.is_favorite ? 'currentColor' : 'none'} />
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
        ))
      )}
      {/* Type Badge */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
          {generation.generation_type}
        </span>
        {generation.input_data?.scene && (
          <span className="text-[10px] text-gray-400">
            {generation.input_data.scene}
          </span>
        )}
      </div>
    </div>
  );
}
