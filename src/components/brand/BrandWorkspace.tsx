'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Sparkles,
  Palette,
  Package,
  Loader2,
} from 'lucide-react';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { PHASES } from '@/lib/timeline-template';
import type { TimelineMilestone } from '@/types/timeline';
import type {
  BrandColor,
  BrandVoice,
  TargetAudience,
  Competitor,
  NamingOption,
  BrandTypography,
} from '@/types/brand';

/* ── Sub-section components ── */
import { BrandNaming } from './sections/BrandNaming';
import { BrandStory } from './sections/BrandStory';
import { BrandVoiceSection } from './sections/BrandVoiceSection';
import { TargetAudienceSection } from './sections/TargetAudienceSection';
import { CompetitorMap } from './sections/CompetitorMap';
import { ColorPalette } from './sections/ColorPalette';
import { TypographySection } from './sections/TypographySection';
import { PackagingSection } from './sections/PackagingSection';

type Tab = 'profile' | 'visual' | 'packaging';

const TABS: { id: Tab; label: string; labelEs: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Brand Profile', labelEs: 'Perfil de Marca', icon: Sparkles },
  { id: 'visual', label: 'Visual Identity', labelEs: 'Identidad Visual', icon: Palette },
  { id: 'packaging', label: 'Packaging', labelEs: 'Packaging', icon: Package },
];

interface BrandWorkspaceProps {
  milestones: TimelineMilestone[];
}

export function BrandWorkspace({ milestones }: BrandWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const { profile, loading, saving, updateProfile, debouncedUpdate } =
    useBrandProfile(collectionId);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const info = PHASES.creative;
  const phaseMilestones = milestones.filter((m) => ['br-1', 'br-2', 'br-3', 'br-4'].includes(m.id));
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

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
      {profile && activeTab === 'profile' && (
        <div className="space-y-6">
          <BrandNaming
            namingOptions={profile.naming_options as NamingOption[] | null}
            brandName={profile.brand_name}
            tagline={profile.tagline}
            onUpdate={debouncedUpdate}
          />
          <BrandStory
            story={profile.brand_story}
            onUpdate={debouncedUpdate}
          />
          <BrandVoiceSection
            voice={profile.brand_voice as BrandVoice | null}
            onUpdate={debouncedUpdate}
          />
          <TargetAudienceSection
            audience={profile.target_audience as TargetAudience | null}
            onUpdate={debouncedUpdate}
          />
          <CompetitorMap
            competitors={profile.competitors as Competitor[] | null}
            onUpdate={debouncedUpdate}
          />
        </div>
      )}

      {profile && activeTab === 'visual' && (
        <div className="space-y-6">
          <ColorPalette
            primaryColors={profile.primary_colors as BrandColor[] | null}
            secondaryColors={profile.secondary_colors as BrandColor[] | null}
            onUpdate={debouncedUpdate}
          />
          <TypographySection
            typography={profile.typography as BrandTypography | null}
            onUpdate={debouncedUpdate}
          />
        </div>
      )}

      {profile && activeTab === 'packaging' && (
        <PackagingSection
          notes={profile.packaging_notes}
          onUpdate={debouncedUpdate}
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
