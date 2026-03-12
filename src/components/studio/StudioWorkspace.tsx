'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Image,
  Users,
  Megaphone,
  Video,
  LayoutGrid,
  BookOpen,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  const loading = skusLoading || generationsLoading || modelsLoading;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center bg-crema text-carbon">
            <Sparkles className="h-7 w-7" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Creative Studio</h1>
            <p className="text-sm text-gray-500">Estudio Creativo IA</p>
          </div>
        </div>
        <Link
          href={`/collection/${collectionId}/studio/lookbook`}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Lookbook Builder
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Image className="h-4 w-4" />
            Generations
          </div>
          <p className="text-2xl font-bold text-gray-900">{generations.length}</p>
        </div>
        <div className="bg-white p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Users className="h-4 w-4" />
            AI Models
          </div>
          <p className="text-2xl font-bold text-gray-900">{models.length}</p>
        </div>
        <div className="bg-white p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Sparkles className="h-4 w-4" />
            Favorites
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {generations.filter((g) => g.is_favorite).length}
          </p>
        </div>
        <div className="bg-white p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="h-4 w-4" />
            Progress
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">{progress}%</p>
            <div className="flex gap-1 text-xs">
              {completed > 0 && (
                <span className="flex items-center gap-0.5 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> {completed}
                </span>
              )}
              {inProgress > 0 && (
                <span className="flex items-center gap-0.5 text-blue-600">
                  <Clock className="h-3 w-3" /> {inProgress}
                </span>
              )}
              {pending > 0 && (
                <span className="flex items-center gap-0.5 text-gray-400">
                  <AlertCircle className="h-3 w-3" /> {pending}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Checklist */}
      {phaseMilestones.length > 0 && (
        <div className="bg-white border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h3>
          <div className="flex flex-wrap gap-3">
            {phaseMilestones.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  m.status === 'completed'
                    ? 'bg-green-50 text-green-700'
                    : m.status === 'in-progress'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {m.status === 'completed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : m.status === 'in-progress' ? (
                  <Clock className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {m.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
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
