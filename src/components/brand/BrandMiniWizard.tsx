'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import type { BrandProfile, BrandColor, BrandVoice, TargetAudience, Competitor, NamingOption, BrandTypography } from '@/types/brand';

/* ── Section components (reused from workspace) ── */
import { BrandNaming } from './sections/BrandNaming';
import { BrandStory } from './sections/BrandStory';
import { BrandVoiceSection } from './sections/BrandVoiceSection';
import { TargetAudienceSection } from './sections/TargetAudienceSection';
import { CompetitorMap } from './sections/CompetitorMap';
import { ColorPalette } from './sections/ColorPalette';
import { TypographySection } from './sections/TypographySection';
import { PackagingSection } from './sections/PackagingSection';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function BrandMiniWizard({ planId, onComplete }: Props) {
  const { id } = useParams();
  const collectionId = id as string;
  const { profile, loading, debouncedUpdate } = useBrandProfile(collectionId);

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'brand', configured: true }),
    }).catch(() => {});
    onComplete();
  }, [planId, onComplete]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
      </div>
    );
  }

  const steps: WizardStep[] = [
    {
      id: 'naming',
      render: () => (
        <FormStep
          title="Brand Naming"
          subtitle="Define your brand name, tagline, and brainstorm alternatives."
        >
          <BrandNaming
            namingOptions={profile.naming_options as NamingOption[] | null}
            brandName={profile.brand_name}
            tagline={profile.tagline}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'story',
      render: () => (
        <FormStep
          title="Brand Story"
          subtitle="Write your brand's origin story, mission, and vision."
        >
          <BrandStory
            story={profile.brand_story}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'voice',
      render: () => (
        <FormStep
          title="Brand Voice"
          subtitle="Define the tone, personality, and language of your brand."
        >
          <BrandVoiceSection
            voice={profile.brand_voice as BrandVoice | null}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'audience',
      render: () => (
        <FormStep
          title="Target Audience"
          subtitle="Who is your ideal customer?"
        >
          <TargetAudienceSection
            audience={profile.target_audience as TargetAudience | null}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'competitors',
      render: () => (
        <FormStep
          title="Competitor Mapping"
          subtitle="Map out your competitive landscape."
        >
          <CompetitorMap
            competitors={profile.competitors as Competitor[] | null}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'colors',
      render: () => (
        <FormStep
          title="Color Palette"
          subtitle="Define your brand's primary and secondary colors."
        >
          <ColorPalette
            primaryColors={profile.primary_colors as BrandColor[] | null}
            secondaryColors={profile.secondary_colors as BrandColor[] | null}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'typography',
      render: () => (
        <FormStep
          title="Typography"
          subtitle="Choose your brand's typefaces."
        >
          <TypographySection
            typography={profile.typography as BrandTypography | null}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
    {
      id: 'packaging',
      render: () => (
        <FormStep
          title="Packaging"
          subtitle="Describe your packaging requirements and design direction."
        >
          <PackagingSection
            notes={profile.packaging_notes}
            onUpdate={debouncedUpdate}
          />
        </FormStep>
      ),
    },
  ];

  return (
    <BlockWizard
      steps={steps}
      onComplete={markConfigured}
      header={
        <div className="fixed top-0 left-0 right-0 z-50 bg-crema">
          <div className="max-w-5xl mx-auto px-6 h-20 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Brand Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
