'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GtmMiniWizard } from './GtmMiniWizard';
import { GoToMarketDashboard } from './GoToMarketDashboard';
import type { SKU } from '@/hooks/useSkus';

interface Props {
  plan: { id: string; name: string; setup_data: any };
  initialSkus: SKU[];
  isConfigured: boolean;
}

export function GtmWorkspaceGate({ plan, initialSkus, isConfigured }: Props) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(!isConfigured);

  if (showWizard) {
    return (
      <GtmMiniWizard
        planId={plan.id}
        launchDate={plan.setup_data?.launchDate || null}
        onComplete={() => {
          setShowWizard(false);
          router.refresh();
        }}
      />
    );
  }

  return <GoToMarketDashboard plan={plan} initialSkus={initialSkus} />;
}
