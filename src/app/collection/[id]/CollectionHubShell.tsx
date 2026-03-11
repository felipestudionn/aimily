'use client';

import { WizardLayout } from '@/components/wizard/WizardLayout';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import type { TimelineMilestone } from '@/types/timeline';

interface CollectionHubShellProps {
  children: React.ReactNode;
  collectionId: string;
  collectionName: string;
  season?: string;
  milestones: TimelineMilestone[];
}

export function CollectionHubShell({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
}: CollectionHubShellProps) {
  return (
    <SubscriptionGate>
      <WizardLayout
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
        milestones={milestones}
      >
        {children}
      </WizardLayout>
    </SubscriptionGate>
  );
}
