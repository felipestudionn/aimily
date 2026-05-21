/**
 * /in-season/[tenantSlug]/setup — unified Setup workspace
 *
 * Replaces the legacy /briefs/new + /constraints/new routes. Single
 * URL hosts two sub-blocks via ?block= query param:
 *
 *   ?block=creative       · clones Block 1's MoodboardContent pattern
 *   ?block=buy-strategy   · archetype kickoff + 5-axis editor
 *                           (clones Block 2's ScenariosContent pattern)
 *
 * Server component: fetches tenant + processed-source count + current
 * brief + current constraint + completed-run flag. Renders the client
 * SetupWorkspace which owns the SegmentedPill + phase machine.
 *
 * Source: .planning/strategy/plan_strategy-restructure-v3-2026-05-16.md §6+§7
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BUY_STRATEGY_ARCHETYPES } from '@/lib/strategy/sales-archetypes';
import { SetupWorkspace } from './SetupWorkspace';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ block?: string }>;
}

export default async function SetupPage({ params, searchParams }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;
  const { block } = await searchParams;

  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  // Parallel reads for gating + prefill.
  const [
    sourcesRes,
    completedRunRes,
    latestBriefRes,
    latestConstraintRes,
    familyScoresRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('strategy_sources')
      .select('id, processed_at')
      .eq('tenant_id', tenant.id)
      .limit(50),
    supabaseAdmin
      .from('strategy_analysis_runs')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('run_status', 'complete')
      .order('recommending_completed_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategy_creative_briefs')
      .select('id, name, description, color_story, archetypes_focus, family_pivot, creative_narrative')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_constraints')
      .select('id, name, chosen_archetype_id, action_mix, buy_waves, target_adjacent_families, target_total_skus, target_buy_budget, target_avg_margin')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_family_scores')
      .select('family_code')
      .eq('tenant_id', tenant.id)
      .limit(50),
  ]);

  const totalSources = sourcesRes.data?.length ?? 0;
  const processedSources = sourcesRes.data?.filter((s) => s.processed_at != null).length ?? 0;
  const hasCompletedRun = (completedRunRes.data?.length ?? 0) > 0;
  const topFamilyCodes = Array.from(
    new Set((familyScoresRes.data ?? []).map((f) => f.family_code))
  ).filter((c): c is string => typeof c === 'string');

  const initialBlock: 'creative' | 'buy-strategy' =
    block === 'buy-strategy' ? 'buy-strategy' : 'creative';

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[1600px]">
        <Link
          href={`/in-season/${tenant.slug}`}
          className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em] mb-3 inline-block"
        >
          ← {tenant.display_name}
        </Link>
        <SetupWorkspace
          tenant={{ id: tenant.id, slug: tenant.slug, display_name: tenant.display_name }}
          initialBlock={initialBlock}
          archetypes={BUY_STRATEGY_ARCHETYPES}
          gating={{
            total_sources: totalSources,
            processed_sources: processedSources,
            has_completed_run: hasCompletedRun,
          }}
          existingBrief={latestBriefRes.data ?? null}
          existingConstraint={latestConstraintRes.data ?? null}
          topFamilyCodes={topFamilyCodes}
        />
      </div>
    </main>
  );
}
