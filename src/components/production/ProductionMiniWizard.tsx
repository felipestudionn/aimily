'use client';

import { useState, useCallback } from 'react';
import { Factory } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { SelectStep } from '@/components/wizard/steps/SelectStep';
import { FormStep } from '@/components/wizard/steps/FormStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function ProductionMiniWizard({ planId, onComplete }: Props) {
  const [origin, setOrigin] = useState('');
  const [factory, setFactory] = useState({ name: '', contact: '' });
  const [currency, setCurrency] = useState('');

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'production',
        configured: true,
        config_data: { origin, factory, currency },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, origin, factory, currency, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'origin',
      autoAdvance: true,
      render: (onNext) => (
        <SelectStep
          title="Where will you produce?"
          subtitle="This adjusts production milestone durations."
          options={[
            { value: 'short', label: 'Short Distance', sublabel: 'Local / your country — shorter timelines' },
            { value: 'medium', label: 'Medium Distance', sublabel: 'Europe / regional — medium timelines' },
            { value: 'long', label: 'Long Distance', sublabel: 'China / Asia — longer timelines' },
          ]}
          value={origin}
          onSelect={(v) => { setOrigin(v); onNext(); }}
          columns={3}
        />
      ),
    },
    {
      id: 'factory',
      render: () => (
        <FormStep
          title="Primary Factory"
          subtitle="Enter your main production factory details."
        >
          <div className="bg-white border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Factory Name</label>
              <input
                type="text"
                value={factory.name}
                onChange={(e) => setFactory((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Dongguan Manufacturing Co."
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
      id: 'currency',
      autoAdvance: true,
      render: (onNext) => (
        <SelectStep
          title="Production currency?"
          subtitle="Pre-selects currency in order forms."
          options={[
            { value: 'EUR', label: 'EUR' },
            { value: 'USD', label: 'USD' },
            { value: 'GBP', label: 'GBP' },
            { value: 'JPY', label: 'JPY' },
            { value: 'CNY', label: 'CNY' },
          ]}
          value={currency}
          onSelect={(v) => { setCurrency(v); onNext(); }}
          columns={5}
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
            <Factory className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Production Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
