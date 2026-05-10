'use client';

import type { TimelineMilestone } from '@/types/timeline';
import { ContentStudioCard } from './ContentStudioCard';
import { CommunicationsCard } from './CommunicationsCard';
import { EcomCard } from './EcomCard';
import { GtmLaunchHub } from './GtmLaunchHub';
import SalesStrategyContent from './SalesStrategyContent';
import SalesDashboardEngine from './SalesDashboardEngine';
import { useSearchParams } from 'next/navigation';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
  blockParamOverride?: string | null;
}

const BLOCK_NAMES: Record<string, string> = {
  strategy: 'Estrategia de Venta',
  gtm: 'GTM y Lanzamiento',
  sales: 'Sales Dashboard',
  content: 'Content Studio',
  comms: 'Comunicación',
  ecom: 'Ecom',
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
              Marketing y Ventas
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              {BLOCK_NAMES[blockParam]}
            </h1>
          </div>

          <div className="max-w-full">
            {blockParam === 'strategy' && <SalesStrategyContent collectionPlanId={collectionPlanId} />}
            {blockParam === 'gtm' && <GtmLaunchHub collectionPlanId={collectionPlanId} />}
            {blockParam === 'sales' && <SalesDashboardEngine collectionPlanId={collectionPlanId} />}
            {blockParam === 'content' && <ContentStudioCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'comms' && <CommunicationsCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'ecom' && <EcomCard collectionPlanId={collectionPlanId} />}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ Default landing: 04.0 Estrategia de Venta (the kick-off) ═══ */
  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
            Marketing y Ventas
          </p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            Estrategia de Venta
          </h1>
        </div>
        <SalesStrategyContent collectionPlanId={collectionPlanId} />
      </div>
    </div>
  );
}
