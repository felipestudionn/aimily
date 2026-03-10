'use client';

import { useState, useMemo } from 'react';
import {
  LayoutGrid,
  Heart,
  Trash2,
  Download,
  X,
  Filter,
  Image,
  Video,
  Star,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AiGeneration, GenerationType } from '@/types/studio';

const TYPE_FILTERS: { id: GenerationType | 'all' | 'favorites'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'product_render', label: 'Studio' },
  { id: 'tryon', label: 'On-Model' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'ad_creative', label: 'Campaign' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'video', label: 'Video' },
];

interface InspirationGalleryProps {
  generations: AiGeneration[];
  onToggleFavorite: (id: string) => Promise<AiGeneration | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function InspirationGallery({
  generations,
  onToggleFavorite,
  onDelete,
}: InspirationGalleryProps) {
  const [filter, setFilter] = useState<string>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Flatten all images from completed generations
  const galleryItems = useMemo(() => {
    const completed = generations.filter((g) => g.status === 'completed');

    let filtered = completed;
    if (filter === 'favorites') {
      filtered = completed.filter((g) => g.is_favorite);
    } else if (filter !== 'all') {
      filtered = completed.filter((g) => g.generation_type === filter);
    }

    const items: Array<{
      id: string;
      generationId: string;
      type: 'image' | 'video';
      url: string;
      generation: AiGeneration;
    }> = [];

    for (const gen of filtered) {
      if (gen.output_data?.images) {
        for (const img of gen.output_data.images) {
          items.push({
            id: `${gen.id}-img-${img.url}`,
            generationId: gen.id,
            type: 'image',
            url: img.url,
            generation: gen,
          });
        }
      }
      if (gen.output_data?.video_url) {
        items.push({
          id: `${gen.id}-video`,
          generationId: gen.id,
          type: 'video',
          url: gen.output_data.video_url,
          generation: gen,
        });
      }
    }

    return items;
  }, [generations, filter]);

  const lightboxItem = lightboxIdx !== null ? galleryItems[lightboxIdx] : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        {TYPE_FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? generations.filter((g) => g.status === 'completed').length
              : f.id === 'favorites'
              ? generations.filter((g) => g.is_favorite).length
              : generations.filter((g) => g.generation_type === f.id && g.status === 'completed').length;

          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.id === 'favorites' && <Heart className="h-3 w-3" />}
              {f.label}
              {count > 0 && (
                <span className={`${filter === f.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Masonry Gallery */}
      {galleryItems.length === 0 ? (
        <div className="bg-white border border-gray-100 p-16 text-center">
          <LayoutGrid className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No content yet</p>
          <p className="text-xs text-gray-400 mt-1">
            {filter === 'favorites'
              ? 'Mark some generations as favorites to see them here'
              : 'Generate some renders to build your inspiration gallery'}
          </p>
        </div>
      ) : (
        <div className="columns-3 gap-4 space-y-4">
          {galleryItems.map((item, idx) => (
            <div key={item.id} className="break-inside-avoid group relative">
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full object-cover cursor-pointer"
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                  onMouseLeave={(e) => {
                    const v = e.target as HTMLVideoElement;
                    v.pause();
                    v.currentTime = 0;
                  }}
                  onClick={() => setLightboxIdx(idx)}
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.generation.prompt}
                  className="w-full object-cover cursor-pointer"
                  onClick={() => setLightboxIdx(idx)}
                />
              )}

              {/* Type Badge */}
              <div className="absolute top-2 left-2">
                {item.type === 'video' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-black/50 text-white rounded-full text-[10px]">
                    <Video className="h-3 w-3" /> Video
                  </span>
                ) : null}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end opacity-0 group-hover:opacity-100">
                <div className="w-full p-3 flex items-center justify-between">
                  <div className="text-white text-xs">
                    <p className="font-medium truncate max-w-[150px]">
                      {item.generation.input_data?.sku_name || item.generation.generation_type}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.generationId);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.generation.is_favorite
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5" fill={item.generation.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <a
                      href={item.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIdx(idx);
                      }}
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 p-2 text-white/70 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx - 1);
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightboxIdx < galleryItems.length - 1 && (
            <button
              className="absolute right-4 p-2 text-white/70 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx + 1);
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div className="max-w-4xl max-h-[85vh] mx-4" onClick={(e) => e.stopPropagation()}>
            {lightboxItem.type === 'video' ? (
              <video
                src={lightboxItem.url}
                className="max-w-full max-h-[85vh]"
                controls
                autoPlay
                loop
              />
            ) : (
              <img
                src={lightboxItem.url}
                alt={lightboxItem.generation.prompt}
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}

            {/* Info Bar */}
            <div className="mt-3 flex items-center justify-between text-white/80 text-sm">
              <div>
                <p className="font-medium">
                  {lightboxItem.generation.input_data?.sku_name || lightboxItem.generation.generation_type}
                </p>
                <p className="text-xs text-white/50 mt-0.5">{lightboxItem.generation.prompt}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onToggleFavorite(lightboxItem.generationId)}
                  className={`p-2 rounded-lg transition-colors ${
                    lightboxItem.generation.is_favorite ? 'bg-pink-500' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Heart className="h-4 w-4" fill={lightboxItem.generation.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <a
                  href={lightboxItem.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => {
                    onDelete(lightboxItem.generationId);
                    setLightboxIdx(null);
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
