'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Megaphone,
  CalendarDays,
  Users,
  Mail,
  Target,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-carbon" />
          <span className="text-sm text-gray-500">Loading Marketing Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crema flex items-center justify-center text-carbon">
              <Megaphone className="h-5 w-5" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Marketing & Content</h2>
              <p className="text-xs text-gray-500">Marketing y Contenido</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-orange-600">{progress}%</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-carbon transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-gray-600">{completed} completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-texto/60" />
            <span className="text-gray-600">{inProgress} in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-gray-600">{pending} pending</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
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
      <div className="bg-white border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Marketing Milestones</h3>
        <div className="space-y-2">
          {phaseMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : m.status === 'in-progress'
                    ? 'border-carbon'
                    : 'border-gray-200'
                }`}
              >
                {m.status === 'completed' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {m.status === 'in-progress' && (
                  <div className="w-2 h-2 rounded-full bg-carbon" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {m.name}
                </p>
                <p className="text-xs text-gray-400">{m.nameEs}</p>
              </div>
              <span className="text-xs text-gray-400">{m.responsible}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
