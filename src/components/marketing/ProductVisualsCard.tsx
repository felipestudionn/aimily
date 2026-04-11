'use client';

import { useState, useMemo } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Shirt,
  Palmtree,
  Loader2,
  Star,
  Trash2,
  X,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStories, type Story } from '@/hooks/useStories';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import { useBrandModels } from '@/hooks/useBrandModels';
import type { AiGeneration, BrandModel } from '@/types/studio';
import { SCENE_OPTIONS } from '@/types/studio';
import { useTranslation } from '@/i18n';

/* ── Types ── */

type VisualAction = 'product-render' | 'tryon' | 'still-life';

interface GeneratingState {
  skuId: string;
  action: VisualAction;
}

/* ── Props ── */

interface ProductVisualsCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function ProductVisualsCard({ collectionPlanId }: ProductVisualsCardProps) {
  const t = useTranslation();
  const { user } = useAuth();
  const { stories, loading: storiesLoading } = useStories(collectionPlanId);
  const { skus } = useSkus(collectionPlanId);
  const {
    generations,
    loading: gensLoading,
    addGeneration,
    toggleFavorite,
    deleteGeneration,
    refetch: refetchGens,
  } = useAiGenerations(collectionPlanId);
  const { models } = useBrandModels(collectionPlanId);

