'use client';

import type { TimelineMilestone } from '@/types/timeline';
import { StoriesCard } from './StoriesCard';
import { ProductVisualsCard } from './ProductVisualsCard';
import { CampaignVideoCard } from './CampaignVideoCard';
import { ContentStrategyCard } from './ContentStrategyCard';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
}

export function MarketingCreationScreen({ collectionPlanId }: Props) {
  return (
    <div className="px-8 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Marketing & Digital
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          Content <span className="italic">Creation</span>
        </h2>
        <p className="text-base font-light text-carbon/50 mt-3 max-w-2xl leading-relaxed">
          Build your marketing assets — stories, visuals, campaigns, and content strategy.
        </p>
      </div>

      {/* 2×2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Stories — live card */}
        <StoriesCard collectionPlanId={collectionPlanId} />

        {/* Product Visuals — live card */}
        <ProductVisualsCard collectionPlanId={collectionPlanId} />

        {/* Campaign & Video — live card */}
        <CampaignVideoCard collectionPlanId={collectionPlanId} />

        {/* Content Strategy — live card */}
        <ContentStrategyCard collectionPlanId={collectionPlanId} />
      </div>
    </div>
  );
}
