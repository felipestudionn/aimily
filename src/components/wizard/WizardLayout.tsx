'use client';

import { WizardSidebar } from '@/components/wizard/WizardSidebar';
import { TimelineProvider } from '@/contexts/TimelineContext';
import type { TimelineMilestone } from '@/types/timeline';

interface WizardLayoutProps {
  children: React.ReactNode;
  collectionId: string;
  collectionName: string;
  season?: string;
  milestones: TimelineMilestone[];
  launchDate?: string | null;
  skuCount?: number;
  setupData?: Record<string, unknown> | null;
}

export function WizardLayout({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
  launchDate,
  skuCount,
  setupData,
}: WizardLayoutProps) {
  return (
    <TimelineProvider collectionPlanId={collectionId} initialMilestones={milestones}>
      <WizardSidebar
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
        launchDate={launchDate}
        skuCount={skuCount}
        setupData={setupData}
      />
      <main className="ml-72 min-h-screen transition-all duration-300">
        {children}
      </main>
    </TimelineProvider>
  );
}
