'use client';

/**
 * CommunicationsCard — wrapper around ContentStrategyCard with updated
 * labeling for the Block 4 restructure.
 *
 * Contains: Copy, SEO, social templates, email marketing, brand voice.
 * All the textual/communication content, as opposed to visual content
 * (which lives in ContentStudioCard) or commercial planning (which
 * lives in SalesDashboardCard).
 *
 * This is a thin wrapper — ContentStrategyCard does all the work.
 * The wrapper exists so MarketingCreationScreen imports the 4 new
 * card names cleanly, and so we can customize the collapsed card
 * labels without touching the ContentStrategyCard internals.
 */

import { ContentStrategyCard } from './ContentStrategyCard';

interface CommunicationsCardProps {
  collectionPlanId: string;
}

export function CommunicationsCard({ collectionPlanId }: CommunicationsCardProps) {
  return <ContentStrategyCard collectionPlanId={collectionPlanId} />;
}
