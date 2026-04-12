'use client';

import type { TimelineMilestone } from '@/types/timeline';
import { SalesDashboardCard } from './SalesDashboardCard';
import { ContentStudioCard } from './ContentStudioCard';
import { CommunicationsCard } from './CommunicationsCard';
import { PointOfSaleCard } from './PointOfSaleCard';
import { useTranslation } from '@/i18n';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
}

/**
 * Marketing Block 4 — 4-card grid (restructured 2026-04-12):
 *
 *   [1] Sales Dashboard      — KPIs, revenue curve, drops, stories commercial
 *   [2] Content Studio       — Per-SKU visual pipeline (4 levels) + model roster
 *   [3] Communications       — Copy, social, email, brand voice, SEO
 *   [4] Point of Sale        — Web store, wholesale orders, distribution
 *
 * Previous structure (before restructure):
 *   Stories, Product Visuals, Campaign & Video, Content Strategy
 *
 * The legacy cards (StoriesCard, ProductVisualsCard, CampaignVideoCard)
 * still exist and are accessible from within the new cards where
 * relevant (e.g., still life generation links to ProductVisualsCard,
 * editorial generation links to CampaignVideoCard).
 */
export function MarketingCreationScreen({ collectionPlanId }: Props) {
  const t = useTranslation();

  return (
    <div className="px-4 sm:px-6 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          {t.marketingPage.sectionLabel}
        </p>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          {t.marketingPage.creationTitle} <span className="italic">{t.marketingPage.creationTitleItalic}</span>
        </h2>
        <p className="text-sm sm:text-base font-light text-carbon/50 mt-3 max-w-2xl leading-relaxed">
          {t.marketingPage.creationDesc}
        </p>
      </div>

      {/* 2×2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SalesDashboardCard collectionPlanId={collectionPlanId} />
        <ContentStudioCard collectionPlanId={collectionPlanId} />
        <CommunicationsCard collectionPlanId={collectionPlanId} />
        <PointOfSaleCard collectionPlanId={collectionPlanId} />
      </div>
    </div>
  );
}
