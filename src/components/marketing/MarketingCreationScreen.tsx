'use client';

import type { TimelineMilestone } from '@/types/timeline';
import { SalesDashboardCard } from './SalesDashboardCard';
import { ContentStudioCard } from './ContentStudioCard';
import { CommunicationsCard } from './CommunicationsCard';
import { PointOfSaleCard } from './PointOfSaleCard';
import { VisualIdentityCard } from './VisualIdentityCard';
import { GtmLaunchHub } from './GtmLaunchHub';
import { useTranslation } from '@/i18n';
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
  visual: 'Visual Identity',
};

export function MarketingCreationScreen({ collectionPlanId, blockParamOverride }: Props) {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const blockParam = blockParamOverride ?? searchParams?.get('block');

  /* ═══ CLEAN WORKSPACE VIEW (from sidebar with ?block= param) ═══ */
  if (blockParam && BLOCK_NAMES[blockParam]) {
    return (
      <div className="min-h-[80vh]">
        <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
          {/* Header — centered, matches template */}
          <div className="text-center mb-10">
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
              Marketing & Sales
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              {BLOCK_NAMES[blockParam]}
            </h1>
          </div>

          {/* Content — single card, full width */}
          <div className="max-w-full">
            {blockParam === 'gtm' && <GtmLaunchHub collectionPlanId={collectionPlanId} />}
            {blockParam === 'sales' && <SalesDashboardCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'content' && <ContentStudioCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'comms' && <CommunicationsCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'pos' && <PointOfSaleCard collectionPlanId={collectionPlanId} />}
            {blockParam === 'visual' && <VisualIdentityCard collectionPlanId={collectionPlanId} />}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ LEGACY VIEW (direct access, no blockParam) ═══ */
  return (
    <div className="px-4 sm:px-6 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.08em] uppercase text-carbon/30 mb-3">
          {t.marketingPage.sectionLabel}
        </p>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          {t.marketingPage.creationTitle} <span className="italic">{t.marketingPage.creationTitleItalic}</span>
        </h2>
        <p className="text-sm sm:text-base font-light text-carbon/50 mt-3 max-w-2xl leading-relaxed">
          {t.marketingPage.creationDesc}
        </p>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SalesDashboardCard collectionPlanId={collectionPlanId} />
        <ContentStudioCard collectionPlanId={collectionPlanId} />
        <CommunicationsCard collectionPlanId={collectionPlanId} />
        <PointOfSaleCard collectionPlanId={collectionPlanId} />
        <VisualIdentityCard collectionPlanId={collectionPlanId} />
      </div>
    </div>
  );
}
