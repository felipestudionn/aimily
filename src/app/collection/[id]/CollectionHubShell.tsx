'use client';

import { CollectionSidebar } from '@/components/collection/CollectionSidebar';
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
    <>
      <CollectionSidebar
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
        milestones={milestones}
      />
      <main className="ml-64 pt-28 pb-16 px-6 transition-all duration-300">
        {children}
      </main>
    </>
  );
}
