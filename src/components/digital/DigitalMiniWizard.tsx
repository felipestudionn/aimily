'use client';

import { useState, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { MultiSelectStep } from '@/components/wizard/steps/MultiSelectStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function DigitalMiniWizard({ planId, onComplete }: Props) {
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);
  const [website, setWebsite] = useState({ platform: '', domain: '', url: '' });
  const [copyNeeds, setCopyNeeds] = useState<Set<string>>(new Set());

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'digital',
        configured: true,
        config_data: {
          hasWebsite,
          website: hasWebsite ? website : null,
          copyNeeds: Array.from(copyNeeds),
        },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, hasWebsite, website, copyNeeds, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'has-website',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Do you have a website?"
          subtitle="We'll set up website tracking if you do."
          onAnswer={(yes) => { setHasWebsite(yes); onNext(); }}
        />
      ),
    },
  ];

  if (hasWebsite) {
    steps.push({
      id: 'website-details',
      render: () => (
        <FormStep
          title="Website Details"
          subtitle="Tell us about your online presence."
        >
          <div className="bg-white border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Platform</label>
              <select
                value={website.platform}
                onChange={(e) => setWebsite((w) => ({ ...w, platform: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              >
                <option value="">Select platform...</option>
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="squarespace">Squarespace</option>
                <option value="custom">Custom</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Domain</label>
              <input
                type="text"
                value={website.domain}
                onChange={(e) => setWebsite((w) => ({ ...w, domain: e.target.value }))}
                placeholder="yourbrand.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL</label>
              <input
                type="text"
                value={website.url}
                onChange={(e) => setWebsite((w) => ({ ...w, url: e.target.value }))}
                placeholder="https://yourbrand.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              />
            </div>
          </div>
        </FormStep>
      ),
    });
  }

  steps.push({
    id: 'copy-needs',
    canAdvance: copyNeeds.size > 0,
    render: () => (
      <MultiSelectStep
        title="What product copy do you need?"
        subtitle="Select all that apply."
        options={[
          { value: 'descriptions', label: 'Product Descriptions' },
          { value: 'brand-story', label: 'Brand Story' },
          { value: 'seo', label: 'SEO Meta Tags' },
          { value: 'email', label: 'Email Templates' },
          { value: 'social', label: 'Social Captions' },
        ]}
        selected={copyNeeds}
        onToggle={(v) => {
          setCopyNeeds((prev) => {
            const next = new Set(prev);
            next.has(v) ? next.delete(v) : next.add(v);
            return next;
          });
        }}
        columns={2}
      />
    ),
  });

  return (
    <BlockWizard
      steps={steps}
      onComplete={markConfigured}
      header={
        <div className="fixed top-0 left-0 right-0 z-50 bg-crema">
          <div className="max-w-5xl mx-auto px-6 h-20 flex items-center gap-3">
            <Globe className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Digital Presence Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
