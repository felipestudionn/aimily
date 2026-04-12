'use client';

import { useState, useMemo } from 'react';
import {
  Camera,
  Flower2,
  Users,
  Film,
  ChevronDown,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Star,
  Trash2,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { AiGeneration } from '@/types/studio';
import { useTranslation } from '@/i18n';
import { ModelRosterPicker } from './ModelRosterPicker';

/* ── Types ── */

interface ContentLevel {
  id: 'ecommerce' | 'still_life' | 'editorial' | 'campaign';
  labelKey: string;
  descKey: string;
  channelsKey: string;
  Icon: typeof Camera;
  generationType: string;
  requiresRender3d: boolean;
}

const LEVELS: ContentLevel[] = [
  {
    id: 'ecommerce',
    labelKey: 'levelEcommerce',
    descKey: 'levelEcommerceDesc',
    channelsKey: 'levelEcommerceChannels',
    Icon: Camera,
    generationType: 'product_render',
    requiresRender3d: false,
  },
  {
    id: 'still_life',
    labelKey: 'levelStillLife',
    descKey: 'levelStillLifeDesc',
    channelsKey: 'levelStillLifeChannels',
    Icon: Flower2,
    generationType: 'still_life',
    requiresRender3d: true,
  },
  {
    id: 'editorial',
    labelKey: 'levelEditorial',
    descKey: 'levelEditorialDesc',
    channelsKey: 'levelEditorialChannels',
    Icon: Users,
    generationType: 'editorial',
    requiresRender3d: true,
  },
  {
    id: 'campaign',
    labelKey: 'levelCampaign',
    descKey: 'levelCampaignDesc',
    channelsKey: 'levelCampaignChannels',
    Icon: Film,
    generationType: 'video',
    requiresRender3d: true,
  },
];

/* ── Props ── */

interface ContentEvolutionStripProps {
  sku: SKU;
  generations: AiGeneration[];
  onToggleFavorite: (id: string) => void;
  onDeleteGeneration: (id: string) => void;
  onLightbox: (url: string) => void;
}

/* ── Component ── */

export function ContentEvolutionStrip({
  sku,
  generations,
  onToggleFavorite,
  onDeleteGeneration,
  onLightbox,
}: ContentEvolutionStripProps) {
  const t = useTranslation();
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  const has3dRender = !!sku.render_urls?.['3d'];

  // Count generations per level
  const countsByLevel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const level of LEVELS) {
      counts[level.id] = generations.filter(
        (g) =>
          g.generation_type === level.generationType &&
          g.status === 'completed' &&
          g.input_data?.sku_id === sku.id
      ).length;
    }
    // E-commerce: if 3D render exists, count as 1
    if (has3dRender && counts.ecommerce === 0) {
      counts.ecommerce = 1;
    }
    return counts;
  }, [generations, sku.id, has3dRender]);

  const getStatusColor = (levelId: string) => {
    const count = countsByLevel[levelId] || 0;
    if (count > 0) return 'bg-carbon';
    return 'bg-carbon/10';
  };

  const getGensForLevel = (genType: string) =>
    generations.filter(
      (g) =>
        g.generation_type === genType &&
        g.status === 'completed' &&
        g.input_data?.sku_id === sku.id
    );

  return (
    <div className="space-y-1">
      {/* Strip header — 4 step pills */}
      <div className="flex items-center gap-1">
        {LEVELS.map((level, idx) => {
          const count = countsByLevel[level.id] || 0;
          const isExpanded = expandedLevel === level.id;
          const isDisabled = level.id === 'campaign';

          return (
            <button
              key={level.id}
              onClick={() => {
                if (!isDisabled) setExpandedLevel(isExpanded ? null : level.id);
              }}
              disabled={isDisabled}
              className={`flex-1 flex items-center justify-between gap-2 px-3 py-2.5 border transition-all ${
                isExpanded
                  ? 'bg-carbon text-crema border-carbon'
                  : isDisabled
                    ? 'bg-carbon/[0.02] text-carbon/20 border-carbon/[0.04] cursor-not-allowed'
                    : 'bg-white text-carbon/60 border-carbon/[0.06] hover:border-carbon/20'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <level.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[9px] font-medium tracking-[0.1em] uppercase truncate">
                  {t.marketingPage[level.labelKey as keyof typeof t.marketingPage] as string || level.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isDisabled ? (
                  <span className="text-[8px] italic">{t.marketingPage.comingSoon || 'Soon'}</span>
                ) : (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(level.id)}`} />
                    {count > 0 && (
                      <span className="text-[9px]">{count}</span>
                    )}
                    <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded level content */}
      {expandedLevel && (
        <div className="bg-white border border-carbon/[0.06] p-5">
          {/* Level description + channels */}
          <div className="mb-4">
            <p className="text-xs font-light text-carbon/50 mb-1">
              {t.marketingPage[`${expandedLevel}Desc` as keyof typeof t.marketingPage] as string || ''}
            </p>
            <p className="text-[9px] text-carbon/25 uppercase tracking-[0.1em]">
              {t.marketingPage[`${expandedLevel}Channels` as keyof typeof t.marketingPage] as string || ''}
            </p>
          </div>

          {/* ── Level 1: E-commerce ── */}
          {expandedLevel === 'ecommerce' && (
            <div>
              {has3dRender ? (
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => onLightbox(sku.render_urls!['3d']!)}
                    className="w-32 h-32 bg-white border border-carbon/[0.06] overflow-hidden flex-shrink-0"
                  >
                    <img src={sku.render_urls!['3d']!} alt={sku.name} className="w-full h-full object-contain" />
                  </button>
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-green-600 mb-1">
                      {t.marketingPage.levelComplete || 'Complete'}
                    </p>
                    <p className="text-xs font-light text-carbon/50">
                      {t.marketingPage.ecommerceReady || '3D render available from the Design phase. Ready for product pages and catalogs.'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-light text-carbon/30 italic py-4">
                  {t.marketingPage.noSourceImages || 'Complete the 3D render step in the Design phase.'}
                </p>
              )}
            </div>
          )}

          {/* ── Level 2: Still Life ── */}
          {expandedLevel === 'still_life' && (
            <div>
              {!has3dRender ? (
                <p className="text-xs font-light text-carbon/30 italic py-4">
                  {t.marketingPage.noSourceImages || 'Complete the 3D render step in the Design phase.'}
                </p>
              ) : (
                <div>
                  {/* Gallery of existing still life shots */}
                  {getGensForLevel('still_life').length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                      {getGensForLevel('still_life')
                        .flatMap((g) =>
                          (g.output_data?.images || []).map((img: { url: string }, i: number) => ({
                            genId: g.id, url: img.url, isFav: g.is_favorite, key: `${g.id}-${i}`,
                          }))
                        )
                        .map((item) => (
                          <div key={item.key} className="group relative aspect-square bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden">
                            <button onClick={() => onLightbox(item.url)} className="w-full h-full">
                              <img src={item.url} alt="" className="w-full h-full object-cover" />
                            </button>
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onToggleFavorite(item.genId)} className={`p-0.5 bg-white/90 ${item.isFav ? 'text-yellow-500' : 'text-carbon/30'}`}>
                                <Star className={`h-2.5 w-2.5 ${item.isFav ? 'fill-yellow-500' : ''}`} />
                              </button>
                              <button onClick={() => onDeleteGeneration(item.genId)} className="p-0.5 bg-white/90 text-carbon/30 hover:text-red-500">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  <p className="text-[10px] text-carbon/30 italic">
                    {t.marketingPage.stillLifeFromVisuals || 'Generate still life shots from the Product Visuals card using the 8 editorial looks.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Level 3: Editorial ── */}
          {expandedLevel === 'editorial' && (
            <div>
              {!has3dRender ? (
                <p className="text-xs font-light text-carbon/30 italic py-4">
                  {t.marketingPage.noSourceImages || 'Complete the 3D render step in the Design phase.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Gallery of existing editorial shots */}
                  {getGensForLevel('editorial').length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {getGensForLevel('editorial')
                        .flatMap((g) =>
                          (g.output_data?.images || []).map((img: { url: string }, i: number) => ({
                            genId: g.id, url: img.url, isFav: g.is_favorite, key: `${g.id}-${i}`,
                          }))
                        )
                        .map((item) => (
                          <div key={item.key} className="group relative aspect-[3/4] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden">
                            <button onClick={() => onLightbox(item.url)} className="w-full h-full">
                              <img src={item.url} alt="" className="w-full h-full object-cover" />
                            </button>
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onToggleFavorite(item.genId)} className={`p-0.5 bg-white/90 ${item.isFav ? 'text-yellow-500' : 'text-carbon/30'}`}>
                                <Star className={`h-2.5 w-2.5 ${item.isFav ? 'fill-yellow-500' : ''}`} />
                              </button>
                              <button onClick={() => onDeleteGeneration(item.genId)} className="p-0.5 bg-white/90 text-carbon/30 hover:text-red-500">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  <p className="text-[10px] text-carbon/30 italic">
                    {t.marketingPage.editorialFromCampaign || 'Generate editorial shots from the Campaign & Video card — select a model, style reference, and product.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Level 4: Campaign (coming soon) ── */}
          {expandedLevel === 'campaign' && (
            <div className="text-center py-8 text-carbon/20 text-sm font-light">
              {t.marketingPage.campaignComingSoon || 'Multi-model campaign shoots and video — coming soon.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
