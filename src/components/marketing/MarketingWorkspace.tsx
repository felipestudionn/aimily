'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  Users,
  Mail,
  Target,
  Loader2,
} from 'lucide-react';
import { useContentCalendar } from '@/hooks/useContentCalendar';
import { usePrContacts } from '@/hooks/usePrContacts';
import type { TimelineMilestone } from '@/types/timeline';
import type { MarketingTab } from '@/types/marketing';

import { ContentCalendarSection } from './sections/ContentCalendarSection';
import { InfluencerCRM } from './sections/InfluencerCRM';
import { EmailMarketingSection } from './sections/EmailMarketingSection';
import { PaidAdsSection } from './sections/PaidAdsSection';

const TABS: { id: MarketingTab; label: string; labelEs: string; icon: React.ElementType }[] = [
  { id: 'calendar', label: 'Content Calendar', labelEs: 'Calendario de Contenido', icon: CalendarDays },
  { id: 'influencer', label: 'Influencer & PR', labelEs: 'Influencers y PR', icon: Users },
  { id: 'email', label: 'Email Marketing', labelEs: 'Email Marketing', icon: Mail },
  { id: 'ads', label: 'Paid Ads', labelEs: 'Publicidad Pagada', icon: Target },
];

interface MarketingWorkspaceProps {
  milestones: TimelineMilestone[];
}

export function MarketingWorkspace({ milestones }: MarketingWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const [activeTab, setActiveTab] = useState<MarketingTab>('calendar');

  const {
    entries,
    loading: entriesLoading,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useContentCalendar(collectionId);

  const {
    contacts,
    loading: contactsLoading,
    addContact,
    updateContact,
    deleteContact,
  } = usePrContacts(collectionId);

  // Marketing workspace milestones (gm-6 to gm-11)
  const phaseMilestones = milestones.filter((m) => ['gm-6', 'gm-7', 'gm-8', 'gm-9', 'gm-10', 'gm-11'].includes(m.id));
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  const loading = entriesLoading || contactsLoading;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/30" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 space-y-10">
      {/* Phase Header */}
      <div>
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
          Marketing y Contenido
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          Marketing &amp; Content
        </h1>
      </div>

      {/* Progress Card */}
      <div className="relative bg-white border border-carbon/[0.06] p-8 overflow-hidden">
        <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
          <div className="h-full bg-carbon transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-5xl font-light text-carbon tracking-tight">{progress}</span>
            <span className="text-lg font-light text-carbon/40 ml-1">%</span>
          </div>
          <div className="flex gap-6 text-xs text-carbon/40">
            <span>{completed} completed</span>
            <span>{inProgress} in progress</span>
            <span>{pending} pending</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-carbon/[0.06]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                isActive
                  ? 'bg-carbon text-crema'
                  : 'bg-white text-carbon/40 hover:text-carbon/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'calendar' && (
        <ContentCalendarSection
          entries={entries}
          collectionId={collectionId}
          onAdd={addEntry}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      )}

      {activeTab === 'influencer' && (
        <InfluencerCRM
          contacts={contacts}
          collectionId={collectionId}
          onAdd={addContact}
          onUpdate={updateContact}
          onDelete={deleteContact}
        />
      )}

      {activeTab === 'email' && (
        <EmailMarketingSection collectionId={collectionId} />
      )}

      {activeTab === 'ads' && (
        <PaidAdsSection collectionId={collectionId} />
      )}

      {/* Milestones Checklist */}
      <div className="bg-white border border-carbon/[0.06] p-8">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-6">Milestones</p>
        <div className="space-y-4">
          {phaseMilestones.map((m) => (
            <div key={m.id} className="flex items-center gap-4">
              <div
                className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed'
                    ? 'bg-carbon border-carbon'
                    : m.status === 'in-progress'
                    ? 'border-carbon'
                    : 'border-carbon/20'
                }`}
              >
                {m.status === 'completed' && (
                  <svg className="w-2.5 h-2.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {m.status === 'in-progress' && (
                  <div className="w-1.5 h-1.5 bg-carbon" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-light ${m.status === 'completed' ? 'text-carbon/30 line-through' : 'text-carbon'}`}>
                  {m.name}
                </p>
              </div>
              <span className="text-xs text-carbon/30">{m.responsible}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
