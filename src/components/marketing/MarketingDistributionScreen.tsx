'use client';

import type { TimelineMilestone } from '@/types/timeline';
import { GoToMarketCard } from './GoToMarketCard';
import { ContentCalendarCard } from './ContentCalendarCard';
import { PaidGrowthCard } from './PaidGrowthCard';
import { LaunchCard } from './LaunchCard';
import { useTranslation } from '@/i18n';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
}

export function MarketingDistributionScreen({ collectionPlanId, milestones }: Props) {
  const t = useTranslation();

  return (
    <div className="px-4 sm:px-6 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          {t.marketingPage.sectionLabel}
        </p>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          {t.marketingPage.distributionTitle} <span className="italic">{t.marketingPage.distributionTitleItalic}</span>
        </h2>
        <p className="text-sm sm:text-base font-light text-carbon/50 mt-3 max-w-2xl leading-relaxed">
          {t.marketingPage.distributionDesc}
        </p>
      </div>

      {/* 2x2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Go-to-Market */}
        <GoToMarketCard collectionPlanId={collectionPlanId} />

        {/* Content Calendar */}
        <ContentCalendarCard collectionPlanId={collectionPlanId} />

        {/* Paid & Growth */}
        <PaidGrowthCard collectionPlanId={collectionPlanId} />

        {/* Launch */}
        <LaunchCard collectionPlanId={collectionPlanId} />
      </div>
    </div>
  );
}
