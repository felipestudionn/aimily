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
  launchDate?: string | null;
  skuCount?: number;
  setupData?: Record<string, unknown> | null;
}

export function CollectionHubShell({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
  launchDate,
  skuCount,
  setupData,
}: CollectionHubShellProps) {
  return (
    <SubscriptionGate>
      <WizardLayout
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
        milestones={milestones}
        launchDate={launchDate}
        skuCount={skuCount}
        setupData={setupData}
      >
        {children}
      </WizardLayout>
    </SubscriptionGate>
  );
}
