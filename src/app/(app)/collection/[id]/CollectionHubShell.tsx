'use client';

import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
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
}

export function CollectionHubShell({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
  launchDate,
  skuCount,
}: CollectionHubShellProps) {
  return (
    <SubscriptionGate>
      <WorkspaceShell
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
        milestones={milestones}
        launchDate={launchDate}
        skuCount={skuCount}
      >
        {children}
      </WorkspaceShell>
    </SubscriptionGate>
  );
}
