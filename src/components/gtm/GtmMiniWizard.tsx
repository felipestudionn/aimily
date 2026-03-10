'use client';

import { useState, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { SelectStep } from '@/components/wizard/steps/SelectStep';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { useDrops } from '@/hooks/useDrops';

interface Props {
  planId: string;
  launchDate: string | null;
  onComplete: () => void;
}

export function GtmMiniWizard({ planId, launchDate, onComplete }: Props) {
  const { addDrop } = useDrops(planId);

  const [dropCount, setDropCount] = useState('');
  const [dropDetails, setDropDetails] = useState<
    { name: string; launch_date: string; weeks_active: number }[]
  >([]);
  const [wantActions, setWantActions] = useState(false);
  const [actions, setActions] = useState<
    { name: string; type: string; date: string }[]
  >([]);

  // Build initial drop details when count is selected
  const initDropDetails = (count: number) => {
    const base = launchDate ? new Date(launchDate) : new Date();
    const details = Array.from({ length: count }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - (count - 1 - i) * 30); // space drops 30 days apart, last one = launch
      return {
        name: `Drop ${i + 1}`,
        launch_date: d.toISOString().split('T')[0],
        weeks_active: 8,
      };
    });
    setDropDetails(details);
  };

  const updateDropDetail = (idx: number, field: string, value: string | number) => {
    setDropDetails((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const addActionRow = () => {
    setActions((prev) => [...prev, { name: '', type: 'CAMPAIGN', date: '' }]);
  };

  const updateAction = (idx: number, field: string, value: string) => {
    setActions((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  };

  const removeAction = (idx: number) => {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  };

  const markConfigured = useCallback(async () => {
    // Create drops in Supabase
    for (let i = 0; i < dropDetails.length; i++) {
      const d = dropDetails[i];
      await addDrop({
        collection_plan_id: planId,
        drop_number: i + 1,
        name: d.name,
        launch_date: d.launch_date,
        weeks_active: d.weeks_active,
        channels: ['DTC', 'WHOLESALE'],
        position: i,
      });
    }

    // Create commercial actions if any
    if (wantActions && actions.length > 0) {
      for (const a of actions.filter((a) => a.name && a.date)) {
        await fetch('/api/commercial-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection_plan_id: planId,
            name: a.name,
            action_type: a.type,
            start_date: a.date,
            category: '',
            channels: ['DTC', 'WHOLESALE'],
            position: 0,
          }),
        }).catch(() => {});
      }
    }

    // Mark workspace configured
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'go-to-market', configured: true }),
    }).catch(() => {});

    onComplete();
  }, [planId, dropDetails, wantActions, actions, addDrop, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'drop-count',
      autoAdvance: true,
      render: (onNext) => (
        <SelectStep
          title="How many drops?"
          subtitle="Divide your collection into timed product releases."
          options={[
            { value: '1', label: '1 Drop', sublabel: 'Single release' },
            { value: '2', label: '2 Drops', sublabel: 'Two-phase launch' },
            { value: '3', label: '3 Drops', sublabel: 'Seasonal cadence' },
            { value: '4', label: '4+ Drops', sublabel: 'Rolling releases' },
          ]}
          value={dropCount}
          onSelect={(v) => {
            setDropCount(v);
            initDropDetails(Number(v));
            onNext();
          }}
          columns={2}
        />
      ),
    },
    {
      id: 'drop-details',
      render: () => (
        <FormStep
          title="Drop Details"
          subtitle="Name each drop and set launch dates."
        >
          <div className="space-y-4">
            {dropDetails.map((d, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 p-4 space-y-3"
              >
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Drop {i + 1}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => updateDropDetail(i, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Launch Date</label>
                    <input
                      type="date"
                      value={d.launch_date}
                      onChange={(e) => updateDropDetail(i, 'launch_date', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weeks Active</label>
                    <input
                      type="number"
                      value={d.weeks_active}
                      min={1}
                      max={52}
                      onChange={(e) => updateDropDetail(i, 'weeks_active', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FormStep>
      ),
    },
    {
      id: 'want-actions',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Any commercial actions planned?"
          subtitle="Sales, collaborations, campaigns, seedings, or events."
          onAnswer={(yes) => {
            setWantActions(yes);
            if (!yes) {
              setActions([]);
            } else if (actions.length === 0) {
              addActionRow();
            }
            onNext();
          }}
        />
      ),
    },
  ];

  // Conditionally add action details step
  if (wantActions) {
    steps.push({
      id: 'action-details',
      render: () => (
        <FormStep
          title="Commercial Actions"
          subtitle="Add your planned marketing activities."
        >
          <div className="space-y-3">
            {actions.map((a, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 p-4 grid grid-cols-[1fr_120px_140px_32px] gap-3 items-end"
              >
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={a.name}
                    onChange={(e) => updateAction(i, 'name', e.target.value)}
                    placeholder="e.g., Black Friday"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={a.type}
                    onChange={(e) => updateAction(i, 'type', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                  >
                    <option value="SALE">Sale</option>
                    <option value="COLLAB">Collab</option>
                    <option value="CAMPAIGN">Campaign</option>
                    <option value="SEEDING">Seeding</option>
                    <option value="EVENT">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={a.date}
                    onChange={(e) => updateAction(i, 'date', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
                  />
                </div>
                <button
                  onClick={() => removeAction(i)}
                  className="p-2 text-gray-300 hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={addActionRow}
              className="w-full py-2 border border-dashed border-gray-200 text-sm text-gray-400 hover:text-carbon hover:border-carbon/30 transition-colors"
            >
              + Add another action
            </button>
          </div>
        </FormStep>
      ),
    });
  }

  return (
    <BlockWizard
      steps={steps}
      onComplete={markConfigured}
      header={
        <div className="fixed top-0 left-0 right-0 z-50 bg-crema">
          <div className="max-w-5xl mx-auto px-6 h-20 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Go-to-Market Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
