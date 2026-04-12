'use client';

import { useState, useMemo } from 'react';
import {
  Palette,
  ChevronLeft,
  Search,
  Camera,
  Loader2,
  X,
} from 'lucide-react';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useStories } from '@/hooks/useStories';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import { useTranslation } from '@/i18n';
import { ContentEvolutionStrip } from './ContentEvolutionStrip';

/* ── Props ── */

interface ContentStudioCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function ContentStudioCard({ collectionPlanId }: ContentStudioCardProps) {
  const t = useTranslation();
  const { skus, loading: skusLoading } = useSkus(collectionPlanId);
  const { stories } = useStories(collectionPlanId);
  const {
    generations,
    loading: gensLoading,
    toggleFavorite,
    deleteGeneration,
    refetch: refetchGenerations,
  } = useAiGenerations(collectionPlanId);

  const [expanded, setExpanded] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ── Derived ── */
  const filteredSkus = useMemo(() => {
    let result = skus;
    if (categoryFilter !== 'ALL') {
      result = result.filter((s) => s.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.family.toLowerCase().includes(q)
      );
    }
    return result;
  }, [skus, categoryFilter, searchQuery]);

  const selectedSku = selectedSkuId
    ? skus.find((s) => s.id === selectedSkuId)
    : null;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(skus.map((s) => s.category)));
    return cats.sort();
  }, [skus]);

  // Content stats
  const contentStats = useMemo(() => {
    const visual = generations.filter(
      (g) =>
        ['product_render', 'still_life', 'editorial', 'tryon', 'video'].includes(g.generation_type) &&
        g.status === 'completed'
    );
    return {
      total: visual.length,
      ecommerce: visual.filter((g) => g.generation_type === 'product_render').length,
      stillLife: visual.filter((g) => g.generation_type === 'still_life').length,
      editorial: visual.filter((g) => g.generation_type === 'editorial').length,
      video: visual.filter((g) => g.generation_type === 'video').length,
    };
  }, [generations]);

  // Get story name for a SKU
  const storyNameForSku = (sku: SKU) => {
    const storyId = (sku as SKU & { story_id?: string }).story_id;
    if (!storyId) return null;
    return stories.find((s) => s.id === storyId)?.name || null;
  };

  // Per-SKU content level status dots
  const skuContentStatus = (sku: SKU) => {
    const has3d = !!sku.render_urls?.['3d'];
    const skuGens = generations.filter(
      (g) => g.input_data?.sku_id === sku.id && g.status === 'completed'
    );
    return {
      ecommerce: has3d,
      stillLife: skuGens.some((g) => g.generation_type === 'still_life'),
      editorial: skuGens.some((g) => g.generation_type === 'editorial'),
      campaign: false,
    };
  };

  const handleToggleFavorite = async (id: string) => {
    setErrorMessage(null);
    try { await toggleFavorite(id); }
    catch (err) { setErrorMessage(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDeleteGeneration = async (id: string) => {
    setErrorMessage(null);
    try { await deleteGeneration(id); }
    catch (err) { setErrorMessage(err instanceof Error ? err.message : 'Failed'); }
  };

  const loading = skusLoading || gensLoading;

  /* ── Collapsed card ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <Palette className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.contentStudioLabel || 'CONTENT'}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.contentStudioTitle || 'Content Studio'}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.contentStudioDesc || 'Visual content pipeline per SKU: e-commerce packshots, still life, editorial lookbook, and campaign shoots.'}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {loading ? (
            <p className="text-xs text-carbon/30">{t.common?.loading || 'Loading...'}</p>
          ) : contentStats.total > 0 ? (
            <div className="flex items-center gap-4">
              <span className="text-2xl font-light text-carbon">{contentStats.total}</span>
              <span className="text-xs text-carbon/40">{t.marketingPage.assetsCreated || 'assets created'}</span>
            </div>
          ) : (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noContentYet || 'No content yet'}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open || 'OPEN'}
        </div>
      </button>
    );
  }

  /* ── Expanded view ── */
  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 text-sm font-light text-carbon/60 hover:text-carbon transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.marketingPage.backToCreation || 'Back'}
          </button>
          <div className="text-center">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
              {t.marketingPage.contentStudioLabel || 'CONTENT'}
            </p>
            <h2 className="text-lg font-light text-carbon tracking-tight">
              {t.marketingPage.contentStudioTitle || 'Content Studio'}
            </h2>
          </div>
          <div className="w-32" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error banner */}
        {errorMessage && (
          <div className="mb-6 bg-amber-50 border border-amber-200/60 text-amber-900 px-4 py-3 text-xs font-light flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-amber-900/60 hover:text-amber-900 text-[10px] uppercase tracking-[0.1em]">×</button>
          </div>
        )}

        <div className="flex gap-6">
          {/* ── SKU List (left sidebar) ── */}
          <div className="w-72 flex-shrink-0">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-carbon/25" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.marketingPage.searchSkus || 'Search SKUs...'}
                className="w-full pl-9 pr-3 py-2 text-xs font-light text-carbon bg-white border border-carbon/[0.06] focus:outline-none focus:border-carbon/20"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-1 mb-3 flex-wrap">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] border transition-colors ${
                  categoryFilter === 'ALL'
                    ? 'bg-carbon text-crema border-carbon'
                    : 'bg-white text-carbon/40 border-carbon/[0.06] hover:text-carbon/70'
                }`}
              >
                {t.common?.all || 'All'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] border transition-colors ${
                    categoryFilter === cat
                      ? 'bg-carbon text-crema border-carbon'
                      : 'bg-white text-carbon/40 border-carbon/[0.06] hover:text-carbon/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* SKU list */}
            <div className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto">
              {filteredSkus.map((sku) => {
                const status = skuContentStatus(sku);
                const storyName = storyNameForSku(sku);
                const isSelected = selectedSkuId === sku.id;
                const thumb = sku.render_urls?.['3d'] || sku.render_url || sku.reference_image_url;

                return (
                  <button
                    key={sku.id}
                    onClick={() => setSelectedSkuId(sku.id)}
                    className={`w-full flex items-center gap-3 p-2.5 border transition-all text-left ${
                      isSelected
                        ? 'bg-carbon/[0.04] border-carbon/20'
                        : 'bg-white border-carbon/[0.06] hover:border-carbon/15'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 bg-carbon/[0.03] border border-carbon/[0.04] flex-shrink-0 overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={sku.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-full h-full p-2 text-carbon/10" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-light text-carbon truncate">{sku.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] text-carbon/25 uppercase tracking-wider">{sku.category}</span>
                        {storyName && (
                          <span className="text-[8px] text-carbon/20 italic truncate">{storyName}</span>
                        )}
                      </div>
                    </div>

                    {/* Status dots (4 levels) */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${status.ecommerce ? 'bg-carbon' : 'bg-carbon/10'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${status.stillLife ? 'bg-carbon' : 'bg-carbon/10'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${status.editorial ? 'bg-carbon' : 'bg-carbon/10'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${status.campaign ? 'bg-carbon' : 'bg-carbon/10'}`} />
                    </div>
                  </button>
                );
              })}

              {filteredSkus.length === 0 && !loading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">
                  {t.marketingPage.noSkusFound || 'No SKUs found'}
                </p>
              )}
            </div>
          </div>

          {/* ── Content area (right) ── */}
          <div className="flex-1 min-w-0">
            {selectedSku ? (
              <div className="space-y-4">
                {/* SKU header */}
                <div className="flex items-center gap-4 mb-2">
                  {selectedSku.render_urls?.['3d'] && (
                    <div className="w-16 h-16 bg-white border border-carbon/[0.06] overflow-hidden flex-shrink-0">
                      <img src={selectedSku.render_urls['3d']} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-light text-carbon tracking-tight">{selectedSku.name}</h3>
                    <p className="text-[10px] text-carbon/30 uppercase tracking-wider">
                      {selectedSku.category} · {selectedSku.family} · €{selectedSku.pvp}
                    </p>
                  </div>
                </div>

                {/* Evolution Strip */}
                <ContentEvolutionStrip
                  sku={selectedSku}
                  collectionPlanId={collectionPlanId}
                  generations={generations}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteGeneration={handleDeleteGeneration}
                  onLightbox={setLightboxUrl}
                  onError={setErrorMessage}
                  onRefetchGenerations={refetchGenerations}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-carbon/20 text-sm font-light">
                {t.marketingPage.selectSkuPrompt || 'Select a SKU from the list to view its content pipeline'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-carbon/80 flex items-center justify-center p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <button onClick={() => setLightboxUrl(null)} className="absolute top-6 right-6 text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
