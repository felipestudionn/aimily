'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Sparkles,
  Type,
  Palette,
  Users,
  Swords,
  BookOpen,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
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

  const info = PHASES.brand;
  const phaseMilestones = milestones.filter((m) => m.phase === 'brand');
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 flex items-center justify-center text-2xl"
            style={{ backgroundColor: info.bgColor }}
          >
            {info.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{info.name}</h1>
            <p className="text-sm text-gray-500">{info.nameEs}</p>
          </div>
        </div>
        {saving && (
          <span className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">Phase Progress</h2>
          <span className="text-xl font-bold" style={{ color: info.color }}>
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: info.color }}
          />
        </div>
        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-gray-500">{completed} completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-texto/60" />
            <span className="text-gray-500">{inProgress} in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-gray-500">{pending} pending</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
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
      <div className="bg-white border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Milestones</h2>
        <div className="space-y-3">
          {phaseMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : m.status === 'in-progress'
                    ? 'border-carbon'
                    : 'border-gray-200'
                }`}
              >
                {m.status === 'completed' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {m.status === 'in-progress' && (
                  <div className="w-2 h-2 rounded-full bg-carbon" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {m.name}
                </p>
                <p className="text-xs text-gray-400">{m.nameEs}</p>
              </div>
              <span className="text-xs text-gray-400">{m.responsible}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
