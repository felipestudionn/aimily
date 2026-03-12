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

/**
 * Marketing block mini-wizard.
 * Collects: has_website, social_channels, has_email_list.
 * Saves to setup_data.workspace_config.marketing_block.
 */
export function MarketingBlockWizard({ planId, onComplete }: Props) {
  const [hasWebsite, setHasWebsite] = useState(false);
  const [socialChannels, setSocialChannels] = useState<Set<string>>(new Set());
  const [hasEmailList, setHasEmailList] = useState(false);

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'marketing_block',
        configured: true,
        config_data: {
          has_website: hasWebsite,
          social_channels: Array.from(socialChannels),
          has_email_list: hasEmailList,
        },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, hasWebsite, socialChannels, hasEmailList, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'has-website',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Does your brand have a website?"
          subtitle="This determines your launch checklist and e-commerce setup tasks."
          onAnswer={(yes) => { setHasWebsite(yes); onNext(); }}
        />
      ),
    },
    {
      id: 'social-channels',
      canAdvance: socialChannels.size > 0,
      render: () => (
        <MultiSelectStep
          title="Which social channels do you use?"
          subtitle="Select all active channels. This configures your content calendar."
          options={[
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'pinterest', label: 'Pinterest' },
          ]}
          selected={socialChannels}
          onToggle={(v) => {
            setSocialChannels((prev) => {
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
      id: 'has-email-list',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Do you have an email list?"
          subtitle="Enables email marketing templates and campaign planning."
          onAnswer={(yes) => { setHasEmailList(yes); onNext(); }}
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
              Marketing & Digital Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
