'use client';

import { WizardLayout } from '@/components/wizard/WizardLayout';
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
    <WizardLayout
      collectionId={collectionId}
      collectionName={collectionName}
      season={season}
      milestones={milestones}
    >
      {children}
    </WizardLayout>
  );
}
