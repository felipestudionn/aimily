'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Film,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  BookOpen,
  Video,
  Plus,
  Trash2,
  Star,
  Loader2,
  X,
  Play,
  GripVertical,
  Layout,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStories, type Story } from '@/hooks/useStories';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import { useLookbookPages } from '@/hooks/useLookbookPages';
import type { AiGeneration, LookbookLayout, LookbookPage } from '@/types/studio';
import { MOTION_TYPES } from '@/types/studio';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── Types ── */

type CampaignTab = 'lookbook' | 'editorial' | 'video';

interface GeneratingState {
  type: 'editorial' | 'video';
  skuId?: string;
}

/* ── Layout configs ── */

const LAYOUT_OPTIONS: { id: LookbookLayout; label: string; desc: string }[] = [
  { id: 'cover', label: 'Cover', desc: 'Title page' },
  { id: 'full_bleed', label: 'Full Bleed', desc: 'Full image page' },
  { id: 'two_column', label: 'Two Column', desc: 'Side by side' },
  { id: 'grid_4', label: 'Grid 4', desc: '2x2 grid' },
  { id: 'text_image', label: 'Text + Image', desc: 'Copy with visual' },
  { id: 'quote', label: 'Quote', desc: 'Pull quote page' },
];

/* ── Props ── */

