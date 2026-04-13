'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import type { TimelineMilestone } from '@/types/timeline';
import type {
  BrandColor,
  BrandVoice,
  TargetAudience,
  Competitor,
  NamingOption,
  BrandTypography,
} from '@/types/brand';
import { SegmentedPill } from '@/components/ui/segmented-pill';

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

interface BrandWorkspaceProps {
  milestones: TimelineMilestone[];
}

export function BrandWorkspace({ milestones }: BrandWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const { profile, loading, saving, updateProfile, debouncedUpdate } =
    useBrandProfile(collectionId);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const phaseMilestones = milestones.filter((m) => ['br-1', 'br-2', 'br-3', 'br-4'].includes(m.id));
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/30" />
      </div>
    );
  }

  return (
    <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-16">
      {/* ── Header — centered, matches dashboard style ── */}
      <div className="text-center mb-8">
        <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
          {saving ? 'Saving...' : 'Brand Identity'}
        </p>
        <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
          Brand Identity
        </h1>
      </div>

      {/* ── Tab selector — SegmentedPill, centered ── */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <SegmentedPill
          options={[
            { id: 'profile' as Tab, label: 'Brand Profile' },
            { id: 'visual' as Tab, label: 'Visual Identity' },
            { id: 'packaging' as Tab, label: 'Packaging' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v)}
          size="md"
        />
        <p className="text-[13px] text-carbon/35 tracking-[-0.01em]">
          {activeTab === 'profile' && 'Naming, story, voice, audience, and competitors'}
          {activeTab === 'visual' && 'Color palette and typography system'}
          {activeTab === 'packaging' && 'Packaging design notes and guidelines'}
        </p>
      </div>

      {/* ── Profile Tab — card grid ── */}
      {profile && activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 [&>div]:rounded-[20px] [&>div>div]:rounded-[20px] [&_.bg-white]:rounded-[20px] [&_.border]:rounded-[20px]">
          {/* Left column: Naming + Voice stacked */}
          <div className="flex flex-col gap-5">
            <BrandNaming
              namingOptions={profile.naming_options as NamingOption[] | null}
              brandName={profile.brand_name}
              tagline={profile.tagline}
              onUpdate={debouncedUpdate}
            />
            <BrandVoiceSection
              voice={profile.brand_voice as BrandVoice | null}
              onUpdate={debouncedUpdate}
            />
          </div>

          {/* Right: Story — spanning 2 columns */}
          <div className="lg:col-span-2">
            <BrandStory
              story={profile.brand_story}
              onUpdate={debouncedUpdate}
            />
          </div>

          {/* Second row: Audience (2 cols) + Competitors (1 col) */}
          <div className="lg:col-span-2">
            <TargetAudienceSection
              audience={profile.target_audience as TargetAudience | null}
              onUpdate={debouncedUpdate}
            />
          </div>

          <div>
            <CompetitorMap
              competitors={profile.competitors as Competitor[] | null}
              onUpdate={debouncedUpdate}
            />
          </div>
        </div>
      )}

      {/* ── Visual Tab — card grid ── */}
      {profile && activeTab === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 [&_.bg-white]:rounded-[20px] [&_.border]:rounded-[20px]">
          <div className="lg:col-span-2">
            <ColorPalette
              primaryColors={profile.primary_colors as BrandColor[] | null}
              secondaryColors={profile.secondary_colors as BrandColor[] | null}
              onUpdate={debouncedUpdate}
            />
          </div>

          <div>
            <TypographySection
              typography={profile.typography as BrandTypography | null}
              onUpdate={debouncedUpdate}
            />
          </div>
        </div>
      )}

      {/* ── Packaging Tab ── */}
      {profile && activeTab === 'packaging' && (
        <div className="[&_.bg-white]:rounded-[20px] [&_.border]:rounded-[20px]">
          <PackagingSection
            notes={profile.packaging_notes}
            onUpdate={debouncedUpdate}
          />
        </div>
      )}

      {/* ── Progress bar — minimal, bottom ── */}
      <div className="mt-12 flex items-center justify-center gap-4">
        <div className="w-[160px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-carbon/30 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[12px] text-carbon/30 tabular-nums">{progress}%</span>
      </div>
    </div>
  );
}
