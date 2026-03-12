'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Monitor,
  ShoppingBag,
  PenTool,
  Globe,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useSkus } from '@/hooks/useSkus';
import { useProductCopy } from '@/hooks/useProductCopy';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import type { TimelineMilestone } from '@/types/timeline';
import type { DigitalTab } from '@/types/digital';

import { ProductCatalog } from './sections/ProductCatalog';
import { CopywritingStudio } from './sections/CopywritingStudio';
import { WebsiteTracker } from './sections/WebsiteTracker';

const TABS: { id: DigitalTab; label: string; labelEs: string; icon: React.ElementType }[] = [
  { id: 'catalog', label: 'Product Catalog', labelEs: 'Catálogo de Productos', icon: ShoppingBag },
  { id: 'copywriting', label: 'AI Copywriting', labelEs: 'Copywriting IA', icon: PenTool },
  { id: 'tracker', label: 'Website Tracker', labelEs: 'Tracker Web', icon: Globe },
];

interface DigitalWorkspaceProps {
  milestones: TimelineMilestone[];
}

export function DigitalWorkspace({ milestones }: DigitalWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const { skus, loading: skusLoading } = useSkus(collectionId);
  const { copies, loading: copiesLoading, addCopy, updateCopy, deleteCopy } = useProductCopy(collectionId);
  const { profile: brandProfile, loading: brandLoading } = useBrandProfile(collectionId);
  const { generations, loading: gensLoading } = useAiGenerations(collectionId);
  const [activeTab, setActiveTab] = useState<DigitalTab>('catalog');

  // Digital workspace milestones (gm-1 Website, gm-2 E-commerce)
  const phaseMilestones = milestones.filter(
    (m) => ['gm-1', 'gm-2'].includes(m.id)
  );
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  const loading = skusLoading || copiesLoading || brandLoading || gensLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="text-sm text-gray-500">Loading Digital Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crema flex items-center justify-center text-carbon">
              <Monitor className="h-5 w-5" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Digital Presence</h2>
              <p className="text-xs text-gray-500">Catalog, AI copy & website readiness</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{progress}%</div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {completed > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> {completed}
                </span>
              )}
              {inProgress > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" /> {inProgress}
                </span>
              )}
              {pending > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-gray-400" /> {pending}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Milestone chips */}
        <div className="flex flex-wrap gap-2">
          {phaseMilestones.map((m) => (
            <span
              key={m.id}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                m.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : m.status === 'in-progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {m.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && (
        <ProductCatalog
          skus={skus}
          generations={generations}
          loading={skusLoading}
        />
      )}
      {activeTab === 'copywriting' && (
        <CopywritingStudio
          collectionId={collectionId}
          skus={skus}
          copies={copies}
          brandProfile={brandProfile}
          onAddCopy={addCopy}
          onUpdateCopy={updateCopy}
          onDeleteCopy={deleteCopy}
          loading={copiesLoading}
        />
      )}
      {activeTab === 'tracker' && (
        <WebsiteTracker collectionId={collectionId} />
      )}
    </div>
  );
}
