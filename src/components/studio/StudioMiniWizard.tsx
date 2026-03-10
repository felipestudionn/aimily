'use client';

import { useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { MultiSelectStep } from '@/components/wizard/steps/MultiSelectStep';
import { FormStep } from '@/components/wizard/steps/FormStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function StudioMiniWizard({ planId, onComplete }: Props) {
  const [contentNeeds, setContentNeeds] = useState<Set<string>>(new Set());

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'studio',
        configured: true,
        config_data: { contentNeeds: Array.from(contentNeeds) },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, contentNeeds, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'content-needs',
      canAdvance: contentNeeds.size > 0,
      render: () => (
        <MultiSelectStep
          title="What content do you need?"
          subtitle="Select all that apply. This enables the relevant studio tabs."
          options={[
            { value: 'renders', label: 'Product Renders', sublabel: 'Studio shots' },
            { value: 'tryon', label: 'On-Model Try-On', sublabel: 'Virtual fitting' },
            { value: 'lifestyle', label: 'Lifestyle Shots', sublabel: 'Context imagery' },
            { value: 'video', label: 'Video Content', sublabel: 'Motion & reels' },
            { value: 'lookbook', label: 'Lookbook', sublabel: 'Curated collection' },
          ]}
          selected={contentNeeds}
          onToggle={(v) => {
            setContentNeeds((prev) => {
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
      id: 'reference-check',
      render: () => {
        return (
          <FormStep
            title="Reference Images"
            subtitle="Your SKUs need reference images for AI generation to work best."
          >
            <div className="bg-white border border-gray-100 p-6 text-center space-y-3">
              <p className="text-sm text-gray-600">
                Make sure your SKUs in the Product workspace have reference images uploaded.
                The AI Studio uses these as the base for all generated content.
              </p>
              <p className="text-xs text-gray-400">
                You can always add images later — this is just a reminder.
              </p>
            </div>
          </FormStep>
        );
      },
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
              AI Studio Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
