'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlannerDashboard } from '@/components/planner/PlannerDashboard';
import { ProductMiniWizard } from '@/components/planner/ProductMiniWizard';
import type { CollectionPlan } from '@/types/planner';

interface Props {
  plan: CollectionPlan;
}

export function ProductWorkspaceGate({ plan }: Props) {
  const router = useRouter();
  const isConfigured =
    (plan.setup_data as any)?.workspace_config?.product?.configured === true;

  const [showWizard, setShowWizard] = useState(!isConfigured);

  if (showWizard) {
    return (
      <ProductMiniWizard
        plan={plan}
        onComplete={() => {
          setShowWizard(false);
          // Force a server re-fetch so PlannerDashboard gets fresh setup_data
          router.refresh();
        }}
      />
    );
  }

  return <PlannerDashboard plan={plan} />;
}