  const [expanded, setExpanded] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<GeneratingState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState('white-studio');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [expandedSkuId, setExpandedSkuId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  /* ── Derived ── */

  const storiesWithSkus = useMemo(() => {
    return stories.map((story) => ({
      ...story,
      skus: skus.filter((sk) => (sk as SKU & { story_id?: string }).story_id === story.id),
    }));
  }, [stories, skus]);

  const unassignedSkus = useMemo(() => {
    return skus.filter(
      (sk) => !stories.some((st) => st.id === (sk as SKU & { story_id?: string }).story_id)
    );
  }, [skus, stories]);

  const activeStory = activeStoryId
    ? storiesWithSkus.find((s) => s.id === activeStoryId)
    : storiesWithSkus[0];

  const gensForStory = useMemo(() => {
    if (!activeStory) return [];
    const storySkuIds = activeStory.skus.map((s) => s.id);
    return generations.filter(
      (g) => g.story_id === activeStory.id || (g.input_data?.sku_id && storySkuIds.includes(g.input_data.sku_id as string))
    );
  }, [generations, activeStory]);

  const gensForSku = (skuId: string) =>
    generations.filter((g) => g.input_data?.sku_id === skuId);

  const totalVisuals = generations.filter(
    (g) => ['product_render', 'tryon', 'still_life'].includes(g.generation_type) && g.status === 'completed'
  ).length;

  /* ── Card (collapsed) ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <Camera className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.visualsLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.visualsTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.visualsDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {storiesLoading || gensLoading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : totalVisuals === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noVisualsYet}</p>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-2xl font-light text-carbon">{totalVisuals}</span>
              <span className="text-xs text-carbon/40">{t.marketingPage.visualsGenerated}</span>
              {generations.filter((g) => g.is_favorite).length > 0 && (
                <span className="text-xs text-carbon/30 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {generations.filter((g) => g.is_favorite).length} {t.marketingPage.favorites}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open}
        </div>
      </button>
    );
  }

  /* ── AI generation handler ── */

  const handleGenerate = async (sku: SKU, action: VisualAction, story?: Story) => {
    if (!user) return;
    setGenerating({ skuId: sku.id, action });
    setErrorMessage(null);

    try {
      const storyCtx = story
        ? {
            name: story.name,
            narrative: story.narrative,
            mood: story.mood,
            tone: story.tone,
            color_palette: story.color_palette,
          }
        : undefined;

      let endpoint = '';
      let body: Record<string, unknown> = {};
      let genType = '';
      let modelUsed = '';

      if (action === 'product-render') {
        // Product Render mirrors the design-phase 3D render flow.
        // If the SKU already has a photoreal 3D saved from the design phase,
        // reuse it (zero cost, zero divergence). Otherwise regenerate it via
        // /api/ai/colorize-sketch with is_3d_render:true — the SAME model
        // and prompt the design phase uses. Never a different model.
        const existing3d = sku.render_urls?.['3d'];
        if (existing3d) {
          await addGeneration({
            user_id: user.id,
            generation_type: 'product_render',
            prompt: `Product render (reused from design phase) for ${sku.name}`,
            input_data: {
              sku_id: sku.id,
              sku_name: sku.name,
              source: 'design_phase_reuse',
            },
            output_data: { images: [{ url: existing3d }] },
            provider_request_id: null,
            model_used: 'gpt-image-1.5',
            status: 'completed',
            is_favorite: false,
            story_id: story?.id || null,
          });
          refetchGens();
          return;
        }

        const sourceSketch = sku.render_url || sku.sketch_url;
        if (!sourceSketch) {
          throw new Error(
            'This SKU has no sketch or colorized render yet. Complete the design phase first.'
          );
        }
        endpoint = '/api/ai/colorize-sketch';
        body = {
          sketch_url: sourceSketch,
          is_3d_render: true,
          category: sku.category,
          product_name: sku.name,
          family: sku.family,
          collectionPlanId: sku.collection_plan_id,
        };
        genType = 'product_render';
        modelUsed = 'gpt-image-1.5';
      } else if (action === 'tryon') {
        // Virtual Try-On via Freepik Nano Banana multi-reference.
        // STRICT: product image must be the photoreal 3D render, not a
        // user-uploaded reference. Same reasoning as Still Life — Nano
        // Banana composites the reference as-is, so using anything less
        // than the 3D render produces visually weak results.
        const model = selectedModelId ? models.find((m) => m.id === selectedModelId) : models[0];
        if (!model?.reference_image_url) {
          throw new Error(
            'Select a brand model first (create one in the Brand Models library).'
          );
        }
        const productImage = sku.render_urls?.['3d'];
        if (!productImage) {
          throw new Error(
            'Try-On needs the photoreal 3D render of this SKU. Open the design phase, run the 3D render step, and try again.'
          );
        }
        endpoint = '/api/ai/freepik/tryon';
        body = {
          brand_model_url: model.reference_image_url,
          product_image_url: productImage,
          product_name: sku.name,
          category: sku.category,
          collectionPlanId: sku.collection_plan_id,
        };
        genType = 'tryon';
        modelUsed = 'freepik-nano-banana';
      } else if (action === 'still-life') {
        // Editorial still life via Freepik Nano Banana (Gemini 2.5 Flash Image).
        // STRICT: must use the photoreal 3D render from the design phase.
        // Using a user-uploaded reference image produces low-quality results
        // because Nano Banana composites the *reference* into the scene.
        // Falling back to reference_image_url or the flat colorized render
        // gives the "I see my reference picture in the new background"
        // failure mode. Require render_urls['3d'] and guide the user to
        // complete the design phase if it's missing.
        const productImage = sku.render_urls?.['3d'];
        if (!productImage) {
          throw new Error(
            'Still Life needs the photoreal 3D render of this SKU. Open the design phase, run the 3D render step, and try again.'
          );
        }
        endpoint = '/api/ai/freepik/still-life';
        body = {
          product_image_url: productImage,
          product_name: sku.name,
          category: sku.category,
          scene: selectedScene,
          story_context: storyCtx,
          collectionPlanId: sku.collection_plan_id,
        };
        genType = 'still_life';
        modelUsed = 'freepik-nano-banana';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();

      // Normalize response shape: colorize-sketch returns { imageUrl },
      // while other endpoints return { images: [{ url }] }.
      const images = data.images ?? (data.imageUrl ? [{ url: data.imageUrl }] : []);

      await addGeneration({
        user_id: user.id,
        generation_type: genType as AiGeneration['generation_type'],
        prompt: (body.prompt as string) || `${action} for ${sku.name}`,
        input_data: { sku_id: sku.id, sku_name: sku.name, scene: selectedScene, ...body },
        output_data: { images },
        provider_request_id: data.requestId || null,
        model_used: modelUsed,
        status: 'completed',
        is_favorite: false,
        story_id: story?.id || null,
      });

      refetchGens();
    } catch (err) {
      console.error('Generation error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  /* ── Expanded view ── */

  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 text-sm font-light text-carbon/60 hover:text-carbon transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.marketingPage.backToCreation}
          </button>
          <div className="text-center">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
              {t.marketingPage.visualsLabel}
            </p>
            <h2 className="text-lg font-light text-carbon tracking-tight">
              {t.marketingPage.visualsTitle}
            </h2>
          </div>
          <div className="w-32" />
        </div>

        {/* Story tabs */}
        {storiesWithSkus.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-1 overflow-x-auto">
            {storiesWithSkus.map((story) => (
              <button
                key={story.id}
                onClick={() => setActiveStoryId(story.id)}
                className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border transition-colors whitespace-nowrap ${
                  (activeStory?.id === story.id)
                    ? 'bg-carbon text-crema border-carbon'
                    : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                }`}
              >
                {story.name}
                <span className="ml-2 text-[10px] opacity-60">({story.skus.length})</span>
              </button>
            ))}
            {unassignedSkus.length > 0 && (
              <button
                onClick={() => setActiveStoryId('__unassigned__')}
                className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border transition-colors whitespace-nowrap ${
                  activeStoryId === '__unassigned__'
                    ? 'bg-carbon text-crema border-carbon'
                    : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                }`}
              >
                {t.marketingPage.unassigned}
                <span className="ml-2 text-[10px] opacity-60">({unassignedSkus.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error banner (e.g. "complete design phase first") */}
        {errorMessage && (
          <div className="mb-6 bg-amber-50 border border-amber-200/60 text-amber-900 px-4 py-3 text-xs font-light flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-amber-900/60 hover:text-amber-900 text-[10px] uppercase tracking-[0.1em]"
            >
              ×
            </button>
          </div>
        )}

        {/* Controls bar */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          {/* Scene selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">
              {t.marketingPage.scene}
            </label>
            <select
              value={selectedScene}
              onChange={(e) => setSelectedScene(e.target.value)}
              className="text-xs font-light text-carbon bg-white border border-carbon/[0.06] px-3 py-1.5 focus:outline-none focus:border-carbon/20"
            >
              {SCENE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model selector for try-on */}
          {models.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">
                <Users className="h-3 w-3 inline mr-1" />
                {t.marketingPage.model}
              </label>
              <select
                value={selectedModelId || models[0]?.id || ''}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="text-xs font-light text-carbon bg-white border border-carbon/[0.06] px-3 py-1.5 focus:outline-none focus:border-carbon/20"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Gallery count */}
          <div className="ml-auto text-xs font-light text-carbon/40">
            {totalVisuals} {t.marketingPage.visualsGenerated}
            {generations.filter((g) => g.is_favorite).length > 0 && (
              <span className="ml-2">
                · {generations.filter((g) => g.is_favorite).length} {t.marketingPage.favorites}
              </span>
            )}
          </div>
        </div>

        {/* No stories state */}
        {stories.length === 0 && !storiesLoading && (
          <div className="text-center py-20 text-carbon/30 text-sm font-light">
            {t.marketingPage.createStoriesFirst}
          </div>
        )}

        {/* SKU grid for active story */}
        {activeStory && activeStoryId !== '__unassigned__' && (
          <div className="space-y-4">
            {/* Story context banner */}
            <div className="bg-white border border-carbon/[0.06] p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-light text-carbon tracking-tight">{activeStory.name}</h3>
                  {activeStory.narrative && (
                    <p className="text-sm font-light text-carbon/50 mt-1 max-w-3xl leading-relaxed">
                      {activeStory.narrative}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 ml-4">
                  {activeStory.mood?.map((m) => (
                    <span key={m} className="text-[10px] tracking-[0.05em] uppercase bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* SKU rows */}
            {activeStory.skus.length === 0 ? (
              <div className="text-center py-12 text-carbon/25 text-sm font-light">
                {t.marketingPage.noSkusAssigned}
              </div>
            ) : (
              activeStory.skus.map((sku) => (
                <SkuVisualRow
                  key={sku.id}
                  sku={sku}
                  story={activeStory}
                  generations={gensForSku(sku.id)}
                  generating={generating}
                  onGenerate={(action) => handleGenerate(sku, action, activeStory)}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteGeneration}
                  isExpanded={expandedSkuId === sku.id}
                  onToggleExpand={() => setExpandedSkuId(expandedSkuId === sku.id ? null : sku.id)}
                  onLightbox={setLightboxUrl}
                />
              ))
            )}
          </div>
        )}

        {/* Unassigned SKUs */}
        {activeStoryId === '__unassigned__' && (
          <div className="space-y-4">
            <div className="bg-white border border-carbon/[0.06] p-5 mb-6">
              <h3 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.unassignedSkusTitle}</h3>
              <p className="text-sm font-light text-carbon/50 mt-1">
                {t.marketingPage.unassignedSkusDesc}
              </p>
            </div>
            {unassignedSkus.map((sku) => (
              <SkuVisualRow
                key={sku.id}
                sku={sku}
                generations={gensForSku(sku.id)}
                generating={generating}
                onGenerate={(action) => handleGenerate(sku, action)}
                onToggleFavorite={toggleFavorite}
                onDelete={deleteGeneration}
                isExpanded={expandedSkuId === sku.id}
                onToggleExpand={() => setExpandedSkuId(expandedSkuId === sku.id ? null : sku.id)}
                onLightbox={setLightboxUrl}
              />
            ))}
          </div>
        )}

        {/* Gallery section — all visuals for this story */}
        {activeStory && activeStoryId !== '__unassigned__' && gensForStory.length > 0 && (
          <div className="mt-12">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">
              {t.marketingPage.allVisuals} — {activeStory.name} ({gensForStory.length})
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {gensForStory
                .filter((g) => g.status === 'completed' && g.output_data?.images?.length)
                .flatMap((g) =>
                  (g.output_data?.images || []).map((img, i) => ({
                    genId: g.id,
                    url: img.url,
                    type: g.generation_type,
                    isFav: g.is_favorite,
                    skuName: g.input_data?.sku_name || '',
                    key: `${g.id}-${i}`,
                  }))
                )
                .map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setLightboxUrl(item.url)}
                    className="group relative aspect-square bg-carbon/[0.03] border border-carbon/[0.06] overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <img
                      src={item.url}
                      alt={item.skuName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-carbon/0 group-hover:bg-carbon/20 transition-colors" />
                    <div className="absolute top-1 left-1 flex gap-1">
                      <span className="text-[8px] font-medium tracking-wider uppercase bg-white/80 text-carbon/60 px-1.5 py-0.5">
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>
                    {item.isFav && (
                      <Star className="absolute top-1 right-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-carbon/80 flex items-center justify-center p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Visual preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

/* ── SKU Visual Row ── */

function SkuVisualRow({
  sku,
  story,
  generations,
  generating,
  onGenerate,
  onToggleFavorite,
  onDelete,
  isExpanded,
  onToggleExpand,
  onLightbox,
}: {
  sku: SKU;
  story?: Story;
  generations: AiGeneration[];
  generating: GeneratingState | null;
  onGenerate: (action: VisualAction) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLightbox: (url: string) => void;
}) {
  const t = useTranslation();
  const completedGens = generations.filter(
    (g) => g.status === 'completed' && g.output_data?.images?.length
  );
  const isGenerating = generating?.skuId === sku.id;

  // Thumbnail priority: 3D render > flat colored render > reference upload.
  // Using the 3D render as the primary thumb gives marketing a preview
  // aligned with what Still Life / Try-On will actually composite from.
  const thumbImage =
    sku.render_urls?.['3d'] || sku.render_url || sku.reference_image_url;

  // Still Life and Try-On require the 3D render. Disable the buttons
  // upfront when the SKU hasn't reached that step in the design phase
  // so the user isn't led into a failing flow by a clickable button.
  const hasRender3d = !!sku.render_urls?.['3d'];

  const ACTIONS: { id: VisualAction; labelKey: 'render' | 'onModel' | 'stillLife'; Icon: typeof Camera; descKey: 'studioProductShot' | 'virtualTryOn' | 'stillLifeScene' }[] = [
    { id: 'product-render', labelKey: 'render', Icon: ImageIcon, descKey: 'studioProductShot' },
    { id: 'tryon', labelKey: 'onModel', Icon: Shirt, descKey: 'virtualTryOn' },
    { id: 'still-life', labelKey: 'stillLife', Icon: Palmtree, descKey: 'stillLifeScene' },
  ];

  return (
    <div className="bg-white border border-carbon/[0.06] transition-all">
      {/* Collapsed row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-carbon/[0.01] transition-colors"
      >
        {/* Thumbnail */}
        <div className="w-14 h-14 bg-carbon/[0.03] border border-carbon/[0.06] flex-shrink-0 overflow-hidden">
          {thumbImage ? (
            <img src={thumbImage} alt={sku.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-5 w-5 text-carbon/15" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-light text-carbon tracking-tight truncate">{sku.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-carbon/30">{sku.family}</span>
            {sku.category && (
              <span className="text-[10px] text-carbon/20">· {sku.category}</span>
            )}
          </div>
        </div>

        {/* Mini gallery preview */}
        <div className="flex gap-1 mr-2">
          {completedGens.slice(0, 4).map((gen) => (
            <div
              key={gen.id}
              className="w-8 h-8 bg-carbon/[0.03] border border-carbon/[0.06] overflow-hidden"
            >
              {gen.output_data?.images?.[0] && (
                <img
                  src={gen.output_data.images[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
          {completedGens.length > 4 && (
            <div className="w-8 h-8 bg-carbon/[0.04] border border-carbon/[0.06] flex items-center justify-center text-[9px] text-carbon/40">
              +{completedGens.length - 4}
            </div>
          )}
        </div>

        <span className="text-xs text-carbon/30">{completedGens.length} {t.marketingPage.visuals}</span>

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-carbon/25 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-carbon/25 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-carbon/[0.06] p-5 space-y-5">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => {
              const loading = isGenerating && generating?.action === action.id;
              // Still Life + Try-On require the 3D render to exist.
              // Product Render itself can regenerate it on demand, so it
              // doesn't need the guard.
              const needs3d = (action.id === 'still-life' || action.id === 'tryon') && !hasRender3d;
              return (
                <button
                  key={action.id}
                  onClick={() => onGenerate(action.id)}
                  disabled={loading || isGenerating || needs3d}
                  className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/60 hover:text-carbon hover:border-carbon/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={needs3d ? 'Run the 3D render step in the design phase first.' : t.marketingPage[action.descKey]}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <action.Icon className="h-3.5 w-3.5" />
                  )}
                  {t.marketingPage[action.labelKey]}
                </button>
              );
            })}
          </div>

          {/* Generation results */}
          {completedGens.length === 0 && !isGenerating && (
            <p className="text-xs text-carbon/20 font-light">
              {t.marketingPage.noVisualsGenerate}
            </p>
          )}

          {completedGens.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {completedGens.flatMap((gen) =>
                (gen.output_data?.images || []).map((img, i) => (
                  <div
                    key={`${gen.id}-${i}`}
                    className="group relative aspect-square bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden"
                  >
                    <button
                      onClick={() => onLightbox(img.url)}
                      className="w-full h-full"
                    >
                      <img
                        src={img.url}
                        alt={sku.name}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-carbon/0 group-hover:bg-carbon/10 transition-colors pointer-events-none" />
                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[8px] font-medium tracking-wider uppercase bg-white/90 text-carbon/60 px-1.5 py-0.5">
                        {gen.generation_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onToggleFavorite(gen.id)}
                        className={`p-1 bg-white/90 hover:bg-white transition-colors ${
                          gen.is_favorite ? 'text-yellow-500' : 'text-carbon/30'
                        }`}
                      >
                        <Star className={`h-3 w-3 ${gen.is_favorite ? 'fill-yellow-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => onDelete(gen.id)}
                        className="p-1 bg-white/90 hover:bg-white text-carbon/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Loading indicator */}
          {isGenerating && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-carbon/40" />
              <p className="text-xs font-light text-carbon/40">
                {t.marketingPage.generating} {generating?.action?.replace('-', ' ')}...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
