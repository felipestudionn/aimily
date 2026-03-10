'use client';

import { useState, useCallback } from 'react';
import { Megaphone } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { MultiSelectStep } from '@/components/wizard/steps/MultiSelectStep';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function MarketingMiniWizard({ planId, onComplete }: Props) {
  const [platforms, setPlatforms] = useState<Set<string>>(new Set());
  const [wantInfluencer, setWantInfluencer] = useState(false);
  const [wantPaidAds, setWantPaidAds] = useState(false);
  const [wantEmail, setWantEmail] = useState(false);

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'marketing',
        configured: true,
        config_data: {
          platforms: Array.from(platforms),
          wantInfluencer,
          wantPaidAds,
          wantEmail,
        },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, platforms, wantInfluencer, wantPaidAds, wantEmail, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'platforms',
      canAdvance: platforms.size > 0,
      render: () => (
        <MultiSelectStep
          title="Which platforms will you use?"
          subtitle="Select all that apply. This pre-configures your content calendar."
          options={[
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'pinterest', label: 'Pinterest' },
            { value: 'email', label: 'Email' },
            { value: 'blog', label: 'Blog' },
          ]}
          selected={platforms}
          onToggle={(v) => {
            setPlatforms((prev) => {
              const next = new Set(prev);
              next.has(v) ? next.delete(v) : next.add(v);
              return next;
            });
          }}
          columns={2}
        />
      ),
    },
    {
      id: 'influencer',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Plan influencer or PR outreach?"
          subtitle="Enables the Influencer CRM tab in your marketing workspace."
          onAnswer={(yes) => { setWantInfluencer(yes); onNext(); }}
        />
      ),
    },
    {
      id: 'paid-ads',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Plan paid advertising?"
          subtitle="Enables the Paid Ads tab for campaign tracking."
          onAnswer={(yes) => { setWantPaidAds(yes); onNext(); }}
        />
      ),
    },
    {
      id: 'email-marketing',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Plan email marketing?"
          subtitle="Enables the Email tab for campaign management."
          onAnswer={(yes) => { setWantEmail(yes); onNext(); }}
        />
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
            <Megaphone className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Marketing Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
