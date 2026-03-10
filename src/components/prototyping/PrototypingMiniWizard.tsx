'use client';

import { useState, useCallback } from 'react';
import { Boxes } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { SelectStep } from '@/components/wizard/steps/SelectStep';
import { FormStep } from '@/components/wizard/steps/FormStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function PrototypingMiniWizard({ planId, onComplete }: Props) {
  const [factory, setFactory] = useState({ name: '', contact: '' });
  const [turnaround, setTurnaround] = useState('');

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'prototyping',
        configured: true,
        config_data: { factory, turnaround },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, factory, turnaround, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'factory',
      render: () => (
        <FormStep
          title="Prototype Factory"
          subtitle="Which factory produces your prototypes?"
        >
          <div className="bg-white border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Factory Name</label>
              <input
                type="text"
                value={factory.name}
                onChange={(e) => setFactory((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., ABC Prototypes Ltd."
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
    },
    {
      id: 'turnaround',
      autoAdvance: true,
      render: (onNext) => (
        <SelectStep
          title="Expected proto turnaround?"
          subtitle="This adjusts milestone durations for prototyping."
          options={[
            { value: '2-4', label: '2–4 weeks', sublabel: 'Fast' },
            { value: '4-8', label: '4–8 weeks', sublabel: 'Standard' },
            { value: '8+', label: '8+ weeks', sublabel: 'Extended' },
          ]}
          value={turnaround}
          onSelect={(v) => { setTurnaround(v); onNext(); }}
          columns={3}
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
            <Boxes className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Prototyping Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
