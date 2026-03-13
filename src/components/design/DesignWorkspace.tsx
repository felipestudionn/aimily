'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Footprints,
  Image as ImageIcon,
  Palette,
  Scissors,
  Loader2,
} from 'lucide-react';
import { useSkus } from '@/hooks/useSkus';
import { useColorways } from '@/hooks/useColorways';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { PHASES } from '@/lib/timeline-template';
import type { TimelineMilestone } from '@/types/timeline';

import { LastFormSection } from './sections/LastFormSection';
import { DesignReviewHub } from './sections/DesignReviewHub';
import { ColorwayManager } from './sections/ColorwayManager';
import { PatternSection } from './sections/PatternSection';

type Tab = 'forms' | 'design' | 'colorways' | 'patterns';

const TABS: { id: Tab; label: string; labelEs: string; icon: React.ElementType }[] = [
  { id: 'forms', label: 'Lasts & Forms', labelEs: 'Hormas y Formas', icon: Footprints },
  { id: 'design', label: 'Design Review', labelEs: 'Revisión de Diseño', icon: ImageIcon },
  { id: 'colorways', label: 'Colorways', labelEs: 'Colores', icon: Palette },
  { id: 'patterns', label: 'Patterns', labelEs: 'Patronaje', icon: Scissors },
];

interface DesignWorkspaceProps {
  milestones: TimelineMilestone[];
}

interface DesignLocalData {
  formSpecs: Record<string, { lastType: string; lastCode: string; factoryLink: string; notes: string }>;
  designFiles: Record<string, { name: string; url: string; status: 'draft' | 'review' | 'approved' | 'rejected' }[]>;
  patterns: Record<string, { name: string; url: string; fileType: string; gradingNotes: string }[]>;
}

const EMPTY_LOCAL: DesignLocalData = {
  formSpecs: {},
  designFiles: {},
  patterns: {},
};

export function DesignWorkspace({ milestones }: DesignWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const { skus, loading: skusLoading } = useSkus(collectionId);
  const { colorways, loading: colorwaysLoading, addColorway, updateColorway, deleteColorway } =
    useColorways(collectionId);
  const [activeTab, setActiveTab] = useState<Tab>('forms');

  // Design data persisted to Supabase (replaces localStorage)
  const { data: localData, save: saveLocal, loading: dataLoading, saving } =
    useWorkspaceData<DesignLocalData>(collectionId, 'design', EMPTY_LOCAL);

  const info = PHASES.development;
  const phaseMilestones = milestones.filter((m) => ['dd-1', 'dd-2', 'dd-3', 'dd-4', 'dd-5', 'dd-6'].includes(m.id));
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  const loading = skusLoading || colorwaysLoading || dataLoading;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/30" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 space-y-10">
      {/* Phase Header */}
      <div>
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
          {info.nameEs}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            {info.name}
          </h1>
          {saving && (
            <span className="flex items-center gap-2 text-sm text-carbon/30">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="relative bg-white border border-carbon/[0.06] p-8 overflow-hidden">
        <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
          <div className="h-full bg-carbon transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-5xl font-light text-carbon tracking-tight">{progress}</span>
            <span className="text-lg font-light text-carbon/40 ml-1">%</span>
          </div>
          <div className="flex gap-6 text-xs text-carbon/40">
            <span>{completed} completed</span>
            <span>{inProgress} in progress</span>
            <span>{pending} pending</span>
          </div>
        </div>
      </div>

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
      {activeTab === 'forms' && (
        <LastFormSection
          skus={skus}
          formSpecs={localData.formSpecs}
          onUpdate={(formSpecs) => saveLocal({ ...localData, formSpecs })}
        />
      )}

      {activeTab === 'design' && (
        <DesignReviewHub
          skus={skus}
          designFiles={localData.designFiles}
          onUpdate={(designFiles) => saveLocal({ ...localData, designFiles })}
        />
      )}

      {activeTab === 'colorways' && (
        <ColorwayManager
          skus={skus}
          colorways={colorways}
          onAdd={addColorway}
          onUpdate={updateColorway}
          onDelete={deleteColorway}
        />
      )}

      {activeTab === 'patterns' && (
        <PatternSection
          skus={skus}
          patterns={localData.patterns}
          onUpdate={(patterns) => saveLocal({ ...localData, patterns })}
        />
      )}

      {/* Milestones Checklist */}
      <div className="bg-white border border-carbon/[0.06] p-8">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-6">Milestones</p>
        <div className="space-y-4">
          {phaseMilestones.map((m) => (
            <div key={m.id} className="flex items-center gap-4">
              <div
                className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed'
                    ? 'bg-carbon border-carbon'
                    : m.status === 'in-progress'
                    ? 'border-carbon'
                    : 'border-carbon/20'
                }`}
              >
                {m.status === 'completed' && (
                  <svg className="w-2.5 h-2.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {m.status === 'in-progress' && (
                  <div className="w-1.5 h-1.5 bg-carbon" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-light ${m.status === 'completed' ? 'text-carbon/30 line-through' : 'text-carbon'}`}>
                  {m.name}
                </p>
              </div>
              <span className="text-xs text-carbon/30">{m.responsible}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
