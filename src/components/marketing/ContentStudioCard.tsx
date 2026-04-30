'use client';

import { useState, useMemo } from 'react';
import { Search, Camera, X } from 'lucide-react';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useStories } from '@/hooks/useStories';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import { useTranslation } from '@/i18n';
import { ContentEvolutionStrip } from './ContentEvolutionStrip';

/* ═══════════════════════════════════════════════════════════
   Content Studio — gold-standard hub for per-SKU visual content
   pipeline. Two-column layout: SKU library on the left, content
   detail on the right. Renders inside the sidebar-driven page
   shell (no internal modal / back button — the page header is
   provided by MarketingCreationScreen).
   ═══════════════════════════════════════════════════════════ */

interface ContentStudioCardProps {
  collectionPlanId: string;
}

export function ContentStudioCard({ collectionPlanId }: ContentStudioCardProps) {
  const t = useTranslation();
  const m = (t as unknown as { marketingPage?: Record<string, string> }).marketingPage || {};
  const { skus, loading: skusLoading } = useSkus(collectionPlanId);
  const { stories } = useStories(collectionPlanId);
  const {
    generations,
    loading: gensLoading,
    toggleFavorite,
    deleteGeneration,
    refetch: refetchGenerations,
  } = useAiGenerations(collectionPlanId);

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

  // Auto-select the first SKU in the list once the data lands so the user
  // doesn't see an empty right pane on entry.
  const effectiveSelectedSkuId =
    selectedSkuId ?? (filteredSkus[0]?.id || null);
  const selectedSku = effectiveSelectedSkuId
    ? skus.find((s) => s.id === effectiveSelectedSkuId) || null
    : null;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(skus.map((s) => s.category)));
    return cats.sort();
  }, [skus]);

  const storyNameForSku = (sku: SKU) => {
    const storyId = (sku as SKU & { story_id?: string }).story_id;
    if (!storyId) return null;
    return stories.find((s) => s.id === storyId)?.name || null;
  };

  // 4-level content readiness used to render the dot strip on each SKU card.
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

  return (
    <div className="space-y-5">
      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-[16px] bg-[#A0463C]/[0.04] border border-[#A0463C]/20">
          <span className="text-[12px] text-[#A0463C] font-medium">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#A0463C]/60 hover:text-[#A0463C] transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* ═══ SKU Library (left) ═══ */}
        <aside className="bg-white rounded-[20px] p-5 space-y-4 sticky top-24 max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon/30 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={m.searchSkus || 'Search SKUs…'}
              className="w-full pl-11 pr-4 py-3 text-[13px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:outline-none focus:border-carbon/20 transition-colors placeholder:text-carbon/30"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                categoryFilter === 'ALL'
                  ? 'bg-carbon text-white'
                  : 'bg-carbon/[0.04] text-carbon/55 hover:bg-carbon/[0.08]'
              }`}
            >
              {(t as unknown as { common?: { all?: string } }).common?.all || 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                  categoryFilter === cat
                    ? 'bg-carbon text-white'
                    : 'bg-carbon/[0.04] text-carbon/55 hover:bg-carbon/[0.08]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* SKU list */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1.5 pb-1">
            {loading && filteredSkus.length === 0 && (
              <p className="text-[12px] text-carbon/30 text-center py-8">
                {(t as unknown as { common?: { loading?: string } }).common?.loading || 'Loading…'}
              </p>
            )}
            {!loading && filteredSkus.length === 0 && (
              <p className="text-[12px] text-carbon/30 italic text-center py-8">
                {m.noSkusFound || 'No SKUs match your filters'}
              </p>
            )}
            {filteredSkus.map((sku) => {
              const status = skuContentStatus(sku);
              const storyName = storyNameForSku(sku);
              const isSelected = effectiveSelectedSkuId === sku.id;
              const thumb =
                sku.render_urls?.['3d'] ||
                sku.render_url ||
                sku.reference_image_url;

              return (
                <button
                  key={sku.id}
                  onClick={() => setSelectedSkuId(sku.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-[14px] text-left transition-all ${
                    isSelected
                      ? 'bg-carbon text-white'
                      : 'bg-transparent hover:bg-carbon/[0.04] text-carbon'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className={`relative w-12 h-12 rounded-[10px] overflow-hidden flex-shrink-0 ${
                    isSelected ? 'bg-white/10' : 'bg-carbon/[0.04]'
                  }`}>
                    {thumb ? (
                      <img src={thumb} alt={sku.name} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className={`absolute inset-0 m-auto h-4 w-4 ${isSelected ? 'text-white/30' : 'text-carbon/15'}`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold tracking-[-0.01em] truncate ${
                      isSelected ? 'text-white' : 'text-carbon'
                    }`}>
                      {sku.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-medium tracking-[0.08em] uppercase ${
                        isSelected ? 'text-white/60' : 'text-carbon/40'
                      }`}>
                        {sku.category}
                      </span>
                      {storyName && (
                        <span className={`text-[9px] truncate italic ${
                          isSelected ? 'text-white/45' : 'text-carbon/30'
                        }`}>
                          {storyName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4-level status dots */}
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status.ecommerce
                        ? (isSelected ? 'bg-white' : 'bg-carbon')
                        : (isSelected ? 'bg-white/20' : 'bg-carbon/15')
                    }`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status.stillLife
                        ? (isSelected ? 'bg-white' : 'bg-carbon')
                        : (isSelected ? 'bg-white/20' : 'bg-carbon/15')
                    }`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status.editorial
                        ? (isSelected ? 'bg-white' : 'bg-carbon')
                        : (isSelected ? 'bg-white/20' : 'bg-carbon/15')
                    }`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status.campaign
                        ? (isSelected ? 'bg-white' : 'bg-carbon')
                        : (isSelected ? 'bg-white/20' : 'bg-carbon/15')
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ═══ Detail (right) ═══ */}
        <section className="bg-white rounded-[20px] p-8 md:p-10 min-h-[600px]">
          {selectedSku ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-5 pb-6 border-b border-carbon/[0.06]">
                {selectedSku.render_urls?.['3d'] ? (
                  <div className="w-20 h-20 rounded-[14px] bg-carbon/[0.04] overflow-hidden flex-shrink-0">
                    <img
                      src={selectedSku.render_urls['3d']}
                      alt={selectedSku.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-[14px] bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
                    <Camera className="h-7 w-7 text-carbon/15" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight truncate">
                    {selectedSku.name}
                  </h2>
                  <p className="text-[12px] text-carbon/45 tracking-[-0.01em] mt-1">
                    <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/35">
                      {selectedSku.category}
                    </span>
                    {' · '}
                    {selectedSku.family}
                    {selectedSku.pvp ? ` · €${selectedSku.pvp}` : ''}
                  </p>
                </div>
              </div>

              {/* Content evolution strip */}
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
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="w-16 h-16 rounded-full bg-carbon/[0.04] flex items-center justify-center mb-5">
                <Camera className="h-7 w-7 text-carbon/25" />
              </div>
              <p className="text-[14px] text-carbon/45 max-w-[340px] leading-relaxed">
                {m.selectSkuPrompt ||
                  'Select a SKU from the library to view its visual content pipeline.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-carbon/85 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-[12px]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
