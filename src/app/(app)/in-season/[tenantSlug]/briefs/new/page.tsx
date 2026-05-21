/**
 * /in-season/[tenantSlug]/briefs/new — REDIRECT to the unified setup workspace
 *
 * The old standalone brief editor (custom MoodboardBriefUploader + form
 * with a Brand-DNA fallback) was rejected by Felipe — Strategy is not
 * creating a brand, it is ingesting creative direction. The Setup
 * workspace now hosts brief creation as the "creative" sub-block,
 * replicating Block 1's MoodboardContent pattern verbatim.
 *
 * Kept for one release as a 301-style redirect so any inbound links from
 * email / docs / external systems keep working. Plan to delete after a
 * telemetry pass confirms no traffic.
 *
 * Source: .planning/strategy/plan_strategy-restructure-v3-2026-05-16.md §6
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NewBriefRedirect({ params }: PageProps) {
  const { tenantSlug } = await params;
  redirect(`/in-season/${tenantSlug}/setup?block=creative`);
}