interface CampaignVideoCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function CampaignVideoCard({ collectionPlanId }: CampaignVideoCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
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

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<CampaignTab>('lookbook');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<GeneratingState | null>(null);
  const [selectedMotion, setSelectedMotion] = useState('subtle');
  const [editorialPrompt, setEditorialPrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  /* ── Lookbook pages for active story ── */
  const activeStoryForLookbook = activeStoryId || stories[0]?.id || undefined;
  const {
    pages: lookbookPages,
    loading: pagesLoading,
    addPage,
    updatePage,
    deletePage,
  } = useLookbookPages(collectionPlanId, undefined, activeStoryForLookbook);

  /* ── Derived ── */

  const storiesWithSkus = useMemo(() => {
    return stories.map((story) => ({
      ...story,
      skus: skus.filter((sk) => (sk as SKU & { story_id?: string }).story_id === story.id),
    }));
  }, [stories, skus]);

  const activeStory = activeStoryId
    ? storiesWithSkus.find((s) => s.id === activeStoryId)
    : storiesWithSkus[0];

  // Editorial = generation_type 'editorial', Video = 'video'
  const editorialGens = useMemo(() => {
    return generations.filter(
      (g) => g.generation_type === 'editorial' && g.status === 'completed' &&
        (activeStory ? g.story_id === activeStory.id : true)
    );
  }, [generations, activeStory]);

  const videoGens = useMemo(() => {
    return generations.filter(
      (g) => g.generation_type === 'video' && g.status === 'completed' &&
        (activeStory ? g.story_id === activeStory.id : true)
    );
  }, [generations, activeStory]);

  // Favorite visuals from ProductVisualsCard (for lookbook use)
  const favoriteVisuals = useMemo(() => {
    return generations.filter(
      (g) =>
        ['product_render', 'tryon', 'lifestyle'].includes(g.generation_type) &&
        g.status === 'completed' &&
        g.is_favorite &&
        (activeStory ? g.story_id === activeStory.id || g.input_data?.sku_id && activeStory.skus.some(s => s.id === g.input_data?.sku_id) : true)
    );
  }, [generations, activeStory]);

  const totalContent = editorialGens.length + videoGens.length + lookbookPages.length;

  /* ── Card (collapsed) ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <Film className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.campaignLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.campaignTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.campaignDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {storiesLoading || gensLoading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : totalContent === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noContentYet}</p>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-2xl font-light text-carbon">{totalContent}</span>
              <span className="text-xs text-carbon/40">{t.marketingPage.assetsCreated}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open}
        </div>
      </button>
    );
  }

  /* ── Handlers ── */

  const storyContext = (story?: Story) =>
    story
      ? {
          name: story.name,
          narrative: story.narrative,
          mood: story.mood,
          tone: story.tone,
          color_palette: story.color_palette,
        }
      : undefined;

  const handleEditorialGenerate = async (sourceImageUrl: string, skuName?: string) => {
    if (!user) return;
    setGenerating({ type: 'editorial' });

    try {
      const story = activeStory;
      const storyCtx = storyContext(story);

      const promptParts = [
        `High-end fashion editorial photograph`,
        story ? `for "${story.name}" story` : '',
        story?.narrative ? `— ${story.narrative}` : '',
        story?.mood?.length ? `Visual mood: ${story.mood.join(', ')}` : '',
        story?.color_palette?.length ? `Color world: ${story.color_palette.join(', ')}` : '',
        editorialPrompt ? `Art direction: ${editorialPrompt}` : '',
        'Editorial quality, magazine cover worthy, dramatic lighting.',
      ].filter(Boolean).join('. ');

      const res = await fetch('/api/ai/fal/product-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: sourceImageUrl,
          prompt: promptParts,
          background: 'editorial-studio',
          story_context: storyCtx,
          language,
        }),
      });

      if (!res.ok) throw new Error('Editorial generation failed');
      const data = await res.json();

      await addGeneration({
        user_id: user.id,
        generation_type: 'editorial',
        prompt: promptParts,
        input_data: {
          source_image: sourceImageUrl,
          sku_name: skuName,
          extra_prompt: editorialPrompt,
        },
        output_data: { images: data.images || [] },
        fal_request_id: data.requestId || null,
        model_used: 'flux-2-pro',
        status: 'completed',
        is_favorite: false,
        story_id: story?.id || null,
      });

      refetchGens();
      setEditorialPrompt('');
    } catch (err) {
      console.error('Editorial generation error:', err);
    } finally {
      setGenerating(null);
    }
  };

  const handleVideoGenerate = async (sourceImageUrl: string, skuName?: string) => {
    if (!user) return;
    setGenerating({ type: 'video' });

    try {
      const story = activeStory;
      const storyCtx = storyContext(story);

      const res = await fetch('/api/ai/fal/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: sourceImageUrl,
          motion_type: selectedMotion,
          prompt: videoPrompt || undefined,
          story_context: storyCtx,
          language,
        }),
      });

      if (!res.ok) throw new Error('Video generation failed');
      const data = await res.json();

      await addGeneration({
        user_id: user.id,
        generation_type: 'video',
        prompt: videoPrompt || `Video ${selectedMotion} for ${skuName || 'editorial'}`,
        input_data: {
          source_image: sourceImageUrl,
          sku_name: skuName,
          motion_type: selectedMotion,
        },
        output_data: { video_url: data.video_url },
        fal_request_id: data.requestId || null,
        model_used: 'kling-3.0',
        status: 'completed',
        is_favorite: false,
        story_id: story?.id || null,
      });

      refetchGens();
      setVideoPrompt('');
    } catch (err) {
      console.error('Video generation error:', err);
    } finally {
      setGenerating(null);
    }
  };

  const handleAddLookbookPage = async (layout: LookbookLayout) => {
    await addPage({
      layout_type: layout,
      story_id: activeStory?.id || null,
      lookbook_name: activeStory?.name || 'Main Lookbook',
      content: [],
    });
  };

  /* ── TABS ── */

  const TABS: { id: CampaignTab; labelKey: 'lookbook' | 'editorial' | 'video'; Icon: typeof Film }[] = [
    { id: 'lookbook', labelKey: 'lookbook', Icon: BookOpen },
    { id: 'editorial', labelKey: 'editorial', Icon: ImageIcon },
    { id: 'video', labelKey: 'video', Icon: Video },
  ];

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
              {t.marketingPage.campaignLabel}
            </p>
            <h2 className="text-lg font-light text-carbon tracking-tight">
              {t.marketingPage.campaignTitle}
            </h2>
          </div>
          <div className="w-32" />
        </div>

        {/* Content tabs */}
        <div className="max-w-7xl mx-auto px-6 pb-2 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border transition-colors ${
                activeTab === tab.id
                  ? 'bg-carbon text-crema border-carbon'
                  : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
              }`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {t.marketingPage[tab.labelKey]}
            </button>
          ))}
        </div>

        {/* Story tabs */}
        {storiesWithSkus.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-1 overflow-x-auto">
            {storiesWithSkus.map((story) => (
              <button
                key={story.id}
                onClick={() => setActiveStoryId(story.id)}
                className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border transition-colors whitespace-nowrap ${
                  activeStory?.id === story.id
                    ? 'bg-carbon text-crema border-carbon'
                    : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                }`}
              >
                {story.name}
                <span className="ml-2 text-[10px] opacity-60">({story.skus.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* No stories state */}
        {stories.length === 0 && !storiesLoading && (
          <div className="text-center py-20 text-carbon/30 text-sm font-light">
            {t.marketingPage.createStoriesCampaign}
          </div>
        )}

        {/* Story context banner */}
        {activeStory && (
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
        )}

        {/* ═══ LOOKBOOK TAB ═══ */}
        {activeTab === 'lookbook' && (
          <LookbookTab
            pages={lookbookPages}
            loading={pagesLoading}
            favoriteVisuals={favoriteVisuals}
            onAddPage={handleAddLookbookPage}
            onUpdatePage={updatePage}
            onDeletePage={deletePage}
            onLightbox={setLightboxUrl}
          />
        )}

        {/* ═══ EDITORIAL TAB ═══ */}
        {activeTab === 'editorial' && (
          <EditorialTab
            generations={editorialGens}
            favoriteVisuals={favoriteVisuals}
            generating={generating?.type === 'editorial'}
            prompt={editorialPrompt}
            onPromptChange={setEditorialPrompt}
            onGenerate={handleEditorialGenerate}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteGeneration}
            onLightbox={setLightboxUrl}
            fileInputRef={fileInputRef}
          />
        )}

        {/* ═══ VIDEO TAB ═══ */}
        {activeTab === 'video' && (
          <VideoTab
            generations={videoGens}
            favoriteVisuals={favoriteVisuals}
            generating={generating?.type === 'video'}
            selectedMotion={selectedMotion}
            onMotionChange={setSelectedMotion}
            prompt={videoPrompt}
            onPromptChange={setVideoPrompt}
            onGenerate={handleVideoGenerate}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteGeneration}
            onVideoPreview={setVideoPreviewUrl}
            videoInputRef={videoInputRef}
          />
        )}
      </div>

      {/* Lightbox (images) */}
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
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video preview modal */}
      {videoPreviewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-carbon/80 flex items-center justify-center p-8"
          onClick={() => setVideoPreviewUrl(null)}
        >
          <button
            onClick={() => setVideoPreviewUrl(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <video
            src={videoPreviewUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
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

/* ── LOOKBOOK TAB ── */

function LookbookTab({
  pages,
  loading,
  favoriteVisuals,
  onAddPage,
  onUpdatePage,
  onDeletePage,
  onLightbox,
}: {
  pages: LookbookPage[];
  loading: boolean;
  favoriteVisuals: AiGeneration[];
  onAddPage: (layout: LookbookLayout) => void;
  onUpdatePage: (id: string, updates: Partial<LookbookPage>) => Promise<LookbookPage | null>;
  onDeletePage: (id: string) => Promise<boolean>;
  onLightbox: (url: string) => void;
}) {
  const t = useTranslation();
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [assigningPageId, setAssigningPageId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header + Add page */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">
            {t.marketingPage.lookbook}
          </p>
          <p className="text-sm font-light text-carbon/50">
            {pages.length} page{pages.length !== 1 ? 's' : ''} · {favoriteVisuals.length} {t.marketingPage.favoriteVisualsAvailable}
          </p>
        </div>
        <button
          onClick={() => setShowLayoutPicker(!showLayoutPicker)}
          className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/60 hover:text-carbon hover:border-carbon/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.marketingPage.addPage}
        </button>
      </div>

      {/* Layout picker */}
      {showLayoutPicker && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {LAYOUT_OPTIONS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => {
                onAddPage(layout.id);
                setShowLayoutPicker(false);
              }}
              className="bg-white border border-carbon/[0.06] p-4 text-center hover:border-carbon/20 transition-colors"
            >
              <Layout className="h-5 w-5 text-carbon/30 mx-auto mb-2" />
              <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/60">{layout.label}</p>
              <p className="text-[9px] text-carbon/30 mt-0.5">{layout.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Pages list */}
      {loading ? (
        <div className="text-center py-12 text-carbon/30 text-sm font-light">{t.marketingPage.loadingPages}</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 text-carbon/25 text-sm font-light">
          {t.marketingPage.noLookbookPages}
        </div>
      ) : (
        <div className="space-y-4">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              className="bg-white border border-carbon/[0.06] p-5 flex items-start gap-4"
            >
              {/* Page number + drag */}
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                <GripVertical className="h-4 w-4 text-carbon/15 cursor-grab" />
                <span className="text-lg font-light text-carbon/30 w-8 text-center">{idx + 1}</span>
              </div>

              {/* Layout preview */}
              <div className="w-24 h-32 bg-carbon/[0.03] border border-carbon/[0.06] flex-shrink-0 flex items-center justify-center">
                {page.content.length > 0 && page.content[0]?.asset_url ? (
                  <img
                    src={page.content[0].asset_url}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => page.content[0]?.asset_url && onLightbox(page.content[0].asset_url)}
                  />
                ) : (
                  <div className="text-center">
                    <Layout className="h-5 w-5 text-carbon/15 mx-auto" />
                    <p className="text-[8px] text-carbon/20 mt-1 uppercase tracking-wider">
                      {page.layout_type.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Page info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40">
                    {page.layout_type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-carbon/20">
                    · {page.content.length} item{page.content.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Assign visuals button */}
                <button
                  onClick={() => setAssigningPageId(assigningPageId === page.id ? null : page.id)}
                  className="text-[11px] font-medium text-carbon/40 hover:text-carbon/70 transition-colors flex items-center gap-1"
                >
                  <ImageIcon className="h-3 w-3" />
                  {assigningPageId === page.id ? t.marketingPage.close : t.marketingPage.assignVisuals}
                </button>

                {/* Visual assignment grid */}
                {assigningPageId === page.id && favoriteVisuals.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {favoriteVisuals
                      .filter((g) => g.output_data?.images?.length)
                      .flatMap((g) =>
                        (g.output_data?.images || []).map((img, i) => ({
                          genId: g.id,
                          url: img.url,
                          type: g.generation_type,
                          key: `${g.id}-${i}`,
                        }))
                      )
                      .map((item) => (
                        <button
                          key={item.key}
                          onClick={async () => {
                            const newContent = [
                              ...page.content,
                              {
                                type: 'image' as const,
                                asset_url: item.url,
                                position: { x: 0, y: 0 },
                                size: { width: 100, height: 100 },
                              },
                            ];
                            await onUpdatePage(page.id, { content: newContent });
                            setAssigningPageId(null);
                          }}
                          className="aspect-square bg-carbon/[0.03] border border-carbon/[0.06] overflow-hidden hover:border-carbon/20 transition-colors"
                        >
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                  </div>
                )}
                {assigningPageId === page.id && favoriteVisuals.length === 0 && (
                  <p className="mt-3 text-xs text-carbon/25 font-light">
                    {t.marketingPage.noFavoriteVisuals}
                  </p>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => onDeletePage(page.id)}
                className="p-2 text-carbon/20 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── EDITORIAL TAB ── */

function EditorialTab({
  generations,
  favoriteVisuals,
  generating,
  prompt,
  onPromptChange,
  onGenerate,
  onToggleFavorite,
  onDelete,
  onLightbox,
  fileInputRef,
}: {
  generations: AiGeneration[];
  favoriteVisuals: AiGeneration[];
  generating: boolean;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: (imageUrl: string, skuName?: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onLightbox: (url: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslation();
  const [selectedSourceIdx, setSelectedSourceIdx] = useState<number | null>(null);

  // Source images: favorite visuals from ProductVisualsCard
  const sourceImages = useMemo(() => {
    return favoriteVisuals
      .filter((g) => g.output_data?.images?.length)
      .flatMap((g) =>
        (g.output_data?.images || []).map((img, i) => ({
          url: img.url,
          skuName: (g.input_data?.sku_name as string) || '',
          key: `${g.id}-${i}`,
        }))
      );
  }, [favoriteVisuals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">
          {t.marketingPage.editorialShoots}
        </p>
        <p className="text-sm font-light text-carbon/50">
          {t.marketingPage.editorialDesc}
        </p>
      </div>

      {/* Source image selection */}
      <div>
        <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-3">
          {t.marketingPage.selectSourceImage}
        </p>
        {sourceImages.length === 0 ? (
          <p className="text-xs text-carbon/25 font-light py-4">
            {t.marketingPage.starVisualsFirst}
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {sourceImages.map((img, idx) => (
              <button
                key={img.key}
                onClick={() => setSelectedSourceIdx(idx)}
                className={`aspect-square border overflow-hidden transition-all ${
                  selectedSourceIdx === idx
                    ? 'border-carbon border-2 shadow-md'
                    : 'border-carbon/[0.06] hover:border-carbon/20'
                }`}
              >
                <img src={img.url} alt={img.skuName} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Art direction prompt */}
      <div>
        <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 block mb-2">
          {t.marketingPage.artDirection}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={t.marketingPage.artDirectionPlaceholder}
          className="w-full text-sm font-light text-carbon bg-white border border-carbon/[0.06] px-4 py-3 focus:outline-none focus:border-carbon/20 resize-none h-20"
        />
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (selectedSourceIdx !== null && sourceImages[selectedSourceIdx]) {
              onGenerate(sourceImages[selectedSourceIdx].url, sourceImages[selectedSourceIdx].skuName);
            }
          }}
          disabled={generating || selectedSourceIdx === null}
          className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.1em] bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          {t.marketingPage.generateEditorial}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50 hover:text-carbon hover:border-carbon/20 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          {t.marketingPage.uploadPhoto}
        </button>

        {generating && (
          <span className="text-xs font-light text-carbon/40 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.marketingPage.generatingEditorial}
          </span>
        )}
      </div>

      {/* Results gallery */}
      {generations.length > 0 && (
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">
            {t.marketingPage.editorialGallery} ({generations.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generations
              .filter((g) => g.output_data?.images?.length)
              .flatMap((g) =>
                (g.output_data?.images || []).map((img, i) => ({
                  genId: g.id,
                  url: img.url,
                  isFav: g.is_favorite,
                  key: `${g.id}-${i}`,
                }))
              )
              .map((item) => (
                <div
                  key={item.key}
                  className="group relative aspect-[3/4] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden"
                >
                  <button
                    onClick={() => onLightbox(item.url)}
                    className="w-full h-full"
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </button>
                  <div className="absolute inset-0 bg-carbon/0 group-hover:bg-carbon/10 transition-colors pointer-events-none" />
                  <div className="absolute top-1.5 left-1.5">
                    <span className="text-[8px] font-medium tracking-wider uppercase bg-white/90 text-carbon/60 px-1.5 py-0.5">
                      editorial
                    </span>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onToggleFavorite(item.genId)}
                      className={`p-1 bg-white/90 hover:bg-white transition-colors ${
                        item.isFav ? 'text-yellow-500' : 'text-carbon/30'
                      }`}
                    >
                      <Star className={`h-3 w-3 ${item.isFav ? 'fill-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => onDelete(item.genId)}
                      className="p-1 bg-white/90 hover:bg-white text-carbon/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {generations.length === 0 && !generating && (
        <div className="text-center py-12 text-carbon/20 text-sm font-light">
          {t.marketingPage.noEditorialShots}
        </div>
      )}
    </div>
  );
}

/* ── VIDEO TAB ── */

function VideoTab({
  generations,
  favoriteVisuals,
  generating,
  selectedMotion,
  onMotionChange,
  prompt,
  onPromptChange,
  onGenerate,
  onToggleFavorite,
  onDelete,
  onVideoPreview,
  videoInputRef,
}: {
  generations: AiGeneration[];
  favoriteVisuals: AiGeneration[];
  generating: boolean;
  selectedMotion: string;
  onMotionChange: (v: string) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: (imageUrl: string, skuName?: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onVideoPreview: (url: string) => void;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslation();
  const [selectedSourceIdx, setSelectedSourceIdx] = useState<number | null>(null);

  const sourceImages = useMemo(() => {
    return favoriteVisuals
      .filter((g) => g.output_data?.images?.length)
      .flatMap((g) =>
        (g.output_data?.images || []).map((img, i) => ({
          url: img.url,
          skuName: (g.input_data?.sku_name as string) || '',
          key: `${g.id}-${i}`,
        }))
      );
  }, [favoriteVisuals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">
          {t.marketingPage.videoContent}
        </p>
        <p className="text-sm font-light text-carbon/50">
          {t.marketingPage.videoDesc}
        </p>
      </div>

      {/* Source image selection */}
      <div>
        <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-3">
          {t.marketingPage.selectSourceImage}
        </p>
        {sourceImages.length === 0 ? (
          <p className="text-xs text-carbon/25 font-light py-4">
            {t.marketingPage.starVisualsVideo}
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {sourceImages.map((img, idx) => (
              <button
                key={img.key}
                onClick={() => setSelectedSourceIdx(idx)}
                className={`aspect-square border overflow-hidden transition-all ${
                  selectedSourceIdx === idx
                    ? 'border-carbon border-2 shadow-md'
                    : 'border-carbon/[0.06] hover:border-carbon/20'
                }`}
              >
                <img src={img.url} alt={img.skuName} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Motion type */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">
            {t.marketingPage.motion}
          </label>
          <select
            value={selectedMotion}
            onChange={(e) => onMotionChange(e.target.value)}
            className="text-xs font-light text-carbon bg-white border border-carbon/[0.06] px-3 py-1.5 focus:outline-none focus:border-carbon/20"
          >
            {MOTION_TYPES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Direction prompt */}
      <div>
        <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 block mb-2">
          {t.marketingPage.direction}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={t.marketingPage.directionPlaceholder}
          className="w-full text-sm font-light text-carbon bg-white border border-carbon/[0.06] px-4 py-3 focus:outline-none focus:border-carbon/20 resize-none h-20"
        />
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (selectedSourceIdx !== null && sourceImages[selectedSourceIdx]) {
              onGenerate(sourceImages[selectedSourceIdx].url, sourceImages[selectedSourceIdx].skuName);
            }
          }}
          disabled={generating || selectedSourceIdx === null}
          className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.1em] bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          {t.marketingPage.generateVideo}
        </button>

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
        />
        <button
          onClick={() => videoInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50 hover:text-carbon hover:border-carbon/20 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          {t.marketingPage.uploadVideo}
        </button>

        {generating && (
          <span className="text-xs font-light text-carbon/40 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.marketingPage.generatingVideo}
          </span>
        )}
      </div>

      {/* Results gallery */}
      {generations.length > 0 && (
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">
            {t.marketingPage.videos} ({generations.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generations.map((gen) => {
              const videoUrl = gen.output_data?.video_url;
              const thumbUrl = gen.output_data?.images?.[0]?.url || gen.input_data?.source_image as string;

              return (
                <div
                  key={gen.id}
                  className="group relative aspect-[9/16] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden"
                >
                  <button
                    onClick={() => videoUrl && onVideoPreview(videoUrl)}
                    className="w-full h-full relative"
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-carbon/[0.04]">
                        <Video className="h-8 w-8 text-carbon/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/80 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <Play className="h-5 w-5 text-carbon ml-0.5" />
                      </div>
                    </div>
                  </button>

                  <div className="absolute top-1.5 left-1.5">
                    <span className="text-[8px] font-medium tracking-wider uppercase bg-white/90 text-carbon/60 px-1.5 py-0.5">
                      {gen.input_data?.motion_type || 'video'}
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
              );
            })}
          </div>
        </div>
      )}

      {generations.length === 0 && !generating && (
        <div className="text-center py-12 text-carbon/20 text-sm font-light">
          {t.marketingPage.noVideosYet}
        </div>
      )}
    </div>
  );
}
