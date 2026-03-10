'use client';

import { useState, useCallback } from 'react';
import { Shirt } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { SelectStep } from '@/components/wizard/steps/SelectStep';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';
import { FormStep } from '@/components/wizard/steps/FormStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function SamplingMiniWizard({ planId, onComplete }: Props) {
  const [sameFactory, setSameFactory] = useState<boolean | null>(null);
  const [factory, setFactory] = useState({ name: '', contact: '' });
  const [fittingRounds, setFittingRounds] = useState('');

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'sampling',
        configured: true,
        config_data: {
          sameFactoryAsProtos: sameFactory,
          factory: sameFactory ? null : factory,
          fittingRounds: Number(fittingRounds) || 2,
        },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, sameFactory, factory, fittingRounds, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'same-factory',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Same factory as prototypes?"
          subtitle="If yes, we'll use the same factory info."
          yesLabel="Yes, same factory"
          noLabel="No, different factory"
          onAnswer={(yes) => { setSameFactory(yes); onNext(); }}
        />
      ),
    },
  ];

  // Show factory form only if different factory
  if (sameFactory === false) {
    steps.push({
      id: 'factory',
      render: () => (
        <FormStep
          title="Sampling Factory"
          subtitle="Enter your sampling factory details."
        >
          <div className="bg-white border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Factory Name</label>
              <input
                type="text"
                value={factory.name}
                onChange={(e) => setFactory((f) => ({ ...f, name: e.target.value }))}
                placeholder="Factory name"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contact / Email</label>
              <input
                type="text"
                value={factory.contact}
                onChange={(e) => setFactory((f) => ({ ...f, contact: e.target.value }))}
                placeholder="email@factory.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              />
            </div>
          </div>
        </FormStep>
      ),
    });
  }

  steps.push({
    id: 'fitting-rounds',
    autoAdvance: true,
    render: (onNext) => (
      <SelectStep
        title="How many fitting rounds?"
        subtitle="Plan your sample fitting iterations."
        options={[
          { value: '1', label: '1 Round', sublabel: 'Fast track' },
          { value: '2', label: '2 Rounds', sublabel: 'Standard' },
          { value: '3', label: '3 Rounds', sublabel: 'Thorough' },
        ]}
        value={fittingRounds}
        onSelect={(v) => { setFittingRounds(v); onNext(); }}
        columns={3}
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
            <Shirt className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Sampling Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
