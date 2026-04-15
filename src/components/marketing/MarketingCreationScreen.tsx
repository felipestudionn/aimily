'use client';

import type { TimelineMilestone } from '@/types/timeline';
import { SalesDashboardCard } from './SalesDashboardCard';
import { ContentStudioCard } from './ContentStudioCard';
import { CommunicationsCard } from './CommunicationsCard';
import { PointOfSaleCard } from './PointOfSaleCard';
import { GtmLaunchHub } from './GtmLaunchHub';
import { useSearchParams } from 'next/navigation';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
  blockParamOverride?: string | null;
}

const BLOCK_NAMES: Record<string, string> = {
  gtm: 'GTM & Launch Plan',
  sales: 'Sales Dashboard',
  content: 'Content Studio',
  comms: 'Communications',
  pos: 'Point of Sale',
};

export function MarketingCreationScreen({ collectionPlanId, blockParamOverride }: Props) {
  const searchParams = useSearchParams();
  const blockParam = blockParamOverride ?? searchParams?.get('block');

  /* ═══ CLEAN WORKSPACE VIEW (from sidebar with ?block= param) ═══ */
  if (blockParam && BLOCK_NAMES[blockParam]) {
    return (
      <div className="min-h-[80vh]">
        <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
          <div className="text-center mb-10">
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
              Marketing & Sales
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              {BLOCK_NAMES[blockParam]}
            </h1>
          </div>

          <div className="max-w-full">
            {blockParam === 'gtm' && <GtmLaunchHub collectionPlanId={collectionPlanId} />}
            {blockParam === 'sales' && <SalesDashboardCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'content' && <ContentStudioCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'comms' && <CommunicationsCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'pos' && <PointOfSaleCard collectionPlanId={collectionPlanId} />}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ Default: GTM hub (block-4 landing when no ?block= param) ═══ */
  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
            Marketing & Sales
          </p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            GTM & Launch Plan
          </h1>
        </div>
        <GtmLaunchHub collectionPlanId={collectionPlanId} />
      </div>
    </div>
  );
}
