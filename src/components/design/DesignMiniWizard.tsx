'use client';

import { useState, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { SelectStep } from '@/components/wizard/steps/SelectStep';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';

interface Props {
  planId: string;
  category: string; // footwear | clothing | accessories | mixed
  onComplete: () => void;
}

export function DesignMiniWizard({ planId, category, onComplete }: Props) {
  const [designRounds, setDesignRounds] = useState('');
  const [hasLastSupplier, setHasLastSupplier] = useState(false);
  const [lastSupplier, setLastSupplier] = useState({ name: '', link: '' });
  const [colorwaysPerStyle, setColorwaysPerStyle] = useState('');

  const isFootwear = category === 'footwear';

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'design',
        configured: true,
        config_data: {
          designRounds: Number(designRounds) || 2,
          lastSupplier: hasLastSupplier ? lastSupplier : null,
          colorwaysPerStyle,
        },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, designRounds, hasLastSupplier, lastSupplier, colorwaysPerStyle, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'design-rounds',
      autoAdvance: true,
      render: (onNext) => (
        <SelectStep
          title="How many design rounds?"
          subtitle="Plan your iteration cycles."
          options={[
            { value: '1', label: '1 Round', sublabel: 'Streamlined' },
            { value: '2', label: '2 Rounds', sublabel: 'Standard' },
            { value: '3', label: '3 Rounds', sublabel: 'Thorough' },
          ]}
          value={designRounds}
          onSelect={(v) => { setDesignRounds(v); onNext(); }}
          columns={3}
        />
      ),
    },
  ];

  // Footwear-only: lasts/forms question
  if (isFootwear) {
    steps.push({
      id: 'last-supplier-ask',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Do you have a last supplier?"
          subtitle="Lasts/forms are needed for footwear development."
          onAnswer={(yes) => { setHasLastSupplier(yes); onNext(); }}
        />
      ),
    });

    // Only show form if yes (conditional — rendered based on state)
    if (hasLastSupplier) {
      steps.push({
        id: 'last-supplier-details',
        render: () => (
          <FormStep
            title="Last Supplier Details"
            subtitle="Enter your last/form supplier information."
          >
            <div className="bg-white border border-gray-100 p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Factory / Supplier Name</label>
                <input
                  type="text"
                  value={lastSupplier.name}
                  onChange={(e) => setLastSupplier((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g., Gruppo Meccanica"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Website or Contact</label>
                <input
                  type="text"
                  value={lastSupplier.link}
                  onChange={(e) => setLastSupplier((s) => ({ ...s, link: e.target.value }))}
                  placeholder="URL or email"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                />
              </div>
            </div>
          </FormStep>
        ),
      });
    }
  }

  steps.push({
    id: 'colorways',
    autoAdvance: true,
    render: (onNext) => (
      <SelectStep
        title="How many colorways per style?"
        subtitle="Pre-create colorway slots for each SKU."
        options={[
          { value: '1-3', label: '1–3', sublabel: 'Focused palette' },
          { value: '3-5', label: '3–5', sublabel: 'Standard range' },
          { value: '5+', label: '5+', sublabel: 'Broad palette' },
        ]}
        value={colorwaysPerStyle}
        onSelect={(v) => { setColorwaysPerStyle(v); onNext(); }}
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
            <Pencil className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Design Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
