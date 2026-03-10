'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMiniWizard } from './BrandMiniWizard';
import { BrandWorkspace } from './BrandWorkspace';
import type { TimelineMilestone } from '@/types/timeline';

interface Props {
  planId: string;
  milestones: TimelineMilestone[];
  isConfigured: boolean;
}

export function BrandWorkspaceGate({ planId, milestones, isConfigured }: Props) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(!isConfigured);

  if (showWizard) {
    return (
      <BrandMiniWizard
        planId={planId}
        onComplete={() => {
          setShowWizard(false);
          router.refresh();
        }}
      />
    );
  }

  return <BrandWorkspace milestones={milestones} />;
}
