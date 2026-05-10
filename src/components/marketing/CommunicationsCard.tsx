'use client';

/**
 * CommunicationsCard — gold standard rewrite (Sprint G v2)
 *
 * Replaces the legacy ContentStrategyCard form-heavy view with
 * CommunicationsContent: hero sections (Voz · Pilares · Ad-hoc generators)
 * mirroring the Sales Dashboard pattern. Each generator one-click triggers
 * /api/marketing/generate/[type] with full Brand DNA + drop context.
 */

import { CommunicationsContent } from './CommunicationsContent';

interface CommunicationsCardProps {
  collectionPlanId: string;
}

export function CommunicationsCard({ collectionPlanId }: CommunicationsCardProps) {
  return <CommunicationsContent collectionPlanId={collectionPlanId} />;
}
