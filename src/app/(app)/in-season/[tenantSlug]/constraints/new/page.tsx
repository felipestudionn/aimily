/**
 * /in-season/[tenantSlug]/constraints/new — REDIRECT to the unified setup workspace
 *
 * The old flat constraints form (raw inputs for SKUs, budget, margin %,
 * positioning, family_share_targets as JSON) is replaced by the
 * archetype-driven Buy Strategy block inside the Setup workspace. Same
 * archetype-kickoff + multi-axis editor pattern as Block 2's
 * ScenariosContent.
 *
 * Kept for one release as a 301-style redirect.
 *
 * Source: .planning/strategy/plan_strategy-restructure-v3-2026-05-16.md §7
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NewConstraintsRedirect({ params }: PageProps) {
  const { tenantSlug } = await params;
  redirect(`/in-season/${tenantSlug}/setup?block=buy-strategy`);
}
