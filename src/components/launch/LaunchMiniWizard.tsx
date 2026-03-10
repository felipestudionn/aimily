'use client';

import { useState, useCallback } from 'react';
import { Rocket } from 'lucide-react';
import { BlockWizard, type WizardStep } from '@/components/wizard/BlockWizard';
import { MultiSelectStep } from '@/components/wizard/steps/MultiSelectStep';
import { YesNoStep } from '@/components/wizard/steps/YesNoStep';
import { FormStep } from '@/components/wizard/steps/FormStep';

interface Props {
  planId: string;
  onComplete: () => void;
}

export function LaunchMiniWizard({ planId, onComplete }: Props) {
  const [channels, setChannels] = useState<Set<string>>(new Set());
  const [wantEvent, setWantEvent] = useState(false);
  const [event, setEvent] = useState({ type: '', date: '' });

  const markConfigured = useCallback(async () => {
    await fetch(`/api/planner/${planId}/workspace-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'launch',
        configured: true,
        config_data: {
          channels: Array.from(channels),
          wantEvent,
          event: wantEvent ? event : null,
        },
      }),
    }).catch(() => {});
    onComplete();
  }, [planId, channels, wantEvent, event, onComplete]);

  const steps: WizardStep[] = [
    {
      id: 'channels',
      canAdvance: channels.size > 0,
      render: () => (
        <MultiSelectStep
          title="Where will you launch?"
          subtitle="Select all launch channels."
          options={[
            { value: 'online', label: 'Online Store' },
            { value: 'retail', label: 'Physical Retail' },
            { value: 'popup', label: 'Pop-up' },
            { value: 'showroom', label: 'Wholesale Showroom' },
            { value: 'marketplace', label: 'Marketplace', sublabel: 'Amazon, etc.' },
          ]}
          selected={channels}
          onToggle={(v) => {
            setChannels((prev) => {
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
      id: 'want-event',
      autoAdvance: true,
      render: (onNext) => (
        <YesNoStep
          title="Planning a launch event?"
          subtitle="We'll add event planning tools to your launch workspace."
          onAnswer={(yes) => { setWantEvent(yes); onNext(); }}
        />
      ),
    },
  ];

  if (wantEvent) {
    steps.push({
      id: 'event-details',
      render: () => (
        <FormStep
          title="Launch Event"
          subtitle="Tell us about your planned event."
        >
          <div className="bg-white border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Event Type</label>
              <select
                value={event.type}
                onChange={(e) => setEvent((ev) => ({ ...ev, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              >
                <option value="">Select type...</option>
                <option value="party">Launch Party</option>
                <option value="presentation">Presentation</option>
                <option value="digital">Digital Event</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expected Date</label>
              <input
                type="date"
                value={event.date}
                onChange={(e) => setEvent((ev) => ({ ...ev, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20"
              />
            </div>
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
            <Rocket className="h-5 w-5 text-carbon" />
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-carbon">
              Launch Setup
            </span>
          </div>
        </div>
      }
    />
  );
}
