'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Camera,
  Flower2,
  Users,
  Film,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
  Sparkles,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { AiGeneration } from '@/types/studio';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { backendError } from '@/hooks/hook-errors';
import { ModelRosterPicker } from './ModelRosterPicker';

/* ═══════════════════════════════════════════════════════════
   ContentEvolutionStrip — 4-level visual content pipeline
   per SKU. Each level (E-commerce → Still Life → Editorial →
   Campaign) shows readiness, existing assets, and inline
   generation flow when relevant.
   ═══════════════════════════════════════════════════════════ */

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

interface ContentEvolutionStripProps {
  sku: SKU;
  collectionPlanId: string;
  generations: AiGeneration[];
  onToggleFavorite: (id: string) => void;
  onDeleteGeneration: (id: string) => void;
  onLightbox: (url: string) => void;
  onError: (msg: string | null) => void;
  onRefetchGenerations: () => void;
}

export function ContentEvolutionStrip({
  sku,
  collectionPlanId,
  generations,
  onToggleFavorite,
  onDeleteGeneration,
  onLightbox,
  onError,
  onRefetchGenerations,
}: ContentEvolutionStripProps) {
  const t = useTranslation();
  const m = (t as unknown as { marketingPage?: Record<string, string> }).marketingPage || {};
  const { user } = useAuth();
  const [expandedLevel, setExpandedLevel] = useState<string | null>('ecommerce');

  // ── Editorial generation state ──
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [styleRefUrl, setStyleRefUrl] = useState<string | null>(null);
  const [editorialPrompt, setEditorialPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const handleStyleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    onError(null);
    try {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const [header, data] = result.split(',');
      const mimeType = header.match(/data:(.*);/)?.[1] || 'image/png';

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          assetType: 'editorial',
          name: file.name,
          base64: data,
          mimeType,
          phase: 'marketing',
        }),
      });
      if (!res.ok) throw await backendError(res);
      const uploadData = await res.json();
      setStyleRefUrl(uploadData.publicUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEditorialGenerate = async () => {
    if (!user || !sku.render_urls?.['3d']) return;
    setGenerating(true);
    onError(null);
    try {
      const res = await fetch('/api/ai/freepik/editorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_image_url: sku.render_urls['3d'],
          style_reference_url: styleRefUrl || undefined,
          model_id: selectedModelId || undefined,
          product_name: sku.name,
          category: sku.category,
          scene: 'editorial',
          user_prompt: editorialPrompt || undefined,
          collectionPlanId,
        }),
      });
      if (!res.ok) throw await backendError(res);
      const data = await res.json();

      const addRes = await fetch('/api/ai-generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          collection_plan_id: collectionPlanId,
          generation_type: 'editorial',
          prompt: `Editorial for ${sku.name}${editorialPrompt ? ` — ${editorialPrompt}` : ''}`,
          input_data: { sku_id: sku.id, sku_name: sku.name, model_id: selectedModelId },
          output_data: { images: data.images || [] },
          provider_request_id: null,
          model_used: 'freepik-nano-banana',
          status: 'completed',
          is_favorite: false,
          story_id: null,
        }),
      });
      if (!addRes.ok) throw await backendError(addRes);

      onRefetchGenerations();
      setEditorialPrompt('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Editorial generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const has3dRender = !!sku.render_urls?.['3d'];

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
    if (has3dRender && counts.ecommerce === 0) counts.ecommerce = 1;
    return counts;
  }, [generations, sku.id, has3dRender]);

  const getGensForLevel = (genType: string) =>
    generations.filter(
      (g) =>
        g.generation_type === genType &&
        g.status === 'completed' &&
        g.input_data?.sku_id === sku.id
    );

  const levelTitle = (key: string, fallback: string) =>
    (m[key] as string | undefined) || fallback;

  return (
    <div className="space-y-4">
      {/* ── 4-step pill strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {LEVELS.map((level) => {
          const count = countsByLevel[level.id] || 0;
          const isExpanded = expandedLevel === level.id;
          const isDisabled = level.id === 'campaign';
          const hasContent = count > 0;

          return (
            <button
              key={level.id}
              onClick={() => {
                if (!isDisabled) setExpandedLevel(isExpanded ? null : level.id);
              }}
              disabled={isDisabled}
              className={`flex items-center justify-between gap-2 px-4 py-3 rounded-[14px] border transition-all ${
                isExpanded
                  ? 'bg-carbon text-white border-carbon shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                  : isDisabled
                    ? 'bg-carbon/[0.02] text-carbon/25 border-carbon/[0.04] cursor-not-allowed'
                    : 'bg-white text-carbon border-carbon/[0.08] hover:border-carbon/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <level.Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                <span className="text-[12px] font-semibold tracking-[-0.01em] truncate">
                  {levelTitle(level.labelKey, level.id)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isDisabled ? (
                  <span className="text-[9px] tracking-[0.08em] uppercase italic">{m.comingSoon || 'Soon'}</span>
                ) : (
                  <>
                    {hasContent && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold ${
                        isExpanded ? 'bg-white text-carbon' : 'bg-carbon/[0.06] text-carbon/70'
                      }`}>
                        {count}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2} />
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Expanded level panel ── */}
      {expandedLevel && (
        <div className="bg-carbon/[0.02] rounded-[20px] p-6 md:p-8 space-y-5">
          {/* Description + channels */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-[13px] text-carbon/65 leading-relaxed flex-1 min-w-0">
              {levelTitle(`${expandedLevel}Desc`, '')}
            </p>
            {levelTitle(`${expandedLevel}Channels`, '') && (
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/40 shrink-0">
                {levelTitle(`${expandedLevel}Channels`, '')}
              </span>
            )}
          </div>

          {/* ── Level 1: E-commerce ── */}
          {expandedLevel === 'ecommerce' && (
            <div>
              {has3dRender ? (
                <div className="flex items-start gap-5">
                  <button
                    onClick={() => onLightbox(sku.render_urls!['3d']!)}
                    className="w-40 h-40 bg-white rounded-[16px] overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-carbon/15 transition-all"
                  >
                    <img src={sku.render_urls!['3d']!} alt={sku.name} className="w-full h-full object-contain" />
                  </button>
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5CAA8]/35 text-carbon text-[10px] font-semibold tracking-[0.05em] uppercase">
                      {m.levelComplete || 'Ready'}
                    </span>
                    <p className="text-[13px] text-carbon/60 leading-relaxed max-w-md">
                      {m.ecommerceReady ||
                        '3D render available from the Design phase. Ready for product pages and catalogs.'}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyLevelCta
                  message={m.noSourceImages || 'Complete the 3D render step in the Design phase, or upload your own image.'}
                />
              )}
            </div>
          )}

          {/* ── Level 2: Still Life ── */}
          {expandedLevel === 'still_life' && (
            <div className="space-y-5">
              {!has3dRender ? (
                <EmptyLevelCta
                  message={m.noSourceImages || 'Complete the 3D render step in the Design phase first.'}
                />
              ) : (
                <>
                  {getGensForLevel('still_life').length > 0 ? (
                    <Gallery
                      items={getGensForLevel('still_life').flatMap((g) =>
                        (g.output_data?.images || []).map((img: { url: string }, i: number) => ({
                          genId: g.id,
                          url: img.url,
                          isFav: g.is_favorite,
                          key: `${g.id}-${i}`,
                        }))
                      )}
                      aspect="square"
                      onLightbox={onLightbox}
                      onToggleFavorite={onToggleFavorite}
                      onDelete={onDeleteGeneration}
                    />
                  ) : (
                    <p className="text-[12px] text-carbon/45 italic">
                      {m.stillLifeFromVisuals ||
                        'Generate still life shots from the Product Visuals card using the editorial looks.'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Level 3: Editorial (full inline generation) ── */}
          {expandedLevel === 'editorial' && (
            <div className="space-y-6">
              {!has3dRender ? (
                <EmptyLevelCta
                  message={m.noSourceImages || 'Complete the 3D render step in the Design phase first.'}
                />
              ) : (
                <>
                  {/* Existing editorial gallery */}
                  {getGensForLevel('editorial').length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">
                        {m.editorialGallery || 'Editorial gallery'} ({getGensForLevel('editorial').length})
                      </p>
                      <Gallery
                        items={getGensForLevel('editorial').flatMap((g) =>
                          (g.output_data?.images || []).map((img: { url: string }, i: number) => ({
                            genId: g.id,
                            url: img.url,
                            isFav: g.is_favorite,
                            key: `${g.id}-${i}`,
                          }))
                        )}
                        aspect="portrait"
                        onLightbox={onLightbox}
                        onToggleFavorite={onToggleFavorite}
                        onDelete={onDeleteGeneration}
                      />
                    </div>
                  )}

                  {/* ── Step 1: Model picker ── */}
                  <ModelRosterPicker
                    selectedModelId={selectedModelId}
                    onSelect={setSelectedModelId}
                  />

                  {/* ── Step 2: Style reference ── */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">
                        {m.editorialStyleLabel || '2. Style reference'}
                      </p>
                      <span className="text-[9px] text-carbon/30 italic">
                        {m.editorialStyleOptional || 'optional'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {styleRefUrl && (
                        <div className="relative w-20 h-20 rounded-[12px] overflow-hidden flex-shrink-0">
                          <img src={styleRefUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setStyleRefUrl(null)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-carbon text-white flex items-center justify-center text-[10px] hover:bg-carbon/85 transition-colors"
                            aria-label="Remove style reference"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <input
                        ref={styleInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleStyleUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => styleInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold tracking-[-0.01em] border border-carbon/[0.12] text-carbon/65 hover:border-carbon/35 hover:text-carbon transition-colors disabled:opacity-40"
                      >
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {m.uploadPhoto || 'Upload reference'}
                      </button>
                    </div>
                  </div>

                  {/* ── Step 3: Art direction ── */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45 block">
                      {m.artDirection || '3. Art direction'}
                    </label>
                    <textarea
                      value={editorialPrompt}
                      onChange={(e) => setEditorialPrompt(e.target.value)}
                      placeholder={m.artDirectionPlaceholder || 'E.g. dramatic side lighting, against raw concrete wall, model looking away…'}
                      className="w-full text-[13px] text-carbon bg-white rounded-[12px] border border-carbon/[0.08] px-4 py-3 focus:outline-none focus:border-carbon/25 transition-colors resize-none h-20 placeholder:text-carbon/30"
                    />
                  </div>

                  {/* ── Generate ── */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleEditorialGenerate}
                      disabled={generating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold tracking-[-0.01em] bg-carbon text-white hover:bg-carbon/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {generating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {m.generateEditorial || 'Generate editorial'}
                    </button>
                    {generating && (
                      <span className="text-[12px] text-carbon/45 italic">
                        {m.generatingEditorial || 'Generating editorial…'}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Level 4: Campaign (placeholder) ── */}
          {expandedLevel === 'campaign' && (
            <div className="text-center py-12">
              <Film className="h-8 w-8 text-carbon/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-carbon/40 italic max-w-md mx-auto leading-relaxed">
                {m.campaignComingSoon ||
                  'Multi-model campaign shoots and video are coming next. We’ll let you know.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function EmptyLevelCta({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 gap-3">
      <div className="w-12 h-12 rounded-full bg-carbon/[0.04] flex items-center justify-center">
        <ImageIcon className="h-5 w-5 text-carbon/25" strokeWidth={1.75} />
      </div>
      <p className="text-[12px] text-carbon/45 max-w-md leading-relaxed">{message}</p>
    </div>
  );
}

function Gallery({
  items,
  aspect,
  onLightbox,
  onToggleFavorite,
  onDelete,
}: {
  items: { genId: string; url: string; isFav: boolean; key: string }[];
  aspect: 'square' | 'portrait';
  onLightbox: (url: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const aspectCls = aspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-square';
  const colsCls =
    aspect === 'portrait'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
      : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5';

  return (
    <div className={`grid ${colsCls} gap-2.5`}>
      {items.map((item) => (
        <div
          key={item.key}
          className={`group relative ${aspectCls} bg-white rounded-[12px] overflow-hidden`}
        >
          <button onClick={() => onLightbox(item.url)} className="w-full h-full">
            {/* object-contain so the editorial isn't beheaded: gpt-image-1.5
                returns 2:3 (1024×1536) but our editorial gallery frame is 3:4.
                With cover the head + shoes get cropped; with contain we get
                a thin sliver of white air top/bottom and the full shot. */}
            <img src={item.url} alt="" className="w-full h-full object-contain" />
          </button>
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onToggleFavorite(item.genId)}
              className={`w-7 h-7 rounded-full bg-white/95 backdrop-blur flex items-center justify-center transition-colors ${
                item.isFav ? 'text-[#FFC107]' : 'text-carbon/40 hover:text-carbon'
              }`}
              aria-label="Favorite"
            >
              <Star
                className={`h-3.5 w-3.5 ${item.isFav ? 'fill-[#FFC107]' : ''}`}
                strokeWidth={2}
              />
            </button>
            <button
              onClick={() => onDelete(item.genId)}
              className="w-7 h-7 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-carbon/40 hover:text-[#A0463C] transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
