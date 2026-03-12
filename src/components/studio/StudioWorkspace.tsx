'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Image,
  Users,
  Megaphone,
  Video,
  LayoutGrid,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { useSkus } from '@/hooks/useSkus';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import { useBrandModels } from '@/hooks/useBrandModels';
import type { TimelineMilestone } from '@/types/timeline';
import type { StudioTab } from '@/types/studio';

import { ProductRenderGenerator } from './sections/ProductRenderGenerator';
import { AiModelStudio } from './sections/AiModelStudio';
import { CampaignCreativeGenerator } from './sections/CampaignCreativeGenerator';
import { VideoGenerator } from './sections/VideoGenerator';
import { InspirationGallery } from './sections/InspirationGallery';

const TABS: { id: StudioTab; label: string; labelEs: string; icon: React.ElementType }[] = [
  { id: 'renders', label: 'Product Renders', labelEs: 'Renders de Producto', icon: Image },
  { id: 'models', label: 'AI Models', labelEs: 'Modelos IA', icon: Users },
  { id: 'campaigns', label: 'Campaign Creative', labelEs: 'Creatividad Campaña', icon: Megaphone },
  { id: 'video', label: 'Video', labelEs: 'Video', icon: Video },
  { id: 'gallery', label: 'Gallery', labelEs: 'Galería', icon: LayoutGrid },
];

interface StudioWorkspaceProps {
  milestones: TimelineMilestone[];
}

export function StudioWorkspace({ milestones }: StudioWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const { skus, loading: skusLoading } = useSkus(collectionId);
  const {
    generations,
    loading: generationsLoading,
    addGeneration,
    updateGeneration,
    deleteGeneration,
    toggleFavorite,
    refetch: refetchGenerations,
  } = useAiGenerations(collectionId);
  const {
    models,
    loading: modelsLoading,
    addModel,
    updateModel,
    deleteModel,
  } = useBrandModels(collectionId);
  const [activeTab, setActiveTab] = useState<StudioTab>('renders');

  // Studio workspace milestones (gm-3 Photography, gm-4 Copywriting, gm-5 Lookbook)
  const phaseMilestones = milestones.filter(
    (m) => ['gm-3', 'gm-4', 'gm-5'].includes(m.id)
  );
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  const loading = skusLoading || generationsLoading || modelsLoading;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/30" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-16 space-y-10">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
            Estudio Creativo IA
          </p>
          <h1 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            AI Creative Studio
          </h1>
        </div>
        <Link
          href={`/collection/${collectionId}/studio/lookbook`}
          className="flex items-center gap-2 px-4 py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-carbon/90 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Lookbook Builder
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-px bg-carbon/[0.06]">
        <div className="bg-white p-6">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
            Generations
          </p>
          <p className="text-3xl font-light text-carbon tracking-tight">{generations.length}</p>
        </div>
        <div className="bg-white p-6">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
            AI Models
          </p>
          <p className="text-3xl font-light text-carbon tracking-tight">{models.length}</p>
        </div>
        <div className="bg-white p-6">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
            Favorites
          </p>
          <p className="text-3xl font-light text-carbon tracking-tight">
            {generations.filter((g) => g.is_favorite).length}
          </p>
        </div>
        <div className="bg-white p-6">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
            Progress
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-light text-carbon tracking-tight">{progress}</p>
            <span className="text-sm font-light text-carbon/40">%</span>
          </div>
        </div>
      </div>

      {/* Milestone Checklist */}
      {phaseMilestones.length > 0 && (
        <div className="bg-white border border-carbon/[0.06] p-8">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-6">Milestones</p>
          <div className="space-y-4">
            {phaseMilestones.map((m) => (
              <div key={m.id} className="flex items-center gap-4">
                <div className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed' ? 'bg-carbon border-carbon' :
                  m.status === 'in-progress' ? 'border-carbon' : 'border-carbon/20'
                }`}>
                  {m.status === 'completed' && (
                    <svg className="w-2.5 h-2.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {m.status === 'in-progress' && (
                    <div className="w-1.5 h-1.5 bg-carbon" />
                  )}
                </div>
                <p className={`text-sm font-light ${m.status === 'completed' ? 'text-carbon/30 line-through' : 'text-carbon'}`}>
                  {m.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border border-carbon/[0.06]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                isActive
                  ? 'bg-carbon text-crema'
                  : 'bg-white text-carbon/40 hover:text-carbon/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'renders' && (
        <ProductRenderGenerator
          collectionId={collectionId}
          skus={skus}
          generations={generations.filter(
            (g) => g.generation_type === 'tryon' || g.generation_type === 'product_render' || g.generation_type === 'lifestyle'
          )}
          onGenerate={addGeneration}
          onUpdate={updateGeneration}
          onToggleFavorite={toggleFavorite}
          onRefetch={refetchGenerations}
        />
      )}
      {activeTab === 'models' && (
        <AiModelStudio
          collectionId={collectionId}
          models={models}
          onAddModel={addModel}
          onUpdateModel={updateModel}
          onDeleteModel={deleteModel}
        />
      )}
      {activeTab === 'campaigns' && (
        <CampaignCreativeGenerator
          collectionId={collectionId}
          generations={generations.filter((g) => g.generation_type === 'ad_creative' || g.generation_type === 'editorial')}
          allGenerations={generations}
          onGenerate={addGeneration}
          onUpdate={updateGeneration}
          onToggleFavorite={toggleFavorite}
          onRefetch={refetchGenerations}
        />
      )}
      {activeTab === 'video' && (
        <VideoGenerator
          collectionId={collectionId}
          generations={generations.filter((g) => g.generation_type === 'video')}
          allGenerations={generations}
          onGenerate={addGeneration}
          onUpdate={updateGeneration}
          onRefetch={refetchGenerations}
        />
      )}
      {activeTab === 'gallery' && (
        <InspirationGallery
          generations={generations}
          onToggleFavorite={toggleFavorite}
          onDelete={deleteGeneration}
        />
      )}
    </div>
  );
}
