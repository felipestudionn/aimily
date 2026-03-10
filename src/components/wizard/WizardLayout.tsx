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
}

export function WizardLayout({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
}: WizardLayoutProps) {
  return (
    <TimelineProvider collectionPlanId={collectionId} initialMilestones={milestones}>
      <WizardSidebar
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
      />
      <main className="ml-72 pt-28 pb-16 px-6 transition-all duration-300 min-h-screen">
        {children}
      </main>
    </TimelineProvider>
  );
}
